import { ExerciseSet, WeightUnit, WorkoutEntryDoc } from "./types";
import {
  formatWeight,
  formatWeightValue,
  fromCanonicalWeightLb,
  getCanonicalWeightFromSet,
  normalizeWeightUnit,
} from "./weightUnits";

const coercePositiveNumber = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
};

const roundToOneDecimal = (value: number) => Math.round(value * 10) / 10;

type NormalizedCompletedWeightSet = Omit<
  ExerciseSet,
  "actualWeight" | "actualReps"
> & {
  actualWeight: number;
  actualReps: number;
};

export type RepPerformance = {
  weight: number;
  reps: number;
};

export type PersonalRecordCategory =
  | "estimated_1rm"
  | "heaviest_weight"
  | "rep_performance";

export type PersonalRecordHighlight = {
  category: PersonalRecordCategory;
  label: string;
  detail: string;
};

export type ProgressTrendStatus = "new" | "up" | "steady" | "down";

export type ProgressTrendHighlight = {
  status: ProgressTrendStatus;
  label: string;
  benchmark: string;
  detail: string;
};

export type ExerciseProgressSummary = {
  latestEstimated1RM: number | null;
  previousEstimated1RM: number | null;
  bestEstimated1RMEver: number | null;
  heaviestWeightEver: number | null;
  bestRepPerformance: RepPerformance | null;
  latestWorkoutBrokePR: boolean;
  latestWorkoutPRCategories: PersonalRecordCategory[];
  previousHeaviestWeight: number | null;
  previousBestRepPerformance: RepPerformance | null;
};

export type ProgressCoachContext = {
  exerciseName: string;
  userName?: string | null;
  sex?: string | null;
  age?: string | null;
  preferredUnits?: "lb" | "kg" | null;
};

export const estimateOneRepMax = (weight: number, reps: number): number => {
  if (weight <= 0 || reps <= 0) {
    return 0;
  }

  return weight * (1 + reps / 30);
};

const getNormalizedCompletedWeightSets = (
  entry: WorkoutEntryDoc
): NormalizedCompletedWeightSet[] => {
  const sets = Array.isArray(entry.sets) ? entry.sets : [];

  return sets
    .map((set) => {
      const actualWeight = coercePositiveNumber((set as any)?.actualWeight);
      const actualReps = coercePositiveNumber((set as any)?.actualReps);
      const actualWeightInLb = getCanonicalWeightFromSet(set as ExerciseSet, "actual");

      if (
        !(set as any)?.complete ||
        actualWeight === null ||
        actualReps === null ||
        actualWeightInLb === null
      ) {
        return null;
      }

      return {
        ...set,
        actualWeight: actualWeightInLb,
        actualReps,
      } as NormalizedCompletedWeightSet;
    })
    .filter((set): set is NormalizedCompletedWeightSet => set !== null);
};

export const getCompletedWeightSets = (entry: WorkoutEntryDoc): ExerciseSet[] => {
  return getNormalizedCompletedWeightSets(entry) as ExerciseSet[];
};

export const getBestEstimated1RMForEntry = (
  entry: WorkoutEntryDoc
): number | null => {
  const completedSets = getNormalizedCompletedWeightSets(entry);

  if (completedSets.length === 0) {
    return null;
  }

  const bestEstimate = completedSets.reduce((best, set) => {
    const estimate = estimateOneRepMax(
      Number((set as any).actualWeight),
      Number((set as any).actualReps)
    );
    return Math.max(best, estimate);
  }, 0);

  return bestEstimate > 0 ? roundToOneDecimal(bestEstimate) : null;
};

