import nodemailer from "nodemailer";
import { Collection, ObjectId } from "mongodb";
import {
  FeedbackItemDoc,
  FeedbackNotificationStatus,
  FeedbackWorkItemDoc,
} from "./types";
import { buildWorkItemUrl } from "./feedbackWorkflow";
import { ADMIN_EMAIL, sanitizeText } from "./feedbackIntakeService";

export const updateNotificationState = async ({
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

export const buildFeedbackNotificationText = ({
  feedback,
  workItem,
  workItemUrl,
}: {
  feedback: FeedbackItemDoc;
  workItem: FeedbackWorkItemDoc;
  workItemUrl: string;
}) => {
  const workItemId = String(workItem._id || "");
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

  return `${lines.join("\n")}\n\nOpen item: ${workItemUrl}`;
};

export const sendFeedbackEmail = async ({
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

  try {
    await transporter.sendMail({
      from,
      to,
      subject: `[Lift Logic] New ${feedback.type} work item: ${feedback.title}`,
      text: buildFeedbackNotificationText({
        feedback,
        workItem,
        workItemUrl,
      }),
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
