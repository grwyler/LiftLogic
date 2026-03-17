import { buildExerciseProgressSummary, getProgressTrendHighlight } from "./performance";
import { ExerciseSet, WeightUnit, WorkoutEntryDoc } from "./types";
import {
  fromCanonicalWeightLb,
  formatWeight,
  getCanonicalWeightFromSet,
  normalizeWeightUnit,
} from "./weightUnits";

export type TrainingAnalyticsPeriod = "week" | "month";

export type TrainingAnalyticsSummary = {
  period: TrainingAnalyticsPeriod;
  label: string;
  completedWorkouts: number;
  plannedWorkouts: number;
  totalSets: number;
  totalVolume: number;
  workoutStreak: number;
  consistencyRate: number;
  muscleDistribution: Array<{
    group: string;
    sets: number;
    share: number;
  }>;
  liftTrendHighlights: Array<{
    exerciseId: string;
    exerciseName: string;
    status: "new" | "up" | "steady" | "down";
    label: string;
    benchmark: string;
    detail: string;
  }>;
};

export type ExerciseHistoryRange = "30d" | "90d" | "all";

export type ExerciseHistoryChartPoint = {
  label: string;
  date: string;
  load: number | null;
  reps: number | null;
  volume: number | null;
  estimatedStrength: number | null;
};

export type ExerciseHistorySummary = {
  lifetimeBestLoad: number | null;
  lifetimeBestRepSet: string | null;
  lifetimeBestEstimatedStrength: number | null;
  chartPoints: ExerciseHistoryChartPoint[];
  recentSessions: Array<{
    date: string;
    routineName: string;
    load: number | null;
    reps: number | null;
    volume: number | null;
    estimatedStrength: number | null;
  }>;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const musclePatterns: Array<{ group: string; pattern: RegExp }> = [
  { group: "Chest", pattern: /bench|push-up|push up|fly|crossover|dip/ },
  { group: "Back", pattern: /row|pulldown|pull-up|pull up|face pull|shrug/ },
  { group: "Shoulders", pattern: /overhead press|shoulder press|lateral raise|rear delt|pike push/ },
  { group: "Quads", pattern: /squat|leg press|step-up|step up|leg extension|wall sit/ },
  { group: "Posterior chain", pattern: /deadlift|romanian deadlift|rdl|hip thrust|glute bridge|back extension|superman/ },
  { group: "Glutes", pattern: /lunge|split squat|hip thrust|glute bridge|step-up|step up/ },
  { group: "Arms", pattern: /curl|triceps|pushdown|skullcrusher/ },
  { group: "Core", pattern: /plank|dead bug|bird dog|leg raise|carry|crunch/ },
  { group: "Conditioning", pattern: /running|cycling|rowing|jump rope|elliptical|stair climber|mountain climber/ },
];

const classifyMuscleGroup = (exerciseName: string) => {
  const normalized = exerciseName.trim().toLowerCase();
  const matched = musclePatterns.find((entry) => entry.pattern.test(normalized));
  return matched?.group || "Other";
};

const parseDate = (value: unknown) => {
  const parsed =
    value instanceof Date ? value : typeof value === "string" ? new Date(value) : null;
  return parsed && !Number.isNaN(+parsed) ? parsed : null;
};

const toDateKey = (value: Date) => value.toISOString().slice(0, 10);

const isCompletedEntry = (entry: WorkoutEntryDoc) => {
  const sets = Array.isArray(entry.sets) ? entry.sets : [];
  return Boolean(entry.complete || sets.some((set) => Boolean(set.complete)));
};

const getCompletedSets = (entry: WorkoutEntryDoc) =>
  (Array.isArray(entry.sets) ? entry.sets : []).filter((set) => Boolean(set.complete));

const getSetVolume = (set: ExerciseSet) => {
  const reps = Number(set.actualReps ?? set.reps ?? 0);
  const weight = getCanonicalWeightFromSet(set, "actual") ?? getCanonicalWeightFromSet(set, "planned");
  if (!reps || !weight) {
    return 0;
  }
  return reps * weight;
};

const getRepresentativeLoad = (sets: ExerciseSet[]) => {
  const best = sets.reduce<number | null>((currentBest, set) => {
    const weight =
      getCanonicalWeightFromSet(set, "actual") ?? getCanonicalWeightFromSet(set, "planned");
    if (!weight) {
      return currentBest;
    }
    return currentBest === null ? weight : Math.max(currentBest, weight);
  }, null);

  return best;
};

const getRepresentativeRepSet = (sets: ExerciseSet[]) =>
  sets.reduce<{ weight: number; reps: number } | null>((currentBest, set) => {
    const weight =
      getCanonicalWeightFromSet(set, "actual") ?? getCanonicalWeightFromSet(set, "planned");
    const reps = Number(set.actualReps ?? set.reps ?? 0);
    if (!weight || !reps) {
      return currentBest;
    }
    if (!currentBest || weight > currentBest.weight || (weight === currentBest.weight && reps > currentBest.reps)) {
      return { weight, reps };
    }
    return currentBest;
  }, null);

const estimateStrength = (weight: number | null, reps: number | null) => {
  if (!weight || !reps) {
    return null;
  }
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
};

const getRangeStart = (currentDate: Date, period: TrainingAnalyticsPeriod) => {
  const start = new Date(currentDate);
  start.setHours(0, 0, 0, 0);
  if (period === "week") {
    start.setDate(start.getDate() - start.getDay());
    return start;
  }

  return new Date(start.getFullYear(), start.getMonth(), 1);
};

const getRangeEnd = (currentDate: Date, period: TrainingAnalyticsPeriod) => {
  const end = new Date(currentDate);
  if (period === "week") {
    end.setHours(23, 59, 59, 999);
    end.setDate(end.getDate() + (6 - end.getDay()));
    return end;
  }

  return new Date(end.getFullYear(), end.getMonth() + 1, 0, 23, 59, 59, 999);
};

const getWorkoutStreak = (completedKeys: string[]) => {
  if (completedKeys.length === 0) {
    return 0;
  }

  const sorted = [...completedKeys].sort().reverse();
  let streak = 1;
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = new Date(`${sorted[index - 1]}T00:00:00`);
    const current = new Date(`${sorted[index]}T00:00:00`);
    const diff = Math.round((previous.getTime() - current.getTime()) / DAY_MS);
    if (diff === 1) {
      streak += 1;
      continue;
    }
    break;
  }
  return streak;
};

