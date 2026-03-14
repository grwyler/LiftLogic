import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../../utils/mongodb";
import { FeedbackItemDoc } from "../../utils/types";
import { ObjectId } from "mongodb";

const sanitizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const sanitizeBugInteractions = (value: unknown) => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value
    .slice(0, 250)
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const interaction = item as Record<string, unknown>;
      const type = sanitizeText(interaction.type);

      if (
        type !== "click" &&
        type !== "change" &&
        type !== "submit" &&
        type !== "navigation" &&
        type !== "lifecycle"
      ) {
        return null;
      }

      const sanitizedType: NonNullable<
        NonNullable<FeedbackItemDoc["bugReport"]>["interactions"]
      >[number]["type"] = type;
      const sanitizedKind: NonNullable<
        NonNullable<FeedbackItemDoc["bugReport"]>["interactions"]
      >[number]["kind"] =
        sanitizeText(interaction.kind) === "semantic" ? "semantic" : "raw";

      return {
        timestamp: sanitizeText(interaction.timestamp),
        type: sanitizedType,
        page: sanitizeText(interaction.page),
        kind: sanitizedKind,
        target: sanitizeText(interaction.target) || undefined,
        value: sanitizeText(interaction.value) || undefined,
        detail: sanitizeText(interaction.detail) || undefined,
        label: sanitizeText(interaction.label) || undefined,
        expected: sanitizeText(interaction.expected) || undefined,
        actual: sanitizeText(interaction.actual) || undefined,
        status:
          sanitizeText(interaction.status) === "success" ||
          sanitizeText(interaction.status) === "failure" ||
          sanitizeText(interaction.status) === "info"
            ? (sanitizeText(interaction.status) as "info" | "success" | "failure")
            : undefined,
      };
    })
    .filter(Boolean);
};

const sanitizeBugErrors = (value: unknown) => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value
    .slice(0, 100)
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const error = item as Record<string, unknown>;
      const source = sanitizeText(error.source);

      if (
        source !== "window-error" &&
        source !== "unhandled-rejection" &&
        source !== "console-error"
      ) {
        return null;
      }

      const message = sanitizeText(error.message);
      if (!message) {
        return null;
      }

      const sanitizedSource: NonNullable<
        NonNullable<FeedbackItemDoc["bugReport"]>["errors"]
      >[number]["source"] = source;

      return {
        timestamp: sanitizeText(error.timestamp),
        source: sanitizedSource,
        page: sanitizeText(error.page),
        message,
        detail: sanitizeText(error.detail) || undefined,
      };
    })
    .filter(Boolean);
};

const sanitizeBugReport = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const report = value as Record<string, unknown>;

  if (sanitizeText(report.mode) !== "recorded") {
    return undefined;
  }

  const rawViewport = report.viewport;
  const viewport =
    rawViewport && typeof rawViewport === "object"
      ? {
          width: Number((rawViewport as Record<string, unknown>).width) || 0,
          height: Number((rawViewport as Record<string, unknown>).height) || 0,
        }
      : undefined;

  return {
    mode: "recorded" as const,
    startedAt: sanitizeText(report.startedAt) || undefined,
    completedAt: sanitizeText(report.completedAt) || undefined,
    currentPath: sanitizeText(report.currentPath) || undefined,
    userAgent: sanitizeText(report.userAgent) || undefined,
    viewport:
      viewport && viewport.width > 0 && viewport.height > 0 ? viewport : undefined,
    interactions: sanitizeBugInteractions(report.interactions),
    errors: sanitizeBugErrors(report.errors),
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const db = await connectToDatabase();
    const feedbackCollection = db.collection<FeedbackItemDoc>("feedback");

    if (req.method === "GET") {
      const { userId } = req.query;
      const normalizedUserId = Array.isArray(userId) ? userId[0] : userId;

      const query = normalizedUserId ? { userId: normalizedUserId } : {};

      const feedback = await feedbackCollection
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json({ feedback });
    }

    if (req.method === "POST") {
      const { feedback } = req.body as { feedback?: Partial<FeedbackItemDoc> };

      if (!feedback) {
        return res.status(400).json({ message: "Feedback is required" });
      }

      const userId = sanitizeText(feedback.userId);
      const type =
        feedback.type === "feature" || feedback.type === "bug"
          ? feedback.type
          : null;
      const title = sanitizeText(feedback.title);
      const description = sanitizeText(feedback.description);

      if (!userId || !type || !title || !description) {
        return res.status(400).json({
          message: "userId, type, title, and description are required",
        });
      }

      const now = new Date();
      const doc: FeedbackItemDoc = {
        userId,
        username: sanitizeText(feedback.username) || undefined,
        email: sanitizeText(feedback.email) || undefined,
        type,
        title,
        description,
        status: "new",
        severity:
          feedback.severity === "low" ||
          feedback.severity === "medium" ||
          feedback.severity === "high"
            ? feedback.severity
            : undefined,
        page: sanitizeText(feedback.page) || undefined,
        deviceType:
          feedback.deviceType === "mobile" ||
          feedback.deviceType === "desktop" ||
          feedback.deviceType === "unknown"
            ? feedback.deviceType
            : "unknown",
        bugReport: sanitizeBugReport(feedback.bugReport),
        createdAt: now,
        updatedAt: now,
      };

      const result = await feedbackCollection.insertOne(doc);

      return res.status(200).json({
        success: true,
        feedback: {
          ...doc,
          _id: result.insertedId,
        },
      });
    }

    if (req.method === "DELETE") {
      const { feedbackId } = req.body as { feedbackId?: string };
      const normalizedFeedbackId = sanitizeText(feedbackId);

      if (!normalizedFeedbackId) {
        return res.status(400).json({ message: "feedbackId is required" });
      }

      let objectId: ObjectId;
      try {
        objectId = new ObjectId(normalizedFeedbackId);
      } catch {
        return res.status(400).json({ message: "Invalid feedbackId" });
      }

      const result = await feedbackCollection.deleteOne({ _id: objectId as any });

      if (!result.deletedCount) {
        return res.status(404).json({ message: "Feedback not found" });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ message: "Method Not Allowed" });
  } catch (error) {
    console.error("Feedback API error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
