import { ExerciseSet, WeightUnit, WorkoutEntryDoc } from "./types";
import {
  fromCanonicalWeightLb,
  getCanonicalWeightFromSet,
  normalizeWeightUnit,
  roundToWeightIncrement,
  toCanonicalWeightLb,
} from "./weightUnits";

type SupportedTrainingGoal =
  | "strength"
  | "hypertrophy"
  | "endurance"
  | "muscle"
  | "conditioning"
  | "fat_loss"
  | "consistency"
  | string
  | undefined;

type NormalizedPerformanceSet = {
  actualWeight: number;
  actualReps: number;
  plannedWeight: number | null;
  plannedReps: number | null;
  complete: boolean;
};

type GoalProfile = {
  label: "strength" | "hypertrophy" | "endurance";
  defaultReps: number;
  minReps: number;
  maxReps: number;
  successIncreasePct: number;
  aggressiveIncreasePct: number;
  underperformDecreasePct: number;
  lightIncrement: number;
  heavyIncrement: number;
};

type CompletionStatus = "success" | "aggressive" | "underperformed";

type EntryPerformanceSummary = {
  entry: WorkoutEntryDoc;
  date: Date | null;
  sets: NormalizedPerformanceSet[];
  representativeSet: NormalizedPerformanceSet | null;
  averageWeight: number | null;
  averageReps: number | null;
  medianEstimated1RM: number | null;
  signal: {
    status: CompletionStatus;
    reason: string;
  };
  removedOutlierSetCount: number;
};

type SkipExposureAdjustment = {
  recentSkipCount: number;
  loadMultiplier: number;
  setDelta: number;
  note: string;
};

type ReturnRampState = {
  active: boolean;
  gapDays: number | null;
  phase: number;
  totalPhases: number;
  loadMultiplier: number;
  setDelta: number;
  note: string;
};

export type ExerciseRecommendation = {
  recommendedWeight: number | null;
  weightUnit?: WeightUnit;
  recommendedReps: number | null;
  recommendedSets: number | null;
  reason: string;
  basedOn: {
    topSetWeight: number;
    topSetReps: number;
    averageWeight: number;
    averageReps: number;
    setsCompleted: number;
    date: string | null;
  } | null;
  daysSinceLastWorkout: number | null;
  progressionStyle: "strength" | "hypertrophy" | "endurance";
  comparison: {
    previousWeight: number | null;
    previousReps: number | null;
    currentTargetWeight: number | null;
    currentTargetReps: number | null;
    deltaWeight: number | null;
    benchmarkDate: string | null;
    firstBenchmark: boolean;
    summary: string;
  } | null;
  fatigue: {
    score: number;
    state: "fresh" | "building" | "high" | "deload";
    consecutiveHighFatigueExposures: number;
    deloadTriggered: boolean;
    signalReasons: string[];
  } | null;
  plateau: {
    consecutiveStalls: number;
    threshold: number;
    triggered: boolean;
    intervention: "none" | "deload" | "rep_reset";
    reramp: boolean;
    signalReasons: string[];
  } | null;
};

export type InWorkoutAdjustment = {
  weight: number | null;
  reps: number | null;
  reason: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_BASELINE_WINDOW = 5;
const SIGNAL_CONFIRMATION_EXPOSURES = 2;
const HIGH_OUTLIER_E1RM_FACTOR = 1.35;
const LOW_OUTLIER_E1RM_FACTOR = 0.65;
const DEFAULT_PLATEAU_THRESHOLD = 3;

const GOAL_PROFILES: Record<"strength" | "hypertrophy" | "endurance", GoalProfile> =
  {
    strength: {
      label: "strength",
      defaultReps: 5,
      minReps: 3,
      maxReps: 6,
      successIncreasePct: 0.03,
      aggressiveIncreasePct: 0.06,
      underperformDecreasePct: 0.04,
      lightIncrement: 5,
      heavyIncrement: 10,
    },
    hypertrophy: {
      label: "hypertrophy",
      defaultReps: 8,
      minReps: 6,
      maxReps: 12,
      successIncreasePct: 0.025,
      aggressiveIncreasePct: 0.05,
      underperformDecreasePct: 0.03,
      lightIncrement: 5,
      heavyIncrement: 5,
    },
    endurance: {
      label: "endurance",
      defaultReps: 12,
      minReps: 10,
      maxReps: 15,
      successIncreasePct: 0.02,
      aggressiveIncreasePct: 0.04,
      underperformDecreasePct: 0.02,
      lightIncrement: 5,
      heavyIncrement: 5,
    },
  };

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

const normalizeTrainingGoal = (
  trainingGoal?: SupportedTrainingGoal
): GoalProfile => {
  switch ((trainingGoal ?? "").toLowerCase()) {
    case "strength":
      return GOAL_PROFILES.strength;
    case "endurance":
    case "conditioning":
    case "fat_loss":
      return GOAL_PROFILES.endurance;
    case "hypertrophy":
    case "muscle":
    case "consistency":
    default:
      return GOAL_PROFILES.hypertrophy;
  }
};

const parseEntryDate = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(+value) ? null : value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(+parsed) ? null : parsed;
  }

  return null;
};

const toIsoDate = (value: Date | null) => {
  if (!value) {
    return null;
  }

  return value.toISOString().slice(0, 10);
};

