// pages/api/routine.ts
import { NextApiRequest, NextApiResponse } from "next";
import connectToDatabase, { disconnectFromDatabase } from "../../utils/mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    // Handling POST request to save a routine
    const { routine } = req.body;

    console.log("Received routine:", routine);

    try {
      const db = await connectToDatabase();
      const collection = db.collection("routines");

      // Use insertOne for the latest MongoDB driver
      await collection.insertOne(routine);
      await disconnectFromDatabase();

      res.status(201).json({ message: "routine saved successfully!" });
    } catch (error) {
      console.error("MongoDB connection or insertion error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  } else if (req.method === "GET") {
    // Handling GET request to retrieve routines
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    try {
      const db = await connectToDatabase();
      const routines = await db
        .collection("routines")
        .find({
          userId,
        })
        .toArray();

      // Return a success status (200) with an array of exercises
      res.status(200).json({ routines });
      await disconnectFromDatabase();
    } catch (error) {
      console.error("MongoDB connection or query error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  } else if (req.method === "DELETE") {
    const { userId, name } = req.query;

    if (!userId || !name) {
      return res
        .status(400)
        .json({ error: "User ID and the name of the routine is required" });
    }

    try {
      const db = await connectToDatabase();
      const collection = db.collection("routines");

      const result = await collection.deleteOne({
        userId,
        name,
      });

      if (result.deletedCount === 1) {
        // Delete related documents in the 'exercises' collection
        const exercisesCollection = db.collection("exercises");
        await exercisesCollection.deleteMany({ userId });
        return res
          .status(200)
          .json({ message: "Routine deleted successfully" });
      } else {
        return res.status(404).json({ error: "Routine not found" });
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    } finally {
      await disconnectFromDatabase();
    }
  } else {
    // Handling other HTTP methods
    res.status(405).json({ message: "Method Not Allowed" });
  }
}
