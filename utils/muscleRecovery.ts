import { initialExercises } from "./sample-data";
import { WorkoutEntryDoc } from "./types";

export type MuscleRegionId =
  | "shoulders"
  | "chest"
  | "biceps"
  | "triceps"
  | "core"
  | "quads"
  | "calves"
  | "rear_delts"
  | "upper_back"
  | "lats"
  | "lower_back"
  | "glutes"
  | "hamstrings";

export const muscleRegionLabels: Record<MuscleRegionId, string> = {
  shoulders: "Shoulders",
  chest: "Chest",
  biceps: "Biceps",
  triceps: "Triceps",
  core: "Core",
  quads: "Quads",
  calves: "Calves",
  rear_delts: "Rear delts",
  upper_back: "Upper back",
  lats: "Lats",
  lower_back: "Lower back",
  glutes: "Glutes",
  hamstrings: "Hamstrings",
};

const normalizeName = (value: string) => value.trim().toLowerCase();

const catalogByName = new Map(
  initialExercises.map((exercise) => [normalizeName(exercise.name), exercise])
);

const resolveCatalogExercise = (name: string) => {
  const normalized = normalizeName(name);

  if (catalogByName.has(normalized)) {
    return catalogByName.get(normalized)!;
  }

  return (
    initialExercises.find((exercise) =>
      (exercise.aliases ?? []).some((alias) => normalizeName(alias) === normalized)
    ) ?? null
  );
};

const targetToRegions = (target?: string, bodyPart?: string): MuscleRegionId[] => {
  const normalizedTarget = normalizeName(target ?? "");
  const normalizedBodyPart = normalizeName(bodyPart ?? "");
  const token = normalizedTarget || normalizedBodyPart;

  if (/upper chest|chest/.test(token)) return ["chest"];
  if (/quads|legs/.test(token)) return ["quads"];
  if (/hamstrings/.test(token)) return ["hamstrings"];
  if (/glutes/.test(token)) return ["glutes"];
  if (/calves/.test(token)) return ["calves"];
  if (/side delts|shoulders/.test(token)) return ["shoulders"];
  if (/rear delts/.test(token)) return ["rear_delts"];
  if (/triceps/.test(token)) return ["triceps"];
  if (/biceps/.test(token)) return ["biceps"];
  if (/lats/.test(token)) return ["lats"];
  if (/back/.test(token)) return ["upper_back", "lats"];
  if (/posterior chain/.test(token)) return ["glutes", "hamstrings", "lower_back"];
  if (/traps/.test(token)) return ["upper_back"];
  if (/abs|core|obliques|grip/.test(token)) return ["core"];
  if (/mobility|conditioning/.test(token)) return [];
  if (/push/.test(normalizedBodyPart)) return ["chest", "shoulders", "triceps"];
  if (/pull/.test(normalizedBodyPart)) return ["upper_back", "lats", "biceps"];

  return [];
};

export const getExerciseRegions = (exerciseName: string): MuscleRegionId[] => {
  const exercise = resolveCatalogExercise(exerciseName);
  if (!exercise) {
    return [];
  }

  return targetToRegions(exercise.target, exercise.bodyPart);
};