const getDaysSince = (date: Date | null, now = new Date()) => {
  if (!date) {
    return null;
  }

  const diff = now.getTime() - date.getTime();
  if (diff < 0) {
    return 0;
  }

  return Math.floor(diff / DAY_MS);
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const roundToIncrement = (value: number, increment: number) => {
  if (!Number.isFinite(value) || increment <= 0) {
    return value;
  }

  return Math.round(value / increment) * increment;
};

const roundDisplayWeight = (value: number, increment: number) =>
  Math.round(roundToIncrement(value, increment) * 10) / 10;

type ExerciseLoadProfile = {
  displayIncrement: number;
  canonicalIncrementLb: number;
  classification: "small" | "upper_compound" | "lower_compound" | "general";
};

const SMALL_LIFT_KEYWORDS = [
  "curl",
  "raise",
  "fly",
  "triceps",
  "pushdown",
  "extension",
  "calf",
  "lateral",
  "rear delt",
  "reverse fly",
  "face pull",
  "rehab",
  "rotator",
];

const LOWER_COMPOUND_KEYWORDS = [
  "squat",
  "deadlift",
  "leg press",
  "hip thrust",
  "hack squat",
  "trap bar",
  "rdl",
  "romanian deadlift",
];

const UPPER_COMPOUND_KEYWORDS = [
  "bench",
  "press",
  "row",
  "pull-up",
  "pulldown",
  "chin-up",
  "overhead",
  "incline",
];

const getExerciseLoadProfile = ({
  exerciseName,
  preferredUnits,
  baseWeightLb,
}: {
  exerciseName?: string;
  preferredUnits: WeightUnit;
  baseWeightLb: number;
}): ExerciseLoadProfile => {
  const normalizedName = String(exerciseName || "").toLowerCase();
  const isSmallLift = SMALL_LIFT_KEYWORDS.some((keyword) =>
    normalizedName.includes(keyword)
  );
  const isLowerCompound = LOWER_COMPOUND_KEYWORDS.some((keyword) =>
    normalizedName.includes(keyword)
  );
  const isUpperCompound = UPPER_COMPOUND_KEYWORDS.some((keyword) =>
    normalizedName.includes(keyword)
  );

  const displayIncrement = isSmallLift
    ? preferredUnits === "kg"
      ? 0.5
      : 2.5
    : isLowerCompound || isUpperCompound || baseWeightLb >= 225
    ? preferredUnits === "kg"
      ? 2.5
      : 5
    : preferredUnits === "kg"
    ? 1
    : 2.5;

  return {
    displayIncrement,
    canonicalIncrementLb: toCanonicalWeightLb(displayIncrement, preferredUnits),
    classification: isSmallLift
      ? "small"
      : isLowerCompound || baseWeightLb >= 225
      ? "lower_compound"
      : isUpperCompound
      ? "upper_compound"
      : "general",
  };
};

const roundRecommendedWeight = (
  weightInLb: number,
  profile: GoalProfile,
  preferredUnits: WeightUnit,
  incrementOverride?: number
) => {
  const convertedWeight = fromCanonicalWeightLb(weightInLb, preferredUnits);
  const roundedWeight =
    typeof incrementOverride === "number" && incrementOverride > 0
      ? roundDisplayWeight(convertedWeight, incrementOverride)
      : roundToWeightIncrement(convertedWeight, preferredUnits);
  if (roundedWeight > 0) {
    return roundedWeight;
  }

  const minimumIncrement =
    preferredUnits === "kg"
      ? fromCanonicalWeightLb(profile.lightIncrement, preferredUnits)
      : profile.lightIncrement;

  return convertedWeight >= minimumIncrement
    ? minimumIncrement
    : Math.max(preferredUnits === "kg" ? 0.5 : 1, Math.round(convertedWeight));
};

const estimateSetE1RM = (set: NormalizedPerformanceSet) =>
  set.actualWeight * (1 + set.actualReps / 30);

const getNormalizedCompletedWeightSets = (
  entry: WorkoutEntryDoc
): NormalizedPerformanceSet[] => {
  const sets = Array.isArray(entry.sets) ? entry.sets : [];

  return sets
    .map((set) => {
      const actualWeight = getCanonicalWeightFromSet(set as ExerciseSet, "actual");
      const actualReps = coercePositiveNumber((set as any)?.actualReps);

      if (!(set as any)?.complete || actualWeight === null || actualReps === null) {
        return null;
      }

      return {
        actualWeight,
        actualReps,
        plannedWeight: getCanonicalWeightFromSet(set as ExerciseSet, "planned"),
        plannedReps: coercePositiveNumber((set as any)?.reps),
        complete: true,
      };
    })
    .filter((set): set is NormalizedPerformanceSet => set !== null);
};

const getRepresentativeSet = (sets: NormalizedPerformanceSet[]) => {
  return sets.reduce<NormalizedPerformanceSet | null>((best, set) => {
    if (
      best === null ||
      set.actualWeight > best.actualWeight ||
      (set.actualWeight === best.actualWeight && set.actualReps > best.actualReps)
    ) {
      return set;
    }

    return best;
  }, null);
};

const getMedianEstimated1RM = (sets: NormalizedPerformanceSet[]) => {
  const estimates = sets
    .map((set) => estimateSetE1RM(set))
    .filter((value) => Number.isFinite(value) && value > 0);

  return getMedian(estimates);
};

const rejectOutlierSets = (sets: NormalizedPerformanceSet[]) => {
  if (sets.length < 3) {
    return {
      cleanedSets: sets,
      removedOutlierSetCount: 0,
    };
  }

  const medianEstimated1RM = getMedianEstimated1RM(sets);

  if (medianEstimated1RM === null) {
    return {
      cleanedSets: sets,
      removedOutlierSetCount: 0,
    };
  }

  const cleanedSets = sets.filter((set) => {
    const estimate = estimateSetE1RM(set);
    return (
      estimate <= medianEstimated1RM * HIGH_OUTLIER_E1RM_FACTOR &&
      estimate >= medianEstimated1RM * LOW_OUTLIER_E1RM_FACTOR
    );
  });

  if (cleanedSets.length < Math.ceil(sets.length / 2)) {
    return {
      cleanedSets: sets,
      removedOutlierSetCount: 0,
    };
  }

  return {
    cleanedSets,
    removedOutlierSetCount: sets.length - cleanedSets.length,
  };
};

const getGoalAdjustmentStrategy = (profile: GoalProfile) => {
  if (profile.label === "strength") {
    return {
      smallMissWeightDrop: 0.025,
      mediumMissWeightDrop: 0.05,
      largeMissWeightDrop: 0.08,
      smallMissRepDrop: 0,
      mediumMissRepDrop: 1,
      largeMissRepDrop: 2,
      beatTargetWeightBump: 0.02,
      beatTargetRepBump: 0,
      preserve: "load",
    } as const;
  }

  if (profile.label === "endurance") {
    return {
      smallMissWeightDrop: 0.03,
      mediumMissWeightDrop: 0.06,
      largeMissWeightDrop: 0.1,
      smallMissRepDrop: 0,
      mediumMissRepDrop: 0,
      largeMissRepDrop: 1,
      beatTargetWeightBump: 0.01,
      beatTargetRepBump: 1,
      preserve: "volume",
    } as const;
  }

  return {
    smallMissWeightDrop: 0.03,
    mediumMissWeightDrop: 0.055,
    largeMissWeightDrop: 0.09,
    smallMissRepDrop: 0,
    mediumMissRepDrop: 1,
    largeMissRepDrop: 1,
    beatTargetWeightBump: 0.015,
    beatTargetRepBump: 0,
    preserve: "stimulus",
  } as const;
};

const getAverageActualWeight = (sets: NormalizedPerformanceSet[]) => {
  if (!sets.length) {
    return null;
  }

  const total = sets.reduce((sum, set) => sum + set.actualWeight, 0);
  return total / sets.length;
};

const getAverageActualReps = (sets: NormalizedPerformanceSet[]) => {
  if (!sets.length) {
    return null;
  }

  const total = sets.reduce((sum, set) => sum + set.actualReps, 0);
  return total / sets.length;
};

const getLatestCompletedWeightEntry = (entries: WorkoutEntryDoc[]) => {
  const sorted = [...entries].sort((a, b) => {
    const aTime = parseEntryDate(a.date)?.getTime() ?? 0;
    const bTime = parseEntryDate(b.date)?.getTime() ?? 0;
    return bTime - aTime;
  });

  return (
    sorted.find(
      (entry) => entry.complete && getNormalizedCompletedWeightSets(entry).length > 0
    ) ?? null
  );
};

const getPlannedSetCount = (entry: WorkoutEntryDoc) => {
  const sets = Array.isArray(entry.sets) ? entry.sets : [];
  return sets.length > 0 ? sets.length : null;
};

const hasIntentionalLowVolumeFlag = (entry: WorkoutEntryDoc) =>
  Boolean(
    (entry as WorkoutEntryDoc & {
      intentionalLowVolume?: boolean;
      reducedVolumeIntentional?: boolean;
      volumeReductionIntentional?: boolean;
    }).intentionalLowVolume ||
      (entry as WorkoutEntryDoc & {
        intentionalLowVolume?: boolean;
        reducedVolumeIntentional?: boolean;
        volumeReductionIntentional?: boolean;
      }).reducedVolumeIntentional ||
      (entry as WorkoutEntryDoc & {
        intentionalLowVolume?: boolean;
        reducedVolumeIntentional?: boolean;
        volumeReductionIntentional?: boolean;
      }).volumeReductionIntentional
  );

const getMedian = (values: number[]) => {
  if (!values.length) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }

  return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
};

