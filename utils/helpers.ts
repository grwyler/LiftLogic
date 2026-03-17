import { ObjectId } from "mongodb";
import {
  WorkoutEntryDoc,
  RecurringRuleDoc,
  ExerciseCatalogDoc,
  Exercise,
  ExerciseSet,
  FeedbackItemDoc,
  BillingSummaryResponse,
  MonetizationSummaryResponse,
  FeedbackTriageStatus,
  FeedbackWorkItemDoc,
} from "./types";
import { ExerciseProgressSummary } from "./performance";
import { ExerciseRecommendation } from "./progression";
import { emitDevBugRequest } from "./devBugRecorder";
import { SetupFormValues } from "./profileSetup";
import { ensureExerciseSetIds } from "./exerciseSetIds";
import {
  calculatePlateBreakdown,
  roundToWeightIncrement,
} from "./weightUnits";
import {
  deactivateRecurringRule as deactivateRecurringRuleClient,
  saveRecurringRule as saveRecurringRuleClient,
} from "./recurringRuleService";
import { requestJson } from "./apiClient";
import { parseLocalDateKey, toLocalDateKey } from "./localDate";

export { parseLocalDateKey, toLocalDateKey } from "./localDate";

export const DEFAULT_ROUTINE = {
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

export const saveExercise = async (exercise) => {
  try {
    const response = await fetch("/api/exercise", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ exercise }),
    });

    if (response.ok) {
      console.log("User inputs saved successfully!");
    } else {
      console.error("Failed to save user inputs");
    }
  } catch (error) {
    console.error("Error saving user inputs:", error);
  }
};

export const deleteExercise = async (exerciseId) => {
  try {
    const response = await fetch("/api/exercise", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ exerciseId }),
    });

    if (response.ok) {
      console.log("Exercise deleted successfully!");
    } else {
      console.error("Failed to delete exercise");
    }
  } catch (error) {
    console.error("Error deleting exercise:", error);
  }
};

export const fetchExercises = async (
  userId,
  formattedDate,
  currentWorkoutTitle
) => {
  try {
    const response = await fetch(
      `/api/exercise?userId=${userId}&date=${formattedDate}&routineName=${currentWorkoutTitle}`
    );
    if (!response.ok) return;
    const data = await response.json();
    return data.exercises;
  } catch (error) {
    console.error("Error fetching exercises:", error);
  } finally {
  }
};

// save exercise **log**  (was saveExercise)
export const createWorkoutEntryRequestIdempotencyKey = (entry: WorkoutEntryDoc) => {
  const setSignature = (entry.sets || [])
    .map((set, index) =>
      [
        set.id || index,
        set.complete ? "1" : "0",
        set.actualReps ?? "",
        set.actualWeight ?? "",
        set.actualSeconds ?? "",
        set.actualMinutes ?? "",
        set.actualHours ?? "",
      ].join(":")
    )
    .join("|");

  return [
    String(entry.entryInstanceId ?? entry._id ?? ""),
    String(entry.exerciseId ?? ""),
    String(entry.routineName ?? ""),
    String(entry.date ?? ""),
    entry.complete ? "1" : "0",
    setSignature,
  ].join("::");
};

export const saveWorkoutEntry = async (entry: WorkoutEntryDoc) => {
  const payloadEntry: WorkoutEntryDoc = {
    ...entry,
    requestIdempotencyKey:
      entry.requestIdempotencyKey || createWorkoutEntryRequestIdempotencyKey(entry),
    lastKnownUpdatedAt: entry.lastKnownUpdatedAt ?? entry.updatedAt,
  };
  emitDevBugRequest({
    label: `Save workout entry for ${payloadEntry.name || payloadEntry.exerciseId || "exercise"}`,
    expected: "Workout entry persists and refetch returns the latest state.",
    actual: "Sending workout entry request.",
    status: "info",
  });
  const res = await fetch("/api/workoutEntry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entry: payloadEntry }),
  });
  if (!res.ok) {
    const message = await res.text();
    emitDevBugRequest({
      label: `Workout entry save failed for ${payloadEntry.name || payloadEntry.exerciseId || "exercise"}`,
      expected: "Workout entry saves successfully.",
      actual: `Request failed with ${res.status}: ${message}`,
      status: "failure",
    });
    throw new Error(
      res.status === 409
        ? `saveWorkoutEntry ${res.status}: Workout data changed in another session. Refresh before retrying.`
        : `saveWorkoutEntry ${res.status}: ${message}`
    );
  }
  emitDevBugRequest({
    label: `Workout entry save returned ${res.status}`,
    expected: "Server confirms the workout entry save.",
    actual: `Workout entry request completed with ${res.status}.`,
    status: "success",
  });
  return res.json();
};

