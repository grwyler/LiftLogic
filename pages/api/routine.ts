// pages/api/routine.ts
import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../../utils/mongodb";

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
    const defaultRoutine = {
      userId,
      days: {
        sunday: [{ title: "Sunday Workout", exercises: [] }],
        monday: [{ title: "Monday Workout", exercises: [] }],
        tuesday: [{ title: "Tuesday Workout", exercises: [] }],
        wednesday: [{ title: "Wednesday Workout", exercises: [] }],
        thursday: [{ title: "Thursday Workout", exercises: [] }],
        friday: [{ title: "Friday Workout", exercises: [] }],
        saturday: [{ title: "Saturday Workout", exercises: [] }],
      },
    };
    if (req.method === "POST") {
      // Handling POST request to save a routine

      // const existingRoutine = await routineCollection.findOne({
      //   userId,
      // });

      // delete routine._id;

      // if (existingRoutine) {
      //   // Update existing routine
      //   await routineCollection.updateOne({ userId }, { $set: routine });
      // } else {
      //   // Insert new routine
      //   try {
      //     await routineCollection.insertOne(routine);
      //   } catch (error) {
      //     console.error("Failed to instert Routine: ", error);
      //   }
      // }

      // return res.status(201).json({ message: "routine saved successfully!" });

      const existingRoutine = await routineCollection.findOne({ userId });

      // If you only allow one routine per user, remove `_id` so that
      // an "update" doesn't conflict with an existing ObjectId
      delete routine._id;

      if (existingRoutine) {
        // Update the existing routine for the user
        await routineCollection.updateOne({ userId }, { $set: routine });
        return res
          .status(201)
          .json({ message: "Routine updated successfully!" });
      } else {
        // Insert the default routine if none exists yet
        try {
          await routineCollection.insertOne(defaultRoutine);
          return res
            .status(201)
            .json({ message: "New default routine created!" });
        } catch (error) {
          console.error("Failed to insert routine: ", error);
          return res.status(500).json({ error: "Failed to insert routine." });
        }
      }
    } else if (req.method === "GET") {
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      let routine = await routineCollection.findOne({ userId });
      if (!routine) {
        try {
          const defaultRoutine = {
            userId,
            days: {
              sunday: [{ title: "Sunday Workout", exercises: [] }],
              monday: [{ title: "Monday Workout", exercises: [] }],
              tuesday: [{ title: "Tuesday Workout", exercises: [] }],
              wednesday: [{ title: "Wednesday Workout", exercises: [] }],
              thursday: [{ title: "Thursday Workout", exercises: [] }],
              friday: [{ title: "Friday Workout", exercises: [] }],
              saturday: [{ title: "Saturday Workout", exercises: [] }],
            },
          };

          // Insert default routine and re-fetch it to include _id
          await routineCollection.insertOne(defaultRoutine);
          routine = await routineCollection.findOne({ userId });
        } catch (error) {
          console.error("Failed to insert routine: ", error);
          return res.status(500).json({ error: "Failed to insert routine." });
        }
      }

      // Return the routine
      return res.status(200).json({ routine });
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
