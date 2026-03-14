import { NextApiRequest, NextApiResponse } from "next";
import { Collection, Db, ObjectId } from "mongodb";
import { getServerSession } from "next-auth/next";
import nodemailer from "nodemailer";
import { connectToDatabase } from "../../utils/mongodb";
import {
  FeedbackItemDoc,
  FeedbackNotificationStatus,
  FeedbackTriageStatus,
  FeedbackWorkItemDoc,
} from "../../utils/types";
import { authOptions } from "./auth/[...nextauth]";
import {
  FEEDBACK_TRIAGE_STATUSES,
  buildWorkItemUrl,
  createFeedbackFingerprint,
  getLegacyStatusFromTriage,
} from "../../utils/feedbackWorkflow";
import {
  getAppBuildMetadata,
  getReporterRole,
} from "../../utils/feedbackMetadata";

const sanitizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const ADMIN_USERNAME = "grwyler";
const ADMIN_EMAIL = "grwyler@gmail.com";
const MAX_STORED_REPORT_IDS = 25;

let feedbackIndexesReady = false;

const isAdminSession = (session: any) => {
  const username = sanitizeText(
    session?.user?.username || session?.token?.user?.username
  ).toLowerCase();
  const email = sanitizeText(
    session?.user?.email || session?.token?.user?.email
  ).toLowerCase();

  return username === ADMIN_USERNAME || email === ADMIN_EMAIL;
};

const ensureFeedbackWorkflowIndexes = async (db: Db) => {
  if (feedbackIndexesReady) {
    return;
  }

  const feedbackCollection = db.collection("feedback");
  const workItemCollection = db.collection("feedbackWorkItems");

  await Promise.all([
    feedbackCollection.createIndex({ createdAt: -1 }),
    feedbackCollection.createIndex({ type: 1, triageStatus: 1, createdAt: -1 }),
    feedbackCollection.createIndex({ workItemId: 1, createdAt: -1 }),
    workItemCollection.createIndex({ fingerprint: 1 }, { unique: true }),
    workItemCollection.createIndex({ type: 1, triageStatus: 1, updatedAt: -1 }),
  ]);

  feedbackIndexesReady = true;
};

const getSessionUserContext = (session: any) => ({
  userId: sanitizeText(session?.user?._id || session?.token?.user?._id),
  username: sanitizeText(
    session?.user?.username || session?.token?.user?.username
  ),
  email: sanitizeText(session?.user?.email || session?.token?.user?.email),
});

const sanitizeReporterRole = (value: unknown) =>
  value === "admin" || value === "user" ? value : undefined;

const sanitizeRuntimeContext = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const context = value as Record<string, unknown>;
  const rawViewport = context.viewport;
  const viewport =
    rawViewport && typeof rawViewport === "object"
      ? {
          width: Number((rawViewport as Record<string, unknown>).width) || 0,
          height: Number((rawViewport as Record<string, unknown>).height) || 0,
        }
      : undefined;
  const online =
    typeof context.online === "boolean" ? context.online : undefined;
  const appVersion = sanitizeText(context.appVersion) || undefined;
  const commitSha = sanitizeText(context.commitSha).slice(0, 40) || undefined;
  const environment = sanitizeText(context.environment) || undefined;
  const route = sanitizeText(context.route) || undefined;
  const userAgent = sanitizeText(context.userAgent) || undefined;

  return {
    appVersion,
    commitSha,
    environment,
    route,
    userAgent,
    viewport:
      viewport && viewport.width > 0 && viewport.height > 0 ? viewport : undefined,
    online,
  };
};

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
            ? (sanitizeText(interaction.status) as
                | "info"
                | "success"
                | "failure")
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

const sanitizeCoachFeedback = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const feedback = value as Record<string, unknown>;
  const sentiment = sanitizeText(feedback.sentiment);

  if (sentiment !== "like" && sentiment !== "dislike") {
    return undefined;
  }

  const rawConversation = Array.isArray(feedback.conversation)
    ? feedback.conversation
    : [];

  const conversation = rawConversation
    .slice(0, 50)
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const entry = item as Record<string, unknown>;
      const role = sanitizeText(entry.role);
      const text = sanitizeText(entry.text);

      if ((role !== "coach" && role !== "user") || !text) {
        return null;
      }

      return {
        role: role as "coach" | "user",
        text,
      };
    })
    .filter(Boolean);

  return {
    sentiment: sentiment as "like" | "dislike",
    messageId: sanitizeText(feedback.messageId) || undefined,
    selectedResponse: sanitizeText(feedback.selectedResponse) || undefined,
    explanation: sanitizeText(feedback.explanation) || undefined,
    conversation: conversation.length > 0 ? conversation : undefined,
  };
};

