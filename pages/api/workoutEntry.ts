import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../../utils/mongodb";
import { ObjectId } from "mongodb";
import { WorkoutEntryDoc } from "@/utils/types";

const parseWorkoutEntryDate = (rawDate: unknown) => {
  if (rawDate instanceof Date) {
    return rawDate;
  }

  if (typeof rawDate !== "string") {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
    const isoDate = new Date(rawDate);
    return isNaN(+isoDate) ? null : isoDate;
  }

  const parsed = new Date(rawDate);
  if (!isNaN(+parsed)) {
    return parsed;
  }

  const thisYear = new Date().getFullYear();
  const fallback = new Date(`${rawDate.trim()} ${thisYear}`);
  return isNaN(+fallback) ? null : fallback;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.info(`[workoutEntry] ${req.method} ${req.url}`);

  const db = await connectToDatabase();
  const col = db.collection<WorkoutEntryDoc>("workoutEntries");

  try {
    if (req.method === "POST") {
      const { entry } = req.body as { entry?: WorkoutEntryDoc };
      console.debug("[POST] Payload:", entry);

      if (!entry?.routineName) {
        console.warn("[POST] routineName missing");
        return res.status(400).json({ message: "routineName required" });
      }

      if (!entry?.userId) {
        console.warn("[POST] userId missing");
        return res.status(400).json({ message: "userId required" });
      }

      const exerciseId = String(entry.exerciseId ?? "").trim();
      if (!exerciseId) {
        console.warn("[POST] Missing exerciseId");
        return res.status(400).json({ message: "exerciseId required" });
      }

      const parsedDate = parseWorkoutEntryDate(entry.date);
      if (!parsedDate) {
        console.warn("[POST] Unparseable date", entry.date);
        return res.status(400).json({ message: "Bad date format" });
      }

      const {
        _id: _discardId,
        createdAt: _discardCreatedAt,
        updatedAt: _discardUpdatedAt,
        date: _discardDate,
        exerciseId: _discardExerciseId,
        ...cleanEntry
      } = entry;

      const filter = {
        userId: entry.userId,
        exerciseId,
        date: parsedDate,
        routineName: entry.routineName,
      };

      const result = await col.updateOne(
        filter,
        {
          $set: {
            ...cleanEntry,
            exerciseId,
            date: parsedDate,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );

      const mode = result.upsertedCount ? "Inserted" : "Updated";
      const docId = result.upsertedId?._id ?? "(existing)";
      console.info(`[POST] ${mode} - id: ${docId}`);

      return res
        .status(result.upsertedCount ? 201 : 200)
        .json({ message: "Workout entry saved", entryId: docId });
    }

    if (req.method === "GET") {
      const { userId, date, routineName } = req.query;
      console.debug("[GET] Query params:", req.query);

      if (!userId || !date) {
        console.warn("[GET] Missing userId or date");
        return res.status(400).json({ message: "userId & date required" });
      }

      const parsedDate = parseWorkoutEntryDate(date);
      if (!parsedDate) {
        console.warn("[GET] Bad date format:", date);
        return res.status(400).json({ message: "Bad date format" });
      }

      const start = new Date(parsedDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(parsedDate);
      end.setHours(23, 59, 59, 999);

      const query: Record<string, unknown> = {
        userId,
        date: { $gte: start, $lte: end },
      };

      if (routineName) {
        query.routineName = routineName;
      }

      console.debug("[GET] Mongo query:", query);

      const entries = await col.find(query).toArray();
      console.info(`[GET] Returned ${entries.length} entries`);
      return res.status(200).json({ entries });
    }

    if (req.method === "DELETE") {
      const { entryId } = req.body as { entryId?: string };
      console.debug("[DELETE] entryId:", entryId);

      if (!entryId) {
        console.warn("[DELETE] entryId missing");
        return res.status(400).json({ message: "`entryId` required" });
      }

      let objId: ObjectId;
      try {
        objId = new ObjectId(entryId);
      } catch {
        console.warn("[DELETE] Bad entryId");
        return res.status(400).json({ message: "Bad entryId" });
      }

      const { deletedCount } = await col.deleteOne({ _id: objId });
      console.info(
        `[DELETE] ${deletedCount ? "Deleted" : "Not found"} - id: ${entryId}`
      );
      return res
        .status(deletedCount ? 200 : 404)
        .json({ message: deletedCount ? "Deleted" : "Not found" });
    }

    res.setHeader("Allow", ["GET", "POST", "DELETE"]);
    console.warn("[405] Method Not Allowed");
    return res.status(405).end();
  } catch (e) {
    console.error("[500] workoutEntry error:", e);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
