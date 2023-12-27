// pages/api/getWorkout.ts
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

    // Ensure date is a string
    const dateString = Array.isArray(date) ? date[0] : date;

    try {
      const db = await connectToDatabase();
      const collection = db.collection("userInputs");

      const userInput = await collection.findOne({
        userId: userId,
        date: new Date(dateString),
      });
      await disconnectFromDatabase();
      if (userInput) {
        res.status(200).json({ userInput });
      } else {
        // Return a success status (200) with an empty response when user input is not found
        res.status(200).json({});
      }
    } catch (error) {
      console.error("MongoDB connection or query error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  } else {
    res.status(405).json({ message: "Method Not Allowed" });
  }
}