export const getExercisePRs = (
  entries: WorkoutEntryDoc[]
): {
  bestEstimated1RM: number | null;
  heaviestWeight: number | null;
  bestRepPerformance: RepPerformance | null;
} => {
  const completedSets = entries.flatMap((entry) =>
    getNormalizedCompletedWeightSets(entry)
  );

  if (completedSets.length === 0) {
    return {
      bestEstimated1RM: null,
      heaviestWeight: null,
      bestRepPerformance: null,
    };
  }

  let bestEstimated1RM: number | null = null;
  let heaviestWeight: number | null = null;
  let bestRepPerformance: RepPerformance | null = null;

  for (const set of completedSets) {
    const weight = set.actualWeight;
    const reps = set.actualReps;
    const estimated1RM = estimateOneRepMax(weight, reps);

    if (estimated1RM > 0) {
      bestEstimated1RM =
        bestEstimated1RM === null
          ? estimated1RM
          : Math.max(bestEstimated1RM, estimated1RM);
    }

    heaviestWeight =
      heaviestWeight === null ? weight : Math.max(heaviestWeight, weight);

    if (
      bestRepPerformance === null ||
      weight > bestRepPerformance.weight ||
      (weight === bestRepPerformance.weight && reps > bestRepPerformance.reps)
    ) {
      bestRepPerformance = { weight, reps };
    }
  }

  return {
    bestEstimated1RM:
      bestEstimated1RM === null ? null : roundToOneDecimal(bestEstimated1RM),
    heaviestWeight,
    bestRepPerformance,
  };
};

const getBestRepPerformanceForEntry = (
  entry: WorkoutEntryDoc
): RepPerformance | null => {
  const completedSets = getNormalizedCompletedWeightSets(entry);

  if (completedSets.length === 0) {
    return null;
  }

  return completedSets.reduce<RepPerformance | null>((best, set) => {
    const candidate = {
      weight: set.actualWeight,
      reps: set.actualReps,
    };

    if (
      best === null ||
      candidate.weight > best.weight ||
      (candidate.weight === best.weight && candidate.reps > best.reps)
    ) {
      return candidate;
    }

    return best;
  }, null);
};

const getComparableTimestamp = (entry: WorkoutEntryDoc) => {
  const rawDate = entry.date;
  const parsed =
    rawDate instanceof Date ? rawDate : typeof rawDate === "string" ? new Date(rawDate) : null;
  return parsed && !Number.isNaN(+parsed) ? parsed.getTime() : 0;
};

const isBetterRepPerformance = (
  candidate: RepPerformance | null,
  baseline: RepPerformance | null
) => {
  if (!candidate) {
    return false;
  }

  if (!baseline) {
    return true;
  }

  return (
    candidate.weight > baseline.weight ||
    (candidate.weight === baseline.weight && candidate.reps > baseline.reps)
  );
};

