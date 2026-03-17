import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../../utils/mongodb";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { ExerciseSet, WorkoutEntryAuditDoc, WorkoutEntryDoc } from "@/utils/types";
import { applyWorkoutMilestones, normalizeBetaFunnel } from "../../utils/betaFunnel";
import { ensureExerciseSetIds } from "../../utils/exerciseSetIds";
import { validateWorkoutEntry } from "../../utils/workoutValidation";
import { DEFAULT_WEIGHT_UNIT, normalizeWeightUnit, normalizeWorkoutEntryWeights } from "../../utils/weightUnits";
import { randomUUID } from "crypto";

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
  sets: WorkoutEntryDoc["sets"],
  weightUnit = DEFAULT_WEIGHT_UNIT
): ExerciseSet[] | undefined => {
  if (!Array.isArray(sets)) {
    return sets;
  }

  return ensureExerciseSetIds(sets).map((set) => {
    const normalizedSet = normalizeWorkoutEntryWeights(
      {
        userId: "",
        exerciseId: "",
        routineName: "",
        date: new Date(),
        weightUnit,
        sets: [set],
      } as WorkoutEntryDoc,
      weightUnit
    ).sets?.[0];
    return {
      ...(normalizedSet ?? set),
      ...set,
      weightUnit: normalizedSet?.weightUnit ?? normalizeWeightUnit((set as any)?.weightUnit ?? weightUnit),
      actualWeightUnit: normalizedSet?.actualWeightUnit,
      weightInLb: normalizedSet?.weightInLb,
      actualWeightInLb: normalizedSet?.actualWeightInLb,
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
    } as ExerciseSet;
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

const getStringId = (value: unknown) => String(value ?? "").trim();

const toComparableTimestamp = (value: unknown) => {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value as string | number | Date).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildRecurringEntryInstanceId = (
  ruleId: string,
  parsedDate: Date,
  routineName: string
) => {
  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");
  return `recurring-entry::${ruleId}::${year}-${month}-${day}::${routineName}`;
};

const isHistoricalMutationDate = (value: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(value);
  target.setHours(0, 0, 0, 0);
  return target.getTime() < today.getTime();
};

const sanitizeEntryForAudit = (
  entry?: WorkoutEntryDoc | null
): Partial<WorkoutEntryDoc> | null => {
  if (!entry) {
    return null;
  }

  return {
    _id: entry._id,
    entryInstanceId: entry.entryInstanceId,
    userId: entry.userId,
    exerciseId: entry.exerciseId,
    routineName: entry.routineName,
    date: entry.date,
    complete: entry.complete,
    skipped: entry.skipped,
    ruleId: entry.ruleId,
    sets: entry.sets,
    updatedAt: entry.updatedAt,
    createdAt: entry.createdAt,
  };
};

const recomputeWorkoutDerivedState = async ({
  db,
  col,
  userId,
}: {
  db: any;
  col: any;
  userId: string;
}) => {
  if (!ObjectId.isValid(userId)) {
    return;
  }

  const users = db.collection("users");
  const [user, completedEntries] = await Promise.all([
    users.findOne(
      { _id: new ObjectId(userId) },
      { projection: { createdAt: 1, betaFunnel: 1 } }
    ),
    col
      .find(
        {
          userId,
          complete: true,
          skipped: { $ne: true },
        },
        { projection: { date: 1 } }
      )
      .sort({ date: 1 })
      .toArray(),
  ]);

  if (!user) {
    return;
  }

  const normalizedFunnel = normalizeBetaFunnel(user.betaFunnel);
  const nextBetaFunnel = applyWorkoutMilestones({
    funnel: {
      landingCtaAt: normalizedFunnel.landingCtaAt,
      signupCompletedAt: normalizedFunnel.signupCompletedAt,
      setupCompletedAt: normalizedFunnel.setupCompletedAt,
    },
    signupCompletedAt:
      normalizedFunnel.signupCompletedAt ?? user.createdAt ?? null,
    workoutDates: completedEntries.map((completedEntry) => completedEntry.date),
  });

  await users.updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        betaFunnel: nextBetaFunnel,
        updatedAt: new Date(),
      },
    }
  );
};

