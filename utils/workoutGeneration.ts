import { initialExercises } from "./sample-data";
import { DEFAULT_ROUTINE } from "./helpers";
import { SetupFormValues } from "./profileSetup";
import {
  getLimitationAwareReplacementOptions,
  parseLimitations,
} from "./workoutGuidance";

type GeneratedExercise = {
  name: string;
  type: "weight" | "timed";
  sets: Array<Record<string, any>>;
  max?: number;
  rest: number;
  complete: boolean;
};

type GeneratedWorkoutDay = {
  dayKey: keyof typeof DEFAULT_ROUTINE.days;
  title: string;
  exercises: GeneratedExercise[];
};

type TimedDayContext = {
  timedExerciseCount: number;
  totalExerciseCount: number;
};

export type GeneratedWorkoutPlan = {
  summary: string;
  days: GeneratedWorkoutDay[];
};

export type WorkoutCoachResponse = {
  headline: string;
  summary: string;
  openingMessage: string;
  plannedDays: string[];
  planSnapshot: Array<{
    dayKey: string;
    dayLabel: string;
    title: string;
    exerciseCount: number;
    exercises: Array<{
      name: string;
      type: "weight" | "timed";
      sets: number;
      reps?: number | null;
      weight?: number | null;
      minutes?: number | null;
      rest: number;
    }>;
  }>;
  why: string[];
  tips: string[];
  suggestedReplies: string[];
};

