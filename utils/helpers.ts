import axios from "axios";
import {
  WorkoutEntryDoc,
  RecurringRuleDoc,
  ExerciseCatalogDoc,
  Exercise,
  ExerciseSet,
} from "./types";

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
export const saveWorkoutEntry = async (entry: WorkoutEntryDoc) => {
  const res = await fetch("/api/workoutEntry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entry }),
  });
  if (!res.ok) {
    const message = await res.text();
    throw new Error(`saveWorkoutEntry ${res.status}: ${message}`);
  }
  return res.json();
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
  const [entriesRes, rulesRes] = await Promise.all([
    fetch(`/api/workoutEntry?${qEntries}`),
    fetch(`/api/recurringRule?${qRules}`),
  ]);

  console.log("[fetchDay] ◀ responses", {
    entriesStatus: entriesRes.status,
    rulesStatus: rulesRes.status,
  });

  if (!entriesRes.ok || !rulesRes.ok) {
    console.warn("[fetchDay] ❌ Non‑200 response", {
      entries: entriesRes.status,
      rules: rulesRes.status,
    });
    return [];
  }

  const { entries } = await entriesRes.json();
  const { rules } = await rulesRes.json();

  console.debug("[fetchDay] raw counts", {
    entries: entries.length,
    rules: rules.length,
  });

  /* ------------------------------------------------------------------ */
  /* 3. Apply recurrence filter                                          */
  /* ------------------------------------------------------------------ */
  const targetDate = new Date(dateISO);
  const dow = targetDate.getDay();
  const recurringToday = rules.filter(
    (r: any) =>
      r.dayOfWeek === dow &&
      (!r.startDate || new Date(r.startDate) <= targetDate)
  );

  const skippedKeys = new Set(
    entries
      .filter((e: any) => e.skipped)
      .map((e: any) => `${e.ruleId ?? e.exerciseId}::${e.routineName}`)
  );

  const visibleEntries = entries.filter((e: any) => !e.skipped);

  console.debug("[fetchDay] recurringToday", recurringToday.length);

  /* ------------------------------------------------------------------ */
  /* 4. Merge & tag                                                      */
  /* ------------------------------------------------------------------ */
  const all = [
    ...visibleEntries.map((e: any) => ({ ...e, kind: "entry" as const })),
    ...recurringToday
      .filter((r: any) => {
        const key = `${r._id?.toString?.() ?? r._id ?? r.exerciseId}::${r.routineName}`;
        return !skippedKeys.has(key);
      })
      .map((r: any) => ruleToExercise(r)),
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

  const result = Object.entries(grouped).map(([title, exercises]) => ({
    title,
    exercises,
  }));

  console.log("[fetchDay] ✔ final return", result);
  return result;
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
export const saveRecurringRule = async (rule: RecurringRuleDoc) => {
  const res = await fetch("/api/recurringRule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rule }),
  });

  if (!res.ok) throw new Error(`saveRecurringRule ${res.status}`);

  // API route should `return res.json({ rule: savedDoc })`
  const { rule: saved } = await res.json();
  return saved as RecurringRuleDoc; // contains _id
};

/* ----------------------------------------------------------------
   deactivateRecurringRule
   Soft‑deletes a rule by setting active:false.
   ---------------------------------------------------------------- */
export const deactivateRecurringRule = async (ruleId: string) => {
  try {
    const res = await fetch("/api/recurringRule", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ruleId }),
    });

    if (!res.ok) {
      const msg = await res.text();
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
export const ruleToExercise = (r: RecurringRuleDoc): Exercise => {
  const sets: ExerciseSet[] =
    (r.templateSets ?? []).map((s, idx) => ({
      name: s.name ?? `Set ${idx + 1}`,
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
    _id: (r as any)._id?.toString?.() ?? (r as any)._id,
    /** the UI expects these 5 keys */
    name: (r as any).exerciseName ?? "Exercise",
    type: (r as any).exerciseType ?? "weight",
    exerciseId: (r as any).exerciseId,
    max: (r as any).defaultMax,
    rest: (r as any).defaultRest ?? 0,
    complete: false,
    sets,
    isRepeating: true,
    ruleId: (r as any)._id?.toString?.() ?? (r as any)._id,
    /** keep the routineName so fetchDay can group */
    routineName: r.routineName,
  } as Exercise & { routineName: string };
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
  try {
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
      return data; // ✅ Return the response data
    } else {
      return { success: false };
    }
  } catch (error) {
    console.error("Error saving user inputs:", error);
  }
};

export const roundToNearestFive = (number) => {
  return Math.round(number / 5) * 5;
};

// local helpers

export const calculateWeights = (totalWeight) => {
  const barbellWeight = 45;
  const availableWeights = {
    "45": 6,
    "35": 2,
    "25": 2,
    "10": 4,
    "5": 2,
    "2.5": 2,
  };

  let remainingWeight = (totalWeight - barbellWeight) / 2; // Divide by 2 for each side
  const requiredWeights = [];
  // Sort weights in descending order
  const sortedWeights = Object.keys(availableWeights).sort(
    (a, b) => parseInt(b) - parseInt(a)
  );

  for (const weight of sortedWeights) {
    const plateWeight = parseFloat(weight);
    let count = Math.min(
      Math.floor(remainingWeight / plateWeight),
      availableWeights[weight]
    );

    if (count > 0) {
      requiredWeights.push(`${count}x ${weight} lbs.`);
      remainingWeight -= count * plateWeight;
    }
  }

  if (remainingWeight > 0) {
    return "Cannot achieve the exact weight with the available plates.";
  }

  return requiredWeights.join(", ");
};

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
  userInput: string
) {
  setIsLoading(true);

  const prompt = userInput;
  axios({
    method: "post",
    url: "https://api.openai.com/v1/images/generations",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer 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`,
    },
    data: {
      prompt,
      n: 1,
      size: "512x512",
      response_format: "url",
    },
  })
    .then((response) => {
      const imageUrl = response.data.data[0].url;
      setImage(imageUrl);
      setIsLoading(false);
    })
    .catch((error) => {
      console.error(error);
    });
}
export const fetchUser = async (id) => {
  try {
    const response = await fetch(`/api/user?id=${id}`);
    const data = await response.json();

    return data.user;
  } catch (error) {
    console.error("Error fetching users:", error);
  }
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
