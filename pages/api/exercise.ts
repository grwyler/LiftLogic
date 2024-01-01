// pages/api/exercise.ts
import { NextApiRequest, NextApiResponse } from "next";
import connectToDatabase, { disconnectFromDatabase } from "../../utils/mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    // Handling POST request to save an exercise
    const { exercise } = req.body;

    console.log("Received exercise:", exercise);

    try {
      const db = await connectToDatabase();
      const collection = db.collection("exercises");

      // Use insertOne for the latest MongoDB driver
      await collection.insertOne(exercise);
      await disconnectFromDatabase();

      res.status(201).json({ message: "Exercise saved successfully!" });
    } catch (error) {
      console.error("MongoDB connection or insertion error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  } else if (req.method === "GET") {
    // Handling GET request to retrieve exercises
    const { userId, date, routineName } = req.query;

    if (!userId || !date || !routineName) {
      return res
        .status(400)
        .json({ message: "User ID, date, routineName are required" });
    }

    try {
      const db = await connectToDatabase();
      const exercises = await db
        .collection("exercises")
        .find({
          userId,
          date,
          routineName,
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
    // Handling other HTTP methods
    res.status(405).json({ message: "Method Not Allowed" });
  }
}
