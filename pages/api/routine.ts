// pages/api/routine.ts
import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../../utils/mongodb";

const buildDefaultRoutine = (userId: string) => ({
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
});

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
    const rawUserId = routine?.userId || req.query?.userId;
    const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;

    if (req.method === "POST") {
      if (!routine || !userId) {
        return res.status(400).json({ message: "Routine and userId are required" });
      }

      const existingRoutine = await routineCollection.findOne({ userId });
      const { _id, ...routineWithoutId } = routine;
      const nextRoutine = {
        ...buildDefaultRoutine(userId),
        ...routineWithoutId,
        userId,
        days: routineWithoutId.days ?? buildDefaultRoutine(userId).days,
      };

      if (existingRoutine) {
        await routineCollection.updateOne(
          { userId },
          {
            $set: {
              ...nextRoutine,
              updatedAt: new Date(),
            },
          }
        );
        return res
          .status(200)
          .json({ message: "Routine updated successfully!" });
      }

      try {
        await routineCollection.insertOne({
          ...nextRoutine,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        return res.status(201).json({ message: "Routine saved successfully!" });
      } catch (error) {
        console.error("Failed to insert routine: ", error);
        return res.status(500).json({ error: "Failed to insert routine." });
      }
    } else if (req.method === "GET") {
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      let routine = await routineCollection.findOne({ userId });
      if (!routine) {
        try {
          const defaultRoutine = buildDefaultRoutine(userId);

          await routineCollection.insertOne({
            ...defaultRoutine,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          routine = await routineCollection.findOne({ userId });
        } catch (error) {
          console.error("Failed to insert routine: ", error);
          return res.status(500).json({ error: "Failed to insert routine." });
        }
      }

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
        await exerciseCollection.deleteMany({ userId });
        return res
          .status(200)
          .json({ message: "Routine deleted successfully" });
      } else {
        return res.status(404).json({ error: "Routine not found" });
      }
    } else {
      return res.status(405).json({ message: "Method Not Allowed" });
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
