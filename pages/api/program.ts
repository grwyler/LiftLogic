import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../../utils/mongodb";
import {
  buildDefaultRoutine,
  clearUpcomingProgramData,
  saveRoutineDocument,
} from "../../utils/programPersistence";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const { userId } = req.body as { userId?: string };

    if (!userId) {
      return res.status(400).json({ message: "userId required" });
    }

    const db = await connectToDatabase();
    const cleanup = await clearUpcomingProgramData({ db, userId });
    const routine = await saveRoutineDocument({
      db,
      userId,
      routine: buildDefaultRoutine(userId),
    });

    return res.status(200).json({
      message: "Workout program cleared",
      routine,
      cleanup,
    });
  } catch (error) {
    console.error("program reset error:", error);
    return res.status(500).json({ message: "Failed to clear workout program" });
  }
}
