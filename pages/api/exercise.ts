// pages/api/exercise.ts
import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase, disconnectFromDatabase } from "../../utils/mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { exercise } = req.body;
    const db = await connectToDatabase();
    const exerciseCollection = db.collection("exercises");
    const { userId, date } = req.query;
    if (req.method === "POST") {
      // Handling POST request to save an exercise

      // Use insertOne for the latest MongoDB driver
      await exerciseCollection.insertOne(exercise);

      return res.status(201).json({ message: "Exercise saved successfully!" });
    } else if (req.method === "GET") {
      // Handling GET request to retrieve exercises

      if (!userId || !date) {
        return res.status(400).json({ message: "User ID, date are required" });
      }

      const exercises = await exerciseCollection
        .find({
          userId,
          date,
        })
        .toArray();

      return res.status(200).json({ exercises });
    } else {
      // Handling other HTTP methods
      return res.status(405).json({ message: "Method Not Allowed" });
    }
  } catch (error) {
    console.error("MongoDB connection or query error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  } finally {
    await disconnectFromDatabase();
  }
}