const getSetCountBaselineFromEntry = (entry: WorkoutEntryDoc) => {
  const plannedSetCount = getPlannedSetCount(entry);
  const completedSetCount = getNormalizedCompletedWeightSets(entry).length;

  if (hasIntentionalLowVolumeFlag(entry) && completedSetCount > 0) {
    return completedSetCount;
  }

  if (plannedSetCount !== null) {
    return plannedSetCount;
  }

  return completedSetCount > 0 ? completedSetCount : null;
};

const resolveRecommendedSetCount = ({
  entries,
  latestEntry,
  completedSetCount,
}: {
  entries: WorkoutEntryDoc[];
  latestEntry: WorkoutEntryDoc;
  completedSetCount: number;
}) => {
  const plannedSetCount = getPlannedSetCount(latestEntry);
  const latestEntryIsIntentionalLowVolume = hasIntentionalLowVolumeFlag(latestEntry);
  const sortedEntries = [...entries].sort((a, b) => {
    const aTime = parseEntryDate(a.date)?.getTime() ?? 0;
    const bTime = parseEntryDate(b.date)?.getTime() ?? 0;
    return bTime - aTime;
  });
  const recentMedianSetCount = getMedian(
    sortedEntries
      .filter((entry) => entry !== latestEntry)
      .map(getSetCountBaselineFromEntry)
      .filter((value): value is number => value !== null)
      .slice(0, 5)
  );

  if (latestEntryIsIntentionalLowVolume && completedSetCount > 0) {
    return {
      recommendedSets: completedSetCount,
      reason:
        "the last workout was explicitly marked as intentionally reduced volume",
    };
  }

  if (
    plannedSetCount !== null &&
    completedSetCount > 0 &&
    completedSetCount < plannedSetCount
  ) {
    return {
      recommendedSets: plannedSetCount,
      reason:
        "the last workout looks partially logged, so the set count stays anchored to the planned template",
    };
  }

  if (
    recentMedianSetCount !== null &&
    plannedSetCount !== null &&
    plannedSetCount <= 1 &&
    recentMedianSetCount > plannedSetCount
  ) {
    return {
      recommendedSets: recentMedianSetCount,
      reason:
        "the last workout's set count looks sparse compared with your recent baseline, so the app kept the recent median volume",
    };
  }

  if (plannedSetCount !== null) {
    return {
      recommendedSets: plannedSetCount,
      reason: "the planned template from your latest workout",
    };
  }

  if (recentMedianSetCount !== null) {
    return {
      recommendedSets: recentMedianSetCount,
      reason: "your recent median set count",
    };
  }

  if (completedSetCount > 0) {
    return {
      recommendedSets: completedSetCount,
      reason: "the number of completed sets in your latest workout",
    };
  }

  return {
    recommendedSets: null,
    reason: "there was not enough reliable set-count history to estimate volume",
  };
};

