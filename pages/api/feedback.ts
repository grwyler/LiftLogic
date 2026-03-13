import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../../utils/mongodb";
import { FeedbackItemDoc } from "../../utils/types";

const sanitizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

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

    return res.status(405).json({ message: "Method Not Allowed" });
  } catch (error) {
    console.error("Feedback API error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