export const buildTrainingAnalyticsSummary = ({
  entries,
  statusMap,
  currentDate,
  period,
  preferredUnits,
}: {
  entries: WorkoutEntryDoc[];
  statusMap: Record<
    string,
    { hasLogged: boolean; hasCompleted: boolean; hasRecurring: boolean; exerciseCount: number }
  >;
  currentDate: Date;
  period: TrainingAnalyticsPeriod;
  preferredUnits?: WeightUnit | null;
}): TrainingAnalyticsSummary => {
  const start = getRangeStart(currentDate, period);
  const end = getRangeEnd(currentDate, period);
  const normalizedUnits = normalizeWeightUnit(preferredUnits);

  const windowEntries = entries.filter((entry) => {
    const date = parseDate(entry.date);
    return date && date >= start && date <= end && !entry.skipped;
  });

  const completedEntryDates = Array.from(
    new Set(
      windowEntries
        .filter((entry) => isCompletedEntry(entry))
        .map((entry) => toDateKey(parseDate(entry.date) as Date))
    )
  );

  let plannedWorkouts = 0;
  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const dayStatus = statusMap[toDateKey(cursor)];
    if (dayStatus && (dayStatus.hasRecurring || dayStatus.exerciseCount > 0)) {
      plannedWorkouts += 1;
    }
  }

  const totalSets = windowEntries.reduce(
    (sum, entry) => sum + getCompletedSets(entry).length,
    0
  );
  const totalVolumeInLb = windowEntries.reduce(
    (sum, entry) =>
      sum + getCompletedSets(entry).reduce((setSum, set) => setSum + getSetVolume(set), 0),
    0
  );

  const muscleCounts = new Map<string, number>();
  windowEntries.forEach((entry) => {
    const completedSets = getCompletedSets(entry).length;
    if (!completedSets) {
      return;
    }
    const group = classifyMuscleGroup(String(entry.name ?? ""));
    muscleCounts.set(group, (muscleCounts.get(group) || 0) + completedSets);
  });

  const muscleDistribution = [...muscleCounts.entries()]
    .map(([group, sets]) => ({
      group,
      sets,
      share: totalSets > 0 ? Math.round((sets / totalSets) * 100) : 0,
    }))
    .sort((left, right) => right.sets - left.sets)
    .slice(0, 6);

  const entriesByExercise = windowEntries.reduce<Record<string, WorkoutEntryDoc[]>>((acc, entry) => {
    const key = String(entry.exerciseId ?? entry.name ?? "").trim();
    if (!key) {
      return acc;
    }
    acc[key] = [...(acc[key] || []), entry];
    return acc;
  }, {});

  const liftTrendHighlights = Object.entries(entriesByExercise)
    .map(([exerciseId, exerciseEntries]) => {
      const summary = buildExerciseProgressSummary(exerciseEntries);
      const highlight = getProgressTrendHighlight(summary, normalizedUnits);
      if (!highlight) {
        return null;
      }
      return {
        exerciseId,
        exerciseName: String(exerciseEntries[0]?.name ?? "Exercise"),
        ...highlight,
      };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value))
    .slice(0, 5);

  return {
    period,
    label: period === "week" ? "This week" : "This month",
    completedWorkouts: completedEntryDates.length,
    plannedWorkouts,
    totalSets,
    totalVolume:
      Math.round(fromCanonicalWeightLb(totalVolumeInLb, normalizedUnits)) || 0,
    workoutStreak: getWorkoutStreak(completedEntryDates),
    consistencyRate:
      plannedWorkouts > 0 ? Math.round((completedEntryDates.length / plannedWorkouts) * 100) : 0,
    muscleDistribution,
    liftTrendHighlights,
  };
};