export const buildExerciseProgressSummary = (
  entries: WorkoutEntryDoc[]
): ExerciseProgressSummary => {
  const sortedEntries = [...entries].sort(
    (a, b) => getComparableTimestamp(b) - getComparableTimestamp(a)
  );

  const qualifyingEntries = sortedEntries.filter(
    (entry) => getCompletedWeightSets(entry).length > 0
  );

  const latestEntry = qualifyingEntries[0] ?? null;
  const previousEntries = latestEntry ? qualifyingEntries.slice(1) : [];

  const latestEstimated1RM = latestEntry
    ? getBestEstimated1RMForEntry(latestEntry)
    : null;
  const previousEstimated1RM =
    qualifyingEntries.length > 1
      ? getBestEstimated1RMForEntry(qualifyingEntries[1])
      : null;

  const latestPRs = latestEntry ? getExercisePRs([latestEntry]) : null;
  const historicalPRs = getExercisePRs(qualifyingEntries);
  const previousPRs = getExercisePRs(previousEntries);
  const latestBestRepPerformance = latestEntry
    ? getBestRepPerformanceForEntry(latestEntry)
    : null;

  const latestWorkoutBrokePR = Boolean(
    latestEntry &&
      (((latestPRs?.bestEstimated1RM ?? null) !== null &&
        ((previousPRs.bestEstimated1RM ?? null) === null ||
          (latestPRs?.bestEstimated1RM ?? 0) > (previousPRs.bestEstimated1RM ?? 0))) ||
        ((latestPRs?.heaviestWeight ?? null) !== null &&
          ((previousPRs.heaviestWeight ?? null) === null ||
            (latestPRs?.heaviestWeight ?? 0) > (previousPRs.heaviestWeight ?? 0))) ||
        isBetterRepPerformance(latestBestRepPerformance, previousPRs.bestRepPerformance))
  );

  const latestWorkoutPRCategories: PersonalRecordCategory[] = [];
  if (
    (latestPRs?.bestEstimated1RM ?? null) !== null &&
    ((previousPRs.bestEstimated1RM ?? null) === null ||
      (latestPRs?.bestEstimated1RM ?? 0) > (previousPRs.bestEstimated1RM ?? 0))
  ) {
    latestWorkoutPRCategories.push("estimated_1rm");
  }

  if (
    (latestPRs?.heaviestWeight ?? null) !== null &&
    ((previousPRs.heaviestWeight ?? null) === null ||
      (latestPRs?.heaviestWeight ?? 0) > (previousPRs.heaviestWeight ?? 0))
  ) {
    latestWorkoutPRCategories.push("heaviest_weight");
  }

  if (isBetterRepPerformance(latestBestRepPerformance, previousPRs.bestRepPerformance)) {
    latestWorkoutPRCategories.push("rep_performance");
  }

  return {
    latestEstimated1RM,
    previousEstimated1RM,
    bestEstimated1RMEver: historicalPRs.bestEstimated1RM,
    heaviestWeightEver: historicalPRs.heaviestWeight,
    bestRepPerformance: historicalPRs.bestRepPerformance,
    latestWorkoutBrokePR,
    latestWorkoutPRCategories,
    previousHeaviestWeight: previousPRs.heaviestWeight,
    previousBestRepPerformance: previousPRs.bestRepPerformance,
  };
};

const buildUserIntro = (userName?: string | null) => {
  const trimmed = String(userName ?? "").trim();
  if (!trimmed) {
    return "Coach note";
  }

  const firstName = trimmed.split(/\s+/)[0];
  return `${firstName},`;
};

const formatLoad = (value: number | null, preferredUnits?: WeightUnit | null) => {
  if (value === null) {
    return null;
  }

  return formatWeight(
    fromCanonicalWeightLb(value, normalizeWeightUnit(preferredUnits)),
    normalizeWeightUnit(preferredUnits)
  );
};

export const getProgressTrendHighlight = (
  summary: ExerciseProgressSummary | null | undefined,
  preferredUnits?: WeightUnit | null
): ProgressTrendHighlight | null => {
  if (!summary) {
    return null;
  }

  const latestEstimated1RM = summary.latestEstimated1RM;
  const previousEstimated1RM = summary.previousEstimated1RM;

  if (latestEstimated1RM === null) {
    if (!summary.bestRepPerformance) {
      return null;
    }

    return {
      status: "new",
      label: "Baseline logged",
      benchmark: "Best set on file",
      detail: "You have enough recent work logged to start comparing future sessions.",
    };
  }

  const latest = formatLoad(latestEstimated1RM, preferredUnits);
  const previous = formatLoad(previousEstimated1RM, preferredUnits);
  const delta =
    latestEstimated1RM !== null && previousEstimated1RM !== null
      ? roundToOneDecimal(
          fromCanonicalWeightLb(
            latestEstimated1RM - previousEstimated1RM,
            normalizeWeightUnit(preferredUnits)
          )
        )
      : null;

  if (previousEstimated1RM === null) {
    return {
      status: "new",
      label: "First benchmark",
      benchmark: latest ? `Current est. 1RM ${latest}` : "First benchmark logged",
      detail: "This session sets the baseline. The next comparable workout will show the change.",
    };
  }

  if (delta !== null && delta > 0) {
    return {
      status: "up",
      label: "Trending up",
      benchmark: latest ? `Up ${delta} vs last workout` : `Up ${delta} vs last workout`,
      detail:
        previous && latest
          ? `Estimated strength moved from about ${previous} to ${latest}.`
          : "Recent performance improved versus the last benchmark.",
    };
  }

  if (delta !== null && delta < 0) {
    return {
      status: "down",
      label: "Lighter than last time",
      benchmark: `Down ${Math.abs(delta)} vs last workout`,
      detail:
        "That is feedback, not failure. A lighter day can still set up the next solid session.",
    };
  }

  return {
    status: "steady",
    label: "Holding steady",
    benchmark: latest ? `Holding around ${latest}` : "Holding steady",
    detail: "No clear change versus the last workout yet. Keep stacking clean reps for a stronger signal.",
  };
};