const dayKeys = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const weekdayLookup: Record<string, (typeof dayKeys)[number]> = {
  sun: "sunday",
  mon: "monday",
  tue: "tuesday",
  wed: "wednesday",
  thu: "thursday",
  fri: "friday",
  sat: "saturday",
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

const normalizeEquipmentText = (value: string) => value.trim().toLowerCase();

const getEquipmentTags = (value: string) => {
  const normalized = normalizeEquipmentText(value);
  const tags = new Set<string>();

  if (/full gym/.test(normalized)) tags.add("full_gym");
  if (/bodyweight/.test(normalized)) tags.add("bodyweight");
  if (/dumbbell/.test(normalized)) tags.add("dumbbells");
  if (/barbell|plates?/.test(normalized)) tags.add("barbell");
  if (/rack/.test(normalized)) tags.add("rack");
  if (/bench/.test(normalized)) tags.add("bench");
  if (/kettlebell/.test(normalized)) tags.add("kettlebells");
  if (/cable/.test(normalized)) tags.add("cable");
  if (/machine|selectorized|smith/.test(normalized)) tags.add("machines");
  if (/smith/.test(normalized)) tags.add("smith");
  if (/pull-up/.test(normalized)) tags.add("pullup_bar");
  if (/dip bars?|parallel bars?/.test(normalized)) tags.add("dip_bars");
  if (/preacher/.test(normalized)) tags.add("preacher_bench");
  if (/ez curl/.test(normalized)) tags.add("ez_bar");
  if (/trap bar/.test(normalized)) tags.add("trap_bar");
  if (/band/.test(normalized)) tags.add("bands");
  if (/jump rope|rope/.test(normalized)) tags.add("jump_rope");
  if (/yoga mat|mat/.test(normalized)) tags.add("mat");
  if (/bike|cycling|treadmill|rowing|stair|elliptical|cardio/.test(normalized)) {
    tags.add("cardio");
  }
  if (/bike|cycling/.test(normalized)) tags.add("bike");
  if (/treadmill/.test(normalized)) tags.add("treadmill");
  if (/rowing/.test(normalized)) tags.add("rowing");
  if (/stair|elliptical/.test(normalized)) tags.add("stair_elliptical");

  return tags;
};

const getSelectedEquipmentTags = (profile: SetupFormValues) =>
  new Set(
    profile.equipmentAccess.flatMap((item) => Array.from(getEquipmentTags(item)))
  );

const requiredSupportTags = [
  "bench",
  "rack",
  "pullup_bar",
  "dip_bars",
  "preacher_bench",
] as const;

const getRequiredSupportTags = (equipment: string[]) => {
  const required = new Set<string>();

  equipment.forEach((item) => {
    const tags = getEquipmentTags(item);

    requiredSupportTags.forEach((tag) => {
      if (tags.has(tag)) {
        required.add(tag);
      }
    });
  });

  return required;
};

const isHomeDumbbellProfile = (profile: SetupFormValues) => {
  const tags = getSelectedEquipmentTags(profile);

  return (
    tags.has("dumbbells") &&
    ![
      "full_gym",
      "barbell",
      "rack",
      "bench",
      "cable",
      "machines",
      "smith",
      "pullup_bar",
    ].some((tag) => tags.has(tag))
  );
};

const isBodyweightOnlyProfile = (profile: SetupFormValues) => {
  const tags = getSelectedEquipmentTags(profile);

  return tags.size === 1 && tags.has("bodyweight");
};

const normalizeGoalForProgramming = (goal: string) => {
  switch (goal) {
    case "recomp":
      return "fat_loss";
    case "general_fitness":
      return "consistency";
    case "athleticism":
      return "conditioning";
    default:
      return goal;
  }
};

const usesMachineEquipment = (equipment: string[]) =>
  equipment.some((item) =>
    /machine|cable|press|curl|extension|climber|elliptical/i.test(item)
  );

const equipmentMatchesProfile = (
  equipment: string[],
  profile: SetupFormValues
) => {
  if (!profile.equipmentAccess.length || profile.equipmentAccess.includes("Full gym")) {
    return true;
  }

  const equipmentTags = Array.from(
    new Set(equipment.flatMap((item) => Array.from(getEquipmentTags(item))))
  );
  const selectedTags = Array.from(getSelectedEquipmentTags(profile));
  const requiredTags = Array.from(getRequiredSupportTags(equipment));

  if (selectedTags.length === 1 && selectedTags.includes("bodyweight")) {
    return equipmentTags.every((item) => item === "bodyweight");
  }

  if (requiredTags.some((tag) => !selectedTags.includes(tag))) {
    return false;
  }

  return equipmentTags.some((tag) => {
    if (tag === "bodyweight") {
      return true;
    }

    if (selectedTags.includes("full_gym")) {
      return true;
    }

    if (selectedTags.includes(tag)) {
      return true;
    }

    if (tag === "ez_bar" && selectedTags.includes("barbell")) {
      return true;
    }

    if (tag === "trap_bar" && selectedTags.includes("barbell")) {
      return true;
    }

    if (tag === "machines" && (selectedTags.includes("cable") || selectedTags.includes("smith"))) {
      return true;
    }

    if (tag === "cardio" && selectedTags.some((selectedTag) => ["bike", "treadmill", "rowing", "stair_elliptical", "cardio"].includes(selectedTag))) {
      return true;
    }

    return false;
  });
};

const findEquipmentFriendlyAlternative = (
  exerciseName: string,
  profile: SetupFormValues,
  excludedNames: Set<string> = new Set()
) => {
  const original = resolveCatalogExercise(exerciseName);
  const candidates = initialExercises.filter((exercise) =>
    equipmentMatchesProfile(exercise.equipment, profile)
  );
  const availableCandidates = candidates.filter(
    (exercise) => !excludedNames.has(normalizeName(exercise.name))
  );
  const pool = availableCandidates;

  const scoreCandidate = (exercise: any) => {
    if (!original) {
      return 0;
    }

    let score = 0;

    if (exercise.type === original.type) score += 4;
    if (exercise.target === original.target) score += 6;
    if (exercise.bodyPart === original.bodyPart) score += 3;

    if (
      isHomeDumbbellProfile(profile) &&
      Array.from(getRequiredSupportTags(exercise.equipment)).length === 0
    ) {
      score += 2;
    }

    return score;
  };

  const pickBestMatch = (matches: typeof initialExercises) =>
    [...matches].sort((left, right) => scoreCandidate(right) - scoreCandidate(left))[0] ?? null;
  const pickMatch = (matcher: (exercise: any) => boolean) =>
    pickBestMatch(pool.filter(matcher));

  if (!original) {
    return pool[0] ?? null;
  }

  return (
    pickMatch(
      (exercise) =>
        exercise.type === original.type && exercise.target === original.target
    ) ??
    pickMatch(
      (exercise) =>
        exercise.type === original.type && exercise.bodyPart === original.bodyPart
    ) ??
    pickMatch((exercise) => exercise.type === original.type) ??
    pickBestMatch(pool) ??
    null
  );
};

const resolveExerciseForProfile = (
  name: string,
  profile: SetupFormValues,
  excludedNames: Set<string> = new Set()
) => {
  const direct = resolveCatalogExercise(name);
  if (
    direct &&
    equipmentMatchesProfile(direct.equipment, profile) &&
    !excludedNames.has(normalizeName(direct.name))
  ) {
    return direct;
  }

  return findEquipmentFriendlyAlternative(name, profile, excludedNames);
};

const parsePositiveNumber = (value?: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const isLightDumbbellHomeProfile = (profile: SetupFormValues) => {
  if (!isHomeDumbbellProfile(profile)) {
    return false;
  }

  const maxDumbbellWeight = parsePositiveNumber(profile.maxDumbbellWeight);
  if (!maxDumbbellWeight) {
    return false;
  }

  const lightDumbbellLimit = profile.preferredUnits === "kg" ? 12 : 25;
  return maxDumbbellWeight <= lightDumbbellLimit;
};

const getWeightDefaults = (goal: string, timed = false) => {
  if (timed) {
    return { sets: 1, minutes: goal === "conditioning" ? 20 : 10, rest: 0 };
  }

  switch (goal) {
    case "strength":
      return { sets: 4, reps: 5, rest: 150 };
    case "muscle":
      return { sets: 4, reps: 8, rest: 90 };
    case "conditioning":
      return { sets: 3, reps: 12, rest: 60 };
    case "fat_loss":
      return { sets: 3, reps: 10, rest: 75 };
    case "consistency":
    default:
      return { sets: 3, reps: 8, rest: 90 };
  }
};

const getProfileReadinessScore = (profile: SetupFormValues) => {
  const experienceScore =
    profile.experienceLevel === "advanced"
      ? 2
      : profile.experienceLevel === "intermediate"
      ? 1
      : profile.experienceLevel === "beginner"
      ? 0
      : 1;
  const fitnessScoreMap: Record<string, number> = {
    starting_out: 0,
    getting_back_into_it: 0,
    active_but_inconsistent: 1,
    training_consistently: 2,
    highly_trained: 3,
    "": 1,
  };

  return experienceScore + (fitnessScoreMap[profile.currentFitnessLevel] ?? 0);
};

const getVolumeAdjustment = (profile: SetupFormValues) => {
  const readinessScore = getProfileReadinessScore(profile);
  if (readinessScore <= 1) {
    return -1;
  }

  if (readinessScore >= 4) {
    return 1;
  }

  return 0;
};

const getSessionDensityAdjustment = (profile: SetupFormValues) => {
  const workoutLengthBudget = getWorkoutLengthBudget(profile);
  if (workoutLengthBudget <= 30) {
    return -1;
  }

  if (workoutLengthBudget >= 70) {
    return 1;
  }

  return 0;
};

const getComplexityTier = (profile: SetupFormValues) => {
  const readinessScore = getProfileReadinessScore(profile);
  if (readinessScore <= 1) {
    return "simple" as const;
  }

  if (readinessScore >= 4) {
    return "advanced" as const;
  }

  return "standard" as const;
};

const getExerciseCountLimit = (
  profile: SetupFormValues,
  totalExerciseCount: number
) => {
  const workoutLengthBudget = getWorkoutLengthBudget(profile);
  const readinessScore = getProfileReadinessScore(profile);

  if (workoutLengthBudget <= 30) {
    return Math.min(totalExerciseCount, readinessScore >= 4 ? 4 : 3);
  }

  if (workoutLengthBudget <= 45) {
    return Math.min(totalExerciseCount, 4);
  }

  if (workoutLengthBudget >= 70) {
    return Math.min(totalExerciseCount, readinessScore >= 4 ? 5 : 4);
  }

  return Math.min(totalExerciseCount, readinessScore >= 4 ? 5 : 4);
};

const simplifyExerciseForProfile = (
  exercise: any,
  profile: SetupFormValues
) => {
  if (getComplexityTier(profile) !== "simple" || exercise.type === "timed") {
    return exercise;
  }

  const name = normalizeName(exercise.name);
  const replacements: Array<[RegExp, string]> = [
    [/back squat|front squat/, "Goblet Squat"],
    [/deadlift$/, "Romanian Deadlift"],
    [/bench press|incline bench press/, "Push-Up"],
    [/overhead press/, "Standing Dumbbell Shoulder Press"],
    [/walking lunge/, "Step-Up"],
  ];

  const replacementName = replacements.find(([pattern]) => pattern.test(name))?.[1];
  if (!replacementName) {
    return exercise;
  }

  return resolveExerciseForProfile(replacementName, profile, new Set<string>()) ?? exercise;
};

const getTargetWeight = (exercise: any, profile: SetupFormValues) => {
  const name = normalizeName(exercise.name);
  const normalizedEquipment = (exercise.equipment ?? []).map(normalizeEquipmentText);

  if (
    normalizedEquipment.some((item: string) => item.includes("bodyweight")) ||
    /push-up|pull-up|dip|plank|dead bug/.test(name)
  ) {
    return 0;
  }

  if (
    normalizedEquipment.some((item: string) =>
      ["dumbbell", "barbell", "cable", "machine"].some((tag) =>
        item.includes(tag)
      )
    ) ||
    usesMachineEquipment(exercise.equipment)
  ) {
    return null;
  }

  return null;
};

const getRepTarget = (goal: string, exercise: any, profile: SetupFormValues) => {
  if (exercise.type === "timed") {
    return null;
  }

  const name = normalizeName(exercise.name);
  const normalizedEquipment = (exercise.equipment ?? []).map(normalizeEquipmentText);
  const readinessScore = getProfileReadinessScore(profile);
  let baseTarget = 8;

  if (goal === "strength") {
    baseTarget = /curl|raise|pushdown|fly|extension/.test(name)
      ? 8
      : 5;
  } else if (goal === "conditioning" || goal === "fat_loss") {
    baseTarget = 10;
  } else if (
    goal === "muscle" &&
    isLightDumbbellHomeProfile(profile) &&
    normalizedEquipment.some((item: string) => /dumbbell|bodyweight/.test(item))
  ) {
    baseTarget = /curl|raise|fly|extension/.test(name) ? 15 : 12;
  } else {
    baseTarget = goal === "muscle" ? 8 : 8;
  }

  if (readinessScore <= 1) {
    if (goal === "strength") {
      return Math.max(baseTarget, /curl|raise|pushdown|fly|extension/.test(name) ? 10 : 6);
    }

    return baseTarget + 2;
  }

  if (readinessScore >= 4) {
    if (goal === "strength") {
      return /curl|raise|pushdown|fly|extension/.test(name) ? 8 : 4;
    }

    if (goal === "muscle") {
      return /curl|raise|fly|extension/.test(name) ? 10 : 8;
    }
  }

  if (getWorkoutLengthBudget(profile) <= 30 && goal !== "strength") {
    return baseTarget + 1;
  }

  return baseTarget;
};

const getSetTarget = (goal: string, exercise: any, profile: SetupFormValues) => {
  if (exercise.type === "timed") {
    return 1;
  }

  const name = normalizeName(exercise.name);
  const isAccessory = /curl|raise|pushdown|fly|extension|calf raise|face pull|dead bug|plank/.test(
    name
  );
  const volumeAdjustment = getVolumeAdjustment(profile);
  const densityAdjustment = getSessionDensityAdjustment(profile);
  let baseTarget = goal === "muscle" ? 4 : 3;

  if (goal === "strength") {
    baseTarget = /curl|raise|pushdown|fly|extension/.test(name)
      ? 3
      : 4;
  }

  const adjustedTarget =
    baseTarget +
    volumeAdjustment +
    (isAccessory ? Math.min(densityAdjustment, 0) : densityAdjustment);

  return Math.max(isAccessory ? 2 : 2, Math.min(5, adjustedTarget));
};

const getRestTarget = (goal: string, exercise: any, profile: SetupFormValues) => {
  if (exercise.type === "timed") {
    return 0;
  }

  const name = normalizeName(exercise.name);
  const readinessScore = getProfileReadinessScore(profile);
  const workoutLengthBudget = getWorkoutLengthBudget(profile);
  let baseTarget = goal === "conditioning" ? 45 : 75;

  if (/deadlift|squat|bench|press|row/.test(name)) {
    baseTarget = goal === "strength" ? 150 : 120;
  } else if (/pull-up|pulldown|lunge|step-up|romanian deadlift/.test(name)) {
    baseTarget = 105;
  }

  if (readinessScore <= 1) {
    baseTarget += 15;
  } else if (readinessScore >= 4 && /deadlift|squat|bench|press|row/.test(name)) {
    baseTarget += goal === "strength" ? 15 : 0;
  }

  if (workoutLengthBudget <= 30 && !/deadlift|squat|bench|press|row/.test(name)) {
    baseTarget -= 15;
  }

  return Math.max(30, baseTarget);
};

const getWorkoutLengthBudget = (profile: SetupFormValues) =>
  parsePositiveNumber(profile.workoutLength) ?? 40;

const getTimedMinutesTarget = (
  goal: string,
  profile: SetupFormValues,
  context: TimedDayContext
) => {
  const workoutLengthBudget = getWorkoutLengthBudget(profile);
  const isDedicatedConditioningDay =
    context.timedExerciseCount > 0 &&
    context.timedExerciseCount === context.totalExerciseCount;

  if (isDedicatedConditioningDay) {
    if (goal === "conditioning") {
      if (workoutLengthBudget <= 30) return 12;
      if (workoutLengthBudget <= 45) return 16;
      if (workoutLengthBudget <= 60) return 20;
      if (workoutLengthBudget <= 75) return 24;
      return 28;
    }

    if (workoutLengthBudget <= 30) return 10;
    if (workoutLengthBudget <= 45) return 12;
    if (workoutLengthBudget <= 60) return 15;
    return 18;
  }

  if (workoutLengthBudget <= 30) return 6;
  if (workoutLengthBudget <= 45) return 8;
  if (workoutLengthBudget <= 60) return goal === "conditioning" ? 10 : 8;
  if (workoutLengthBudget <= 75) return goal === "conditioning" ? 12 : 10;
  return goal === "conditioning" ? 14 : 12;
};

const getTimedExerciseDefaults = (
  exercise: any,
  goal: string,
  profile: SetupFormValues,
  context: TimedDayContext
) => {
  const name = normalizeName(exercise.name);
  const cardioMinutes = getTimedMinutesTarget(goal, profile, context);
  const readinessScore = getProfileReadinessScore(profile);
  const beginnerFriendly = readinessScore <= 1;
  const advancedReadiness = readinessScore >= 4;

  if (/plank|wall sit|support hold|hang|superman hold/.test(name)) {
    return {
      sets: beginnerFriendly ? 2 : 3,
      hours: 0,
      minutes: 1,
      seconds: 0,
      rest: beginnerFriendly ? 45 : 30,
    };
  }

  if (/dead bug|bird dog/.test(name)) {
    return {
      sets: advancedReadiness ? 3 : 2,
      hours: 0,
      minutes: 1,
      seconds: 0,
      rest: 30,
    };
  }

  if (/carry/.test(name)) {
    return {
      sets: beginnerFriendly ? 1 : 2,
      hours: 0,
      minutes: Math.max(1, Math.min(6, Math.round(cardioMinutes / 2))),
      seconds: 0,
      rest: 45,
    };
  }

  if (/stretch|mobility|warmup|warm-up|yoga/.test(name)) {
    return {
      sets: 1,
      hours: 0,
      minutes: Math.max(5, Math.min(12, Math.round(cardioMinutes * 0.6))),
      seconds: 0,
      rest: 0,
    };
  }

  return {
    sets: advancedReadiness && getWorkoutLengthBudget(profile) >= 70 ? 2 : 1,
    hours: 0,
    minutes: cardioMinutes,
    seconds: 0,
    rest: 0,
  };
};

const inferExerciseType = (name: string): "weight" | "timed" =>
  /run|row|bike|cycle|walk|jump rope|plank|carry|treadmill|elliptical|stair|cardio|interval|hold|hang|wall sit|support hold/.test(
    normalizeName(name)
  )
    ? "timed"
    : "weight";

const createFallbackExerciseDefinition = (name: string) => ({
  name: name.trim() || "Exercise",
  type: inferExerciseType(name),
  equipment: ["Bodyweight"],
  target: "general",
  bodyPart: "full body",
});

const buildExercise = (
  resolvedExercise: any,
  goal: string,
  profile: SetupFormValues,
  timedContext: TimedDayContext
): GeneratedExercise => {
  if (resolvedExercise.type === "timed") {
    const timedDefaults = getTimedExerciseDefaults(
      resolvedExercise,
      goal,
      profile,
      timedContext
    );
    return {
      name: resolvedExercise.name,
      type: "timed",
      rest: timedDefaults.rest,
      complete: false,
      sets: Array.from({ length: timedDefaults.sets }, (_, index) => ({
        name: `Timed Set ${index + 1}`,
        hours: timedDefaults.hours,
        minutes: timedDefaults.minutes,
        seconds: timedDefaults.seconds,
        totalSeconds:
          timedDefaults.hours * 3600 +
          timedDefaults.minutes * 60 +
          timedDefaults.seconds,
        complete: false,
      })),
    };
  }

  const defaults = getWeightDefaults(goal, false);
  const setTarget = getSetTarget(goal, resolvedExercise, profile);
  const repTarget = getRepTarget(goal, resolvedExercise, profile) ?? defaults.reps;
  const restTarget = getRestTarget(goal, resolvedExercise, profile);
  const targetWeight = getTargetWeight(resolvedExercise, profile);
  return {
    name: resolvedExercise.name,
    type: "weight",
    max: targetWeight ?? undefined,
    rest: restTarget,
    complete: false,
    sets: Array.from({ length: setTarget }, (_, index) => ({
      name: `Working Set ${index + 1}`,
      reps: repTarget,
      weight: targetWeight ?? null,
      complete: false,
    })),
  };
};

const buildExercisesForDay = (
  exerciseNames: string[],
  goal: string,
  profile: SetupFormValues
) => {
  const usedNames = new Set<string>();
  const limitations = profile.limitations || "";
  const resolvedExercises = exerciseNames.map((name) => {
    const directExercise =
      resolveExerciseForProfile(name, profile, usedNames) ??
      ((!profile.equipmentAccess.length || profile.equipmentAccess.includes("Full gym"))
        ? resolveCatalogExercise(name)
        : null);
    const limitationAwareReplacement = getLimitationAwareReplacementOptions(
      directExercise?.name ?? name,
      limitations
    ).find((replacementName) => !usedNames.has(normalizeName(replacementName)));
    const catalogExercise = limitationAwareReplacement
      ? resolveExerciseForProfile(limitationAwareReplacement, profile, usedNames)
      : null;
    const exercise =
      catalogExercise ??
      directExercise ??
      createFallbackExerciseDefinition(limitationAwareReplacement ?? name);
    usedNames.add(normalizeName(exercise.name));
    return exercise;
  });
  const timedContext = {
    timedExerciseCount: 0,
    totalExerciseCount: 0,
  };
  const adjustedExercises = resolvedExercises
    .map((exercise) => simplifyExerciseForProfile(exercise, profile))
    .filter((exercise, index, collection) => {
      const normalized = normalizeName(exercise.name);
      return (
        collection.findIndex(
          (candidate) => normalizeName(candidate.name) === normalized
        ) === index
      );
    });
  const limitedExerciseCount = getExerciseCountLimit(profile, adjustedExercises.length);
  const prioritizedExercises = adjustedExercises.slice(0, limitedExerciseCount);
  const overflowTimedExercise = adjustedExercises
    .slice(limitedExerciseCount)
    .find((exercise) => exercise.type === "timed");
  const hasTimedExerciseInWindow = prioritizedExercises.some(
    (exercise) => exercise.type === "timed"
  );
  const limitedExercises =
    overflowTimedExercise && !hasTimedExerciseInWindow && prioritizedExercises.length > 0
      ? [...prioritizedExercises.slice(0, -1), overflowTimedExercise]
      : prioritizedExercises;

  timedContext.timedExerciseCount = limitedExercises.filter(
    (exercise) => exercise.type === "timed"
  ).length;
  timedContext.totalExerciseCount = limitedExercises.length;

  return limitedExercises.map((exercise) =>
    buildExercise(exercise, goal, profile, timedContext)
  );
};

const pickDays = (profile: SetupFormValues) => {
  const preferred = profile.preferredTrainingDays
    .map((day) => weekdayLookup[day.toLowerCase().slice(0, 3)])
    .filter(Boolean);

  const count = Math.max(
    1,
    Math.min(6, Number(profile.workoutDaysPerWeek || preferred.length || 3))
  );

  const defaultsByCount: Record<number, (typeof dayKeys)[number][]> = {
    1: ["wednesday"],
    2: ["monday", "thursday"],
    3: ["monday", "wednesday", "friday"],
    4: ["monday", "tuesday", "thursday", "friday"],
    5: ["monday", "tuesday", "wednesday", "friday", "saturday"],
    6: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
  };

  if (preferred.length >= count) {
    return preferred.slice(0, count);
  }

  if (preferred.length > 0) {
    const remainder = dayKeys.filter((day) => !preferred.includes(day));
    return [...preferred, ...remainder].slice(0, count);
  }

  return defaultsByCount[count] ?? defaultsByCount[3];
};

type SplitTemplate = {
  title: string;
  exerciseNames: string[];
};

const getHighFrequencyRecommendation = (
  profile: SetupFormValues,
  sessionCount: number
) => {
  if (sessionCount < 5) {
    return null;
  }

  const lowerReadiness =
    profile.experienceLevel === "beginner" ||
    profile.experienceLevel === "" ||
    ["starting_out", "getting_back_into_it", "active_but_inconsistent"].includes(
      profile.currentFitnessLevel
    );
  const longSessions = Number(profile.workoutLength || 0) >= 55;

  if (!lowerReadiness && !(sessionCount === 6 && longSessions)) {
    return null;
  }

  return "I kept the extra sessions lighter, but 4 days per week is probably the more recoverable baseline for your current training background if fatigue starts to stack up.";
};

const getFirstSessionLoadGuidance = (plan: GeneratedWorkoutPlan) => {
  const hasUnspecifiedWeightTargets = plan.days.some((day) =>
    day.exercises.some(
      (exercise) =>
        exercise.type === "weight" &&
        exercise.sets.some((set: any) => set.weight == null)
    )
  );

  if (!hasUnspecifiedWeightTargets) {
    return null;
  }

  return "For your first session, start with the empty bar or a light warm-up load and build up until the working sets feel like about 2-3 reps in reserve. Log what you actually use so later recommendations can anchor to your performance instead of a generic starter weight.";
};

const buildHighFrequencySplit = (
  profileType: "default" | "home_dumbbell" | "bodyweight",
  goal: string,
  sessionCount: number
): SplitTemplate[] | null => {
  if (sessionCount < 4 || sessionCount > 6) {
    return null;
  }

  const libraries: Record<
    "default" | "home_dumbbell" | "bodyweight",
    Record<string, Record<number, SplitTemplate[]>>
  > = {
    default: {
      strength: {
        4: [
          { title: "Lower Strength", exerciseNames: ["Back Squat", "Romanian Deadlift", "Walking Lunge", "Plank"] },
          { title: "Upper Strength", exerciseNames: ["Bench Press", "Barbell Row", "Overhead Press", "Assisted Pull-Up"] },
          { title: "Lower Volume", exerciseNames: ["Front Squat", "Hip Thrust", "Leg Press", "Dead Bug"] },
          { title: "Upper Volume", exerciseNames: ["Incline Bench Press", "Lat Pulldown", "Lateral Raise", "Face Pull"] },
        ],
        5: [
          { title: "Lower Strength", exerciseNames: ["Back Squat", "Romanian Deadlift", "Walking Lunge", "Plank"] },
          { title: "Upper Strength", exerciseNames: ["Bench Press", "Barbell Row", "Overhead Press", "Assisted Pull-Up"] },
          { title: "Posterior Chain", exerciseNames: ["Deadlift", "Hip Thrust", "Back Extension", "Farmer Carry"] },
          { title: "Upper Volume", exerciseNames: ["Incline Bench Press", "Lat Pulldown", "Lateral Raise", "Face Pull"] },
          { title: "Recovery + Core", exerciseNames: ["Cycling", "Sled Push", "Dead Bug"] },
        ],
        6: [
          { title: "Lower Strength", exerciseNames: ["Back Squat", "Romanian Deadlift", "Walking Lunge", "Plank"] },
          { title: "Upper Strength", exerciseNames: ["Bench Press", "Barbell Row", "Overhead Press", "Assisted Pull-Up"] },
          { title: "Lower Volume", exerciseNames: ["Front Squat", "Hip Thrust", "Leg Press", "Dead Bug"] },
          { title: "Upper Volume", exerciseNames: ["Incline Bench Press", "Lat Pulldown", "Lateral Raise", "Face Pull"] },
          { title: "Posterior Chain", exerciseNames: ["Deadlift", "Back Extension", "Farmer Carry", "Hammer Curl"] },
          { title: "Technique + Core", exerciseNames: ["Cycling", "Sled Push", "Plank"] },
        ],
      },
      muscle: {
        4: [
          { title: "Upper Push", exerciseNames: ["Bench Press", "Incline Bench Press", "Lateral Raise", "Triceps Pushdown"] },
          { title: "Upper Pull", exerciseNames: ["Barbell Row", "Lat Pulldown", "Face Pull", "Barbell Curl"] },
          { title: "Lower Quad Bias", exerciseNames: ["Back Squat", "Leg Press", "Leg Extension", "Calf Raise"] },
          { title: "Lower Posterior Bias", exerciseNames: ["Romanian Deadlift", "Hip Thrust", "Hamstring Curl", "Walking Lunge"] },
        ],
        5: [
          { title: "Push Heavy", exerciseNames: ["Bench Press", "Incline Bench Press", "Overhead Press", "Triceps Pushdown"] },
          { title: "Pull Heavy", exerciseNames: ["Barbell Row", "Lat Pulldown", "Chest Supported Row", "Barbell Curl"] },
          { title: "Legs Heavy", exerciseNames: ["Back Squat", "Romanian Deadlift", "Leg Press", "Hamstring Curl"] },
          { title: "Upper Pump", exerciseNames: ["Machine Chest Press", "Cable Row", "Lateral Raise", "Face Pull"] },
          { title: "Lower Pump + Core", exerciseNames: ["Walking Lunge", "Leg Extension", "Calf Raise", "Plank"] },
        ],
        6: [
          { title: "Push Heavy", exerciseNames: ["Bench Press", "Incline Bench Press", "Overhead Press", "Triceps Pushdown"] },
          { title: "Pull Heavy", exerciseNames: ["Barbell Row", "Lat Pulldown", "Chest Supported Row", "Barbell Curl"] },
          { title: "Legs Heavy", exerciseNames: ["Back Squat", "Romanian Deadlift", "Leg Press", "Hamstring Curl"] },
          { title: "Push Pump", exerciseNames: ["Machine Chest Press", "Lateral Raise", "Cable Fly", "Overhead Triceps Extension"] },
          { title: "Pull Pump", exerciseNames: ["Cable Row", "Face Pull", "Rear Delt Fly", "Hammer Curl"] },
          { title: "Legs Pump + Core", exerciseNames: ["Walking Lunge", "Leg Extension", "Calf Raise", "Plank"] },
        ],
      },
      conditioning: {
        4: [
          { title: "Intervals + Core", exerciseNames: ["Cycling", "Plank", "Dead Bug"] },
          { title: "Full Body Circuit", exerciseNames: ["Goblet Squat", "Push-Up", "Assisted Pull-Up", "Jump Rope"] },
          { title: "Aerobic Base", exerciseNames: ["Rowing", "Walking Lunge", "Farmer Carry"] },
          { title: "Tempo + Mobility", exerciseNames: ["Treadmill", "Dead Bug", "Plank"] },
        ],
        5: [
          { title: "Power Intervals", exerciseNames: ["Cycling", "Jump Rope", "Plank"] },
          { title: "Full Body Circuit", exerciseNames: ["Goblet Squat", "Push-Up", "Assisted Pull-Up", "Jump Rope"] },
          { title: "Aerobic Base", exerciseNames: ["Rowing", "Walking Lunge", "Farmer Carry"] },
          { title: "Threshold Builder", exerciseNames: ["Treadmill", "Dead Bug", "Mountain Climber"] },
          { title: "Recovery Engine", exerciseNames: ["Cycling", "Plank", "Dead Bug"] },
        ],
        6: [
          { title: "Power Intervals", exerciseNames: ["Cycling", "Jump Rope", "Plank"] },
          { title: "Circuit Builder", exerciseNames: ["Goblet Squat", "Push-Up", "Assisted Pull-Up", "Jump Rope"] },
          { title: "Aerobic Base", exerciseNames: ["Rowing", "Walking Lunge", "Farmer Carry"] },
          { title: "Threshold Builder", exerciseNames: ["Treadmill", "Dead Bug", "Mountain Climber"] },
          { title: "Mixed Modal Conditioning", exerciseNames: ["Bike / cycling", "Walking Lunge", "Farmer Carry"] },
          { title: "Recovery Engine", exerciseNames: ["Cycling", "Plank", "Dead Bug"] },
        ],
      },
      fat_loss: {
        4: [
          { title: "Full Body Strength", exerciseNames: ["Goblet Squat", "Bench Press", "Lat Pulldown", "Cycling"] },
          { title: "Full Body Conditioning", exerciseNames: ["Romanian Deadlift", "Push-Up", "Seated Cable Row", "Jump Rope"] },
          { title: "Lower + Core", exerciseNames: ["Walking Lunge", "Leg Press", "Hamstring Curl", "Plank"] },
          { title: "Upper + Carry", exerciseNames: ["Overhead Press", "Assisted Pull-Up", "Farmer Carry", "Cycling"] },
        ],
        5: [
          { title: "Full Body Strength", exerciseNames: ["Goblet Squat", "Bench Press", "Lat Pulldown", "Cycling"] },
          { title: "Metabolic Push", exerciseNames: ["Push-Up", "Walking Lunge", "Farmer Carry", "Jump Rope"] },
          { title: "Full Body Pull", exerciseNames: ["Romanian Deadlift", "Seated Cable Row", "Plank", "Cycling"] },
          { title: "Lower Volume", exerciseNames: ["Leg Press", "Hamstring Curl", "Calf Raise", "Dead Bug"] },
          { title: "Recovery Circuit", exerciseNames: ["Bike / cycling", "Dead Bug", "Plank"] },
        ],
        6: [
          { title: "Full Body Strength", exerciseNames: ["Goblet Squat", "Bench Press", "Lat Pulldown", "Cycling"] },
          { title: "Metabolic Push", exerciseNames: ["Push-Up", "Walking Lunge", "Farmer Carry", "Jump Rope"] },
          { title: "Full Body Pull", exerciseNames: ["Romanian Deadlift", "Seated Cable Row", "Plank", "Cycling"] },
          { title: "Lower Volume", exerciseNames: ["Leg Press", "Hamstring Curl", "Calf Raise", "Dead Bug"] },
          { title: "Upper Volume", exerciseNames: ["Overhead Press", "Assisted Pull-Up", "Lateral Raise", "Farmer Carry"] },
          { title: "Recovery Circuit", exerciseNames: ["Bike / cycling", "Dead Bug", "Plank"] },
        ],
      },
      consistency: {
        4: [
          { title: "Full Body Strength", exerciseNames: ["Goblet Squat", "Bench Press", "Seated Cable Row", "Plank"] },
          { title: "Full Body Hinge", exerciseNames: ["Romanian Deadlift", "Push-Up", "Lat Pulldown", "Cycling"] },
          { title: "Lower + Balance", exerciseNames: ["Walking Lunge", "Step-Up", "Dead Bug", "Calf Raise"] },
          { title: "Upper + Conditioning", exerciseNames: ["Overhead Press", "Assisted Pull-Up", "Farmer Carry", "Jump Rope"] },
        ],
        5: [
          { title: "Full Body Strength", exerciseNames: ["Goblet Squat", "Bench Press", "Seated Cable Row", "Plank"] },
          { title: "Full Body Hinge", exerciseNames: ["Romanian Deadlift", "Push-Up", "Lat Pulldown", "Cycling"] },
          { title: "Lower + Balance", exerciseNames: ["Walking Lunge", "Step-Up", "Dead Bug", "Calf Raise"] },
          { title: "Upper + Carry", exerciseNames: ["Overhead Press", "Assisted Pull-Up", "Farmer Carry", "Jump Rope"] },
          { title: "Recovery Circuit", exerciseNames: ["Cycling", "Plank", "Dead Bug"] },
        ],
        6: [
          { title: "Full Body Strength", exerciseNames: ["Goblet Squat", "Bench Press", "Seated Cable Row", "Plank"] },
          { title: "Full Body Hinge", exerciseNames: ["Romanian Deadlift", "Push-Up", "Lat Pulldown", "Cycling"] },
          { title: "Lower + Balance", exerciseNames: ["Walking Lunge", "Step-Up", "Dead Bug", "Calf Raise"] },
          { title: "Upper + Carry", exerciseNames: ["Overhead Press", "Assisted Pull-Up", "Farmer Carry", "Jump Rope"] },
          { title: "Full Body Volume", exerciseNames: ["Leg Press", "Machine Chest Press", "Cable Row", "Plank"] },
          { title: "Recovery Circuit", exerciseNames: ["Cycling", "Dead Bug", "Plank"] },
        ],
      },
    },
    home_dumbbell: {},
    bodyweight: {},
  };

  libraries.home_dumbbell = {
    strength: {
      4: [
        { title: "Lower Strength", exerciseNames: ["Goblet Squat", "Romanian Deadlift", "Walking Lunge", "Plank"] },
        { title: "Upper Strength", exerciseNames: ["Dumbbell Floor Press", "One-Arm Dumbbell Row", "Standing Dumbbell Shoulder Press", "Farmer Carry"] },
        { title: "Lower Volume", exerciseNames: ["Goblet Squat", "Glute Bridge", "Step-Up", "Dead Bug"] },
        { title: "Upper Volume", exerciseNames: ["Push-Up", "One-Arm Dumbbell Row", "Lateral Raise", "Rear Delt Fly"] },
      ],
      5: [
        { title: "Lower Strength", exerciseNames: ["Goblet Squat", "Romanian Deadlift", "Walking Lunge", "Plank"] },
        { title: "Upper Strength", exerciseNames: ["Dumbbell Floor Press", "One-Arm Dumbbell Row", "Standing Dumbbell Shoulder Press", "Farmer Carry"] },
        { title: "Posterior Chain", exerciseNames: ["Romanian Deadlift", "Glute Bridge", "Rear Delt Fly", "Farmer Carry"] },
        { title: "Upper Volume", exerciseNames: ["Push-Up", "One-Arm Dumbbell Row", "Lateral Raise", "Hammer Curl"] },
        { title: "Recovery + Core", exerciseNames: ["Jump Rope", "Plank", "Dead Bug"] },
      ],
      6: [
        { title: "Lower Strength", exerciseNames: ["Goblet Squat", "Romanian Deadlift", "Walking Lunge", "Plank"] },
        { title: "Upper Strength", exerciseNames: ["Dumbbell Floor Press", "One-Arm Dumbbell Row", "Standing Dumbbell Shoulder Press", "Farmer Carry"] },
        { title: "Lower Volume", exerciseNames: ["Goblet Squat", "Glute Bridge", "Step-Up", "Dead Bug"] },
        { title: "Upper Volume", exerciseNames: ["Push-Up", "One-Arm Dumbbell Row", "Lateral Raise", "Rear Delt Fly"] },
        { title: "Posterior Chain", exerciseNames: ["Romanian Deadlift", "Glute Bridge", "Hammer Curl", "Farmer Carry"] },
        { title: "Technique + Core", exerciseNames: ["Jump Rope", "Plank", "Dead Bug"] },
      ],
    },
    muscle: {
      4: [
        { title: "Upper Push", exerciseNames: ["Dumbbell Floor Press", "Push-Up", "Lateral Raise", "Overhead Dumbbell Triceps Extension"] },
        { title: "Upper Pull", exerciseNames: ["One-Arm Dumbbell Row", "Shrug", "Rear Delt Fly", "Hammer Curl"] },
        { title: "Lower Quad Bias", exerciseNames: ["Goblet Squat", "Walking Lunge", "Step-Up", "Calf Raise"] },
        { title: "Lower Posterior Bias", exerciseNames: ["Romanian Deadlift", "Glute Bridge", "Walking Lunge", "Farmer Carry"] },
      ],
      5: [
        { title: "Push Heavy", exerciseNames: ["Dumbbell Floor Press", "Push-Up", "Standing Dumbbell Shoulder Press", "Overhead Dumbbell Triceps Extension"] },
        { title: "Pull Heavy", exerciseNames: ["One-Arm Dumbbell Row", "Shrug", "Rear Delt Fly", "Hammer Curl"] },
        { title: "Legs Heavy", exerciseNames: ["Goblet Squat", "Romanian Deadlift", "Walking Lunge", "Farmer Carry"] },
        { title: "Upper Pump", exerciseNames: ["Push-Up", "Lateral Raise", "Rear Delt Fly", "Hammer Curl"] },
        { title: "Lower Pump + Core", exerciseNames: ["Walking Lunge", "Step-Up", "Calf Raise", "Plank"] },
      ],
      6: [
        { title: "Push Heavy", exerciseNames: ["Dumbbell Floor Press", "Push-Up", "Standing Dumbbell Shoulder Press", "Overhead Dumbbell Triceps Extension"] },
        { title: "Pull Heavy", exerciseNames: ["One-Arm Dumbbell Row", "Shrug", "Rear Delt Fly", "Hammer Curl"] },
        { title: "Legs Heavy", exerciseNames: ["Goblet Squat", "Romanian Deadlift", "Walking Lunge", "Farmer Carry"] },
        { title: "Push Pump", exerciseNames: ["Push-Up", "Lateral Raise", "Standing Dumbbell Shoulder Press", "Overhead Dumbbell Triceps Extension"] },
        { title: "Pull Pump", exerciseNames: ["One-Arm Dumbbell Row", "Rear Delt Fly", "Shrug", "Hammer Curl"] },
        { title: "Legs Pump + Core", exerciseNames: ["Walking Lunge", "Step-Up", "Calf Raise", "Plank"] },
      ],
    },
    conditioning: libraries.default.conditioning,
    fat_loss: {
      4: [
        { title: "Full Body Strength", exerciseNames: ["Goblet Squat", "Dumbbell Floor Press", "One-Arm Dumbbell Row", "Jump Rope"] },
        { title: "Full Body Conditioning", exerciseNames: ["Romanian Deadlift", "Push-Up", "Walking Lunge", "Plank"] },
        { title: "Lower + Core", exerciseNames: ["Walking Lunge", "Step-Up", "Dead Bug", "Calf Raise"] },
        { title: "Upper + Carry", exerciseNames: ["Standing Dumbbell Shoulder Press", "Hammer Curl", "Farmer Carry", "Jump Rope"] },
      ],
      5: [
        { title: "Full Body Strength", exerciseNames: ["Goblet Squat", "Dumbbell Floor Press", "One-Arm Dumbbell Row", "Jump Rope"] },
        { title: "Metabolic Push", exerciseNames: ["Push-Up", "Walking Lunge", "Farmer Carry", "Jump Rope"] },
        { title: "Full Body Pull", exerciseNames: ["Romanian Deadlift", "Hammer Curl", "Plank", "Jump Rope"] },
        { title: "Lower Volume", exerciseNames: ["Step-Up", "Walking Lunge", "Calf Raise", "Dead Bug"] },
        { title: "Recovery Circuit", exerciseNames: ["Jump Rope", "Dead Bug", "Plank"] },
      ],
      6: [
        { title: "Full Body Strength", exerciseNames: ["Goblet Squat", "Dumbbell Floor Press", "One-Arm Dumbbell Row", "Jump Rope"] },
        { title: "Metabolic Push", exerciseNames: ["Push-Up", "Walking Lunge", "Farmer Carry", "Jump Rope"] },
        { title: "Full Body Pull", exerciseNames: ["Romanian Deadlift", "Hammer Curl", "Plank", "Jump Rope"] },
        { title: "Lower Volume", exerciseNames: ["Step-Up", "Walking Lunge", "Calf Raise", "Dead Bug"] },
        { title: "Upper Volume", exerciseNames: ["Standing Dumbbell Shoulder Press", "One-Arm Dumbbell Row", "Lateral Raise", "Farmer Carry"] },
        { title: "Recovery Circuit", exerciseNames: ["Jump Rope", "Dead Bug", "Plank"] },
      ],
    },
    consistency: {
      4: [
        { title: "Full Body Strength", exerciseNames: ["Goblet Squat", "Dumbbell Floor Press", "One-Arm Dumbbell Row", "Plank"] },
        { title: "Full Body Hinge", exerciseNames: ["Romanian Deadlift", "Push-Up", "Walking Lunge", "Farmer Carry"] },
        { title: "Lower + Balance", exerciseNames: ["Walking Lunge", "Step-Up", "Dead Bug", "Calf Raise"] },
        { title: "Upper + Conditioning", exerciseNames: ["Standing Dumbbell Shoulder Press", "Hammer Curl", "Farmer Carry", "Jump Rope"] },
      ],
      5: [
        { title: "Full Body Strength", exerciseNames: ["Goblet Squat", "Dumbbell Floor Press", "One-Arm Dumbbell Row", "Plank"] },
        { title: "Full Body Hinge", exerciseNames: ["Romanian Deadlift", "Push-Up", "Walking Lunge", "Farmer Carry"] },
        { title: "Lower + Balance", exerciseNames: ["Walking Lunge", "Step-Up", "Dead Bug", "Calf Raise"] },
        { title: "Upper + Carry", exerciseNames: ["Standing Dumbbell Shoulder Press", "Hammer Curl", "Farmer Carry", "Jump Rope"] },
        { title: "Recovery Circuit", exerciseNames: ["Jump Rope", "Plank", "Dead Bug"] },
      ],
      6: [
        { title: "Full Body Strength", exerciseNames: ["Goblet Squat", "Dumbbell Floor Press", "One-Arm Dumbbell Row", "Plank"] },
        { title: "Full Body Hinge", exerciseNames: ["Romanian Deadlift", "Push-Up", "Walking Lunge", "Farmer Carry"] },
        { title: "Lower + Balance", exerciseNames: ["Walking Lunge", "Step-Up", "Dead Bug", "Calf Raise"] },
        { title: "Upper + Carry", exerciseNames: ["Standing Dumbbell Shoulder Press", "Hammer Curl", "Farmer Carry", "Jump Rope"] },
        { title: "Full Body Volume", exerciseNames: ["Goblet Squat", "Push-Up", "One-Arm Dumbbell Row", "Plank"] },
        { title: "Recovery Circuit", exerciseNames: ["Jump Rope", "Dead Bug", "Plank"] },
      ],
    },
  };

  libraries.bodyweight = {
    strength: {
      4: [
        { title: "Lower Strength", exerciseNames: ["Bodyweight Squat", "Reverse Lunge", "Glute Bridge", "Wall Sit"] },
        { title: "Upper Strength", exerciseNames: ["Push-Up", "Pike Push-Up", "Prone Back Extension", "Plank"] },
        { title: "Lower Volume", exerciseNames: ["Reverse Lunge", "Glute Bridge", "Wall Sit", "Dead Bug"] },
        { title: "Upper Volume", exerciseNames: ["Push-Up", "Prone Back Extension", "Bird Dog", "Mountain Climber"] },
      ],
      5: [
        { title: "Lower Strength", exerciseNames: ["Bodyweight Squat", "Reverse Lunge", "Glute Bridge", "Wall Sit"] },
        { title: "Upper Strength", exerciseNames: ["Push-Up", "Pike Push-Up", "Prone Back Extension", "Plank"] },
        { title: "Posterior Chain", exerciseNames: ["Glute Bridge", "Prone Back Extension", "Bird Dog", "Superman Hold"] },
        { title: "Upper Volume", exerciseNames: ["Push-Up", "Pike Push-Up", "Bird Dog", "Mountain Climber"] },
        { title: "Recovery + Core", exerciseNames: ["Dead Bug", "Plank", "Bird Dog"] },
      ],
      6: [
        { title: "Lower Strength", exerciseNames: ["Bodyweight Squat", "Reverse Lunge", "Glute Bridge", "Wall Sit"] },
        { title: "Upper Strength", exerciseNames: ["Push-Up", "Pike Push-Up", "Prone Back Extension", "Plank"] },
        { title: "Lower Volume", exerciseNames: ["Reverse Lunge", "Glute Bridge", "Wall Sit", "Dead Bug"] },
        { title: "Upper Volume", exerciseNames: ["Push-Up", "Prone Back Extension", "Bird Dog", "Mountain Climber"] },
        { title: "Posterior Chain", exerciseNames: ["Glute Bridge", "Prone Back Extension", "Superman Hold", "Bird Dog"] },
        { title: "Technique + Core", exerciseNames: ["Dead Bug", "Plank", "Bird Dog"] },
      ],
    },
    muscle: {
      4: [
        { title: "Upper Push", exerciseNames: ["Push-Up", "Pike Push-Up", "Bodyweight Squat", "Wall Sit"] },
        { title: "Upper Pull + Core", exerciseNames: ["Prone Back Extension", "Bird Dog", "Plank", "Dead Bug"] },
        { title: "Lower Quad Bias", exerciseNames: ["Bodyweight Squat", "Reverse Lunge", "Wall Sit", "Mountain Climber"] },
        { title: "Lower Posterior Bias", exerciseNames: ["Glute Bridge", "Reverse Lunge", "Bird Dog", "Plank"] },
      ],
      5: [
        { title: "Push Heavy", exerciseNames: ["Push-Up", "Pike Push-Up", "Bodyweight Squat", "Wall Sit"] },
        { title: "Pull + Posture", exerciseNames: ["Prone Back Extension", "Bird Dog", "Plank", "Dead Bug"] },
        { title: "Legs Heavy", exerciseNames: ["Bodyweight Squat", "Reverse Lunge", "Glute Bridge", "Wall Sit"] },
        { title: "Upper Pump", exerciseNames: ["Push-Up", "Pike Push-Up", "Mountain Climber", "Plank"] },
        { title: "Lower Pump + Core", exerciseNames: ["Reverse Lunge", "Wall Sit", "Dead Bug", "Bird Dog"] },
      ],
      6: [
        { title: "Push Heavy", exerciseNames: ["Push-Up", "Pike Push-Up", "Bodyweight Squat", "Wall Sit"] },
        { title: "Pull + Posture", exerciseNames: ["Prone Back Extension", "Bird Dog", "Plank", "Dead Bug"] },
        { title: "Legs Heavy", exerciseNames: ["Bodyweight Squat", "Reverse Lunge", "Glute Bridge", "Wall Sit"] },
        { title: "Push Pump", exerciseNames: ["Push-Up", "Pike Push-Up", "Mountain Climber", "Plank"] },
        { title: "Pull Pump", exerciseNames: ["Prone Back Extension", "Bird Dog", "Dead Bug", "Plank"] },
        { title: "Legs Pump + Core", exerciseNames: ["Reverse Lunge", "Wall Sit", "Dead Bug", "Bird Dog"] },
      ],
    },
    conditioning: libraries.default.conditioning,
    fat_loss: {
      4: [
        { title: "Full Body Strength", exerciseNames: ["Bodyweight Squat", "Push-Up", "Prone Back Extension", "Mountain Climber"] },
        { title: "Full Body Conditioning", exerciseNames: ["Reverse Lunge", "Pike Push-Up", "Glute Bridge", "Plank"] },
        { title: "Lower + Core", exerciseNames: ["Reverse Lunge", "Wall Sit", "Dead Bug", "Bird Dog"] },
        { title: "Upper + Engine", exerciseNames: ["Push-Up", "Prone Back Extension", "Mountain Climber", "Plank"] },
      ],
      5: [
        { title: "Full Body Strength", exerciseNames: ["Bodyweight Squat", "Push-Up", "Prone Back Extension", "Mountain Climber"] },
        { title: "Metabolic Push", exerciseNames: ["Push-Up", "Reverse Lunge", "Mountain Climber", "Plank"] },
        { title: "Full Body Pull", exerciseNames: ["Glute Bridge", "Prone Back Extension", "Bird Dog", "Dead Bug"] },
        { title: "Lower Volume", exerciseNames: ["Reverse Lunge", "Wall Sit", "Dead Bug", "Bird Dog"] },
        { title: "Recovery Circuit", exerciseNames: ["Dead Bug", "Plank", "Bird Dog"] },
      ],
      6: [
        { title: "Full Body Strength", exerciseNames: ["Bodyweight Squat", "Push-Up", "Prone Back Extension", "Mountain Climber"] },
        { title: "Metabolic Push", exerciseNames: ["Push-Up", "Reverse Lunge", "Mountain Climber", "Plank"] },
        { title: "Full Body Pull", exerciseNames: ["Glute Bridge", "Prone Back Extension", "Bird Dog", "Dead Bug"] },
        { title: "Lower Volume", exerciseNames: ["Reverse Lunge", "Wall Sit", "Dead Bug", "Bird Dog"] },
        { title: "Upper Volume", exerciseNames: ["Push-Up", "Pike Push-Up", "Prone Back Extension", "Plank"] },
        { title: "Recovery Circuit", exerciseNames: ["Dead Bug", "Plank", "Bird Dog"] },
      ],
    },
    consistency: {
      4: [
        { title: "Full Body Strength", exerciseNames: ["Bodyweight Squat", "Push-Up", "Prone Back Extension", "Plank"] },
        { title: "Full Body Hinge", exerciseNames: ["Reverse Lunge", "Glute Bridge", "Bird Dog", "Mountain Climber"] },
        { title: "Lower + Balance", exerciseNames: ["Reverse Lunge", "Wall Sit", "Dead Bug", "Bird Dog"] },
        { title: "Upper + Conditioning", exerciseNames: ["Pike Push-Up", "Push-Up", "Mountain Climber", "Plank"] },
      ],
      5: [
        { title: "Full Body Strength", exerciseNames: ["Bodyweight Squat", "Push-Up", "Prone Back Extension", "Plank"] },
        { title: "Full Body Hinge", exerciseNames: ["Reverse Lunge", "Glute Bridge", "Bird Dog", "Mountain Climber"] },
        { title: "Lower + Balance", exerciseNames: ["Reverse Lunge", "Wall Sit", "Dead Bug", "Bird Dog"] },
        { title: "Upper + Conditioning", exerciseNames: ["Pike Push-Up", "Push-Up", "Mountain Climber", "Plank"] },
        { title: "Recovery Circuit", exerciseNames: ["Dead Bug", "Plank", "Bird Dog"] },
      ],
      6: [
        { title: "Full Body Strength", exerciseNames: ["Bodyweight Squat", "Push-Up", "Prone Back Extension", "Plank"] },
        { title: "Full Body Hinge", exerciseNames: ["Reverse Lunge", "Glute Bridge", "Bird Dog", "Mountain Climber"] },
        { title: "Lower + Balance", exerciseNames: ["Reverse Lunge", "Wall Sit", "Dead Bug", "Bird Dog"] },
        { title: "Upper + Conditioning", exerciseNames: ["Pike Push-Up", "Push-Up", "Mountain Climber", "Plank"] },
        { title: "Full Body Volume", exerciseNames: ["Bodyweight Squat", "Push-Up", "Bird Dog", "Dead Bug"] },
        { title: "Recovery Circuit", exerciseNames: ["Dead Bug", "Plank", "Bird Dog"] },
      ],
    },
  };

  const family = libraries[profileType];
  return family[goal]?.[sessionCount] ?? family.consistency?.[sessionCount] ?? null;
};

const buildFallbackSplit = (profile: SetupFormValues) => {
  const goal = profile.trainingGoal || "consistency";
  const normalizedGoal = normalizeGoalForProgramming(goal);
  const days = pickDays(profile);
  const profileType = isBodyweightOnlyProfile(profile)
    ? "bodyweight"
    : isHomeDumbbellProfile(profile)
    ? "home_dumbbell"
    : "default";

  const defaultTemplates: Record<string, { title: string; exerciseNames: string[] }[]> = {
    strength: [
      {
        title: "Lower Strength",
        exerciseNames: ["Back Squat", "Romanian Deadlift", "Walking Lunge", "Plank"],
      },
      {
        title: "Upper Strength",
        exerciseNames: ["Bench Press", "Barbell Row", "Overhead Press", "Assisted Pull-Up"],
      },
      {
        title: "Pull + Posterior",
        exerciseNames: ["Deadlift", "Lat Pulldown", "Face Pull", "Hammer Curl"],
      },
    ],
    muscle: [
      {
        title: "Push",
        exerciseNames: ["Bench Press", "Incline Bench Press", "Lateral Raise", "Triceps Pushdown"],
      },
      {
        title: "Pull",
        exerciseNames: ["Barbell Row", "Lat Pulldown", "Face Pull", "Barbell Curl"],
      },
      {
        title: "Legs",
        exerciseNames: ["Back Squat", "Romanian Deadlift", "Leg Extension", "Hamstring Curl"],
      },
    ],
    conditioning: [
      {
        title: "Conditioning + Core",
        exerciseNames: ["Cycling", "Plank", "Dead Bug"],
      },
      {
        title: "Full Body Circuit",
        exerciseNames: ["Goblet Squat", "Push-Up", "Assisted Pull-Up", "Jump Rope"],
      },
      {
        title: "Engine Builder",
        exerciseNames: ["Rowing", "Walking Lunge", "Farmer Carry"],
      },
    ],
    fat_loss: [
      {
        title: "Full Body A",
        exerciseNames: ["Goblet Squat", "Bench Press", "Lat Pulldown", "Cycling"],
      },
      {
        title: "Full Body B",
        exerciseNames: ["Romanian Deadlift", "Push-Up", "Seated Cable Row", "Jump Rope"],
      },
      {
        title: "Full Body C",
        exerciseNames: ["Walking Lunge", "Overhead Press", "Assisted Pull-Up", "Plank"],
      },
    ],
    consistency: [
      {
        title: "Full Body A",
        exerciseNames: ["Goblet Squat", "Bench Press", "Seated Cable Row", "Plank"],
      },
      {
        title: "Full Body B",
        exerciseNames: ["Romanian Deadlift", "Push-Up", "Lat Pulldown", "Cycling"],
      },
      {
        title: "Full Body C",
        exerciseNames: ["Walking Lunge", "Overhead Press", "Assisted Pull-Up", "Dead Bug"],
      },
    ],
  };

  const homeDumbbellTemplates: Record<
    string,
    { title: string; exerciseNames: string[] }[]
  > = {
    strength: [
      {
        title: "Lower Strength",
        exerciseNames: ["Goblet Squat", "Romanian Deadlift", "Walking Lunge", "Plank"],
      },
      {
        title: "Upper Strength",
        exerciseNames: [
          "Dumbbell Floor Press",
          "One-Arm Dumbbell Row",
          "Standing Dumbbell Shoulder Press",
          "Farmer Carry",
        ],
      },
      {
        title: "Posterior + Pull",
        exerciseNames: [
          "Romanian Deadlift",
          "One-Arm Dumbbell Row",
          "Rear Delt Fly",
          "Hammer Curl",
        ],
      },
    ],
    muscle: [
      {
        title: "Push",
        exerciseNames: [
          "Dumbbell Floor Press",
          "Push-Up",
          "Lateral Raise",
          "Overhead Dumbbell Triceps Extension",
        ],
      },
      {
        title: "Pull",
        exerciseNames: ["One-Arm Dumbbell Row", "Shrug", "Rear Delt Fly", "Hammer Curl"],
      },
      {
        title: "Legs",
        exerciseNames: ["Goblet Squat", "Romanian Deadlift", "Walking Lunge", "Farmer Carry"],
      },
    ],
    conditioning: [
      {
        title: "Conditioning + Core",
        exerciseNames: ["Jump Rope", "Plank", "Dead Bug"],
      },
      {
        title: "Full Body Circuit",
        exerciseNames: ["Goblet Squat", "Push-Up", "Walking Lunge", "Jump Rope"],
      },
      {
        title: "Engine Builder",
        exerciseNames: ["Farmer Carry", "Walking Lunge", "Dead Bug"],
      },
    ],
    fat_loss: [
      {
        title: "Full Body A",
        exerciseNames: ["Goblet Squat", "Dumbbell Floor Press", "One-Arm Dumbbell Row", "Jump Rope"],
      },
      {
        title: "Full Body B",
        exerciseNames: ["Romanian Deadlift", "Push-Up", "Walking Lunge", "Plank"],
      },
      {
        title: "Full Body C",
        exerciseNames: [
          "Walking Lunge",
          "Standing Dumbbell Shoulder Press",
          "Hammer Curl",
          "Farmer Carry",
        ],
      },
    ],
    consistency: [
      {
        title: "Full Body A",
        exerciseNames: ["Goblet Squat", "Dumbbell Floor Press", "One-Arm Dumbbell Row", "Plank"],
      },
      {
        title: "Full Body B",
        exerciseNames: ["Romanian Deadlift", "Push-Up", "Walking Lunge", "Farmer Carry"],
      },
      {
        title: "Full Body C",
        exerciseNames: [
          "Walking Lunge",
          "Standing Dumbbell Shoulder Press",
          "Hammer Curl",
          "Dead Bug",
        ],
      },
    ],
  };

  const bodyweightOnlyTemplates: Record<
    string,
    { title: string; exerciseNames: string[] }[]
  > = {
    strength: [
      {
        title: "Lower Strength",
        exerciseNames: ["Bodyweight Squat", "Reverse Lunge", "Glute Bridge", "Wall Sit"],
      },
      {
        title: "Upper Strength",
        exerciseNames: ["Push-Up", "Pike Push-Up", "Prone Back Extension", "Plank"],
      },
      {
        title: "Full Body Strength",
        exerciseNames: ["Reverse Lunge", "Push-Up", "Bird Dog", "Superman Hold"],
      },
    ],
    muscle: [
      {
        title: "Push + Legs",
        exerciseNames: ["Push-Up", "Pike Push-Up", "Bodyweight Squat", "Wall Sit"],
      },
      {
        title: "Lower + Core",
        exerciseNames: ["Reverse Lunge", "Glute Bridge", "Plank", "Dead Bug"],
      },
      {
        title: "Full Body Pump",
        exerciseNames: ["Reverse Lunge", "Push-Up", "Prone Back Extension", "Mountain Climber"],
      },
    ],
    conditioning: [
      {
        title: "Conditioning + Core",
        exerciseNames: ["Mountain Climber", "Plank", "Dead Bug", "Bird Dog"],
      },
      {
        title: "Full Body Circuit",
        exerciseNames: ["Bodyweight Squat", "Push-Up", "Reverse Lunge", "Mountain Climber"],
      },
      {
        title: "Engine Builder",
        exerciseNames: ["Reverse Lunge", "Wall Sit", "Superman Hold", "Dead Bug"],
      },
    ],
    fat_loss: [
      {
        title: "Full Body A",
        exerciseNames: ["Bodyweight Squat", "Push-Up", "Prone Back Extension", "Mountain Climber"],
      },
      {
        title: "Full Body B",
        exerciseNames: ["Reverse Lunge", "Pike Push-Up", "Glute Bridge", "Plank"],
      },
      {
        title: "Full Body C",
        exerciseNames: ["Reverse Lunge", "Push-Up", "Bird Dog", "Wall Sit"],
      },
    ],
    consistency: [
      {
        title: "Full Body A",
        exerciseNames: ["Bodyweight Squat", "Push-Up", "Prone Back Extension", "Plank"],
      },
      {
        title: "Full Body B",
        exerciseNames: ["Reverse Lunge", "Glute Bridge", "Bird Dog", "Mountain Climber"],
      },
      {
        title: "Full Body C",
        exerciseNames: ["Reverse Lunge", "Pike Push-Up", "Dead Bug", "Wall Sit"],
      },
    ],
  };

  const templates = isBodyweightOnlyProfile(profile)
    ? bodyweightOnlyTemplates
    : isHomeDumbbellProfile(profile)
    ? homeDumbbellTemplates
    : defaultTemplates;

  if (days.length === 1) {
    const oneDayTemplateByProfileType: Record<
      "default" | "home_dumbbell" | "bodyweight",
      Record<string, { title: string; exerciseNames: string[] }>
    > = {
      default: {
        strength: {
          title: "Full Body Strength Anchor",
          exerciseNames: [
            "Back Squat",
            "Bench Press",
            "Barbell Row",
            "Romanian Deadlift",
          ],
        },
        muscle: {
          title: "Full Body Muscle Anchor",
          exerciseNames: [
            "Goblet Squat",
            "Bench Press",
            "Lat Pulldown",
            "Romanian Deadlift",
          ],
        },
        conditioning: {
          title: "Full Body Conditioning Anchor",
          exerciseNames: ["Cycling", "Goblet Squat", "Push-Up", "Plank"],
        },
        fat_loss: {
          title: "Full Body Fat-Loss Anchor",
          exerciseNames: ["Goblet Squat", "Bench Press", "Lat Pulldown", "Cycling"],
        },
        consistency: {
          title: "Full Body Consistency Anchor",
          exerciseNames: [
            "Goblet Squat",
            "Bench Press",
            "Seated Cable Row",
            "Plank",
          ],
        },
      },
      home_dumbbell: {
        strength: {
          title: "Full Body Strength Anchor",
          exerciseNames: [
            "Goblet Squat",
            "Dumbbell Floor Press",
            "One-Arm Dumbbell Row",
            "Romanian Deadlift",
          ],
        },
        muscle: {
          title: "Full Body Muscle Anchor",
          exerciseNames: [
            "Goblet Squat",
            "Dumbbell Floor Press",
            "One-Arm Dumbbell Row",
            "Walking Lunge",
          ],
        },
        conditioning: {
          title: "Full Body Conditioning Anchor",
          exerciseNames: ["Jump Rope", "Goblet Squat", "Push-Up", "Plank"],
        },
        fat_loss: {
          title: "Full Body Fat-Loss Anchor",
          exerciseNames: [
            "Goblet Squat",
            "Dumbbell Floor Press",
            "One-Arm Dumbbell Row",
            "Jump Rope",
          ],
        },
        consistency: {
          title: "Full Body Consistency Anchor",
          exerciseNames: [
            "Goblet Squat",
            "Dumbbell Floor Press",
            "One-Arm Dumbbell Row",
            "Plank",
          ],
        },
      },
      bodyweight: {
        strength: {
          title: "Full Body Strength Anchor",
          exerciseNames: ["Bodyweight Squat", "Push-Up", "Reverse Lunge", "Plank"],
        },
        muscle: {
          title: "Full Body Muscle Anchor",
          exerciseNames: ["Bodyweight Squat", "Push-Up", "Reverse Lunge", "Wall Sit"],
        },
        conditioning: {
          title: "Full Body Conditioning Anchor",
          exerciseNames: ["Mountain Climber", "Bodyweight Squat", "Push-Up", "Plank"],
        },
        fat_loss: {
          title: "Full Body Fat-Loss Anchor",
          exerciseNames: [
            "Bodyweight Squat",
            "Push-Up",
            "Prone Back Extension",
            "Mountain Climber",
          ],
        },
        consistency: {
          title: "Full Body Consistency Anchor",
          exerciseNames: ["Bodyweight Squat", "Push-Up", "Bird Dog", "Plank"],
        },
      },
    };

    const template =
      oneDayTemplateByProfileType[profileType][normalizedGoal] ??
      oneDayTemplateByProfileType[profileType].consistency;

    return days.map((dayKey) => ({
      dayKey,
      title: template.title,
      exercises: buildExercisesForDay(template.exerciseNames, normalizedGoal, profile),
    }));
  }

  const split =
    buildHighFrequencySplit(profileType, normalizedGoal, days.length) ??
    templates[normalizedGoal] ??
    templates.consistency;

  return days.map((dayKey, index) => {
    const template = split[index] ?? split[split.length - 1];
    return {
      dayKey,
      title: template.title,
      exercises: buildExercisesForDay(
        template.exerciseNames,
        normalizedGoal,
        profile
      ),
    };
  });
};

export const buildRoutineFromPlan = (
  userId: string,
  plan: GeneratedWorkoutPlan
) => {
  const routine = structuredClone(DEFAULT_ROUTINE) as any;
  routine.userId = userId;

  dayKeys.forEach((dayKey) => {
    const matchingDay = plan.days.find((day) => day.dayKey === dayKey);
    routine.days[dayKey] = [
      {
        title:
          matchingDay?.title ||
          `${dayKey.charAt(0).toUpperCase()}${dayKey.slice(1)} Workout`,
        exercises: matchingDay?.exercises ?? [],
      },
    ];
  });

  return routine;
};

export const buildFallbackWorkoutPlan = (
  profile: SetupFormValues
): GeneratedWorkoutPlan => {
  const days = buildFallbackSplit(profile);
  const frequencyRecommendation = getHighFrequencyRecommendation(
    profile,
    days.length
  );
  const limitations = parseLimitations(profile.limitations || "");
  return {
    summary: [
      "Built a baseline weekly draft from your goal, weekly frequency, and available equipment.",
      days.length === 1
        ? "This one-day version is a full-body anchor session with optional extra movement on other days, not a missed ideal."
        : null,
      days.length >= 5
        ? "The higher-frequency layout redistributes stress with lighter sessions instead of repeating the same workout."
        : null,
      frequencyRecommendation,
      limitations.length > 0
        ? `Applied ${limitations.length} limitation-aware guardrail${
            limitations.length === 1 ? "" : "s"
          } to keep the draft friendlier to your current constraints.`
        : null,
    ]
      .filter(Boolean)
      .join(" "),
    days,
  };
};

export const buildWorkoutGenerationPrompt = (profile: SetupFormValues) => {
  const compatibleExercises = initialExercises.filter((exercise) =>
    equipmentMatchesProfile(exercise.equipment, profile)
  );
  const allowedExercises =
    compatibleExercises.length > 0 ? compatibleExercises : initialExercises;
  const allowedExerciseNames = allowedExercises
    .map((exercise) => exercise.name)
    .join(", ");
  const exampleExercises = allowedExercises
    .slice(0, 2)
    .map((exercise) => `        { "name": ${JSON.stringify(exercise.name)} }`)
    .join(",\n");
  const lightDumbbellRule = isLightDumbbellHomeProfile(profile)
    ? "\n- Because the user only has light dumbbells, favor floor press, one-arm rows, push-up progressions, unilateral lower-body work, carries, and higher-rep accessory work."
    : "";

  return `
You are generating a weekly workout plan for a fitness app.

Return only valid JSON with this shape:
{
  "summary": "string",
  "days": [
    {
      "dayKey": "monday",
      "title": "Push Day",
      "exercises": [
${exampleExercises}
      ]
    }
  ]
}

Rules:
- Use only these day keys: sunday, monday, tuesday, wednesday, thursday, friday, saturday
- Use only exercise names from this list: ${allowedExerciseNames}
- Create ${profile.workoutDaysPerWeek || "3"} training days per week
- Respect preferred training days when possible: ${
    profile.preferredTrainingDays.join(", ") || "none specified"
  }
- Biological sex: ${profile.sex || "not specified"}
- Age: ${profile.age || "not specified"}
- Goal: ${profile.trainingGoal || "consistency"}
- Current fitness level: ${profile.currentFitnessLevel || "not specified"}
- Experience: ${profile.experienceLevel || "not specified"}
- Workout length: ${profile.workoutLength || "not specified"} minutes
- Equipment access: ${profile.equipmentAccess.join(", ") || "not specified"}
- Max dumbbell weight available: ${profile.maxDumbbellWeight || "not specified"}
- Limitations: ${profile.limitations || "none specified"}
- Notes: ${profile.notes || "none specified"}
- Keep each workout simple and realistic for the stated experience and workout length
- Only choose movements that can actually be done with the listed equipment. Do not assume access to a bench, rack, cable station, machine, or pull-up bar unless it is listed.${lightDumbbellRule}
- Do not include more than 6 exercises in a day
`.trim();
};

export const normalizeGeneratedPlan = (
  rawPlan: any,
  profile: SetupFormValues
): GeneratedWorkoutPlan => {
  const goal = normalizeGoalForProgramming(profile.trainingGoal || "consistency");
  const rawDays = Array.isArray(rawPlan?.days) ? rawPlan.days : [];

  const days = rawDays
    .map((day: any) => {
      const dayKey = dayKeys.find((key) => key === day?.dayKey);
      if (!dayKey) {
        return null;
      }

      const exerciseNames = Array.isArray(day?.exercises)
        ? day.exercises.map((exercise: any) => String(exercise?.name ?? "").trim()).filter(Boolean)
        : [];

      if (exerciseNames.length === 0) {
        return null;
      }

      return {
        dayKey,
        title: String(day?.title ?? `${dayKey} workout`)
          .replace(/\s+/g, " ")
          .trim(),
        exercises: buildExercisesForDay(exerciseNames, goal, profile),
      };
    })
    .filter(Boolean) as GeneratedWorkoutDay[];

  if (days.length === 0) {
    return buildFallbackWorkoutPlan(profile);
  }

  return {
    summary:
      String(rawPlan?.summary ?? "").trim() ||
      "Built a weekly plan from your workout assistant preferences.",
    days,
  };
};

export const buildWorkoutCoachResponse = (
  profile: SetupFormValues,
  plan: GeneratedWorkoutPlan
): WorkoutCoachResponse => {
  const goalLabel = profile.trainingGoal
    ? profile.trainingGoal.replace(/_/g, " ")
    : "consistency";
  const sessionCount = plan.days.length;
  const frequencyRecommendation = getHighFrequencyRecommendation(
    profile,
    sessionCount
  );
  const firstSessionLoadGuidance = getFirstSessionLoadGuidance(plan);
  const limitationInsights = parseLimitations(profile.limitations || "");
  const plannedDays = plan.days.map((day) => {
    const exerciseCount = day.exercises.length;
    return `${day.title} on ${
      day.dayKey.charAt(0).toUpperCase() + day.dayKey.slice(1)
    } with ${exerciseCount} exercise${exerciseCount === 1 ? "" : "s"}`;
  });
  const planSnapshot = plan.days.map((day) => ({
    dayKey: day.dayKey,
    dayLabel: day.dayKey.charAt(0).toUpperCase() + day.dayKey.slice(1),
    title: day.title,
    exerciseCount: day.exercises.length,
    exercises: day.exercises.map((exercise) => ({
      name: exercise.name,
      type: exercise.type,
      sets: exercise.sets.length,
      reps:
        exercise.type === "weight"
          ? Number(exercise.sets[0]?.reps ?? 0) || null
          : null,
      weight:
        exercise.type === "weight"
          ? Number(exercise.sets[0]?.weight ?? exercise.max ?? 0) || 0
          : null,
      minutes:
        exercise.type === "timed"
          ? Number(exercise.sets[0]?.minutes ?? 0) || null
          : null,
      rest: Number(exercise.rest ?? 0) || 0,
    })),
  }));

  const why = [
    profile.trainingGoal
      ? `The split leans toward your main goal: ${profile.trainingGoal.replace(
          "_",
          " "
        )}.`
      : null,
    profile.workoutDaysPerWeek
      ? `It matches your weekly target of about ${profile.workoutDaysPerWeek} sessions.`
      : null,
    sessionCount >= 5
      ? "The weekly stress is redistributed across heavier, volume, and lighter days instead of repeating the same three sessions."
      : null,
    profile.workoutLength
      ? `Exercise count was kept practical for sessions around ${profile.workoutLength} minutes.`
      : null,
    profile.equipmentAccess.length > 0
      ? `It favors the equipment you said you usually have: ${profile.equipmentAccess.join(
          ", "
        )}.`
      : null,
    limitationInsights.length > 0
      ? `It includes ${limitationInsights
          .map((insight) => insight.title.toLowerCase())
          .join(", ")} guardrails based on the limitations you noted.`
      : profile.limitations
      ? `It should be easier to work around your noted limitations: ${profile.limitations}.`
      : null,
  ].filter(Boolean) as string[];

  const tips = [
    "Start by opening the first scheduled day and adjusting any exercise you know you want to swap.",
    "Treat the first week as a baseline and use your logged performance to refine the recommendations.",
    limitationInsights.length > 0
      ? `Quick safety pass: ${limitationInsights[0]?.avoidLabel}. Use the easier substitutions if a movement still feels wrong in warm-ups.`
      : null,
    firstSessionLoadGuidance,
    frequencyRecommendation,
    profile.notes
      ? `Keep your own priority in mind as you run the plan: ${profile.notes}.`
      : "If a day feels too long, trim one accessory first instead of skipping the whole session.",
  ].filter(Boolean) as string[];

  return {
    headline: "Your workout plan is ready",
    summary: plan.summary,
    openingMessage: `I mapped out a ${sessionCount}-day baseline draft aimed at ${goalLabel}. It is shaped mainly by your goal, schedule, and equipment so you have something practical to start from and adjust.`,
    plannedDays,
    planSnapshot,
    why,
    tips,
    suggestedReplies: [
      "Why did you pick this split?",
      "Can you walk me through the week?",
      "What should I start with?",
      "Can I swap an exercise?",
    ],
  };
};

export const buildWorkoutCoachResponseFromRoutine = (
  profile: SetupFormValues,
  routine: any
): WorkoutCoachResponse | null => {
  const dayOrder = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ] as const;

  const days = dayOrder
    .map((dayKey) => {
      const workout = routine?.days?.[dayKey]?.[0];
      const exercises = Array.isArray(workout?.exercises) ? workout.exercises : [];

      if (!workout?.title || exercises.length === 0) {
        return null;
      }

      return {
        dayKey,
        title: String(workout.title),
        exercises: exercises.map((exercise: any) => ({
          name: String(exercise?.name ?? "Exercise"),
          type: exercise?.type === "timed" ? "timed" : "weight",
          sets: Array.isArray(exercise?.sets) ? exercise.sets : [],
          max: Number(exercise?.max ?? 0) || 0,
          rest: Number(exercise?.rest ?? 0) || 0,
          complete: Boolean(exercise?.complete),
        })),
      };
    })
    .filter(Boolean) as GeneratedWorkoutPlan["days"];

  if (days.length === 0) {
    return null;
  }

  return buildWorkoutCoachResponse(profile, {
    summary: "Restored your current weekly plan from the saved routine.",
    days,
  });
};

export const buildSetupCoachResponse = (
  profile: SetupFormValues
): WorkoutCoachResponse => {
  const goalLabel = profile.trainingGoal
    ? profile.trainingGoal.replace(/_/g, " ")
    : "general training";
  const frequencyLabel = profile.workoutDaysPerWeek
    ? `${profile.workoutDaysPerWeek} day${profile.workoutDaysPerWeek === "1" ? "" : "s"}`
    : "a flexible schedule";

  return {
    headline: "Your workout assistant is ready",
    summary:
      "Your preferences are saved. The assistant can now help you build a plan, adjust scheduling, and tailor exercises around your equipment.",
    openingMessage: `I saved your setup and I'm ready to help you build something around ${goalLabel} with ${frequencyLabel} per week. If you want, I can draft a split, adjust your schedule, or help you figure out what kind of plan fits best.`,
    plannedDays: [],
    planSnapshot: [],
    why: [
      profile.trainingGoal
        ? `I know your current goal is ${profile.trainingGoal.replace(/_/g, " ")}.`
        : "You can tell me your main goal any time and I'll adapt around it.",
      profile.equipmentAccess.length > 0
        ? `I'll keep your equipment in mind: ${profile.equipmentAccess.join(", ")}.`
        : "If you tell me what equipment you have, I can make the plan much more specific.",
    ].filter(Boolean) as string[],
    tips: [
      "Ask me to build a split, shorten a day, or make the plan fit your schedule.",
      "You can also tell me what equipment you have and I'll make the exercise choices more realistic.",
    ],
    suggestedReplies: [
      "Build me a 4 day split",
      "I only have dumbbells",
      "Help me pick the right goal",
      "What plan would fit me best?",
    ],
  };
};

const buildPlanOverview = (coachResponse: WorkoutCoachResponse) =>
  coachResponse.planSnapshot
    .map(
      (day) =>
        `${day.dayLabel}: ${day.title} with ${day.exerciseCount} exercise${
          day.exerciseCount === 1 ? "" : "s"
        }`
    )
    .join("; ");

const findExerciseInPlan = (coachResponse: WorkoutCoachResponse, message: string) => {
  const normalized = message.toLowerCase();

  for (const day of coachResponse.planSnapshot) {
    for (const exercise of day.exercises) {
      if (normalized.includes(exercise.name.toLowerCase())) {
        return {
          day,
          exercise,
        };
      }
    }
  }

  return null;
};

export const buildFallbackCoachReply = ({
  message,
  profile,
  coachResponse,
}: {
  message: string;
  profile: SetupFormValues;
  coachResponse: WorkoutCoachResponse;
}) => {
  const normalized = message.toLowerCase();
  const hasGeneratedPlan = (coachResponse.planSnapshot ?? []).length > 0;

  if (
    !hasGeneratedPlan &&
    /(what\s+(plan|split|program).*(fit me best|best for me)|what would fit me best)/.test(
      normalized
    )
  ) {
    const goalLabel = profile.trainingGoal
      ? profile.trainingGoal.replace(/_/g, " ")
      : "general training";
    const daysPerWeek = Number(profile.workoutDaysPerWeek || 0);
    const splitLabel =
      daysPerWeek >= 4
        ? `${daysPerWeek}-day upper-lower or full-body split`
        : daysPerWeek >= 2
        ? `${daysPerWeek}-day full-body split`
        : "simple full-body split";

    return {
      reply:
        daysPerWeek > 0
          ? `Based on ${goalLabel} and ${daysPerWeek} training day${
              daysPerWeek === 1 ? "" : "s"
            } per week, ${splitLabel} is probably your best fit. I can draft that now and put it on the calendar so you have something concrete to start from.`
          : `A simple full-body split is usually the best starting point when the goal is ${goalLabel}. Tell me how many days per week you want to train and I can draft it properly.`,
      suggestedReplies:
        daysPerWeek > 0
          ? [
              "Build that plan for me",
              "Can you keep the workouts short?",
              "I only have dumbbells",
            ]
          : ["I want to train 3 days per week", "I want to train 4 days per week"],
    };
  }

  if (/(why|reason|picked|choose|chose|split)/.test(normalized)) {
    return {
      reply: `I chose this structure because ${coachResponse.why
        .slice(0, 3)
        .join(" ")} I wanted it to feel realistic, not impressive on paper but impossible to follow.`,
      suggestedReplies: [
        "Can you walk me through the week?",
        "Can you shorten the workouts?",
        "Can I swap an exercise?",
      ],
    };
  }

  if (/(week|schedule|days|walk me through|what did you plan)/.test(normalized)) {
    return {
      reply: `Here’s the weekly shape I set up: ${buildPlanOverview(
        coachResponse
      )}. I’d treat the first week as a baseline and then let your logged performance steer what changes next.`,
      suggestedReplies: [
        "What should I start with?",
        "Why did you pick this split?",
        "Can I swap an exercise?",
      ],
    };
  }

  if (/(start|first|begin|today|where do i start)/.test(normalized)) {
    const firstDay = coachResponse.planSnapshot[0];
    return {
      reply: firstDay
        ? `Start with ${firstDay.title} on ${firstDay.dayLabel}. Open that day, keep the first week honest, and log what you actually do so I can help tighten the plan from there.`
        : `Start with the first scheduled day, keep week one conservative, and use your actual logged performance to refine the plan.`,
      suggestedReplies: [
        "Can you walk me through the week?",
        "Can you shorten the workouts?",
      ],
    };
  }

  const referencedExercise = findExerciseInPlan(coachResponse, message);
  if (
    referencedExercise &&
    /(what do i use|what should i use|how much|what weight|what reps|what sets|how do i do)/.test(
      normalized
    )
  ) {
    const { day, exercise } = referencedExercise;
    if (exercise.type === "weight") {
      const weightLine =
        exercise.weight && exercise.weight > 0
          ? `${exercise.weight} ${profile.preferredUnits}`
          : "a manageable starting load";
      const repLine = exercise.reps ? `${exercise.reps} reps` : "controlled reps";
      const restLine = exercise.rest ? `${exercise.rest} seconds of rest` : "normal rest";

      return {
        reply: `${exercise.name} is set up on ${day.dayLabel} for ${exercise.sets} sets of ${repLine} with about ${weightLine}. Start there, keep a rep or two in reserve on week one, and adjust based on how it actually feels. Rest about ${restLine} between sets.`,
        suggestedReplies: [
          "Can you show me the updated week?",
          "Can I swap that exercise?",
          "How hard should week one feel?",
        ],
      };
    }

    return {
      reply: `${exercise.name} is set up on ${day.dayLabel} for ${exercise.sets} timed set${
        exercise.sets === 1 ? "" : "s"
      } of about ${exercise.minutes || 0} minutes. Keep the effort sustainable on the first week so we can adjust from real performance.`,
      suggestedReplies: [
        "Can you show me the updated week?",
        "Can I swap that exercise?",
        "What should I start with?",
      ],
    };
  }

  if (/(swap|substitute|replace|equipment|don't have)/.test(normalized)) {
    const equipmentLine =
      profile.equipmentAccess.length > 0
        ? `You told me you usually have ${profile.equipmentAccess.join(", ")}.`
        : "You didn't lock in equipment yet, so I kept the choices fairly general.";
    return {
      reply: `${equipmentLine} If those movements don't fit what you have, I can update the workout around your actual equipment instead of leaving you to patch it manually. Do you want me to update the workout, yes or no?`,
      suggestedReplies: [
        "Yes, update the workout",
        "No, I'll adjust it myself",
        "What equipment do you need me to have?",
      ],
    };
  }

  if (/(shorter|longer|too much|too long|volume|time)/.test(normalized)) {
    return {
      reply: `If the workouts feel too long, trim one accessory before you cut a main lift. The plan was built around about ${
        profile.workoutLength || "manageable"
      } minute sessions, so volume should be flexible around the core work.`,
      suggestedReplies: [
        "Can I swap an exercise?",
        "What should I start with?",
      ],
    };
  }

  return {
    reply: `I built this plan to be a flexible starting point, not a rigid script. Ask me why I chose the split, how to make it fit your week better, or what to swap if an exercise doesn't fit.`,
    suggestedReplies: coachResponse.suggestedReplies,
  };
};
