// pages/api/getExercises.ts
import { NextApiRequest, NextApiResponse } from "next";
import connectToDatabase, { disconnectFromDatabase } from "../../utils/mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    const { userId, date } = req.query;

    if (!userId || !date) {
      return res.status(400).json({ message: "User ID and date are required" });
    }

    try {
      const db = await connectToDatabase();
      const exercises = await db
        .collection("exercises")
        .find({
          userId,
          date,
        })
        .toArray();

      // Return a success status (200) with an array of exercises
      await disconnectFromDatabase();
      res.status(200).json({ exercises });
    } catch (error) {
      console.error("MongoDB connection or query error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  } else {
    res.status(405).json({ message: "Method Not Allowed" });
  }
}