export const createWorkoutEntryInstanceId = () => {
  if (
    typeof globalThis !== "undefined" &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `workout-entry-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export type WorkoutExerciseView = Exercise & {
  _id?: string;
  entryInstanceId?: string;
  exerciseId?: ObjectId | string;
  max?: number;
  rest?: number;
  sortOrder?: number;
  isRepeating?: boolean;
  recurrenceType?: RecurringRuleDoc["recurrenceType"];
  interval?: number;
  intervalWeeks?: number;
  dayOfWeek?: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  endDate?: Date | string;
  ruleId?: string;
  routineName: string;
};

export const getWorkoutEntryInstanceId = (entry: any) =>
  String(
    entry?.entryInstanceId ??
      entry?._id?.toString?.() ??
      entry?._id ??
      ""
  ).trim();

export const getWorkoutEntryIdentity = (entry: any, fallback?: string | number) => {
  const entryInstanceId = getWorkoutEntryInstanceId(entry);
  if (entryInstanceId) {
    return entryInstanceId;
  }

  return String(
    entry?.ruleId ??
      entry?.exerciseId ??
      entry?.name ??
      fallback ??
      ""
  );
};

export const getRecurringWorkoutEntryInstanceId = (
  ruleId: string,
  dateISO: string,
  routineName?: string
) => `recurring-entry::${String(ruleId).trim()}::${dateISO}::${String(routineName ?? "").trim()}`;

export const fetchExerciseProgress = async (
  userId: string,
  exerciseId: string
): Promise<{
  summary: ExerciseProgressSummary;
  recommendation: ExerciseRecommendation;
  entries: WorkoutEntryDoc[];
} | null> => {
  const trimmedExerciseId = String(exerciseId ?? "").trim();

  if (!userId || !trimmedExerciseId) {
    return null;
  }

  const qs = new URLSearchParams({
    userId,
    exerciseId: trimmedExerciseId,
  });

  const res = await fetch(`/api/exerciseProgress?${qs.toString()}`);
  if (!res.ok) {
    const message = await res.text();
    throw new Error(`fetchExerciseProgress ${res.status}: ${message}`);
  }

  return res.json();
};

export const fetchWorkoutMonthEntries = async (
  userId: string,
  monthDate: Date,
  routineName?: string
): Promise<WorkoutEntryDoc[]> => {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  return fetchWorkoutEntriesRange(userId, start, end, routineName);
};

export const fetchWorkoutEntriesRange = async (
  userId: string,
  startDate: Date,
  endDate: Date,
  routineName?: string
): Promise<WorkoutEntryDoc[]> => {
  const qs = new URLSearchParams({
    userId,
    monthStart: toLocalDateKey(startDate),
    monthEnd: toLocalDateKey(endDate),
  });

  if (routineName) {
    qs.append("routineName", routineName);
  }

  const res = await fetch(`/api/workoutEntry?${qs.toString()}`);
  if (!res.ok) {
    const message = await res.text();
    throw new Error(`fetchWorkoutEntriesRange ${res.status}: ${message}`);
  }

  const data = (await res.json()) as { entries?: WorkoutEntryDoc[] };
  return Array.isArray(data.entries) ? data.entries : [];
};

export const fetchWorkoutEntriesForDay = async (
  userId: string,
  dateISO: string,
  routineName?: string
): Promise<WorkoutEntryDoc[]> => {
  const qs = new URLSearchParams({ userId, date: dateISO });

  if (routineName) {
    qs.append("routineName", routineName);
  }

  const res = await fetch(`/api/workoutEntry?${qs.toString()}`);
  if (!res.ok) {
    const message = await res.text();
    throw new Error(`fetchWorkoutEntriesForDay ${res.status}: ${message}`);
  }

  const data = (await res.json()) as { entries?: WorkoutEntryDoc[] };
  return Array.isArray(data.entries) ? data.entries : [];
};

export const fetchWorkoutCalendarSummary = async (
  userId: string,
  monthDate: Date,
  routineName?: string
): Promise<{
  entries: WorkoutEntryDoc[];
  rules: RecurringRuleDoc[];
}> => {
  const qs = new URLSearchParams({
    userId,
    monthStart: toLocalDateKey(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)),
    monthEnd: toLocalDateKey(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)),
  });

  if (routineName) {
    qs.append("routineName", routineName);
  }

  const res = await fetch(`/api/workoutCalendarSummary?${qs.toString()}`);
  if (!res.ok) {
    const message = await res.text();
    throw new Error(`fetchWorkoutCalendarSummary ${res.status}: ${message}`);
  }

  const data = (await res.json()) as {
    entries?: WorkoutEntryDoc[];
    rules?: RecurringRuleDoc[];
  };

  return {
    entries: Array.isArray(data.entries) ? data.entries : [],
    rules: Array.isArray(data.rules) ? data.rules : [],
  };
};

const normalizeRuleDate = (value?: Date | string | null) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

export const getRecurringRuleConfig = (rule: RecurringRuleDoc) => {
  const startDate = normalizeRuleDate(rule.startDate);
  const fallbackDayOfWeek = startDate?.getDay() ?? 0;
  const fallbackDayOfMonth = startDate?.getDate() ?? 1;
  const recurrenceType =
    rule.recurrenceType ??
    (Array.isArray(rule.daysOfWeek) && rule.daysOfWeek.length > 1
      ? "custom"
      : "weekly");
  const interval = Math.max(
    1,
    Number(rule.interval ?? rule.intervalWeeks ?? 1) || 1
  );
  const daysOfWeek =
    Array.isArray(rule.daysOfWeek) && rule.daysOfWeek.length > 0
      ? rule.daysOfWeek.map((value) => Number(value)).filter((value) => value >= 0 && value <= 6)
      : [Number(rule.dayOfWeek ?? fallbackDayOfWeek)];
  const dayOfMonth = Math.max(
    1,
    Math.min(31, Number(rule.dayOfMonth ?? fallbackDayOfMonth) || fallbackDayOfMonth)
  );
  const endDate = normalizeRuleDate(rule.endDate);

  return {
    recurrenceType,
    interval,
    daysOfWeek,
    dayOfMonth,
    startDate,
    endDate,
  };
};

export const doesRecurringRuleMatchDate = (
  rule: RecurringRuleDoc,
  targetDate: Date
) => {
  const {
    recurrenceType,
    interval,
    daysOfWeek,
    dayOfMonth,
    startDate,
    endDate,
  } = getRecurringRuleConfig(rule);

  if (!startDate) {
    return false;
  }

  const normalizedTarget = new Date(targetDate);
  normalizedTarget.setHours(0, 0, 0, 0);

  if (normalizedTarget < startDate) {
    return false;
  }

  if (endDate && normalizedTarget > endDate) {
    return false;
  }

  const diffDays = Math.floor(
    (normalizedTarget.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const diffWeeks = Math.floor(diffDays / 7);
  const monthDiff =
    (normalizedTarget.getFullYear() - startDate.getFullYear()) * 12 +
    (normalizedTarget.getMonth() - startDate.getMonth());

  switch (recurrenceType) {
    case "daily":
      return diffDays % interval === 0;
    case "monthly":
      return monthDiff >= 0 && monthDiff % interval === 0 && normalizedTarget.getDate() === dayOfMonth;
    case "custom":
      return diffWeeks >= 0 &&
        diffWeeks % interval === 0 &&
        daysOfWeek.includes(normalizedTarget.getDay());
    case "weekly":
    default:
      return diffWeeks >= 0 &&
        diffWeeks % interval === 0 &&
        normalizedTarget.getDay() === daysOfWeek[0];
  }
};

// delete log
export const deleteWorkoutEntry = async (entryId: string) => {
  const res = await fetch("/api/workoutEntry", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entryId }),
  });
  if (!res.ok) throw new Error(`deleteWorkoutEntry ${res.status}`);
};

/**
 * Pull one calendar day’s data (entries + recurring rules) and
 * reshape it into [{ title, exercises }] for the UI.
 */
export const fetchDay = async (
  userId: string,
  dateISO: string,
  routineName?: string
) => {
  /* ------------------------------------------------------------------ */
  /* 1. Build query strings                                              */
  /* ------------------------------------------------------------------ */
  const qEntries = new URLSearchParams({ userId, date: dateISO });
  const qRules = new URLSearchParams({ userId });

  if (routineName) {
    qEntries.append("routineName", routineName);
    qRules.append("routineName", routineName);
  }

  console.log(
    "[fetchDay] ▶",
    { userId, dateISO, routineName },
    { qEntries: qEntries.toString(), qRules: qRules.toString() }
  );

  /* ------------------------------------------------------------------ */
  /* 2. Parallel fetch                                                   */
  /* ------------------------------------------------------------------ */
  const [entriesData, rulesData] = await Promise.all([
    requestJson<{ entries?: WorkoutEntryDoc[] }>(`/api/workoutEntry?${qEntries}`, {
      fallback: { entries: [] },
    }),
    requestJson<{ rules?: RecurringRuleDoc[] }>(`/api/recurringRule?${qRules}`, {
      fallback: { rules: [] },
    }),
  ]);

  console.log("[fetchDay] ◀ responses", {
    entriesCount: entriesData.entries?.length ?? 0,
    rulesCount: rulesData.rules?.length ?? 0,
  });

  if (false) {
    emitDevBugRequest({
      label: "Load scheduled workout data",
      expected: "Workout entries and recurring rules load for the selected day.",
      actual: "entries=0, rules=0",
      status: "failure",
    });
    console.warn("[fetchDay] ❌ Non‑200 response", {
      entries: entriesData.entries?.length ?? 0,
      rules: rulesData.rules?.length ?? 0,
    });
    return [];
  }

  const entries = Array.isArray(entriesData.entries) ? entriesData.entries : [];
  const rules = Array.isArray(rulesData.rules) ? rulesData.rules : [];

  console.debug("[fetchDay] raw counts", {
    entries: entries.length,
    rules: rules.length,
  });

  /* ------------------------------------------------------------------ */
  /* 3. Apply recurrence filter                                          */
  /* ------------------------------------------------------------------ */
  const targetDate = parseLocalDateKey(dateISO) ?? new Date(dateISO);
  const recurringToday = rules.filter((r: any) =>
    doesRecurringRuleMatchDate(r, targetDate)
  );

  const skippedKeys = new Set(
    entries
      .filter((e: any) => e.skipped)
      .map((e: any) => `${e.ruleId ?? e.exerciseId}::${e.routineName}`)
  );

  const visibleEntries = entries.filter((e: any) => !e.skipped);
  const materializedRecurringKeys = new Set(
    visibleEntries
      .filter((e: any) => e.ruleId || e.exerciseId)
      .map(
        (e: any) =>
          `${e.ruleId ?? e.exerciseId}::${e.routineName}::${
            e.exerciseId ?? ""
          }`
      )
  );
  console.debug("[fetchDay] recurringToday", recurringToday.length);

  /* ------------------------------------------------------------------ */
  /* 4. Merge & tag                                                      */
  /* ------------------------------------------------------------------ */
  const all = [
    ...visibleEntries.map((e: any) => ({
      ...e,
      sets: ensureExerciseSetIds(e?.sets),
      isRepeating: Boolean(e.isRepeating || e.ruleId),
      kind: "entry" as const,
    })),
    ...recurringToday
      .filter((r: any) => {
        const ruleId = r._id?.toString?.() ?? r._id ?? r.exerciseId;
        const key = `${ruleId}::${r.routineName}`;
        const materializedKey = `${ruleId}::${r.routineName}::${r.exerciseId ?? ""}`;
        return (
          !skippedKeys.has(key) &&
          !materializedRecurringKeys.has(materializedKey)
        );
      })
      .map((r: any) => ruleToExercise(r, dateISO)),
  ];

  console.debug("[fetchDay] merged total", all.length);

  /* ------------------------------------------------------------------ */
  /* 5. Group back into UI shape                                         */
  /* ------------------------------------------------------------------ */
  const grouped: Record<string, Exercise[]> = {};
  all.forEach((ex) => {
    const key = ex.routineName;
    (grouped[key] ??= []).push(ex);
  });

  Object.values(grouped).forEach((group) => {
    group.sort((a: any, b: any) => {
      const sortDelta =
        Number(a?.sortOrder ?? Number.MAX_SAFE_INTEGER) -
        Number(b?.sortOrder ?? Number.MAX_SAFE_INTEGER);

      if (sortDelta !== 0) {
        return sortDelta;
      }

      return String(a?.name ?? "").localeCompare(String(b?.name ?? ""));
    });
  });

  const result = Object.entries(grouped).map(([title, exercises]) => ({
    title,
    exercises,
  }));

  console.log("[fetchDay] ✔ final return", result);
  return result;
};

export const buildDayWorkoutsFromEntriesAndRules = (
  entries: WorkoutEntryDoc[],
  rules: RecurringRuleDoc[],
  dateISO: string,
  routineName?: string
) => {
  const targetDate = parseLocalDateKey(dateISO) ?? new Date(dateISO);
  const scopedRules = routineName
    ? rules.filter((rule) => rule.routineName === routineName)
    : rules;
  const recurringToday = scopedRules.filter((rule) =>
    doesRecurringRuleMatchDate(rule, targetDate)
  );

  const skippedKeys = new Set(
    entries
      .filter((entry: any) => entry.skipped)
      .map((entry: any) => `${entry.ruleId ?? entry.exerciseId}::${entry.routineName}`)
  );

  const visibleEntries = entries.filter((entry: any) => !entry.skipped);
  const materializedRecurringKeys = new Set(
    visibleEntries
      .filter((entry: any) => entry.ruleId || entry.exerciseId)
      .map(
        (entry: any) =>
          `${entry.ruleId ?? entry.exerciseId}::${entry.routineName}::${
            entry.exerciseId ?? ""
          }`
      )
  );
  const all = [
    ...visibleEntries.map((entry: any) => ({
      ...entry,
      sets: ensureExerciseSetIds(entry?.sets),
      isRepeating: Boolean(entry.isRepeating || entry.ruleId),
      kind: "entry" as const,
    })),
    ...recurringToday
      .filter((rule: any) => {
        const ruleId = rule._id?.toString?.() ?? rule._id ?? rule.exerciseId;
        const key = `${ruleId}::${rule.routineName}`;
        const materializedKey = `${ruleId}::${rule.routineName}::${rule.exerciseId ?? ""}`;
        return (
          !skippedKeys.has(key) &&
          !materializedRecurringKeys.has(materializedKey)
        );
      })
      .map((rule: any) => ruleToExercise(rule, dateISO)),
  ];

  const grouped: Record<string, Exercise[]> = {};
  all.forEach((exercise) => {
    const key = exercise.routineName;
    (grouped[key] ??= []).push(exercise);
  });

  Object.values(grouped).forEach((group) => {
    group.sort((a: any, b: any) => {
      const sortDelta =
        Number(a?.sortOrder ?? Number.MAX_SAFE_INTEGER) -
        Number(b?.sortOrder ?? Number.MAX_SAFE_INTEGER);

      if (sortDelta !== 0) {
        return sortDelta;
      }

      return String(a?.name ?? "").localeCompare(String(b?.name ?? ""));
    });
  });

  return Object.entries(grouped).map(([title, exercises]) => ({
    title,
    exercises,
  }));
};

let cache: Record<string, ExerciseCatalogDoc> | null = null;

export async function getCatalogMap(): Promise<
  Record<string, ExerciseCatalogDoc>
> {
  if (cache) return cache; // already fetched

  const res = await fetch("/api/exercise"); // GET all catalog docs
  const { exercises } = (await res.json()) as {
    exercises: ExerciseCatalogDoc[];
  };
  cache = Object.fromEntries(exercises.map((e) => [e._id, e]));
  return cache;
}

/* ----------------------------------------------------------------
   saveRecurringRule
   Upserts (create / update) a rule. Pass a RecurringRuleDoc object.
   ---------------------------------------------------------------- */
// utils/recurringRuleClient.ts
export const saveRecurringRule = saveRecurringRuleClient;

/* ----------------------------------------------------------------
   deactivateRecurringRule
   Soft‑deletes a rule by setting active:false.
   ---------------------------------------------------------------- */
export const deactivateRecurringRule = async (ruleId: string) => {
  try {
    await deactivateRecurringRuleClient(ruleId);
    const res = { status: 200 } as const;
    const msg = "";
    if (false) {

      console.error("[deactivateRecurringRule] ❌", res.status, msg);
    } else {
      console.info("[deactivateRecurringRule] ✅");
    }
  } catch (err) {
    console.error("[deactivateRecurringRule] ❌ fetch error", err);
  }
};

/* ----------------------------------------------------------------
   fetchRecurringRules
   Pulls all active rules for a user (optionally filtered by routineName)
   ---------------------------------------------------------------- */
export const fetchRecurringRules = async (
  userId: string,
  routineName?: string
): Promise<RecurringRuleDoc[]> => {
  const qs = new URLSearchParams({ userId });
  if (routineName) qs.append("routineName", routineName);

  const data = await requestJson<{ rules?: RecurringRuleDoc[] }>(
    `/api/recurringRule?${qs}`,
    {
      fallback: { rules: [] },
    }
  );

  return Array.isArray(data.rules) ? data.rules : [];

  try {
    const qs = new URLSearchParams({ userId });
    if (routineName) qs.append("routineName", routineName);

    const res = await fetch(`/api/recurringRule?${qs}`);
    if (!res.ok) {
      console.error("[fetchRecurringRules] ❌", res.status);
      return [];
    }

    const { rules } = (await res.json()) as { rules: RecurringRuleDoc[] };
    console.info(`[fetchRecurringRules] ✅ got ${rules.length} rules`);
    return rules;
  } catch (err) {
    console.error("[fetchRecurringRules] ❌ fetch error", err);
    return [];
  }
};

/**
 * Turns a RecurringRuleDoc coming from /api/recurringRule
 * into the exact Exercise object your components already expect.
 *
 * NOTE: This relies on three denormalised fields you’ll add to the rule
 *       when you create / update it:
 *         • exerciseName   (e.g. "Squats")
 *         • exerciseType   ("weight" | "timed")
 *         • defaultRest    (number, seconds)
 *
 * If you already saved those in your existing docs, you’re done.
 * Otherwise see option B or C below.
 */
export const ruleToExercise = (
  r: RecurringRuleDoc,
  dateISO?: string
): WorkoutExerciseView => {
  const ruleId = String(r._id?.toString?.() ?? r._id ?? "").trim();
  const sets: ExerciseSet[] =
    ensureExerciseSetIds(r.templateSets ?? []).map((s, idx) => ({
      name: s.name ?? `Set ${idx + 1}`,
      id: s.id,
      reps: s.reps,
      percentage: s.percentage,
      weight: s.weight,
      actualReps: "",
      actualWeight: "",
      seconds: s.seconds,
      actualSeconds: "",
      minutes: s.minutes,
      actualMinutes: "",
      hours: s.hours,
      actualHours: "",
    })) || [];

  return {
    _id: ruleId || undefined,
    entryInstanceId:
      dateISO && ruleId
        ? getRecurringWorkoutEntryInstanceId(
            ruleId,
            dateISO,
            r.routineName
          )
        : undefined,
    name: r.exerciseName ?? "Exercise",
    type: r.exerciseType ?? "weight",
    exerciseId: r.exerciseId,
    max: r.defaultMax,
    rest: r.defaultRest ?? 0,
    sortOrder: r.sortOrder,
    complete: false,
    sets,
    isRepeating: true,
    recurrenceType: r.recurrenceType ?? "weekly",
    interval: r.interval ?? r.intervalWeeks ?? 1,
    intervalWeeks: r.intervalWeeks ?? r.interval ?? 1,
    dayOfWeek: r.dayOfWeek,
    daysOfWeek: r.daysOfWeek ?? [r.dayOfWeek],
    dayOfMonth: r.dayOfMonth,
    endDate: r.endDate,
    ruleId: ruleId || undefined,
    routineName: r.routineName,
  };
};

export const saveSet = async (set) => {
  try {
    const response = await fetch("/api/set", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ set }),
    });

    if (response.ok) {
      console.log("User inputs saved successfully!");
    } else {
      console.error("Failed to save user inputs");
    }
  } catch (error) {
    console.error("Error saving user inputs:", error);
  }
};
export const saveRoutine = async (routine) => {
  try {
    // Create a deep copy of the routine and filter out non-persistent exercises
    const filteredRoutine = structuredClone(routine);

    if (filteredRoutine.days) {
      Object.keys(filteredRoutine.days).forEach((day) => {
        filteredRoutine.days[day] = filteredRoutine.days[day].map(
          (workout) => ({
            ...workout,
            exercises: workout.exercises
              ? workout.exercises.filter((exercise) => exercise.isPersistent)
              : [],
          })
        );
      });
    }

    const response = await fetch("/api/routine", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ routine: filteredRoutine }),
    });

    if (response.ok) {
      console.log("User inputs saved successfully!");
    } else {
      console.error("Failed to save user inputs");
    }
  } catch (error) {
    console.error("Error saving user inputs:", error);
  }
};
export const saveUser = async (user) => {
  emitDevBugRequest({
    label: "Save user profile",
    expected: "Profile changes persist successfully.",
    actual: "Sending user profile update.",
    status: "info",
  });

  const data = await requestJson<{ success?: boolean } & Record<string, unknown>>(
    "/api/user",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user }),
    }
  );

  emitDevBugRequest({
    label: "User profile saved",
    expected: "Profile changes persist successfully.",
    actual: "User update request completed successfully.",
    status: "success",
  });

  return {
    ...data,
    success: true,
  };

  try {
    emitDevBugRequest({
      label: "Save user profile",
      expected: "Profile changes persist successfully.",
      actual: "Sending user profile update.",
      status: "info",
    });
    const response = await fetch("/api/user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user }),
    });

    if (response.ok) {
      const data = await response.json(); // ✅ Parse response JSON
      data.success = true;
      emitDevBugRequest({
        label: "User profile saved",
        expected: "Profile changes persist successfully.",
        actual: `User update request completed with ${response.status}.`,
        status: "success",
      });
      return data;
    } else {
      const data = { success: false };
      return data; // ✅ Return the response data
      emitDevBugRequest({
        label: "User profile save failed",
        expected: "Profile changes persist successfully.",
        actual: `User update request returned ${response.status}.`,
        status: "failure",
      });
      return { success: false };
    }
  } catch (error) {
    console.error("Error saving user inputs:", error);
  }
};

export const fetchBillingSummary = async (): Promise<BillingSummaryResponse> => {
  const response = await fetch("/api/billing/summary");

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`fetchBillingSummary ${response.status}: ${message}`);
  }

  return response.json();
};

export const createBillingCheckoutSession = async (
  interval: "month" | "year"
) => {
  const response = await fetch("/api/billing/create-checkout-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ interval }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`createBillingCheckoutSession ${response.status}: ${message}`);
  }

  return response.json() as Promise<{ url: string }>;
};

export const createBillingPortalSession = async () => {
  const response = await fetch("/api/billing/create-portal-session", {
    method: "POST",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`createBillingPortalSession ${response.status}: ${message}`);
  }

  return response.json() as Promise<{ url: string }>;
};

export const trackBetaFunnelMilestone = async (
  milestone: string,
  occurredAt?: string
) => {
  const response = await fetch("/api/funnel", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      milestone,
      ...(occurredAt ? { occurredAt } : {}),
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`trackBetaFunnelMilestone ${response.status}: ${message}`);
  }

  return response.json() as Promise<{ success: true }>;
};

export const fetchMonetizationSummary =
  async (): Promise<MonetizationSummaryResponse> => {
    const response = await fetch("/api/funnel?summary=monetization");

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`fetchMonetizationSummary ${response.status}: ${message}`);
    }

    return response.json();
  };

export const fetchFoundingBetaUsers = async (search = "") => {
  const query = new URLSearchParams();
  if (search.trim()) {
    query.set("search", search.trim());
  }

  const response = await fetch(
    `/api/admin/founding-beta${query.toString() ? `?${query.toString()}` : ""}`
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`fetchFoundingBetaUsers ${response.status}: ${message}`);
  }

  return response.json() as Promise<{ users: any[] }>;
};

export const saveFoundingBetaAccess = async ({
  userId,
  operation,
  expiresAt,
  paymentCollectionNote,
}: {
  userId: string;
  operation: "grant" | "revoke" | "update";
  expiresAt?: string;
  paymentCollectionNote?: string;
}) => {
  const response = await fetch("/api/admin/founding-beta", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      operation,
      expiresAt: expiresAt || "",
      paymentCollectionNote,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`saveFoundingBetaAccess ${response.status}: ${message}`);
  }

  return response.json() as Promise<{ user: any }>;
};

export const submitFeedback = async (
  feedback: Omit<
    FeedbackItemDoc,
    | "_id"
    | "createdAt"
    | "updatedAt"
    | "status"
    | "triageStatus"
    | "notificationStatus"
    | "lastNotificationError"
    | "workItemId"
    | "fixThreadId"
    | "fixCommitSha"
    | "resolvedAt"
  >
) => {
  emitDevBugRequest({
    label: `Submit ${feedback.type} feedback`,
    expected: "Feedback is stored successfully.",
    actual: "Sending feedback request.",
    status: "info",
  });
  const response = await fetch("/api/feedback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ feedback }),
  });

  if (!response.ok) {
    const message = await response.text();
    emitDevBugRequest({
      label: `Submit ${feedback.type} feedback failed`,
      expected: "Feedback is stored successfully.",
      actual: `Feedback request failed with ${response.status}: ${message}`,
      status: "failure",
    });
    throw new Error(`submitFeedback ${response.status}: ${message}`);
  }

  emitDevBugRequest({
    label: `Submitted ${feedback.type} feedback`,
    expected: "Feedback is stored successfully.",
    actual: `Feedback request completed with ${response.status}.`,
    status: "success",
  });
  return response.json();
};

export const fetchFeedback = async (userId?: string) => {
  const query = new URLSearchParams();
  if (userId) {
    query.set("userId", userId);
  }

  const response = await fetch(`/api/feedback?${query.toString()}`);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`fetchFeedback ${response.status}: ${message}`);
  }

  const data = await response.json();
  return Array.isArray(data.feedback) ? data.feedback : [];
};

export const fetchFeedbackWorkflow = async () => {
  const response = await fetch("/api/feedback");
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`fetchFeedbackWorkflow ${response.status}: ${message}`);
  }

  const data = await response.json();
  return {
    feedback: Array.isArray(data.feedback)
      ? (data.feedback as FeedbackItemDoc[])
      : [],
    workItems: Array.isArray(data.workItems)
      ? (data.workItems as FeedbackWorkItemDoc[])
      : [],
  };
};

export const updateFeedbackWorkItem = async ({
  workItemId,
  triageStatus,
  severity,
  fixThreadId,
  fixCommitSha,
  title,
  latestDescription,
  resolution,
}: {
  workItemId: string;
  triageStatus: FeedbackTriageStatus;
  severity?: "low" | "medium" | "high";
  fixThreadId?: string;
  fixCommitSha?: string;
  title?: string;
  latestDescription?: string;
  resolution?: FeedbackWorkItemDoc["resolution"];
}) => {
  emitDevBugRequest({
    label: `Update work item ${workItemId}`,
    expected: "The feedback work item status is updated successfully.",
    actual: `Saving triage status ${triageStatus}.`,
    status: "info",
  });

  const response = await fetch("/api/feedback", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      workItemId,
      triageStatus,
      severity,
      fixThreadId,
      fixCommitSha,
      title,
      latestDescription,
      resolution,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    emitDevBugRequest({
      label: `Update work item ${workItemId} failed`,
      expected: "The feedback work item status is updated successfully.",
      actual: `Work item update failed with ${response.status}: ${message}`,
      status: "failure",
    });
    throw new Error(`updateFeedbackWorkItem ${response.status}: ${message}`);
  }

  emitDevBugRequest({
    label: `Updated work item ${workItemId}`,
    expected: "The feedback work item status is updated successfully.",
    actual: `Work item update completed with ${response.status}.`,
    status: "success",
  });

  return response.json();
};

export const deleteFeedbackWorkItem = async (workItemId: string) => {
  emitDevBugRequest({
    label: "Delete feedback work item",
    expected: "The selected work item and its linked reports are removed.",
    actual: "Sending delete request for feedback work item.",
    status: "info",
  });
  const response = await fetch("/api/feedback", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ workItemId }),
  });

  if (!response.ok) {
    const message = await response.text();
    emitDevBugRequest({
      label: "Delete feedback work item failed",
      expected: "The selected work item and its linked reports are removed.",
      actual: `Delete request failed with ${response.status}: ${message}`,
      status: "failure",
    });
    throw new Error(`deleteFeedbackWorkItem ${response.status}: ${message}`);
  }

  emitDevBugRequest({
    label: "Deleted feedback work item",
    expected: "The selected work item and its linked reports are removed.",
    actual: `Delete request completed with ${response.status}.`,
    status: "success",
  });

  return response.json();
};

export const deleteFeedback = async (feedbackId: string) => {
  emitDevBugRequest({
    label: "Delete bug report",
    expected: "The selected bug report is removed.",
    actual: "Sending delete request for bug report.",
    status: "info",
  });
  const response = await fetch("/api/feedback", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ feedbackId }),
  });

  if (!response.ok) {
    const message = await response.text();
    emitDevBugRequest({
      label: "Delete bug report failed",
      expected: "The selected bug report is removed.",
      actual: `Delete request failed with ${response.status}: ${message}`,
      status: "failure",
    });
    throw new Error(`deleteFeedback ${response.status}: ${message}`);
  }

  emitDevBugRequest({
    label: "Deleted bug report",
    expected: "The selected bug report is removed.",
    actual: `Delete request completed with ${response.status}.`,
    status: "success",
  });
  return response.json();
};

export const roundToNearestFive = (number) => {
  return roundToWeightIncrement(number, "lb");
};

// local helpers

export const calculateWeights = (totalWeight, unit: "lb" | "kg" = "lb") =>
  calculatePlateBreakdown(totalWeight, unit);

export const formatTime = (totalSeconds) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  const formattedTime = `${hours > 0 ? hours + "h " : ""}${
    minutes > 0 ? minutes + "m " : ""
  }${remainingSeconds > 0 ? remainingSeconds + "s" : ""}`;

  return formattedTime.trim();
};

export const fetchRoutine = async (userId) => {
  const data = await requestJson<{ routine?: typeof DEFAULT_ROUTINE }>(
    `/api/routine?userId=${userId}`,
    {
      fallback: { routine: DEFAULT_ROUTINE },
    }
  );

  return data.routine || DEFAULT_ROUTINE;

  try {
    const response = await fetch(`/api/routine?userId=${userId}`);
    if (response.ok) {
      const data = await response.json();
      return data.routine || DEFAULT_ROUTINE;
    }
  } catch (error) {
    console.error("Error fetching users:", error);
  }
};

export async function getImageFromOpenAI(
  setImage: Function,
  setIsLoading: Function,
  userInput: string,
  setError?: (message: string) => void
) {
  const prompt = userInput.trim();
  if (!prompt) {
    setError?.("Enter a prompt first.");
    return;
  }

  setIsLoading(true);
  setError?.("");

  try {
    const response = await fetch("/api/imageGeneration", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.message || "Couldn't generate an image right now.");
    }

    const data = await response.json();
    setImage(data.imageUrl);
  } catch (error) {
    console.error("Error generating image:", error);
    setError?.(
      error instanceof Error ? error.message : "Couldn't generate an image right now."
    );
  } finally {
    setIsLoading(false);
  }
}
export const fetchUser = async (id) => {
  const data = await requestJson<{ user?: any }>(`/api/user?id=${id}`, {
    fallback: { user: null },
  });

  return data.user ?? null;

  try {
    const response = await fetch(`/api/user?id=${id}`);
    const data = await response.json();

    return data.user;
  } catch (error) {
    console.error("Error fetching users:", error);
  }
};

export const generateWorkoutPlan = async (
  userId: string,
  profile: SetupFormValues
) => {
  const response = await fetch("/api/generateWorkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, profile }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`generateWorkoutPlan ${response.status}: ${message}`);
  }

  return response.json();
};

export const clearWorkoutProgram = async (userId: string) => {
  const response = await fetch("/api/program", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`clearWorkoutProgram ${response.status}: ${message}`);
  }

  return response.json();
};

export const askWorkoutCoach = async ({
  message,
  history,
  profile,
  coachResponse,
  userId,
}: {
  message: string;
  history: Array<{ role: "coach" | "user"; text: string }>;
  profile: SetupFormValues;
  coachResponse: any;
  userId?: string;
}) => {
  const response = await fetch("/api/workoutCoachChat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, profile, coachResponse, userId }),
  });

  if (!response.ok) {
    const messageText = await response.text();
    throw new Error(`askWorkoutCoach ${response.status}: ${messageText}`);
  }

  return response.json();
};

export const emptyOrNullToZero = (value) => {
  // Check if the value is an empty string or null
  if (value === "" || !value) {
    return 0; // Return 0 if empty string or null
  } else {
    return value; // Return the original value if not empty string or null
  }
};

export const toTitleCase = (text?: string) =>
  typeof text === "string" ? text.replace(/\b\w/g, (c) => c.toUpperCase()) : "";
