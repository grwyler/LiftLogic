import { randomUUID } from "crypto";
import { NextApiRequest, NextApiResponse } from "next";
import { ClientSession, ObjectId } from "mongodb";
import { connectToDatabase, connectToMongoClient } from "../../utils/mongodb";
import { RecurringRuleDoc, UserDoc, WorkoutEntryDoc } from "@/utils/types";
import { ensureExerciseSetIds } from "../../utils/exerciseSetIds";
import {
  buildRecurringRuleUpsertDoc,
  parseRecurringDateKey,
  PersistedRecurringRule,
  RecurringWorkoutExerciseInput,
  SaveWorkoutScheduleRequest,
  WorkoutScheduleBatchRequest,
} from "../../utils/recurringRuleService";

type BatchAction = WorkoutScheduleBatchRequest["action"];
type BatchExerciseInput = RecurringWorkoutExerciseInput;
type BatchRequest = Partial<WorkoutScheduleBatchRequest>;

const getStringId = (value: unknown) => String(value ?? "").trim();
const resolveExerciseType = (value: unknown): "weight" | "timed" =>
  value === "timed" ? "timed" : "weight";

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

const buildWorkoutEntryFilter = ({
  exercise,
  userId,
  entryInstanceId,
}: {
  exercise: BatchExerciseInput;
  userId: string;
  entryInstanceId: string;
}) => {
  const rawEntryId = getStringId(exercise._id);

  if (ObjectId.isValid(rawEntryId)) {
    return { _id: new ObjectId(rawEntryId) };
  }

  return {
    userId,
    entryInstanceId,
  };
};

const resolveEntryInstanceId = ({
  exercise,
  nextRuleId,
  parsedDate,
  routineName,
}: {
  exercise: BatchExerciseInput;
  nextRuleId?: string;
  parsedDate: Date;
  routineName: string;
}) => {
  const existingEntryInstanceId = getStringId(exercise.entryInstanceId);
  if (existingEntryInstanceId) {
    return existingEntryInstanceId;
  }

  const rawEntryId = getStringId(exercise._id);
  if (rawEntryId && !ObjectId.isValid(rawEntryId)) {
    return rawEntryId;
  }

  if (nextRuleId) {
    return buildRecurringEntryInstanceId(nextRuleId, parsedDate, routineName);
  }

  const rawRuleId = getStringId(exercise.ruleId);
  if (rawRuleId) {
    return buildRecurringEntryInstanceId(rawRuleId, parsedDate, routineName);
  }

  return randomUUID();
};

