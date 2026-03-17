import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth/next";
import { connectToDatabase } from "../../utils/mongodb";
import {
  FeedbackItemDoc,
  FeedbackNotificationStatus,
  FeedbackTriageStatus,
  FeedbackWorkItemDoc,
} from "../../utils/types";
import { authOptions } from "./auth/[...nextauth]";
import {
  buildFeedbackDoc,
  ensureFeedbackWorkflowIndexes,
  getSessionUserContext,
  isAdminSession,
  sanitizeFeedbackSeverity,
  sanitizeText,
  sanitizeTriageStatus,
} from "../../utils/feedbackIntakeService";
import {
  buildWorkItemUpdate,
  refreshWorkItemAfterDelete,
  upsertFeedbackWorkItem,
} from "../../utils/feedbackWorkItemService";
import {
  sendFeedbackEmail,
  updateNotificationState,
} from "../../utils/feedbackNotificationService";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);
    const db = await connectToDatabase();
    await ensureFeedbackWorkflowIndexes(db);

    const feedbackCollection = db.collection<FeedbackItemDoc>("feedback");
    const workItemCollection =
      db.collection<FeedbackWorkItemDoc>("feedbackWorkItems");

    if (req.method === "GET") {
      const { userId } = req.query;
      const normalizedUserId = Array.isArray(userId) ? userId[0] : userId;
      const requesterId = getSessionUserContext(session).userId;
      const admin = isAdminSession(session);

      if (!session) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!normalizedUserId && !admin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      if (normalizedUserId && !admin && normalizedUserId !== requesterId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const query = normalizedUserId ? { userId: normalizedUserId } : {};
      const feedback = await feedbackCollection
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();

      if (admin && !normalizedUserId) {
        const workItems = await workItemCollection
          .find({})
          .sort({ updatedAt: -1, createdAt: -1 })
          .toArray();

        return res.status(200).json({ feedback, workItems });
      }

      return res.status(200).json({ feedback });
    }

    if (req.method === "POST") {
      if (!session) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { feedback } = req.body as { feedback?: Partial<FeedbackItemDoc> };
      if (!feedback) {
        return res.status(400).json({ message: "Feedback is required" });
      }

      const now = new Date();
      const doc = buildFeedbackDoc({
        feedback,
        session,
        now,
      });

      if (!doc) {
        return res.status(400).json({
          message: "A signed-in user, type, title, and description are required",
        });
      }

      const insertResult = await feedbackCollection.insertOne(doc);
      const feedbackId = insertResult.insertedId.toString();
      const feedbackWithId: FeedbackItemDoc = {
        ...doc,
        _id: insertResult.insertedId,
      };

      const {
        workItem,
        isDuplicate,
        shouldSendNotification,
        workItemId,
      } = await upsertFeedbackWorkItem({
        workItemCollection,
        feedback: feedbackWithId,
        feedbackId,
        now,
      });

      const rawUpdate: Partial<FeedbackItemDoc> = {
        workItemId,
        triageStatus: workItem.triageStatus,
        status: workItem.status,
        fixThreadId: workItem.fixThreadId,
        fixCommitSha: workItem.fixCommitSha,
        resolvedAt: workItem.resolvedAt,
        notificationStatus: shouldSendNotification ? "pending" : "skipped",
        lastNotificationError: shouldSendNotification
          ? undefined
          : "Duplicate work item; notification suppressed.",
        updatedAt: new Date(),
      };

      await feedbackCollection.updateOne(
        { _id: insertResult.insertedId },
        {
          $set: rawUpdate,
        }
      );

      let notificationState: {
        status: FeedbackNotificationStatus;
        error?: string;
      } = {
        status: rawUpdate.notificationStatus || "pending",
        error: rawUpdate.lastNotificationError,
      };

      if (shouldSendNotification) {
        notificationState = await sendFeedbackEmail({
          feedback: {
            ...feedbackWithId,
            ...rawUpdate,
            workItemId,
          },
          workItem,
        });

        await updateNotificationState({
          feedbackCollection,
          workItemCollection,
          feedbackId,
          workItemId,
          status: notificationState.status,
          error: notificationState.error,
        });
      }

      const responseFeedback: FeedbackItemDoc = {
        ...feedbackWithId,
        ...rawUpdate,
        notificationStatus: notificationState.status,
        lastNotificationError: notificationState.error,
      };

      const responseWorkItem: FeedbackWorkItemDoc = {
        ...workItem,
        notificationStatus: shouldSendNotification
          ? notificationState.status
          : workItem.notificationStatus,
        lastNotificationError: shouldSendNotification
          ? notificationState.error
          : workItem.lastNotificationError,
      };

      return res.status(200).json({
        success: true,
        feedback: responseFeedback,
        workItem: responseWorkItem,
        duplicate: isDuplicate,
      });
    }

    if (req.method === "PATCH") {
      if (!session || !isAdminSession(session)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const {
        workItemId,
        triageStatus,
        severity,
        fixThreadId,
        fixCommitSha,
        title,
        latestDescription,
        labels,
        structuredRepro,
        implementationContext,
        verificationPack,
        completedVerificationIds,
      } = req.body as {
        workItemId?: string;
        triageStatus?: FeedbackTriageStatus;
        severity?: "low" | "medium" | "high";
        fixThreadId?: string;
        fixCommitSha?: string;
        title?: string;
        latestDescription?: string;
        labels?: string[];
        structuredRepro?: FeedbackWorkItemDoc["structuredRepro"];
        implementationContext?: FeedbackWorkItemDoc["implementationContext"];
        verificationPack?: FeedbackWorkItemDoc["verificationPack"];
        completedVerificationIds?: string[];
      };

      const normalizedWorkItemId = sanitizeText(workItemId);
      const normalizedTriageStatus = sanitizeTriageStatus(triageStatus);

      if (!normalizedWorkItemId || !ObjectId.isValid(normalizedWorkItemId)) {
        return res.status(400).json({ message: "Valid workItemId is required" });
      }

      if (!normalizedTriageStatus) {
        return res.status(400).json({ message: "Valid triageStatus is required" });
      }

      const existing = await workItemCollection.findOne({
        _id: new ObjectId(normalizedWorkItemId),
      });

      if (!existing) {
        return res.status(404).json({ message: "Work item not found" });
      }

      const now = new Date();
      let update: Partial<FeedbackWorkItemDoc>;
      try {
        update = buildWorkItemUpdate({
          existing,
          triageStatus: normalizedTriageStatus,
          severity: sanitizeFeedbackSeverity(severity) || existing.severity,
          fixThreadId,
          fixCommitSha,
          title,
          latestDescription,
          labels,
          structuredRepro,
          implementationContext,
          verificationPack,
          completedVerificationIds,
          now,
        });
      } catch (error) {
        if (error instanceof Error) {
          return res.status(400).json({ message: error.message });
        }

        throw error;
      }

      await Promise.all([
        workItemCollection.updateOne(
          { _id: new ObjectId(normalizedWorkItemId) },
          {
            $set: update,
          }
        ),
        feedbackCollection.updateMany(
          { workItemId: normalizedWorkItemId },
          {
            $set: {
              triageStatus: update.triageStatus,
              status: update.status,
              severity: update.severity,
              structuredRepro: update.structuredRepro,
              fixThreadId: update.fixThreadId,
              fixCommitSha: update.fixCommitSha,
              resolvedAt: update.resolvedAt,
              updatedAt: now,
            },
          }
        ),
      ]);

      return res.status(200).json({
        success: true,
        workItem: {
          ...existing,
          ...update,
          _id: existing._id,
        },
      });
    }

    if (req.method === "DELETE") {
      if (!session || !isAdminSession(session)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { feedbackId, workItemId } = req.body as {
        feedbackId?: string;
        workItemId?: string;
      };
      const normalizedFeedbackId = sanitizeText(feedbackId);
      const normalizedWorkItemId = sanitizeText(workItemId);

      if (normalizedWorkItemId) {
        if (!ObjectId.isValid(normalizedWorkItemId)) {
          return res.status(400).json({ message: "Valid workItemId is required" });
        }

        const existingWorkItem = await workItemCollection.findOne({
          _id: new ObjectId(normalizedWorkItemId),
        });

        if (!existingWorkItem) {
          return res.status(404).json({ message: "Work item not found" });
        }

        await Promise.all([
          feedbackCollection.deleteMany({ workItemId: normalizedWorkItemId }),
          workItemCollection.deleteOne({
            _id: new ObjectId(normalizedWorkItemId),
          }),
        ]);

        return res.status(200).json({ success: true });
      }

      if (!normalizedFeedbackId || !ObjectId.isValid(normalizedFeedbackId)) {
        return res.status(400).json({ message: "Valid feedbackId is required" });
      }

      const existing = await feedbackCollection.findOne({
        _id: new ObjectId(normalizedFeedbackId),
      });

      if (!existing) {
        return res.status(404).json({ message: "Feedback not found" });
      }

      await feedbackCollection.deleteOne({
        _id: new ObjectId(normalizedFeedbackId),
      });

      if (existing.workItemId) {
        await refreshWorkItemAfterDelete({
          feedbackCollection,
          workItemCollection,
          workItemId: String(existing.workItemId),
        });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ message: "Method Not Allowed" });
  } catch (error) {
    console.error("Feedback API error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
