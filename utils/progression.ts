import { ExerciseSet, WorkoutEntryDoc } from "./types";

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

export type ExerciseRecommendation = {
  recommendedWeight: number | null;
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
};

export type InWorkoutAdjustment = {
  weight: number | null;
  reps: number | null;
  reason: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

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

const roundToNearestFive = (value: number) => Math.round(value / 5) * 5;

const roundRecommendedWeight = (weight: number, profile: GoalProfile) => {
  const roundedToFive = roundToNearestFive(weight);
  if (roundedToFive > 0) {
    return roundedToFive;
  }

  return weight >= profile.lightIncrement
    ? profile.lightIncrement
    : Math.max(1, Math.round(weight));
};

const getNormalizedCompletedWeightSets = (
  entry: WorkoutEntryDoc
): NormalizedPerformanceSet[] => {
  const sets = Array.isArray(entry.sets) ? entry.sets : [];

  return sets
    .map((set) => {
      const actualWeight = coercePositiveNumber((set as any)?.actualWeight);
      const actualReps = coercePositiveNumber((set as any)?.actualReps);

      if (!(set as any)?.complete || actualWeight === null || actualReps === null) {
        return null;
      }

      return {
        actualWeight,
        actualReps,
        plannedWeight: coercePositiveNumber((set as any)?.weight),
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

const applyBaseProgression = (
  baseWeight: number,
  status: "success" | "aggressive" | "underperformed",
  profile: GoalProfile
) => {
  if (status === "aggressive") {
    return Math.max(
      baseWeight * (1 + profile.aggressiveIncreasePct),
      baseWeight + profile.lightIncrement
    );
  }

  if (status === "underperformed") {
    return Math.max(
      baseWeight * (1 - profile.underperformDecreasePct),
      baseWeight - profile.lightIncrement
    );
  }

  return Math.max(
    baseWeight * (1 + profile.successIncreasePct),
    baseWeight + Math.min(profile.lightIncrement, profile.heavyIncrement)
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
  trainingGoal?: SupportedTrainingGoal
): ExerciseRecommendation => {
  const profile = normalizeTrainingGoal(trainingGoal);
  const latestEntry = getLatestCompletedWeightEntry(entries);

  if (!latestEntry) {
    return {
      recommendedWeight: null,
      recommendedReps: null,
      recommendedSets: null,
      reason:
        "Complete at least one fully logged weight session for this exercise to unlock a data-driven recommendation.",
      basedOn: null,
      daysSinceLastWorkout: null,
      progressionStyle: profile.label,
    };
  }

  const completedSets = getNormalizedCompletedWeightSets(latestEntry);
  const representativeSet = getRepresentativeSet(completedSets);
  const averageWeight = getAverageActualWeight(completedSets);
  const averageReps = getAverageActualReps(completedSets);
  const latestDate = parseEntryDate(latestEntry.date);
  const daysSinceLastWorkout = getDaysSince(latestDate);
  const completionSignal = getCompletionSignal(completedSets);

  if (!representativeSet || averageWeight === null || averageReps === null) {
    return {
      recommendedWeight: null,
      recommendedReps: null,
      recommendedSets: null,
      reason:
        "The last completed entry did not have enough valid weight and rep data to build a recommendation.",
      basedOn: null,
      daysSinceLastWorkout,
      progressionStyle: profile.label,
    };
  }

  const baseWeight =
    completionSignal.status === "aggressive"
      ? representativeSet.actualWeight
      : averageWeight;
  const baseReps =
    completionSignal.status === "aggressive"
      ? representativeSet.actualReps
      : averageReps;
  const progressedWeight = applyBaseProgression(
    baseWeight,
    completionSignal.status,
    profile
  );
  const detrained = applyDetrainingAdjustment(progressedWeight, daysSinceLastWorkout);
  const recommendedWeight = roundRecommendedWeight(detrained.weight, profile);
  const recommendedReps = clamp(
    Math.round(baseReps),
    profile.minReps,
    profile.maxReps
  );
  const recommendedSets = completedSets.length;

  return {
    recommendedWeight,
    recommendedReps,
    recommendedSets,
    reason: `Using ${representativeSet.actualWeight} x ${representativeSet.actualReps} from your latest completed workout, ${completionSignal.reason}${detrained.note}.`,
    basedOn: {
      topSetWeight: representativeSet.actualWeight,
      topSetReps: representativeSet.actualReps,
      averageWeight: Math.round(averageWeight * 10) / 10,
      averageReps: Math.round(averageReps * 10) / 10,
      setsCompleted: completedSets.length,
      date: toIsoDate(latestDate),
    },
    daysSinceLastWorkout,
    progressionStyle: profile.label,
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
  const actualWeight = coercePositiveNumber((loggedSet as any)?.actualWeight);
  const actualReps = coercePositiveNumber((loggedSet as any)?.actualReps);
  const plannedWeight = coercePositiveNumber((loggedSet as any)?.weight);
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
      actualWeight: coercePositiveNumber((set as any)?.actualWeight),
      actualReps: coercePositiveNumber((set as any)?.actualReps),
      plannedWeight: coercePositiveNumber((set as any)?.weight),
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

  const normalizedWeight = roundRecommendedWeight(nextWeight, profile);
  const normalizedReps = clamp(Math.round(nextReps), profile.minReps, profile.maxReps);

  const adjustedSets = sets.map((set, index) => {
    if (index <= setIndex || (set as any)?.complete) {
      return set;
    }

    return {
      ...set,
      weight: normalizedWeight,
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
