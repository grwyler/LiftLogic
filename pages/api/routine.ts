// pages/api/routine.ts
import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase, disconnectFromDatabase } from "../../utils/mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const db = await connectToDatabase();
    if (!db) {
      console.error("Database connection failed.");
      return res.status(500).json({ message: "Database connection failed." });
    }
    const routineCollection = db.collection("routines");
    const exerciseCollection = db.collection("exercises");
    const { routine } = req.body;
    const userId = routine?._id || req.query?.userId;
    if (req.method === "POST") {
      // Handling POST request to save a routine

      const existingRoutine = await routineCollection.findOne({
        userId,
      });

      delete routine._id;

      if (existingRoutine) {
        // Update existing routine
        await routineCollection.updateOne({ userId }, { $set: routine });
      } else {
        // Insert new routine
        try {
          await routineCollection.insertOne(routine);
        } catch (error) {
          console.error("Failed to instert Routine: ", error);
        }
      }

      return res.status(201).json({ message: "routine saved successfully!" });
    } else if (req.method === "GET") {
      // Handling GET request to retrieve routines

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const routines = await routineCollection
        .find({
          userId,
        })
        .toArray();

      // Return a success status (200) with an array of exercises
      return res.status(200).json({ routines });
    } else if (req.method === "DELETE") {
      const { userId, name } = req.query;

      if (!userId || !name) {
        return res
          .status(400)
          .json({ error: "User ID and the name of the routine is required" });
      }

      const result = await routineCollection.deleteOne({
        userId,
        name,
      });

      if (result.deletedCount === 1) {
        // Delete related documents in the 'exercises' collection

        await exerciseCollection.deleteMany({ userId });
        return res
          .status(200)
          .json({ message: "Routine deleted successfully" });
      } else {
        return res.status(404).json({ error: "Routine not found" });
      }
    } else {
      // Handling other HTTP methods
      return res.status(405).json({ message: "Method Not Allowed" });
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