const sanitizeFeedbackSeverity = (value: unknown) =>
  value === "low" || value === "medium" || value === "high" ? value : undefined;

const sanitizeDeviceType = (value: unknown) =>
  value === "mobile" || value === "desktop" || value === "unknown"
    ? value
    : "unknown";

const sanitizeTriageStatus = (
  value: unknown
): FeedbackTriageStatus | undefined =>
  FEEDBACK_TRIAGE_STATUSES.includes(value as FeedbackTriageStatus)
    ? (value as FeedbackTriageStatus)
    : undefined;

const compareSeverity = (value?: string) => {
  switch (value) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
};

const selectHigherSeverity = (
  left?: "low" | "medium" | "high",
  right?: "low" | "medium" | "high"
) =>
  compareSeverity(left) >= compareSeverity(right) ? left : right;

const buildReportIdList = (existing: unknown, nextReportId: string) => {
  const seen = new Set<string>();
  const reportIds = Array.isArray(existing)
    ? existing.map((value) => String(value)).filter(Boolean)
    : [];

  return [...reportIds, nextReportId]
    .filter((value) => {
      if (seen.has(value)) {
        return false;
      }

      seen.add(value);
      return true;
    })
    .slice(-MAX_STORED_REPORT_IDS);
};

const buildFeedbackDoc = ({
  feedback,
  session,
  now,
}: {
  feedback: Partial<FeedbackItemDoc>;
  session: any;
  now: Date;
}) => {
  const { userId, username, email } = getSessionUserContext(session);
  const reporterRole =
    getReporterRole({ username, email }) ||
    sanitizeReporterRole(feedback.reporterRole);
  const type =
    feedback.type === "feature" || feedback.type === "bug"
      ? feedback.type
      : null;
  const title = sanitizeText(feedback.title);
  const description = sanitizeText(feedback.description);

  if (!userId || !type || !title || !description) {
    return null;
  }

  const runtimeContext = sanitizeRuntimeContext(feedback.runtimeContext);
  const buildMetadata = getAppBuildMetadata();
  const doc: FeedbackItemDoc = {
    userId,
    username: username || undefined,
    email: email || undefined,
    reporterRole,
    type,
    title,
    description,
    status: "new",
    triageStatus: "new",
    severity: sanitizeFeedbackSeverity(feedback.severity),
    page: sanitizeText(feedback.page) || undefined,
    deviceType: sanitizeDeviceType(feedback.deviceType),
    runtimeContext: {
      ...runtimeContext,
      appVersion: runtimeContext?.appVersion || buildMetadata.appVersion,
      commitSha: runtimeContext?.commitSha || buildMetadata.commitSha,
      environment: runtimeContext?.environment || buildMetadata.environment,
      route:
        runtimeContext?.route ||
        sanitizeText(feedback.page) ||
        sanitizeBugReport(feedback.bugReport)?.currentPath ||
        undefined,
    },
    bugReport: sanitizeBugReport(feedback.bugReport),
    coachFeedback: sanitizeCoachFeedback(feedback.coachFeedback),
    fingerprint: createFeedbackFingerprint({
      ...feedback,
      userId,
      username,
      email,
      title,
      description,
      type,
      page: sanitizeText(feedback.page),
      severity: sanitizeFeedbackSeverity(feedback.severity),
      bugReport: sanitizeBugReport(feedback.bugReport),
      coachFeedback: sanitizeCoachFeedback(feedback.coachFeedback),
    }),
    notificationStatus: "pending",
    createdAt: now,
    updatedAt: now,
  };

  return doc;
};

