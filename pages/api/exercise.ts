// pages/api/exercise.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../../utils/mongodb";

/** Shape of a catalog exercise. Extend as needed. */
interface ExerciseDoc {
  _id?: ObjectId;
  /** Who created it (null = global/default exercise). */
  createdBy?: string;
  name: string;
  category?: string;
  muscleGroup?: string;
  videoUrl?: string;
  description?: string;
  suggestedScheme?: { sets: number; reps: number };
  createdAt?: Date;
  updatedAt?: Date;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const db = await connectToDatabase();
  const exerciseCol = db.collection<ExerciseDoc>("exercises");

  try {
    switch (req.method) {
      /* ------------------------------------------------------------------ */
      /* POST  – Create **or** update a catalog exercise                    */
      /* ------------------------------------------------------------------ */
      case "POST": {
        const { exercise } = req.body as { exercise?: ExerciseDoc };
        if (!exercise || !exercise.name) {
          return res
            .status(400)
            .json({ message: "`exercise.name` is required" });
        }

        // If _id exists → update ; otherwise insert
        if (exercise._id) {
          await exerciseCol.updateOne(
            { _id: new ObjectId(exercise._id) },
            {
              $set: { ...exercise, updatedAt: new Date() },
              $setOnInsert: { createdAt: new Date() },
            },
            { upsert: true }
          );
          return res.status(200).json({ message: "Exercise updated" });
        } else {
          const doc: ExerciseDoc = {
            ...exercise,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          const { insertedId } = await exerciseCol.insertOne(doc);
          return res
            .status(201)
            .json({ message: "Exercise created", id: insertedId });
        }
      }

      /* ------------------------------------------------------------------ */
      /* GET  – List catalog exercises (optionally filtered)                */
      /* ------------------------------------------------------------------ */
      case "GET": {
        const { userId, date, routineName } = req.query;
        if (!userId || !date) {
          console.warn("[GET] Missing userId or date");
          return res.status(400).json({ message: "userId & date required" });
        }

        /* unified parser – same logic as POST */
        const raw = date as string;
        const thisYear = new Date().getFullYear();
        const safe = /^\d{4}-\d{2}-\d{2}/.test(raw) // already ISO?
          ? raw // "2025-07-15"
          : `${raw.trim()} ${thisYear}`; // "Tuesday, July 15 2025"

        const day = new Date(safe);
        if (isNaN(+day)) {
          console.warn("[GET] Bad date", raw);
          return res.status(400).json({ message: "Bad date format" });
        }

        const start = new Date(day.setHours(0, 0, 0, 0));
        const end = new Date(day.setHours(23, 59, 59, 999));

        const query: any = { userId, date: { $gte: start, $lte: end } };
        if (routineName) query.routineName = routineName;

        console.debug("[GET] Mongo query:", query);

        const entries = await col.find(query).toArray();
        console.info(`[GET] Returned ${entries.length} entries`);
        return res.status(200).json({ entries });
      }
      /* ------------------------------------------------------------------ */
      /* DELETE – Remove a catalog exercise                                 */
      /* ------------------------------------------------------------------ */
      case "DELETE": {
        const { exerciseId } = req.body as { exerciseId?: string };
        if (!exerciseId) {
          return res.status(400).json({ message: "`exerciseId` is required" });
        }

        const result = await exerciseCol.deleteOne({
          _id: new ObjectId(exerciseId),
        });
        if (result.deletedCount) {
          return res.status(200).json({ message: "Exercise deleted" });
        }
        return res.status(404).json({ message: "Exercise not found" });
      }

      /* ------------------------------------------------------------------ */
      /* Anything else                                                      */
      /* ------------------------------------------------------------------ */
      default:
        res.setHeader("Allow", ["GET", "POST", "DELETE"]);
        return res.status(405).json({ message: "Method Not Allowed" });
    }
  } catch (err) {
    console.error("Exercise endpoint error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