const getCompletionSignal = (sets: NormalizedPerformanceSet[]) => {
  const qualifyingWithTargets = sets.filter(
    (set) => set.plannedWeight !== null || set.plannedReps !== null
  );

  if (!qualifyingWithTargets.length) {
    return {
      status: "success" as "success" | "aggressive" | "underperformed",
      reason:
        "using your latest completed performance because there was no reliable planned target to compare against",
    };
  }

  const successfulSets = qualifyingWithTargets.filter((set) => {
    const metWeight =
      set.plannedWeight === null || set.actualWeight >= set.plannedWeight;
    const metReps = set.plannedReps === null || set.actualReps >= set.plannedReps;
    return metWeight && metReps;
  }).length;

  const aggressiveSets = qualifyingWithTargets.filter((set) => {
    const exceededWeight =
      set.plannedWeight !== null && set.actualWeight >= set.plannedWeight * 1.15;
    const exceededReps =
      set.plannedReps !== null && set.actualReps >= set.plannedReps + 3;
    return exceededWeight || exceededReps;
  }).length;

  const underperformedSets = qualifyingWithTargets.filter((set) => {
    const missedWeight =
      set.plannedWeight !== null && set.actualWeight < set.plannedWeight * 0.97;
    const missedReps =
      set.plannedReps !== null && set.actualReps < set.plannedReps;
    return missedWeight || missedReps;
  }).length;

  if (aggressiveSets >= Math.ceil(qualifyingWithTargets.length / 2)) {
    return {
      status: "aggressive" as const,
      reason: "you beat the planned target by a wide margin last time",
    };
  }

  if (underperformedSets >= Math.ceil(qualifyingWithTargets.length / 2)) {
    return {
      status: "underperformed" as const,
      reason: "your last session came in below the planned target",
    };
  }

  if (successfulSets >= Math.ceil(qualifyingWithTargets.length / 2)) {
    return {
      status: "success" as const,
      reason: "you hit the planned target last time",
    };
  }

  return {
    status: "success" as const,
    reason: "your latest completed work is the best current baseline",
  };
};

const buildEntryPerformanceSummary = (
  entry: WorkoutEntryDoc
): EntryPerformanceSummary | null => {
  const rawCompletedSets = getNormalizedCompletedWeightSets(entry);
  const { cleanedSets, removedOutlierSetCount } = rejectOutlierSets(rawCompletedSets);

  if (!cleanedSets.length) {
    return null;
  }

  return {
    entry,
    date: parseEntryDate(entry.date),
    sets: cleanedSets,
    representativeSet: getRepresentativeSet(cleanedSets),
    averageWeight: getAverageActualWeight(cleanedSets),
    averageReps: getAverageActualReps(cleanedSets),
    medianEstimated1RM: getMedianEstimated1RM(cleanedSets),
    signal: getCompletionSignal(cleanedSets),
    removedOutlierSetCount,
  };
};

const getEntriesSortedByDate = (entries: WorkoutEntryDoc[]) =>
  [...entries].sort((a, b) => {
    const aTime = parseEntryDate(a.date)?.getTime() ?? 0;
    const bTime = parseEntryDate(b.date)?.getTime() ?? 0;
    return bTime - aTime;
  });

const getRecentEntrySummaries = (entries: WorkoutEntryDoc[]) =>
  getEntriesSortedByDate(entries)
    .filter((entry) => entry.complete)
    .map(buildEntryPerformanceSummary)
    .filter((summary): summary is EntryPerformanceSummary => summary !== null)
    .slice(0, RECENT_BASELINE_WINDOW);

const getConfirmedStatus = (
  summaries: EntryPerformanceSummary[],
  status: CompletionStatus
) =>
  summaries.length >= SIGNAL_CONFIRMATION_EXPOSURES &&
  summaries
    .slice(0, SIGNAL_CONFIRMATION_EXPOSURES)
    .every((summary) => summary.signal.status === status);

const getHistoricalBaselineSummaries = (summaries: EntryPerformanceSummary[]) => {
  const historical = summaries.slice(1);

  if (historical.length >= 2) {
    return historical;
  }

  return summaries;
};

const getSessionGapDays = (
  newer: EntryPerformanceSummary | null,
  older: EntryPerformanceSummary | null
) => {
  if (!newer?.date || !older?.date) {
    return null;
  }

  return Math.max(
    0,
    Math.round((newer.date.getTime() - older.date.getTime()) / DAY_MS)
  );
};

const getSkipExposureAdjustment = (
  entries: WorkoutEntryDoc[],
  recentSummaries: EntryPerformanceSummary[]
): SkipExposureAdjustment => {
  const latestCompletedDate = recentSummaries[0]?.date ?? null;
  const previousCompletedDate = recentSummaries[1]?.date ?? null;

  if (!latestCompletedDate) {
    return {
      recentSkipCount: 0,
      loadMultiplier: 1,
      setDelta: 0,
      note: "",
    };
  }

  const recentSkipCount = getEntriesSortedByDate(entries).filter((entry) => {
    if (!entry?.skipped) {
      return false;
    }

    const entryDate = parseEntryDate(entry.date);
    if (!entryDate) {
      return false;
    }

    if (entryDate > latestCompletedDate) {
      return true;
    }

    if (
      previousCompletedDate &&
      entryDate < latestCompletedDate &&
      entryDate > previousCompletedDate
    ) {
      return true;
    }

    return false;
  }).length;

  if (recentSkipCount >= 2) {
    return {
      recentSkipCount,
      loadMultiplier: 0.94,
      setDelta: -1,
      note: ` Repeated missed planned exposures (${recentSkipCount}) kept this recommendation lighter so the next session re-establishes rhythm before load climbs again.`,
    };
  }

  if (recentSkipCount === 1) {
    return {
      recentSkipCount,
      loadMultiplier: 0.98,
      setDelta: 0,
      note: " A missed planned exposure kept this recommendation slightly conservative instead of assuming uninterrupted progression.",
    };
  }

  return {
    recentSkipCount: 0,
    loadMultiplier: 1,
    setDelta: 0,
    note: "",
  };
};

