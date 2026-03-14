import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../../utils/mongodb";

interface ExerciseDoc {
  _id?: ObjectId;
  createdBy?: string | null;
  name: string;
  type?: "weight" | "timed";
  equipment?: string[];
  target?: string;
  bodyPart?: string;
  aliases?: string[];
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
      case "POST": {
        const { exercise } = req.body as { exercise?: ExerciseDoc };

        if (!exercise?.name) {
          return res
            .status(400)
            .json({ message: "`exercise.name` is required" });
        }

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
        }

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

      case "GET": {
        const { createdBy } = req.query;
        const query =
          typeof createdBy === "string" && createdBy.trim()
            ? {
                $or: [{ createdBy: createdBy.trim() }, { createdBy: null }],
              }
            : {};

        const exercises = await exerciseCol.find(query).sort({ name: 1 }).toArray();
        return res.status(200).json({ exercises });
      }

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

      default:
        res.setHeader("Allow", ["GET", "POST", "DELETE"]);
        return res.status(405).json({ message: "Method Not Allowed" });
    }
  } catch (error) {
    console.error("Exercise endpoint error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