const getEntryCompletionTime = (entry: WorkoutEntryDoc) => {
  const sets = Array.isArray(entry.sets) ? entry.sets : [];
  const latestSetCompletion = sets
    .filter((set) => Boolean(set.complete))
    .map((set) => {
      const raw = (set as any).completedDate ?? entry.updatedAt ?? entry.date;
      const parsed = new Date(raw as any);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    })
    .filter(Boolean)
    .sort((a, b) => +b! - +a!)[0];

  if (latestSetCompletion) {
    return latestSetCompletion;
  }

  const fallback = new Date((entry.updatedAt ?? entry.date) as any);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

export const buildMuscleRecoveryMap = ({
  exercises,
  recentEntries,
  anchorDate,
}: {
  exercises: Array<{ name: string }>;
  recentEntries: WorkoutEntryDoc[];
  anchorDate: Date;
}) => {
  const anchor = new Date(anchorDate);
  const workoutRegions = new Set<MuscleRegionId>();

  exercises.forEach((exercise) => {
    getExerciseRegions(exercise.name).forEach((region) => workoutRegions.add(region));
  });

  const lastTargetedAt: Partial<Record<MuscleRegionId, Date>> = {};

  recentEntries.forEach((entry) => {
    const sets = Array.isArray(entry.sets) ? entry.sets : [];
    const didAnyWork =
      Boolean(entry.complete) || sets.some((set) => Boolean(set.complete));

    if (!didAnyWork) {
      return;
    }

    const completionTime = getEntryCompletionTime(entry);
    if (!completionTime) {
      return;
    }

    const regions = getExerciseRegions(entry.name ?? String(entry.exerciseId ?? ""));
    regions.forEach((region) => {
      const previous = lastTargetedAt[region];
      if (!previous || completionTime > previous) {
        lastTargetedAt[region] = completionTime;
      }
    });
  });

  return Object.fromEntries(
    Array.from(workoutRegions).map((region) => {
      const lastHit = lastTargetedAt[region];
      const hoursAgo = lastHit
        ? Math.max(0, (anchor.getTime() - lastHit.getTime()) / (1000 * 60 * 60))
        : null;

      return [
        region,
        {
          region,
          label: muscleRegionLabels[region],
          inCurrentWorkout: true,
          lastTargetedAt: lastHit ?? null,
          hoursAgo,
          intensity:
            hoursAgo === null || hoursAgo > 48 ? 0 : Math.max(0.18, 1 - hoursAgo / 48),
        },
      ];
    })
  ) as Record<
    MuscleRegionId,
    {
      region: MuscleRegionId;
      label: string;
      inCurrentWorkout: boolean;
      lastTargetedAt: Date | null;
      hoursAgo: number | null;
      intensity: number;
    }
  >;
};

export const buildRecoveryGuidance = (
  regions: Array<{
    label: string;
    hoursAgo: number | null;
  }>
) => {
  if (!regions.length) {
    return null;
  }

  const freshCount = regions.filter((region) => region.hoursAgo === null || region.hoursAgo >= 36).length;
  const recentlyTrainedCount = regions.filter(
    (region) => region.hoursAgo !== null && region.hoursAgo < 24
  ).length;
  const moderatelyTrainedCount = regions.filter(
    (region) => region.hoursAgo !== null && region.hoursAgo < 36
  ).length;

  if (recentlyTrainedCount >= Math.max(2, Math.ceil(regions.length * 0.6))) {
    return {
      tone: "rest",
      headline: "Rest or a lighter version is the smart call today",
      supportingCopy:
        "Most of the muscles in today's plan were trained recently. You are not losing ground by taking a lighter day, trimming volume, or swapping to easier work.",
    };
  }

  if (moderatelyTrainedCount >= Math.max(2, Math.ceil(regions.length * 0.6))) {
    return {
      tone: "light",
      headline: "Keep the session, but keep the effort conservative",
      supportingCopy:
        "Several target areas are still carrying recent work. A good adjustment today is fewer hard sets, a cleaner pace, or a lower-intensity swap instead of forcing a full push.",
    };
  }

  if (freshCount === regions.length) {
    return {
      tone: "push",
      headline: "Good day to push the planned session",
      supportingCopy:
        "Today's main muscle groups look fresh enough to run the workout as written and let the harder work count.",
    };
  }

  return {
    tone: "swap",
    headline: "Main work can stay, but swaps are fair game",
    supportingCopy:
      "You have a mix of fresh and recently trained areas today. Keep the core intent of the session, then swap or soften the pieces that feel least recovered.",
  };
};

export const getRecoveryFill = (intensity: number, active: boolean) => {
  if (!active) {
    return "rgba(148, 163, 184, 0.08)";
  }

  if (intensity <= 0) {
    return "rgba(148, 163, 184, 0.16)";
  }

  const alpha = 0.22 + intensity * 0.68;
  return `rgba(37, 99, 235, ${alpha.toFixed(2)})`;
};