const getReturnRampState = (
  recentSummaries: EntryPerformanceSummary[],
  completionSignal: EntryPerformanceSummary["signal"]
): ReturnRampState => {
  const rampSpec = recentSummaries
    .map((summary, index) => {
      if (index === recentSummaries.length - 1) {
        return null;
      }

      const olderSummary = recentSummaries[index + 1];
      const gapDays = getSessionGapDays(summary, olderSummary);
      if (gapDays === null || gapDays < 14) {
        return null;
      }

      if (gapDays >= 42) {
        return {
          gapDays,
          totalPhases: 4,
          loadMultipliers: [0.82, 0.88, 0.94, 1],
          setDeltas: [-2, -1, -1, 0],
        };
      }

      if (gapDays >= 28) {
        return {
          gapDays,
          totalPhases: 3,
          loadMultipliers: [0.88, 0.94, 1],
          setDeltas: [-1, -1, 0],
        };
      }

      return {
        gapDays,
        totalPhases: 2,
        loadMultipliers: [0.94, 1],
        setDeltas: [-1, 0],
      };
    })
    .find((value) => value !== null);

  if (!rampSpec) {
    return {
      active: false,
      gapDays: null,
      phase: 0,
      totalPhases: 0,
      loadMultiplier: 1,
      setDelta: 0,
      note: "",
    };
  }

  const postGapExposureCount =
    recentSummaries.findIndex(
      (summary, index) =>
        index < recentSummaries.length - 1 &&
        getSessionGapDays(summary, recentSummaries[index + 1]) === rampSpec.gapDays
    ) + 1;

  let phaseIndex = Math.min(
    Math.max(postGapExposureCount - 1, 0),
    rampSpec.totalPhases - 1
  );

  if (
    completionSignal.status === "aggressive" &&
    phaseIndex < rampSpec.totalPhases - 1
  ) {
    phaseIndex += 1;
  }

  if (completionSignal.status === "underperformed" && phaseIndex > 0) {
    phaseIndex -= 1;
  }

  const loadMultiplier = rampSpec.loadMultipliers[phaseIndex] ?? 1;
  const setDelta = rampSpec.setDeltas[phaseIndex] ?? 0;

  return {
    active: phaseIndex < rampSpec.totalPhases - 1,
    gapDays: rampSpec.gapDays,
    phase: phaseIndex + 1,
    totalPhases: rampSpec.totalPhases,
    loadMultiplier,
    setDelta,
    note:
      phaseIndex < rampSpec.totalPhases - 1
        ? ` Lift Logic is using session ${phaseIndex + 1} of a ${rampSpec.totalPhases}-session return ramp after ${rampSpec.gapDays} days away, so both load and volume stay temporarily conservative.`
        : ` Your recent return session after ${rampSpec.gapDays} days away was strong enough to finish the re-ramp and resume normal progression.`,
  };
};

const getFatigueState = (
  recentSummaries: EntryPerformanceSummary[]
): ExerciseRecommendation["fatigue"] => {
  if (!recentSummaries.length) {
    return {
      score: 0,
      state: "fresh",
      consecutiveHighFatigueExposures: 0,
      deloadTriggered: false,
      signalReasons: [],
    };
  }

  let score = 0;
  const signalReasons: string[] = [];
  const exposures = recentSummaries.map((summary, index) => {
    const previous = recentSummaries[index + 1] ?? null;
    const gapDays = getSessionGapDays(summary, previous);
    const previousMedian = previous?.medianEstimated1RM ?? null;
    const currentMedian = summary.medianEstimated1RM ?? null;
    const declinePct =
      previousMedian && currentMedian
        ? (previousMedian - currentMedian) / previousMedian
        : 0;

    let highFatigue = false;

    if (summary.signal.status === "underperformed") {
      score += 2;
      highFatigue = true;
      signalReasons.push("recent session underperformed the planned target");
    }

    if (gapDays !== null && gapDays <= 2) {
      score += 1;
      signalReasons.push("sessions were stacked close together");
    }

    if (declinePct >= 0.04) {
      score += 1;
      highFatigue = true;
      signalReasons.push("estimated strength dipped versus the prior exposure");
    }

    return highFatigue;
  });

  let consecutiveHighFatigueExposures = 0;
  for (const exposure of exposures) {
    if (!exposure) {
      break;
    }
    consecutiveHighFatigueExposures += 1;
  }

  const deloadTriggered = consecutiveHighFatigueExposures >= 2;
  const state =
    deloadTriggered
      ? "deload"
      : consecutiveHighFatigueExposures >= 1 && score >= 4
      ? "high"
      : score >= 1
      ? "building"
      : "fresh";

  return {
    score,
    state,
    consecutiveHighFatigueExposures,
    deloadTriggered,
    signalReasons: Array.from(new Set(signalReasons)).slice(0, 3),
  };
};

const getPlateauState = ({
  recentSummaries,
  profile,
  exerciseName,
  preferredUnits,
}: {
  recentSummaries: EntryPerformanceSummary[];
  profile: GoalProfile;
  exerciseName?: string;
  preferredUnits: WeightUnit;
}): ExerciseRecommendation["plateau"] => {
  if (!recentSummaries.length) {
    return {
      consecutiveStalls: 0,
      threshold: DEFAULT_PLATEAU_THRESHOLD,
      triggered: false,
      intervention: "none",
      reramp: false,
      signalReasons: [],
    };
  }

  const latestRepresentative = recentSummaries[0]?.representativeSet;
  const loadProfile = getExerciseLoadProfile({
    exerciseName,
    preferredUnits,
    baseWeightLb: latestRepresentative?.actualWeight ?? 0,
  });

  let consecutiveStalls = 0;
  const signalReasons: string[] = [];

  for (let index = 0; index < recentSummaries.length; index += 1) {
    const current = recentSummaries[index];
    const previous = recentSummaries[index + 1] ?? null;
    const currentSet = current.representativeSet;
    const previousSet = previous?.representativeSet ?? null;

    if (!currentSet) {
      break;
    }

    const repeatedMiss = current.signal.status === "underperformed";
    const repeatedPrescription =
      current.sets.some(
        (set) =>
          set.plannedWeight !== null &&
          currentSet.plannedWeight !== null &&
          Math.abs(set.plannedWeight - currentSet.plannedWeight) <=
            loadProfile.canonicalIncrementLb / 2
      ) || currentSet.plannedWeight !== null;
    const noComparableProgress =
      previousSet !== null &&
      currentSet.actualWeight <=
        previousSet.actualWeight + loadProfile.canonicalIncrementLb / 2 &&
      currentSet.actualReps <= previousSet.actualReps;
    const stalled = repeatedMiss || (Boolean(repeatedPrescription) && noComparableProgress);

    if (!stalled) {
      break;
    }

    consecutiveStalls += 1;

    if (repeatedMiss) {
      signalReasons.push("recent session missed the planned prescription");
    }

    if (noComparableProgress) {
      signalReasons.push("load and reps stayed flat versus the prior comparable exposure");
    }
  }

  const triggered = consecutiveStalls >= DEFAULT_PLATEAU_THRESHOLD;
  const intervention =
    !triggered
      ? "none"
      : profile.label === "strength"
      ? "deload"
      : "rep_reset";

  return {
    consecutiveStalls,
    threshold: DEFAULT_PLATEAU_THRESHOLD,
    triggered,
    intervention,
    reramp: triggered,
    signalReasons: Array.from(new Set(signalReasons)).slice(0, 3),
  };
};

