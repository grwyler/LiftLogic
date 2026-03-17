import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../../utils/mongodb";
import { ExerciseRecommendationFeedbackDoc, WorkoutEntryDoc } from "@/utils/types";
import { buildExerciseProgressSummary } from "@/utils/performance";
import { buildNextExerciseRecommendation } from "@/utils/progression";
import {
  hasEntitlement,
  withResolvedUserAccess,
} from "@/utils/entitlements";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { userId, exerciseId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: "userId required" });
  }

  const trimmedExerciseId = String(exerciseId ?? "").trim();
  if (!trimmedExerciseId) {
    return res.status(400).json({ message: "exerciseId required" });
  }

  try {
    const db = await connectToDatabase();
    const col = db.collection<WorkoutEntryDoc>("workoutEntries");
    const userCollection = db.collection("users");
    const recommendationFeedbackCollection = db.collection<ExerciseRecommendationFeedbackDoc>(
      "exerciseRecommendationFeedback"
    );

    const entries = await col
      .find({
        userId,
        exerciseId: trimmedExerciseId,
        skipped: { $ne: true },
      })
      .sort({ date: -1 })
      .toArray();

    const normalizedUserId = Array.isArray(userId) ? userId[0] : userId;
    const user =
      typeof normalizedUserId === "string" && ObjectId.isValid(normalizedUserId)
        ? await userCollection.findOne({
            _id: new ObjectId(normalizedUserId),
          })
        : null;

    const summary = buildExerciseProgressSummary(entries);
    const recommendation = hasEntitlement(
      user as any,
      "progressionRecommendations"
    )
      ? buildNextExerciseRecommendation(
          entries,
          user?.trainingGoal,
          user?.preferredUnits
        )
      : null;
    const latestFeedback = await recommendationFeedbackCollection.findOne(
      {
        userId: String(userId),
        exerciseId: trimmedExerciseId,
      },
      {
        sort: { createdAt: -1 },
      }
    );

    return res.status(200).json({
      summary,
      recommendation,
      entries,
      latestFeedback,
      user: withResolvedUserAccess(user as any),
    });
  } catch (error) {
    console.error("exerciseProgress error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
