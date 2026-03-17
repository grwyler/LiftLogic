import { Db } from "mongodb";
import {
  FeedbackDeviceType,
  FeedbackItemDoc,
  FeedbackTriageStatus,
} from "./types";
import {
  FEEDBACK_TRIAGE_STATUSES,
  createFeedbackFingerprint,
} from "./feedbackWorkflow";
import { getAppBuildMetadata, getReporterRole } from "./feedbackMetadata";
import { inferStructuredRepro } from "./feedbackWorkItemContext";

export const ADMIN_USERNAME = "grwyler";
export const ADMIN_EMAIL = "grwyler@gmail.com";

let feedbackIndexesReady = false;

export const sanitizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export const isAdminSession = (session: any) => {
  const username = sanitizeText(
    session?.user?.username || session?.token?.user?.username
  ).toLowerCase();
  const email = sanitizeText(
    session?.user?.email || session?.token?.user?.email
  ).toLowerCase();

  return username === ADMIN_USERNAME || email === ADMIN_EMAIL;
};

export const ensureFeedbackWorkflowIndexes = async (db: Db) => {
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

export const getSessionUserContext = (session: any) => ({
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

export const sanitizeStructuredRepro = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const structured = value as Record<string, unknown>;
  const reproSteps = Array.isArray(structured.reproSteps)
    ? structured.reproSteps
        .map((entry) => sanitizeText(entry))
        .filter(Boolean)
        .slice(0, 20)
    : undefined;
  const source = sanitizeText(structured.source);

  return {
    actualBehavior: sanitizeText(structured.actualBehavior) || undefined,
    expectedBehavior: sanitizeText(structured.expectedBehavior) || undefined,
    reproSteps: reproSteps?.length ? reproSteps : undefined,
    affectedFlow: sanitizeText(structured.affectedFlow) || undefined,
    triggerConditions: sanitizeText(structured.triggerConditions) || undefined,
    regressionRisks: sanitizeText(structured.regressionRisks) || undefined,
    source:
      source === "manual" || source === "inferred" || source === "recorder"
        ? (source as "manual" | "inferred" | "recorder")
        : undefined,
  };
};

export const sanitizeFeedbackSeverity = (value: unknown) =>
  value === "low" || value === "medium" || value === "high" ? value : undefined;

export const sanitizeFeedbackLabels = (value: unknown) => {
  const rawLabels = Array.isArray(value)
    ? value
    : typeof value === "string"
    ? value.split(",")
    : [];
  const seen = new Set<string>();
  const normalized = rawLabels
    .map((entry) => sanitizeText(entry).slice(0, 32))
    .filter((entry) => {
      if (!entry) {
        return false;
      }

      const key = entry.toLowerCase();
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, 12);

  return normalized.length > 0 ? normalized : undefined;
};

const sanitizeDeviceType = (value: unknown) =>
  value === "mobile" ||
  value === "tablet" ||
  value === "foldable" ||
  value === "desktop" ||
  value === "unknown"
    ? (value as FeedbackDeviceType)
    : "unknown";

export const sanitizeTriageStatus = (
  value: unknown
): FeedbackTriageStatus | undefined =>
  FEEDBACK_TRIAGE_STATUSES.includes(value as FeedbackTriageStatus)
    ? (value as FeedbackTriageStatus)
    : undefined;

export const buildFeedbackDoc = ({
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

  const bugReport = sanitizeBugReport(feedback.bugReport);
  const coachFeedback = sanitizeCoachFeedback(feedback.coachFeedback);
  const runtimeContext = sanitizeRuntimeContext(feedback.runtimeContext);
  const structuredRepro =
    sanitizeStructuredRepro(feedback.structuredRepro) ||
    inferStructuredRepro({
      title,
      description,
      page: sanitizeText(feedback.page),
      bugReport,
    });
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
    structuredRepro,
    runtimeContext: {
      ...runtimeContext,
      appVersion: runtimeContext?.appVersion || buildMetadata.appVersion,
      commitSha: runtimeContext?.commitSha || buildMetadata.commitSha,
      environment: runtimeContext?.environment || buildMetadata.environment,
      route:
        runtimeContext?.route ||
        sanitizeText(feedback.page) ||
        bugReport?.currentPath ||
        undefined,
    },
    bugReport,
    coachFeedback,
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
      bugReport,
      coachFeedback,
    }),
    notificationStatus: "pending",
    createdAt: now,
    updatedAt: now,
  };

  return doc;
};