const applyBaseProgression = (
  baseWeight: number,
  status: "success" | "aggressive" | "underperformed",
  profile: GoalProfile,
  canonicalIncrementLb: number
) => {
  if (status === "aggressive") {
    return Math.max(
      baseWeight * (1 + profile.aggressiveIncreasePct),
      baseWeight + canonicalIncrementLb
    );
  }

  if (status === "underperformed") {
    return Math.max(
      baseWeight * (1 - profile.underperformDecreasePct),
      baseWeight - canonicalIncrementLb
    );
  }

  return Math.max(
    baseWeight * (1 + profile.successIncreasePct),
    baseWeight + canonicalIncrementLb
  );
};

const applyDetrainingAdjustment = (
  weight: number,
  daysSinceLastWorkout: number | null
) => {
  if (daysSinceLastWorkout === null) {
    return { weight, note: "" };
  }

  if (daysSinceLastWorkout >= 42) {
    return {
      weight: weight * 0.85,
      note: " after a long break",
    };
  }

  if (daysSinceLastWorkout >= 21) {
    return {
      weight: weight * 0.9,
      note: " after multiple weeks away",
    };
  }

  if (daysSinceLastWorkout >= 10) {
    return {
      weight: weight * 0.95,
      note: " after some time away",
    };
  }

  return { weight, note: "" };
};

