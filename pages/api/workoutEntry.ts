import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../../utils/mongodb";
import { ObjectId } from "mongodb";
import { ExerciseSet, WorkoutEntryDoc } from "@/utils/types";

const normalizeOptionalNumber = (value: unknown) => {
  if (value === "") {
    return undefined;
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "number") {
    return Number.isNaN(value) ? undefined : value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? value : parsed;
  }

  return value;
};

const normalizeOptionalDate = (value: unknown) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  if (value instanceof Date) {
    return Number.isNaN(+value) ? undefined : value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(+parsed) ? value : parsed;
  }

  return value;
};

const normalizeWorkoutEntrySets = (
  sets: WorkoutEntryDoc["sets"]
): ExerciseSet[] | undefined => {
  if (!Array.isArray(sets)) {
    return sets;
  }

  return sets.map((set) => {
    const normalizedSet: ExerciseSet = {
      ...set,
      reps: normalizeOptionalNumber(set?.reps) as number | undefined,
      percentage: normalizeOptionalNumber(set?.percentage) as
        | number
        | undefined,
      weight: normalizeOptionalNumber(set?.weight) as number | undefined,
      actualReps: normalizeOptionalNumber(set?.actualReps) as
        | number
        | string
        | undefined,
      actualWeight: normalizeOptionalNumber(set?.actualWeight) as
        | number
        | string
        | undefined,
      seconds: normalizeOptionalNumber(set?.seconds) as number | undefined,
      actualSeconds: normalizeOptionalNumber((set as any)?.actualSeconds) as
        | number
        | string
        | undefined,
      minutes: normalizeOptionalNumber(set?.minutes) as number | undefined,
      actualMinutes: normalizeOptionalNumber((set as any)?.actualMinutes) as
        | number
        | string
        | undefined,
      hours: normalizeOptionalNumber(set?.hours) as number | undefined,
      actualHours: normalizeOptionalNumber((set as any)?.actualHours) as
        | number
        | string
        | undefined,
      totalSeconds: normalizeOptionalNumber((set as any)?.totalSeconds) as
        | number
        | string
        | undefined,
      completedDate: normalizeOptionalDate((set as any)?.completedDate) as
        | Date
        | string
        | undefined,
    };

    return normalizedSet;
  });
};

const parseWorkoutEntryDate = (rawDate: unknown) => {
  if (rawDate instanceof Date) {
    return rawDate;
  }

  if (typeof rawDate !== "string") {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    const [year, month, day] = rawDate.split("-").map(Number);
    const isoDate = new Date(year, month - 1, day);
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

      const normalizedSets = normalizeWorkoutEntrySets(cleanEntry.sets);
      const shouldUnsetRuleId =
        Object.prototype.hasOwnProperty.call(cleanEntry, "ruleId") &&
        (cleanEntry as any).ruleId == null;

      const {
        ruleId: incomingRuleId,
        ...settableEntry
      } = cleanEntry as WorkoutEntryDoc & { ruleId?: string | null };

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
            ...settableEntry,
            ...(shouldUnsetRuleId ? {} : { ruleId: incomingRuleId }),
            sets: normalizedSets,
            exerciseId,
            date: parsedDate,
            updatedAt: new Date(),
          },
          ...(shouldUnsetRuleId ? { $unset: { ruleId: "" } } : {}),
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );

      const mode = result.upsertedCount ? "Inserted" : "Updated";
      const docId = result.upsertedId ?? "(existing)";
      console.info(`[POST] ${mode} - id: ${docId}`);

      return res
        .status(result.upsertedCount ? 201 : 200)
        .json({ message: "Workout entry saved", entryId: docId });
    }

    if (req.method === "GET") {
      const {
        userId,
        date,
        routineName,
        exerciseId,
        history,
        completedOnly,
        monthStart,
        monthEnd,
      } =
        req.query;
      console.debug("[GET] Query params:", req.query);

      if (!userId) {
        console.warn("[GET] Missing userId");
        return res.status(400).json({ message: "userId required" });
      }

      if (history === "true") {
        const trimmedExerciseId = String(exerciseId ?? "").trim();

        if (!trimmedExerciseId) {
          console.warn("[GET] Missing exerciseId for history query");
          return res.status(400).json({ message: "exerciseId required" });
        }

        const historyQuery: Record<string, unknown> = {
          userId,
          exerciseId: trimmedExerciseId,
          skipped: { $ne: true },
        };

        if (completedOnly === "true") {
          historyQuery.complete = true;
        }

        console.debug("[GET] History Mongo query:", historyQuery);

        const entries = await col.find(historyQuery).sort({ date: -1 }).toArray();
        console.info(`[GET] Returned ${entries.length} history entries`);
        return res.status(200).json({ entries });
      }

      if (monthStart || monthEnd) {
        const parsedStart = parseWorkoutEntryDate(monthStart);
        const parsedEnd = parseWorkoutEntryDate(monthEnd);

        if (!parsedStart || !parsedEnd) {
          console.warn("[GET] Bad month range", { monthStart, monthEnd });
          return res.status(400).json({ message: "Bad month range" });
        }

        const start = new Date(parsedStart);
        start.setHours(0, 0, 0, 0);
        const end = new Date(parsedEnd);
        end.setHours(23, 59, 59, 999);

        const rangeQuery: Record<string, unknown> = {
          userId,
          date: { $gte: start, $lte: end },
          skipped: { $ne: true },
        };

        if (routineName) {
          rangeQuery.routineName = routineName;
        }

        console.debug("[GET] Month Mongo query:", rangeQuery);

        const entries = await col.find(rangeQuery).sort({ date: -1 }).toArray();
        console.info(`[GET] Returned ${entries.length} month entries`);
        return res.status(200).json({ entries });
      }

      if (!date) {
        console.warn("[GET] Missing date");
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
