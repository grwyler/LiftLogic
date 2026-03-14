import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../../utils/mongodb";
import { FeedbackItemDoc } from "../../utils/types";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import nodemailer from "nodemailer";

const sanitizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const ADMIN_USERNAME = "grwyler";
const ADMIN_EMAIL = "grwyler@gmail.com";

const isAdminSession = (session: any) => {
  const username = sanitizeText(
    session?.user?.username || session?.token?.user?.username
  ).toLowerCase();
  const email = sanitizeText(
    session?.user?.email || session?.token?.user?.email
  ).toLowerCase();

  return username === ADMIN_USERNAME || email === ADMIN_EMAIL;
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

const sendFeedbackEmail = async (feedback: FeedbackItemDoc) => {
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

  if (!host || !user || !pass) {
    return;
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

  const lines = [
    `Title: ${feedback.title}`,
    `Type: ${feedback.type}`,
    `Reporter: ${feedback.username || feedback.email || feedback.userId}`,
    `Severity: ${feedback.severity || "unknown"}`,
    `Page: ${feedback.page || "unknown"}`,
    `Created: ${feedback.createdAt ? new Date(feedback.createdAt).toLocaleString() : "Unknown"}`,
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

  const bugsUrl = `${appUrl.replace(/\/$/, "")}/bugs`;

  await transporter.sendMail({
    from,
    to,
    subject: `[Lift Logic] New ${feedback.type} report: ${feedback.title}`,
    text: `${lines.join("\n")}\n\nReview inbox: ${bugsUrl}`,
  });
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);
    const db = await connectToDatabase();
    const feedbackCollection = db.collection<FeedbackItemDoc>("feedback");

    if (req.method === "GET") {
      const { userId } = req.query;
      const normalizedUserId = Array.isArray(userId) ? userId[0] : userId;
      const requesterId = sanitizeText(
        (session as any)?.user?._id || (session as any)?.token?.user?._id
      );
      const admin = isAdminSession(session);

      if (!session) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!normalizedUserId && !admin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      if (
        normalizedUserId &&
        !admin &&
        normalizedUserId !== requesterId
      ) {
        return res.status(403).json({ message: "Forbidden" });
      }

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
        coachFeedback: sanitizeCoachFeedback(feedback.coachFeedback),
        createdAt: now,
        updatedAt: now,
      };

      const result = await feedbackCollection.insertOne(doc);

      try {
        await sendFeedbackEmail({
          ...doc,
          _id: result.insertedId,
        });
      } catch (emailError) {
        console.error("Feedback email notification error:", emailError);
      }

      return res.status(200).json({
        success: true,
        feedback: {
          ...doc,
          _id: result.insertedId,
        },
      });
    }

    if (req.method === "DELETE") {
      if (!session || !isAdminSession(session)) {
        return res.status(403).json({ message: "Forbidden" });
      }

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