export const buildNextExerciseRecommendation = (
  entries: WorkoutEntryDoc[],
  trainingGoal?: SupportedTrainingGoal,
  preferredUnits?: WeightUnit
): ExerciseRecommendation => {
  const profile = normalizeTrainingGoal(trainingGoal);
  const normalizedPreferredUnits = normalizeWeightUnit(preferredUnits);
  const recentSummaries = getRecentEntrySummaries(entries);
  const latestSummary = recentSummaries[0] ?? null;
  const latestEntry = latestSummary?.entry ?? null;

  if (!latestEntry || !latestSummary) {
    return {
      recommendedWeight: null,
      weightUnit: normalizedPreferredUnits,
      recommendedReps: null,
      recommendedSets: null,
      reason:
        "Complete at least one fully logged weight session for this exercise to unlock a data-driven recommendation.",
      basedOn: null,
      daysSinceLastWorkout: null,
      progressionStyle: profile.label,
      comparison: null,
      fatigue: null,
      plateau: null,
    };
  }

  const completedSets = latestSummary.sets;
  const representativeSet = latestSummary.representativeSet;
  const averageWeight = latestSummary.averageWeight;
  const averageReps = latestSummary.averageReps;
  const latestDate = latestSummary.date;
  const daysSinceLastWorkout = getDaysSince(latestDate);
  const completionSignal = latestSummary.signal;
  const setCountResolution = resolveRecommendedSetCount({
    entries,
    latestEntry,
    completedSetCount: completedSets.length,
  });
  const skipExposureAdjustment = getSkipExposureAdjustment(entries, recentSummaries);
  const baselineSummaries = getHistoricalBaselineSummaries(recentSummaries);
  const hasPriorComparableSession = recentSummaries.length > 1;
  const baselineWeight =
    getMedian(
      baselineSummaries
        .map((summary) => summary.averageWeight)
        .filter((value): value is number => value !== null)
    ) ?? averageWeight;
  const baselineReps =
    getMedian(
      baselineSummaries
        .map((summary) => summary.averageReps)
        .filter((value): value is number => value !== null)
    ) ?? averageReps;
  const isAggressiveConfirmed = getConfirmedStatus(recentSummaries, "aggressive");
  const isUnderperformanceConfirmed = getConfirmedStatus(
    recentSummaries,
    "underperformed"
  );

  if (
    !representativeSet ||
    averageWeight === null ||
    averageReps === null ||
    baselineWeight === null ||
    baselineReps === null
  ) {
    return {
      recommendedWeight: null,
      weightUnit: normalizedPreferredUnits,
      recommendedReps: null,
      recommendedSets: null,
      reason:
        "The last completed entry did not have enough valid weight and rep data to build a recommendation.",
      basedOn: null,
      daysSinceLastWorkout,
      progressionStyle: profile.label,
      comparison: null,
      fatigue: getFatigueState(recentSummaries),
      plateau: getPlateauState({
        recentSummaries,
        profile,
        exerciseName: latestEntry.name ?? String(latestEntry.exerciseId || ""),
        preferredUnits: normalizedPreferredUnits,
      }),
    };
  }

  const baseWeight = baselineWeight;
  const baseReps = baselineReps;
  const loadProfile = getExerciseLoadProfile({
    exerciseName: latestEntry.name ?? String(latestEntry.exerciseId || ""),
    preferredUnits: normalizedPreferredUnits,
    baseWeightLb: baseWeight,
  });
  const effectiveWeightStatus: CompletionStatus =
    completionSignal.status === "aggressive" && !isAggressiveConfirmed
      ? "success"
      : completionSignal.status;
  const progressedWeight = applyBaseProgression(
    baseWeight,
    effectiveWeightStatus,
    profile,
    loadProfile.canonicalIncrementLb
  );
  const detrained = applyDetrainingAdjustment(progressedWeight, daysSinceLastWorkout);
  const uncappedWeight = detrained.weight;
  const cappedWeight =
    completionSignal.status === "aggressive" && !isAggressiveConfirmed
      ? Math.min(uncappedWeight, baseWeight + loadProfile.canonicalIncrementLb)
      : completionSignal.status === "underperformed" && !isUnderperformanceConfirmed
      ? Math.max(uncappedWeight, baseWeight - loadProfile.canonicalIncrementLb)
      : uncappedWeight;
  const plateau = getPlateauState({
    recentSummaries,
    profile,
    exerciseName: latestEntry.name ?? String(latestEntry.exerciseId || ""),
    preferredUnits: normalizedPreferredUnits,
  });
  const returnRamp = getReturnRampState(recentSummaries, completionSignal);
  const plateauAdjustedWeight =
    plateau.triggered && plateau.intervention === "deload"
      ? cappedWeight * 0.92
      : plateau.triggered
      ? cappedWeight * 0.96
      : cappedWeight;
  const adherenceAdjustedWeight =
    plateauAdjustedWeight *
    skipExposureAdjustment.loadMultiplier *
    returnRamp.loadMultiplier;
  const recommendedWeight = roundRecommendedWeight(
    adherenceAdjustedWeight,
    profile,
    normalizedPreferredUnits,
    loadProfile.displayIncrement
  );
  const latestRepBaseline = clamp(
    Math.round(baseReps),
    profile.minReps,
    profile.maxReps
  );
  const repeatedUnderperformanceReps = clamp(
    Math.round(Math.min(baseReps, averageReps)),
    profile.minReps,
    profile.maxReps
  );
  const recommendedReps =
    plateau.triggered && plateau.intervention === "rep_reset"
      ? clamp(
          latestRepBaseline + (profile.label === "endurance" ? 2 : 1),
          profile.minReps,
          profile.maxReps
        )
      : plateau.triggered && plateau.intervention === "deload"
      ? clamp(latestRepBaseline - 1, profile.minReps, profile.maxReps)
      : completionSignal.status === "underperformed" && isUnderperformanceConfirmed
      ? repeatedUnderperformanceReps
      : latestRepBaseline;
  const recommendedSets = setCountResolution.recommendedSets;
  const fatigue = getFatigueState(recentSummaries);
  const fatigueLoadMultiplier =
    fatigue.state === "deload"
      ? 0.9
      : fatigue.state === "high"
      ? 0.96
      : 1;
  const fatigueSetDelta = fatigue.state === "deload" ? -1 : 0;
  const outlierNote =
    latestSummary.removedOutlierSetCount > 0
      ? ` Outlier rejection ignored ${latestSummary.removedOutlierSetCount} noisy set${
          latestSummary.removedOutlierSetCount === 1 ? "" : "s"
        } in the latest session.`
      : "";
  const confirmationNote =
    completionSignal.status === "aggressive" && !isAggressiveConfirmed
      ? " A single strong session is capped to one increment until it repeats."
      : completionSignal.status === "underperformed" && !isUnderperformanceConfirmed
      ? " A single low day can trim load slightly, but reps stay steady until the miss repeats."
      : "";

  const fatigueAdjustedWeight = recommendedWeight
    ? roundRecommendedWeight(
        adherenceAdjustedWeight * fatigueLoadMultiplier,
        profile,
        normalizedPreferredUnits,
        loadProfile.displayIncrement
      )
    : recommendedWeight;
  const fatigueAdjustedSets =
    typeof recommendedSets === "number"
      ? Math.max(
          1,
          recommendedSets +
            fatigueSetDelta +
            skipExposureAdjustment.setDelta +
            returnRamp.setDelta +
            (plateau.triggered && plateau.intervention === "deload" ? -1 : 0)
        )
      : recommendedSets;
  const comparisonDelta =
    fatigueAdjustedWeight !== null && representativeSet.actualWeight !== null
      ? Math.round(
          (fatigueAdjustedWeight -
            fromCanonicalWeightLb(
              representativeSet.actualWeight,
              normalizedPreferredUnits
            )) *
            10
        ) / 10
      : null;
  const comparisonSummary =
    !hasPriorComparableSession
      ? "This is your first benchmark for this lift. Log another clean session to unlock a true session-to-session delta."
      : fatigueAdjustedWeight !== null
      ? representativeSet
        ? `Last time ${Math.round(
            fromCanonicalWeightLb(
              representativeSet.actualWeight,
              normalizedPreferredUnits
            ) * 10
          ) / 10} x ${representativeSet.actualReps}, today ${fatigueAdjustedWeight} x ${recommendedReps}${
            comparisonDelta !== null
              ? `, ${comparisonDelta > 0 ? "+" : ""}${comparisonDelta} ${normalizedPreferredUnits}`
              : ""
          }.`
        : "This is your first benchmark for this lift."
      : "This is your first benchmark for this lift.";

  return {
    recommendedWeight: fatigueAdjustedWeight,
    weightUnit: normalizedPreferredUnits,
    recommendedReps,
    recommendedSets: fatigueAdjustedSets,
    reason: `Next target: ${fatigueAdjustedWeight ?? "log one clean set first"}${
      recommendedReps ? ` x ${recommendedReps}` : ""
    }${
      fatigueAdjustedSets ? ` for ${fatigueAdjustedSets} set${fatigueAdjustedSets === 1 ? "" : "s"}` : ""
    }. Recommended from your last logged session: you completed ${Math.round(
      fromCanonicalWeightLb(
        representativeSet.actualWeight,
        normalizedPreferredUnits
      ) * 10
    ) / 10} x ${representativeSet.actualReps}, so Lift Logic ${
      comparisonDelta !== null && comparisonDelta > 0
        ? `nudged the load up by ${comparisonDelta} ${normalizedPreferredUnits}`
        : comparisonDelta !== null && comparisonDelta < 0
        ? `pulled the load back by ${Math.abs(comparisonDelta)} ${normalizedPreferredUnits}`
        : "held the target steady"
    }. Using a rolling ${baselineSummaries.length}-session baseline, ${completionSignal.reason}${detrained.note}. Set count is based on ${setCountResolution.reason}.${outlierNote}${confirmationNote}${
      skipExposureAdjustment.note
    }${
      returnRamp.note
    }${
      plateau.triggered
        ? plateau.intervention === "deload"
          ? ` Plateau detection tripped after ${plateau.consecutiveStalls} stalled exposures, so Lift Logic prescribes a deload and restart ramp instead of repeating the same failed prescription.`
          : ` Plateau detection tripped after ${plateau.consecutiveStalls} stalled exposures, so Lift Logic reset the rep target slightly and starts a reramp instead of holding the same stalled prescription.`
        : ""
    }${
      fatigue.state === "deload"
        ? " Fatigue stayed elevated across multiple sessions, so this recommendation prescribes a deload."
        : fatigue.state === "high"
        ? " Recent fatigue signals kept the recommendation slightly conservative."
        : ""
    }`,
    basedOn: {
      topSetWeight: fromCanonicalWeightLb(
        representativeSet.actualWeight,
        normalizedPreferredUnits
      ),
      topSetReps: representativeSet.actualReps,
      averageWeight:
        Math.round(
          fromCanonicalWeightLb(averageWeight, normalizedPreferredUnits) * 10
        ) / 10,
      averageReps: Math.round(averageReps * 10) / 10,
      setsCompleted: completedSets.length,
      date: toIsoDate(latestDate),
    },
    daysSinceLastWorkout,
    progressionStyle: profile.label,
    comparison: {
      previousWeight:
        Math.round(
          fromCanonicalWeightLb(
            representativeSet.actualWeight,
            normalizedPreferredUnits
          ) * 10
        ) / 10,
      previousReps: representativeSet.actualReps,
      currentTargetWeight: fatigueAdjustedWeight,
      currentTargetReps: recommendedReps,
      deltaWeight: comparisonDelta,
      benchmarkDate: toIsoDate(latestDate),
      firstBenchmark: !hasPriorComparableSession,
      summary: comparisonSummary,
    },
    fatigue,
    plateau,
  };
};