export const buildExerciseHistorySummary = ({
  entries,
  preferredUnits,
  range,
}: {
  entries: WorkoutEntryDoc[];
  preferredUnits?: WeightUnit | null;
  range: ExerciseHistoryRange;
}): ExerciseHistorySummary => {
  const normalizedUnits = normalizeWeightUnit(preferredUnits);
  const sortedEntries = [...entries]
    .filter((entry) => !entry.skipped)
    .sort((left, right) => {
      const leftTime = parseDate(left.date)?.getTime() ?? 0;
      const rightTime = parseDate(right.date)?.getTime() ?? 0;
      return rightTime - leftTime;
    });

  const cutoff =
    range === "all"
      ? null
      : new Date(Date.now() - (range === "30d" ? 30 : 90) * DAY_MS);

  const filteredEntries = sortedEntries.filter((entry) => {
    if (!cutoff) {
      return true;
    }
    const date = parseDate(entry.date);
    return Boolean(date && date >= cutoff);
  });

  const chartPoints = filteredEntries
    .slice()
    .reverse()
    .map((entry) => {
      const completedSets = getCompletedSets(entry);
      const date = parseDate(entry.date);
      const repSet = getRepresentativeRepSet(completedSets);
      const load = getRepresentativeLoad(completedSets);
      const reps = repSet?.reps ?? null;
      const estimatedStrength = estimateStrength(load, reps);
      const volume = completedSets.reduce((sum, set) => sum + getSetVolume(set), 0);

      return {
        label: date
          ? date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
          : "Unknown",
        date: date ? date.toISOString() : "",
        load: load ? Math.round(fromCanonicalWeightLb(load, normalizedUnits) * 10) / 10 : null,
        reps,
        volume:
          volume > 0 ? Math.round(fromCanonicalWeightLb(volume, normalizedUnits)) : null,
        estimatedStrength:
          estimatedStrength !== null
            ? Math.round(fromCanonicalWeightLb(estimatedStrength, normalizedUnits) * 10) / 10
            : null,
      };
    });

  const allCompletedSets = sortedEntries.flatMap((entry) => getCompletedSets(entry));
  const lifetimeBestLoad = getRepresentativeLoad(allCompletedSets);
  const lifetimeBestRepSet = getRepresentativeRepSet(allCompletedSets);
  const lifetimeBestEstimatedStrength = allCompletedSets.reduce<number | null>((best, set) => {
    const reps = Number(set.actualReps ?? set.reps ?? 0);
    const weight =
      getCanonicalWeightFromSet(set, "actual") ?? getCanonicalWeightFromSet(set, "planned");
    const estimate = estimateStrength(weight, reps);
    if (!estimate) {
      return best;
    }
    return best === null ? estimate : Math.max(best, estimate);
  }, null);

  return {
    lifetimeBestLoad:
      lifetimeBestLoad !== null
        ? Math.round(fromCanonicalWeightLb(lifetimeBestLoad, normalizedUnits) * 10) / 10
        : null,
    lifetimeBestRepSet:
      lifetimeBestRepSet
        ? `${formatWeight(
            fromCanonicalWeightLb(lifetimeBestRepSet.weight, normalizedUnits),
            normalizedUnits
          )} x ${lifetimeBestRepSet.reps}`
        : null,
    lifetimeBestEstimatedStrength:
      lifetimeBestEstimatedStrength !== null
        ? Math.round(
            fromCanonicalWeightLb(lifetimeBestEstimatedStrength, normalizedUnits) * 10
          ) / 10
        : null,
    chartPoints,
    recentSessions: filteredEntries.slice(0, 6).map((entry) => {
      const completedSets = getCompletedSets(entry);
      const date = parseDate(entry.date);
      const repSet = getRepresentativeRepSet(completedSets);
      const load = getRepresentativeLoad(completedSets);
      const reps = repSet?.reps ?? null;
      const estimatedStrength = estimateStrength(load, reps);
      const volume = completedSets.reduce((sum, set) => sum + getSetVolume(set), 0);

      return {
        date:
          date?.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) ||
          "Unknown",
        routineName: String(entry.routineName ?? "Workout"),
        load: load ? Math.round(fromCanonicalWeightLb(load, normalizedUnits) * 10) / 10 : null,
        reps,
        volume:
          volume > 0 ? Math.round(fromCanonicalWeightLb(volume, normalizedUnits)) : null,
        estimatedStrength:
          estimatedStrength !== null
            ? Math.round(fromCanonicalWeightLb(estimatedStrength, normalizedUnits) * 10) / 10
            : null,
      };
    }),
  };
};
