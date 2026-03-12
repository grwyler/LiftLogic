import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../../utils/mongodb";
import { WorkoutEntryDoc } from "@/utils/types";
import { buildExerciseProgressSummary } from "@/utils/performance";

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

    const entries = await col
      .find({
        userId,
        exerciseId: trimmedExerciseId,
        skipped: { $ne: true },
      })
      .sort({ date: -1 })
      .toArray();

    const summary = buildExerciseProgressSummary(entries);

    return res.status(200).json({ summary, entries });
  } catch (error) {
    console.error("exerciseProgress error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