export const adjustRemainingSetsAfterLoggedSet = (
  sets: ExerciseSet[],
  setIndex: number,
  trainingGoal?: SupportedTrainingGoal
): {
  sets: ExerciseSet[];
  adjustment: InWorkoutAdjustment | null;
} => {
  const profile = normalizeTrainingGoal(trainingGoal);
  const strategy = getGoalAdjustmentStrategy(profile);
  const loggedSet = sets[setIndex];
  const weightUnit = normalizeWeightUnit(
    (loggedSet as any)?.actualWeightUnit ?? (loggedSet as any)?.weightUnit
  );
  const actualWeight = getCanonicalWeightFromSet(loggedSet as ExerciseSet, "actual");
  const actualReps = coercePositiveNumber((loggedSet as any)?.actualReps);
  const plannedWeight = getCanonicalWeightFromSet(loggedSet as ExerciseSet, "planned");
  const plannedReps = coercePositiveNumber((loggedSet as any)?.reps);

  if (
    !loggedSet ||
    actualWeight === null ||
    actualReps === null ||
    plannedWeight === null ||
    plannedReps === null
  ) {
    return {
      sets,
      adjustment: null,
    };
  }

  const completedSets = sets
    .slice(0, setIndex + 1)
    .filter((set) => (set as any)?.complete)
    .map((set) => ({
      actualWeight: getCanonicalWeightFromSet(set as ExerciseSet, "actual"),
      actualReps: coercePositiveNumber((set as any)?.actualReps),
      plannedWeight: getCanonicalWeightFromSet(set as ExerciseSet, "planned"),
      plannedReps: coercePositiveNumber((set as any)?.reps),
    }))
    .filter(
      (set): set is {
        actualWeight: number;
        actualReps: number;
        plannedWeight: number | null;
        plannedReps: number | null;
      } => set.actualWeight !== null && set.actualReps !== null
    );

  const repRatio = actualReps / plannedReps;
  const averageRepRatio =
    completedSets.reduce((sum, set) => {
      const targetReps = set.plannedReps ?? plannedReps;
      return sum + set.actualReps / Math.max(targetReps || 1, 1);
    }, 0) / Math.max(completedSets.length, 1);
  const fatiguePenalty = Math.max(0, 1 - averageRepRatio);
  const lastTwoCompleted = completedSets.slice(-2);
  const fatigueTrend =
    lastTwoCompleted.length === 2
      ? lastTwoCompleted[0].actualReps - lastTwoCompleted[1].actualReps
      : 0;

  let nextWeight = plannedWeight;
  let nextReps = plannedReps;
  let reason = "holding the current target steady after your logged set";

  if (repRatio >= 1.3) {
    nextWeight = Math.max(
      actualWeight * (1 + strategy.beatTargetWeightBump),
      actualWeight + profile.lightIncrement
    );
    nextReps = Math.min(
      profile.maxReps,
      plannedReps + strategy.beatTargetRepBump
    );
    reason =
      "you clearly outperformed the target, so the remaining sets were pushed up";
  } else if (repRatio >= 1) {
    nextWeight = plannedWeight;
    nextReps = plannedReps;
    reason = "you hit the target, so the remaining sets stay on plan";
  } else if (repRatio >= 0.8) {
    nextWeight = plannedWeight * (1 - strategy.smallMissWeightDrop);
    nextReps = Math.max(profile.minReps, plannedReps - strategy.smallMissRepDrop);
    reason =
      strategy.preserve === "load"
        ? "you came in slightly short, so the plan keeps the intent but trims load a bit"
        : "you came in slightly short, so the remaining sets were eased down a little";
  } else if (repRatio >= 0.5) {
    nextWeight = plannedWeight * (1 - strategy.mediumMissWeightDrop);
    nextReps = Math.max(profile.minReps, plannedReps - strategy.mediumMissRepDrop);
    reason =
      "you were well under target, so the remaining sets were adjusted to keep the workout productive";
  } else {
    nextWeight = plannedWeight * (1 - strategy.largeMissWeightDrop);
    nextReps = Math.max(profile.minReps, plannedReps - strategy.largeMissRepDrop);
    reason =
      "you missed the target by a lot, so the remaining sets were reduced more aggressively";
  }

  if (fatiguePenalty >= 0.2 || fatigueTrend >= 2) {
    nextWeight = nextWeight * (1 - Math.min(0.06, fatiguePenalty));
    nextReps = Math.max(
      profile.minReps,
      nextReps - (fatigueTrend >= 2 ? 1 : 0)
    );
    reason +=
      strategy.preserve === "volume"
        ? " Fatigue is building, so the app is protecting your remaining work capacity."
        : strategy.preserve === "load"
        ? " Fatigue is showing up, so the app is preserving quality on the heavier work."
        : " Fatigue is building, so the app is protecting the quality of the remaining sets.";
  }

  const normalizedWeight = roundRecommendedWeight(nextWeight, profile, weightUnit);
  const normalizedReps = clamp(Math.round(nextReps), profile.minReps, profile.maxReps);

  const adjustedSets = sets.map((set, index) => {
    if (index <= setIndex || (set as any)?.complete) {
      return set;
    }

    return {
      ...set,
      weight: normalizedWeight,
      weightUnit,
      reps: normalizedReps,
      adjustmentReason: reason,
    } as ExerciseSet;
  });

  return {
    sets: adjustedSets,
    adjustment: {
      weight: normalizedWeight,
      reps: normalizedReps,
      reason,
    },
  };
};