const validateBatchRequest = (body: BatchRequest) => {
  const action = body.action;
  if (action !== "save_workout_schedule" && action !== "remove_workout_schedule") {
    return "Valid action required";
  }

  if (!getStringId(body.userId)) {
    return "userId required";
  }

  if (!getStringId(body.routineName)) {
    return "routineName required";
  }

  if (!parseRecurringDateKey(body.date)) {
    return "date must be YYYY-MM-DD";
  }

  if (!Array.isArray(body.exercises) || body.exercises.length === 0) {
    return "exercises required";
  }

  if (action === "save_workout_schedule") {
    if (!body.schedule) {
      return "schedule required";
    }

    if (
      body.schedule.recurrenceType !== "daily" &&
      body.schedule.recurrenceType !== "weekly" &&
      body.schedule.recurrenceType !== "custom" &&
      body.schedule.recurrenceType !== "monthly"
    ) {
      return "Valid recurrenceType required";
    }
  }

  return null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const db = await connectToDatabase();
  const col = db.collection<PersistedRecurringRule>("recurringRules");
  const users = db.collection<UserDoc>("users");

  try {
    switch (req.method) {
      case "POST": {
        const { rule } = req.body as { rule?: PersistedRecurringRule };
        console.debug("[POST] Payload:", rule);

        if (!rule?.routineName) {
          console.warn("[POST] routineName missing");
          return res.status(400).json({ message: "routineName required" });
        }

        if (!rule?.userId) {
          console.warn("[POST] userId missing");
          return res.status(400).json({ message: "userId required" });
        }

        const exerciseId = String(rule.exerciseId ?? "").trim();
        if (!exerciseId) {
          console.warn("[POST] exerciseId missing");
          return res.status(400).json({ message: "exerciseId required" });
        }

        const ruleDoc = buildRecurringRuleUpsertDoc({
          _id: rule._id,
          userId: rule.userId,
          exerciseId,
          exerciseName: String(rule.exerciseName ?? "").trim(),
          exerciseType: resolveExerciseType(rule.exerciseType),
          routineName: rule.routineName,
          sortOrder: rule.sortOrder,
          recurrenceType: rule.recurrenceType,
          interval: rule.interval,
          dayOfWeek: rule.dayOfWeek,
          daysOfWeek: rule.daysOfWeek,
          dayOfMonth: rule.dayOfMonth,
          intervalWeeks: rule.intervalWeeks,
          startDate: rule.startDate,
          endDate: rule.endDate,
          templateSets: rule.templateSets,
          defaultMax: rule.defaultMax,
          defaultRest: rule.defaultRest,
          active: rule.active,
        });

        const filter =
          rule._id && ObjectId.isValid(String(rule._id))
            ? { _id: new ObjectId(String(rule._id)) }
            : {
                userId: rule.userId,
                exerciseId,
                routineName: rule.routineName,
                active: true,
              };
        const doc = {
          ...ruleDoc,
          updatedAt: new Date(),
        } as PersistedRecurringRule;

        const result = await col.updateOne(
          filter,
          { $set: doc, $setOnInsert: { createdAt: new Date() } },
          { upsert: true }
        );

        const mode = result.upsertedCount ? "Inserted" : "Updated";
        const savedRule = result.upsertedCount
          ? { _id: result.upsertedId ?? undefined, ...doc }
          : await col.findOne(filter);
        const docId = savedRule?._id ?? "(existing)";
        console.info(`[POST] ${mode} - id: ${docId}`);

        return res
          .status(result.upsertedCount ? 201 : 200)
          .json({ rule: savedRule ?? { _id: docId, ...doc } });
      }

      case "PUT": {
        const body = (req.body ?? {}) as BatchRequest;
        const validationError = validateBatchRequest(body);
        if (validationError) {
          return res.status(400).json({ message: validationError });
        }

        const action = body.action as BatchAction;
        const userId = getStringId(body.userId);
        const routineName = getStringId(body.routineName);
        const parsedDate = parseRecurringDateKey(body.date)!;
        const exercises = body.exercises as BatchExerciseInput[];
        const schedule =
          action === "save_workout_schedule"
            ? (body as Partial<SaveWorkoutScheduleRequest>).schedule
            : undefined;

        const user =
          ObjectId.isValid(userId)
            ? await users.findOne({ _id: new ObjectId(userId) })
            : null;

        const recurringRules = db.collection<PersistedRecurringRule>("recurringRules");
        const workoutEntries = db.collection<WorkoutEntryDoc>("workoutEntries");
        const existingRuleIds = exercises
          .map((exercise) => getStringId(exercise.ruleId))
          .filter((ruleId) => ObjectId.isValid(ruleId))
          .map((ruleId) => new ObjectId(ruleId));

        const client = await connectToMongoClient();
        const session = typeof client.startSession === "function" ? client.startSession() : null;
        let updatedExercises: BatchExerciseInput[] = [];

        try {
          const runBatch = async (activeSession?: ClientSession) => {
            if (existingRuleIds.length > 0) {
              await recurringRules.updateMany(
                { _id: { $in: existingRuleIds }, active: true },
                { $set: { active: false, updatedAt: new Date() } },
                activeSession ? { session: activeSession } : undefined
              );
            }

            updatedExercises = [];

            for (const exercise of exercises) {
              const resolvedExerciseId = getStringId(
                exercise.exerciseId ?? exercise._id ?? exercise.name
              );

              if (!resolvedExerciseId) {
                throw new Error("Each exercise must include an exerciseId, _id, or name.");
              }

              const nextRuleId =
                action === "save_workout_schedule" ? String(new ObjectId()) : undefined;
              const entryInstanceId = resolveEntryInstanceId({
                exercise,
                nextRuleId,
                parsedDate,
                routineName,
              });

              let nextRuleDoc: PersistedRecurringRule | null = null;

              if (action === "save_workout_schedule" && schedule) {
                nextRuleDoc = buildRecurringRuleUpsertDoc({
                  _id: new ObjectId(nextRuleId),
                  userId,
                  exerciseId: resolvedExerciseId,
                  exerciseName: String(exercise.name ?? "").trim(),
                  exerciseType: resolveExerciseType(exercise.type),
                  routineName,
                  recurrenceType: schedule.recurrenceType,
                  interval: schedule.interval ?? undefined,
                  dayOfWeek: schedule.dayOfWeek ?? undefined,
                  daysOfWeek: schedule.daysOfWeek ?? undefined,
                  dayOfMonth: schedule.dayOfMonth ?? undefined,
                  startDate: parsedDate,
                  endDate: schedule.endDate ?? undefined,
                  templateSets: ensureExerciseSetIds(exercise.sets ?? []),
                  defaultMax: exercise.max,
                  defaultRest: exercise.rest,
                  sortOrder: exercise.sortOrder,
                  active: true,
                });

                await recurringRules.insertOne(
                  {
                    ...nextRuleDoc,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  } as PersistedRecurringRule,
                  activeSession ? { session: activeSession } : undefined
                );
              }

              const filter = buildWorkoutEntryFilter({
                exercise,
                userId,
                entryInstanceId,
              });
              const nextRuleIdValue =
                action === "save_workout_schedule" ? nextRuleId : undefined;

              await workoutEntries.updateOne(
                filter,
                {
                  $set: {
                    userId,
                    exerciseId: resolvedExerciseId,
                    entryInstanceId,
                    weightUnit: exercise.weightUnit,
                    sortOrder: exercise.sortOrder,
                    name: exercise.name,
                    type: exercise.type,
                    max: exercise.max,
                    routineName,
                    date: parsedDate,
                    rest: exercise.rest,
                    complete: exercise.complete ?? false,
                    sets: ensureExerciseSetIds(exercise.sets ?? []),
                    ...(nextRuleIdValue ? { ruleId: nextRuleIdValue } : {}),
                    updatedAt: new Date(),
                  },
                  ...(nextRuleIdValue ? {} : { $unset: { ruleId: "" } }),
                  $setOnInsert: {
                    createdAt: new Date(),
                  },
                },
                {
                  upsert: true,
                  ...(activeSession ? { session: activeSession } : {}),
                }
              );

              updatedExercises.push({
                ...exercise,
                userId: getStringId(exercise.userId) || userId,
                exerciseId: resolvedExerciseId,
                routineName,
                entryInstanceId,
                isRepeating: action === "save_workout_schedule",
                ruleId: nextRuleIdValue,
                recurrenceType:
                  action === "save_workout_schedule" ? nextRuleDoc?.recurrenceType : undefined,
                interval:
                  action === "save_workout_schedule"
                    ? nextRuleDoc?.interval
                    : undefined,
                intervalWeeks:
                  action === "save_workout_schedule"
                    ? nextRuleDoc?.interval
                    : undefined,
                dayOfWeek:
                  action === "save_workout_schedule"
                    ? nextRuleDoc?.dayOfWeek
                    : undefined,
                daysOfWeek:
                  action === "save_workout_schedule"
                    ? nextRuleDoc?.daysOfWeek
                    : undefined,
                dayOfMonth:
                  action === "save_workout_schedule"
                    ? nextRuleDoc?.dayOfMonth
                    : undefined,
                endDate:
                  action === "save_workout_schedule"
                    ? nextRuleDoc?.endDate
                      ? new Date(nextRuleDoc.endDate)
                      : undefined
                    : undefined,
                date: parsedDate,
              });
            }
          };

          if (session) {
            await session.withTransaction(async () => {
              await runBatch(session);
            });
          } else {
            await runBatch();
          }
        } finally {
          await session?.endSession();
        }

        return res.status(200).json({
          exercises: updatedExercises,
          action,
        });
      }

      case "GET": {
        const { userId, routineName } = req.query;
        if (!userId) {
          return res.status(400).json({ message: "userId required" });
        }

        const query: Record<string, unknown> = {
          userId,
          active: true,
        };

        if (routineName) {
          query.routineName = routineName;
        }

        const rules = await col.find(query).toArray();
        rules.sort(
          (a, b) =>
            Number(a.sortOrder ?? Number.MAX_SAFE_INTEGER) -
            Number(b.sortOrder ?? Number.MAX_SAFE_INTEGER)
        );
        return res.status(200).json({ rules });
      }

      case "DELETE": {
        const { ruleId } = req.body as { ruleId?: string };
        console.debug("[DELETE] ruleId:", ruleId);

        if (!ruleId || !ObjectId.isValid(ruleId)) {
          console.warn("[DELETE] Bad or missing ruleId");
          return res
            .status(400)
            .json({ message: "ruleId required & must be valid" });
        }

        const objId = new ObjectId(ruleId);
        const existingRule = await col.findOne({ _id: objId });
        const user =
          existingRule?.userId && ObjectId.isValid(String(existingRule.userId))
            ? await users.findOne({
                _id: new ObjectId(String(existingRule.userId)),
              })
            : null;

        const { modifiedCount } = await col.updateOne(
          { _id: objId, active: true },
          { $set: { active: false, updatedAt: new Date() } }
        );

        console.info(
          `[DELETE] ${modifiedCount ? "Deactivated" : "Not found"} - id: ${ruleId}`
        );
        return res.status(modifiedCount ? 200 : 404).json({
          message: modifiedCount ? "Rule deactivated" : "Rule not found",
        });
      }

      default:
        res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
        return res.status(405).end();
    }
  } catch (e) {
    console.error("recurringRule error:", e);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