export const getPersonalRecordHighlights = (
  summary: ExerciseProgressSummary | null | undefined,
  preferredUnits?: WeightUnit | null
): PersonalRecordHighlight[] => {
  if (!summary || !summary.latestWorkoutPRCategories.length) {
    return [];
  }

  const highlights: PersonalRecordHighlight[] = [];

  for (const category of summary.latestWorkoutPRCategories) {
    if (category === "estimated_1rm" && summary.latestEstimated1RM !== null) {
      const latest = formatLoad(summary.latestEstimated1RM, preferredUnits);
      if (latest) {
        highlights.push({
          category,
          label: "Estimated 1RM PR",
          detail: latest,
        });
      }
      continue;
    }

    if (category === "heaviest_weight" && summary.heaviestWeightEver !== null) {
      const heaviest = formatLoad(summary.heaviestWeightEver, preferredUnits);
      if (heaviest) {
        highlights.push({
          category,
          label: "Load PR",
          detail: heaviest,
        });
      }
      continue;
    }

    if (category === "rep_performance" && summary.bestRepPerformance) {
      const repSetWeight = formatLoad(summary.bestRepPerformance.weight, preferredUnits);
      if (repSetWeight) {
        highlights.push({
          category,
          label: "Rep PR",
          detail: `${repSetWeight} x ${summary.bestRepPerformance.reps}`,
        });
      }
    }
  }

  return highlights;
};

export const buildProgressCoachMessage = (
  summary: ExerciseProgressSummary | null | undefined,
  context: ProgressCoachContext
) => {
  if (!summary) {
    return null;
  }

  const intro = buildUserIntro(context.userName);
  const exerciseName = context.exerciseName || "this lift";
  const latestEstimated1RM = summary.latestEstimated1RM;
  const previousEstimated1RM = summary.previousEstimated1RM;
  const delta =
    latestEstimated1RM !== null && previousEstimated1RM !== null
      ? roundToOneDecimal(latestEstimated1RM - previousEstimated1RM)
      : null;
  const isFirstMeaningfulBenchmark = previousEstimated1RM === null;

  if (isFirstMeaningfulBenchmark && summary.bestRepPerformance) {
    return `${intro} solid first logged benchmark on ${exerciseName}. Keep stacking clean sets like that and the app will start dialing your recommendations in more accurately.`;
  }

  if (summary.latestWorkoutBrokePR && !isFirstMeaningfulBenchmark) {
    const bestEver = formatLoad(
      summary.bestEstimated1RMEver ?? latestEstimated1RM,
      context.preferredUnits
    );

    return `${intro} you set a new PR on ${exerciseName}. That kind of steady progress is exactly what we want to build on.${bestEver ? ` Your best estimated 1RM is now around ${bestEver}.` : ""}`;
  }

  if (delta !== null && delta > 0) {
    const normalizedUnit = normalizeWeightUnit(context.preferredUnits);
    const latest = formatLoad(latestEstimated1RM, context.preferredUnits);
    const previous = formatLoad(previousEstimated1RM, context.preferredUnits);
    const convertedDelta = formatWeightValue(
      fromCanonicalWeightLb(delta, normalizedUnit)
    );

    return `${intro} this was real progress on ${exerciseName}. Your estimated strength moved up by ${convertedDelta} ${normalizedUnit}${previous && latest ? `, from about ${previous} to ${latest}` : ""}. Those steady jumps are usually the ones that last.`;
  }

  if (summary.bestRepPerformance) {
    return `${intro} you kept useful work on the board for ${exerciseName}. Consistency like that is what sets up the next clean jump.`;
  }

  return null;
};