const writeWorkoutEntryAudit = async ({
  db,
  actor,
  action,
  previousEntry,
  nextEntry,
}: {
  db: any;
  actor: { userId?: string; username?: string; email?: string };
  action: WorkoutEntryAuditDoc["action"];
  previousEntry?: WorkoutEntryDoc | null;
  nextEntry?: WorkoutEntryDoc | null;
}) => {
  const referenceEntry = nextEntry ?? previousEntry;
  if (!referenceEntry?.userId) {
    return;
  }

  const changedDate =
    nextEntry?.date instanceof Date
      ? nextEntry.date
      : previousEntry?.date instanceof Date
      ? previousEntry.date
      : parseWorkoutEntryDate(nextEntry?.date ?? previousEntry?.date ?? "");

  await db.collection("workoutEntryAudits").insertOne({
    workoutEntryId:
      nextEntry?._id ??
      previousEntry?._id?.toString?.() ??
      previousEntry?._id,
    entryInstanceId:
      nextEntry?.entryInstanceId ?? previousEntry?.entryInstanceId,
    userId: referenceEntry.userId,
    actorUserId: actor.userId,
    actorUsername: actor.username,
    actorEmail: actor.email,
    action,
    routineName: referenceEntry.routineName,
    exerciseId: referenceEntry.exerciseId,
    changedAt: new Date(),
    isHistoricalMutation: changedDate ? isHistoricalMutationDate(changedDate) : false,
    previousEntry: sanitizeEntryForAudit(previousEntry),
    nextEntry: sanitizeEntryForAudit(nextEntry),
  });
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.info(`[workoutEntry] ${req.method} ${req.url}`);

  const db = await connectToDatabase();
  const col = db.collection<WorkoutEntryDoc>("workoutEntries");
  const session = await getServerSession(req, res, authOptions);
  const actor = {
    userId:
      (session as any)?.token?.user?._id ??
      (session as any)?.user?._id ??
      undefined,
    username:
      (session as any)?.token?.user?.username ??
      (session as any)?.user?.username ??
      undefined,
    email:
      (session as any)?.token?.user?.email ??
      (session as any)?.user?.email ??
      undefined,
  };

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

      const userDoc =
        ObjectId.isValid(entry.userId)
          ? await db
              .collection("users")
              .findOne(
                { _id: new ObjectId(entry.userId) },
                { projection: { preferredUnits: 1 } }
              )
          : null;
      const entryWeightUnit = normalizeWeightUnit(
        entry.weightUnit ?? userDoc?.preferredUnits ?? DEFAULT_WEIGHT_UNIT
      );

      const parsedDate = parseWorkoutEntryDate(entry.date);
      if (!parsedDate) {
        console.warn("[POST] Unparseable date", entry.date);
        return res.status(400).json({ message: "Bad date format" });
      }

      const rawEntryId = getStringId(entry._id);
      const rawRuleId = getStringId((entry as WorkoutEntryDoc & { ruleId?: string | null }).ruleId);
      const requestIdempotencyKey = getStringId(
        (entry as WorkoutEntryDoc & { requestIdempotencyKey?: string }).requestIdempotencyKey
      );
      const lastKnownUpdatedAt = (entry as WorkoutEntryDoc & {
        lastKnownUpdatedAt?: Date | string;
      }).lastKnownUpdatedAt;
      const resolvedEntryInstanceId =
        getStringId(entry.entryInstanceId) ||
        (rawEntryId && !ObjectId.isValid(rawEntryId) ? rawEntryId : "") ||
        (rawRuleId
          ? buildRecurringEntryInstanceId(rawRuleId, parsedDate, entry.routineName)
          : randomUUID());

      const {
        _id: _discardId,
        createdAt: _discardCreatedAt,
        updatedAt: _discardUpdatedAt,
        date: _discardDate,
        exerciseId: _discardExerciseId,
        entryInstanceId: _discardEntryInstanceId,
        ...cleanEntry
      } = entry;

      const normalizedSets = normalizeWorkoutEntrySets(cleanEntry.sets, entryWeightUnit);
      const normalizedEntryForValidation = {
        ...entry,
        date: parsedDate,
        exerciseId,
        weightUnit: entryWeightUnit,
        sets: normalizedSets,
      } as WorkoutEntryDoc;
      const validationErrors = validateWorkoutEntry(normalizedEntryForValidation);
      if (validationErrors.length > 0) {
        console.warn("[POST] Validation failed", validationErrors);
        return res.status(400).json({
          message: validationErrors[0],
          errors: validationErrors,
        });
      }
      const shouldUnsetRuleId =
        Object.prototype.hasOwnProperty.call(cleanEntry, "ruleId") &&
        (cleanEntry as any).ruleId == null;

      const {
        ruleId: incomingRuleId,
        ...settableEntry
      } = cleanEntry as WorkoutEntryDoc & { ruleId?: string | null };

      const filter = ObjectId.isValid(rawEntryId)
        ? { _id: new ObjectId(rawEntryId) }
        : {
            userId: entry.userId,
            entryInstanceId: resolvedEntryInstanceId,
          };
      const existingEntry = await col.findOne(filter);

      if (
        existingEntry &&
        requestIdempotencyKey &&
        requestIdempotencyKey === existingEntry.lastRequestIdempotencyKey
      ) {
        return res.status(200).json({
          message: "Workout entry already saved",
          entryId: String(existingEntry._id ?? rawEntryId ?? ""),
          entryInstanceId: existingEntry.entryInstanceId ?? resolvedEntryInstanceId,
          updatedAt: existingEntry.updatedAt,
          deduped: true,
        });
      }

      if (
        existingEntry &&
        lastKnownUpdatedAt &&
        toComparableTimestamp(existingEntry.updatedAt) >
          toComparableTimestamp(lastKnownUpdatedAt)
      ) {
        return res.status(409).json({
          message: "Workout entry has newer server changes",
          entryId: String(existingEntry._id ?? rawEntryId ?? ""),
          entryInstanceId: existingEntry.entryInstanceId ?? resolvedEntryInstanceId,
          updatedAt: existingEntry.updatedAt,
          conflict: true,
        });
      }

      const result = await col.updateOne(
        filter,
        {
          $set: {
            ...settableEntry,
            ...(shouldUnsetRuleId ? {} : { ruleId: incomingRuleId }),
            weightUnit: entryWeightUnit,
            sets: normalizedSets,
            entryInstanceId: resolvedEntryInstanceId,
            lastRequestIdempotencyKey: requestIdempotencyKey || undefined,
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
      const savedEntry = await col.findOne(filter);
      await recomputeWorkoutDerivedState({
        db,
        col,
        userId: entry.userId,
      });
      await writeWorkoutEntryAudit({
        db,
        actor,
        action: existingEntry ? "update" : "create",
        previousEntry: existingEntry,
        nextEntry: savedEntry,
      });

      return res
        .status(result.upsertedCount ? 201 : 200)
        .json({
          message: "Workout entry saved",
          entryId: String(savedEntry?._id ?? result.upsertedId ?? rawEntryId ?? ""),
          entryInstanceId: savedEntry?.entryInstanceId ?? resolvedEntryInstanceId,
          updatedAt: savedEntry?.updatedAt,
        });
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

      const existingEntry = await col.findOne({ _id: objId });
      const { deletedCount } = await col.deleteOne({ _id: objId });
      console.info(
        `[DELETE] ${deletedCount ? "Deleted" : "Not found"} - id: ${entryId}`
      );

      if (deletedCount && existingEntry?.userId) {
        await recomputeWorkoutDerivedState({
          db,
          col,
          userId: existingEntry.userId,
        });
        await writeWorkoutEntryAudit({
          db,
          actor,
          action: "delete",
          previousEntry: existingEntry,
          nextEntry: null,
        });
      }

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
