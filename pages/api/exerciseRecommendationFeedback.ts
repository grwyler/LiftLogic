import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../../utils/mongodb";
import { ExerciseRecommendationFeedbackDoc } from "../../utils/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const {
    userId,
    exerciseId,
    exerciseName,
    feedback,
    recommendedWeight,
    recommendedReps,
    recommendedSets,
    weightUnit,
    recommendationReason,
    basedOnDate,
  } = req.body as ExerciseRecommendationFeedbackDoc;

  if (!userId || !exerciseId || !feedback) {
    return res.status(400).json({ message: "userId, exerciseId, and feedback are required" });
  }

  try {
    const db = await connectToDatabase();
    const collection = db.collection<ExerciseRecommendationFeedbackDoc>(
      "exerciseRecommendationFeedback"
    );

    await collection.insertOne({
      userId: String(userId),
      exerciseId: String(exerciseId),
      exerciseName: exerciseName ? String(exerciseName) : undefined,
      feedback,
      recommendedWeight: recommendedWeight ?? null,
      recommendedReps: recommendedReps ?? null,
      recommendedSets: recommendedSets ?? null,
      weightUnit,
      recommendationReason: recommendationReason
        ? String(recommendationReason)
        : undefined,
      basedOnDate: basedOnDate ? String(basedOnDate) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return res.status(201).json({ success: true });
  } catch (error) {
    console.error("exerciseRecommendationFeedback error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
