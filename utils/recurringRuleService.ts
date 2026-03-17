import { ObjectId } from "mongodb";
import { ensureExerciseSetIds } from "./exerciseSetIds";
import { requestJson } from "./apiClient";
import { parseLocalDateKey, toLocalDateKey } from "./localDate";
import { ExerciseSet, RecurringRuleDoc, WorkoutEntryDoc } from "./types";

export type RecurrenceType = "daily" | "weekly" | "custom" | "monthly";

export type PersistedRecurringRule = Omit<RecurringRuleDoc, "_id" | "exerciseId"> & {
  _id?: ObjectId | string;
  exerciseId: ObjectId | string;
  exerciseName?: string;
  exerciseType?: "weight" | "timed";
  defaultMax?: number;
  defaultRest?: number;
};

export type RecurringWorkoutExerciseInput = Partial<WorkoutEntryDoc> &
  Partial<PersistedRecurringRule> & {
    _id?: unknown;
    ruleId?: string | null;
    isRepeating?: boolean;
  };

export type RecurringScheduleInput = {
  recurrenceType: RecurrenceType;
  interval?: number | null;
  dayOfWeek?: number | null;
  daysOfWeek?: number[] | null;
  dayOfMonth?: number | null;
  endDate?: string | Date | null;
};

export type NormalizedRecurringSchedule = {
  recurrenceType: RecurrenceType;
  interval: number;
  dayOfWeek: number;
  daysOfWeek: number[];
  dayOfMonth?: number;
  endDate?: string;
};

export type RecurringRuleUpsertInput = {
  _id?: ObjectId | string;
  userId: string;
  exerciseId: ObjectId | string;
  exerciseName: string;
  exerciseType: "weight" | "timed";
  routineName: string;
  sortOrder?: number;
  recurrenceType?: RecurrenceType;
  interval?: number;
  dayOfWeek?: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  intervalWeeks?: number;
  startDate: Date | string;
  endDate?: Date | string;
  templateSets?: ExerciseSet[];
  defaultMax?: number;
  defaultRest?: number;
  active?: boolean;
};

export type SaveWorkoutScheduleRequest = {
  action: "save_workout_schedule";
  userId: string;
  routineName: string;
  date: string;
  exercises: RecurringWorkoutExerciseInput[];
  schedule: RecurringScheduleInput;
};

export type RemoveWorkoutScheduleRequest = {
  action: "remove_workout_schedule";
  userId: string;
  routineName: string;
  date: string;
  exercises: RecurringWorkoutExerciseInput[];
};

export type WorkoutScheduleBatchRequest =
  | SaveWorkoutScheduleRequest
  | RemoveWorkoutScheduleRequest;

export type WorkoutScheduleBatchResponse = {
  exercises: RecurringWorkoutExerciseInput[];
  action: WorkoutScheduleBatchRequest["action"];
};

const clampDayOfWeek = (value: unknown, fallback = 0) => {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 0 || numeric > 6) {
    return fallback;
  }

  return numeric;
};

const clampDayOfMonth = (value: unknown, fallback = 1) => {
  const numeric = Number(value);
  if (!Number.isInteger(numeric)) {
    return fallback;
  }

  return Math.max(1, Math.min(31, numeric));
};

const normalizeDateString = (value?: string | Date | null) => {
  if (!value) {
    return undefined;
  }

  if (typeof value === "string") {
    const parsedKey = parseLocalDateKey(value);
    if (parsedKey) {
      return value;
    }
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : toLocalDateKey(parsed);
};

export const parseRecurringDateKey = parseLocalDateKey;

export const normalizeRecurringSchedule = (
  schedule: RecurringScheduleInput,
  fallbackDate?: Date
): NormalizedRecurringSchedule => {
  const referenceDate =
    fallbackDate && !Number.isNaN(fallbackDate.getTime()) ? fallbackDate : new Date();
  const recurrenceType = schedule.recurrenceType ?? "weekly";
  const interval = Math.max(1, Number(schedule.interval) || 1);
  const fallbackDayOfWeek = referenceDate.getDay();
  const dayOfWeek = clampDayOfWeek(schedule.dayOfWeek, fallbackDayOfWeek);
  const providedDays = Array.isArray(schedule.daysOfWeek)
    ? schedule.daysOfWeek
        .map((value) => clampDayOfWeek(value, fallbackDayOfWeek))
        .filter((value, index, values) => values.indexOf(value) === index)
        .sort((left, right) => left - right)
    : [];
  const daysOfWeek =
    recurrenceType === "custom"
      ? providedDays.length > 0
        ? providedDays
        : [dayOfWeek]
      : [dayOfWeek];

  return {
    recurrenceType,
    interval,
    dayOfWeek,
    daysOfWeek,
    dayOfMonth:
      recurrenceType === "monthly"
        ? clampDayOfMonth(schedule.dayOfMonth, referenceDate.getDate())
        : undefined,
    endDate: normalizeDateString(schedule.endDate),
  };
};

export const buildRecurringRuleUpsertDoc = (
  rule: RecurringRuleUpsertInput
): PersistedRecurringRule => {
  const startDate = new Date(rule.startDate);
  if (Number.isNaN(startDate.getTime())) {
    throw new Error("startDate must be a valid date");
  }

  const schedule = normalizeRecurringSchedule(
    {
      recurrenceType: rule.recurrenceType ?? "weekly",
      interval: rule.interval ?? rule.intervalWeeks ?? 1,
      dayOfWeek: rule.dayOfWeek,
      daysOfWeek: rule.daysOfWeek,
      dayOfMonth: rule.dayOfMonth,
      endDate: rule.endDate,
    },
    startDate
  );

  return {
    _id: rule._id,
    userId: rule.userId,
    exerciseId: String(rule.exerciseId),
    exerciseName: rule.exerciseName,
    exerciseType: rule.exerciseType,
    routineName: rule.routineName,
    sortOrder: rule.sortOrder,
    recurrenceType: schedule.recurrenceType,
    interval: schedule.interval,
    dayOfWeek: schedule.dayOfWeek,
    daysOfWeek: schedule.daysOfWeek,
    dayOfMonth: schedule.dayOfMonth,
    intervalWeeks: schedule.interval,
    startDate,
    endDate: schedule.endDate ? new Date(schedule.endDate) : undefined,
    templateSets: ensureExerciseSetIds(rule.templateSets ?? []),
    defaultMax: rule.defaultMax,
    defaultRest: rule.defaultRest,
    active: rule.active ?? true,
  };
};

export const saveRecurringRule = async (
  rule: RecurringRuleUpsertInput
): Promise<PersistedRecurringRule> => {
  const data = await requestJson<{ rule: PersistedRecurringRule }>("/api/recurringRule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rule }),
  });

  return data.rule;
};

export const deactivateRecurringRule = async (ruleId: string): Promise<void> => {
  await requestJson<{ message: string }>("/api/recurringRule", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ruleId }),
  });
};

export const updateWorkoutSchedule = async (
  request: SaveWorkoutScheduleRequest
): Promise<WorkoutScheduleBatchResponse> =>
  requestJson<WorkoutScheduleBatchResponse>("/api/recurringRule", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

export const removeWorkoutSchedule = async (
  request: RemoveWorkoutScheduleRequest
): Promise<WorkoutScheduleBatchResponse> =>
  requestJson<WorkoutScheduleBatchResponse>("/api/recurringRule", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