const upsertFeedbackWorkItem = async ({
  workItemCollection,
  feedback,
  feedbackId,
  now,
}: {
  workItemCollection: Collection<FeedbackWorkItemDoc>;
  feedback: FeedbackItemDoc;
  feedbackId: string;
  now: Date;
}) => {
  const fingerprint = feedback.fingerprint || createFeedbackFingerprint(feedback);
  const existing = (await workItemCollection.findOne({
    fingerprint,
  })) as FeedbackWorkItemDoc | null;

  if (existing?._id) {
    const occurrenceCount = Number(existing.occurrenceCount || 0) + 1;
    const triageStatus = existing.triageStatus || "new";
    const workItemId = existing._id.toString();
    const nextReportIds = buildReportIdList(existing.reportIds, feedbackId);
    const nextSeverity = selectHigherSeverity(existing.severity, feedback.severity);

    const update: Partial<FeedbackWorkItemDoc> = {
      title: feedback.title,
      latestDescription: feedback.description,
      page: feedback.page || existing.page,
      severity: nextSeverity,
      deviceType: feedback.deviceType || existing.deviceType,
      latestRuntimeContext: feedback.runtimeContext || existing.latestRuntimeContext,
      occurrenceCount,
      triageStatus,
      status: getLegacyStatusFromTriage(triageStatus),
      latestReportId: feedbackId,
      reportIds: nextReportIds,
      latestReporter: feedback.username || feedback.email || feedback.userId,
      latestEmail: feedback.email,
      latestReporterRole: feedback.reporterRole || existing.latestReporterRole,
      lastReportedAt: now,
      updatedAt: now,
    };

    await workItemCollection.updateOne(
      { _id: existing._id },
      {
        $set: update,
      }
    );

    return {
      workItem: {
        ...existing,
        ...update,
        _id: existing._id,
      } as FeedbackWorkItemDoc,
      isDuplicate: true,
      shouldSendNotification: false,
      workItemId,
    };
  }

  const triageStatus = "new";
  const workItem: FeedbackWorkItemDoc = {
    type: feedback.type,
    title: feedback.title,
    latestDescription: feedback.description,
    page: feedback.page,
    severity: feedback.severity,
    deviceType: feedback.deviceType,
    fingerprint,
    occurrenceCount: 1,
    status: getLegacyStatusFromTriage(triageStatus),
    triageStatus,
    notificationStatus: "pending",
    firstReportId: feedbackId,
    latestReportId: feedbackId,
    reportIds: [feedbackId],
    latestReporter: feedback.username || feedback.email || feedback.userId,
    latestEmail: feedback.email,
    latestReporterRole: feedback.reporterRole,
    latestRuntimeContext: feedback.runtimeContext,
    firstReportedAt: now,
    lastReportedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  const result = await workItemCollection.insertOne(workItem);
  const workItemId = result.insertedId.toString();

  return {
    workItem: {
      ...workItem,
      _id: result.insertedId,
    } as FeedbackWorkItemDoc,
    isDuplicate: false,
    shouldSendNotification: true,
    workItemId,
  };
};

const updateNotificationState = async ({
  feedbackCollection,
  workItemCollection,
  feedbackId,
  workItemId,
  status,
  error,
}: {
  feedbackCollection: Collection<FeedbackItemDoc>;
  workItemCollection: Collection<FeedbackWorkItemDoc>;
  feedbackId: string;
  workItemId: string;
  status: FeedbackNotificationStatus;
  error?: string;
}) => {
  const update = {
    notificationStatus: status,
    lastNotificationError: error || undefined,
    updatedAt: new Date(),
  };

  await Promise.all([
    feedbackCollection.updateOne(
      { _id: new ObjectId(feedbackId) },
      {
        $set: update,
      }
    ),
    workItemCollection.updateOne(
      { _id: new ObjectId(workItemId) },
      {
        $set: update,
      }
    ),
  ]);
};

const sendFeedbackEmail = async ({
  feedback,
  workItem,
}: {
  feedback: FeedbackItemDoc;
  workItem: FeedbackWorkItemDoc;
}) => {
  const host = sanitizeText(process.env.SMTP_HOST);
  const user = sanitizeText(process.env.SMTP_USER);
  const pass = sanitizeText(process.env.SMTP_PASS);
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true";
  const from =
    sanitizeText(process.env.SMTP_FROM) || user || "no-reply@lift-logic.local";
  const to = sanitizeText(process.env.BUG_ALERT_EMAIL_TO) || ADMIN_EMAIL;
  const appUrl =
    sanitizeText(process.env.NEXTAUTH_URL) || "http://localhost:3000";
  const workItemId = String(workItem._id || "");

  if (!host || !user || !pass) {
    return {
      status: "skipped" as const,
      error: "SMTP is not configured for feedback alerts.",
    };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  const workItemUrl = buildWorkItemUrl({
    appUrl,
    workItemId,
  });
  const lines = [
    `Title: ${feedback.title}`,
    `Type: ${feedback.type}`,
    `Report ID: ${String(feedback._id || "")}`,
    `Work item ID: ${workItemId}`,
    `Fingerprint: ${feedback.fingerprint || workItem.fingerprint}`,
    `Occurrences: ${workItem.occurrenceCount || 1}`,
    `Reporter: ${feedback.username || feedback.email || feedback.userId}`,
    `Reporter role: ${feedback.reporterRole || "unknown"}`,
    `Severity: ${feedback.severity || "unknown"}`,
    `Page: ${feedback.page || "unknown"}`,
    `Environment: ${feedback.runtimeContext?.environment || "unknown"}`,
    `App version: ${feedback.runtimeContext?.appVersion || "unknown"}`,
    `Commit SHA: ${feedback.runtimeContext?.commitSha || "unknown"}`,
    `Route: ${feedback.runtimeContext?.route || feedback.page || "unknown"}`,
    `User agent: ${feedback.runtimeContext?.userAgent || "unknown"}`,
    `Triage status: ${workItem.triageStatus}`,
    `Created: ${
      feedback.createdAt ? new Date(feedback.createdAt).toLocaleString() : "Unknown"
    }`,
    "",
    feedback.description,
  ];

  if (feedback.coachFeedback?.selectedResponse) {
    lines.push("", "Selected response", feedback.coachFeedback.selectedResponse);
  }

  if (feedback.coachFeedback?.explanation) {
    lines.push("", "User note", feedback.coachFeedback.explanation);
  }

  if (feedback.coachFeedback?.conversation?.length) {
    lines.push(
      "",
      "Conversation history",
      ...feedback.coachFeedback.conversation.map(
        (entry) => `${entry.role === "coach" ? "Coach" : "User"}: ${entry.text}`
      )
    );
  }

  try {
    await transporter.sendMail({
      from,
      to,
      subject: `[Lift Logic] New ${feedback.type} work item: ${feedback.title}`,
      text: `${lines.join("\n")}\n\nOpen item: ${workItemUrl}`,
    });

    return {
      status: "sent" as const,
    };
  } catch (error) {
    return {
      status: "failed" as const,
      error:
        error instanceof Error
          ? error.message
          : "Unknown feedback email delivery error.",
    };
  }
};

const refreshWorkItemAfterDelete = async ({
  feedbackCollection,
  workItemCollection,
  workItemId,
}: {
  feedbackCollection: Collection<FeedbackItemDoc>;
  workItemCollection: Collection<FeedbackWorkItemDoc>;
  workItemId: string;
}) => {
  if (!ObjectId.isValid(workItemId)) {
    return;
  }

  const remaining = (await feedbackCollection
    .find({ workItemId })
    .sort({ createdAt: -1 })
    .toArray()) as FeedbackItemDoc[];

  if (remaining.length === 0) {
    await workItemCollection.deleteOne({
      _id: new ObjectId(workItemId),
    });
    return;
  }

  const latest = remaining[0];
  const oldest = remaining[remaining.length - 1];
  const reportIds = remaining
    .map((item) => String(item._id))
    .slice(0, MAX_STORED_REPORT_IDS);
  const severity = remaining.reduce<"low" | "medium" | "high" | undefined>(
    (accumulator, item) => selectHigherSeverity(accumulator, item.severity),
    undefined
  );

  await workItemCollection.updateOne(
    { _id: new ObjectId(workItemId) },
    {
      $set: {
        title: latest.title,
        latestDescription: latest.description,
        page: latest.page,
        severity,
        deviceType: latest.deviceType,
        latestRuntimeContext: latest.runtimeContext,
        occurrenceCount: remaining.length,
        latestReportId: String(latest._id),
        firstReportId: String(oldest._id),
        reportIds,
        latestReporter: latest.username || latest.email || latest.userId,
        latestEmail: latest.email,
        latestReporterRole: latest.reporterRole,
        firstReportedAt: oldest.createdAt,
        lastReportedAt: latest.createdAt,
        updatedAt: new Date(),
      },
    }
  );
};

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
        fixThreadId,
        fixCommitSha,
      } = req.body as {
        workItemId?: string;
        triageStatus?: FeedbackTriageStatus;
        fixThreadId?: string;
        fixCommitSha?: string;
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
      const normalizedFixThreadId = sanitizeText(fixThreadId) || undefined;
      const normalizedFixCommitSha = sanitizeText(fixCommitSha) || undefined;
      const nextResolvedAt =
        normalizedTriageStatus === "resolved" || normalizedTriageStatus === "verified"
          ? existing.resolvedAt || now
          : undefined;
      const update: Partial<FeedbackWorkItemDoc> = {
        triageStatus: normalizedTriageStatus,
        status: getLegacyStatusFromTriage(normalizedTriageStatus),
        fixThreadId: normalizedFixThreadId,
        fixCommitSha: normalizedFixCommitSha,
        resolvedAt: nextResolvedAt,
        updatedAt: now,
      };

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

      const { feedbackId } = req.body as { feedbackId?: string };
      const normalizedFeedbackId = sanitizeText(feedbackId);

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
