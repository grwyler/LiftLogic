import { initialExercises } from "./sample-data";
import { DEFAULT_ROUTINE } from "./helpers";
import { SetupFormValues } from "./profileSetup";

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
    return { sets: 1, minutes: goal === "conditioning" ? 30 : 20, rest: 0 };
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

const getTargetWeight = (exercise: any, profile: SetupFormValues) => {
  const name = normalizeName(exercise.name);
  const maxDumbbellWeight = parsePositiveNumber(profile.maxDumbbellWeight);
  const normalizedEquipment = exercise.equipment.map(normalizeEquipmentText);

  if (
    normalizedEquipment.some((item: string) => item.includes("bodyweight")) ||
    /push-up|pull-up|dip|plank|dead bug/.test(name)
  ) {
    return 0;
  }

  if (normalizedEquipment.some((item: string) => item.includes("dumbbell"))) {
    const target = /goblet squat|walking lunge|bulgarian|step-up|romanian deadlift|farmer carry/.test(
      name
    )
      ? 25
      : /bench|press|row/.test(name)
      ? 20
      : 15;

    return maxDumbbellWeight ? Math.min(maxDumbbellWeight, target) : target;
  }

  if (normalizedEquipment.some((item: string) => item.includes("barbell"))) {
    if (/deadlift|squat/.test(name)) return 95;
    if (/bench/.test(name)) return 75;
    if (/press/.test(name)) return 55;
    return 65;
  }

  if (normalizedEquipment.some((item: string) => item.includes("cable"))) {
    return 50;
  }

  if (usesMachineEquipment(exercise.equipment)) {
    return 70;
  }

  return 0;
};

const getRepTarget = (goal: string, exercise: any, profile: SetupFormValues) => {
  if (exercise.type === "timed") {
    return null;
  }

  const name = normalizeName(exercise.name);
  const normalizedEquipment = exercise.equipment.map(normalizeEquipmentText);

  if (goal === "strength") {
    return /curl|raise|pushdown|fly|extension/.test(name)
      ? 8
      : 5;
  }

  if (goal === "conditioning" || goal === "fat_loss") {
    return 10;
  }

  if (
    goal === "muscle" &&
    isLightDumbbellHomeProfile(profile) &&
    normalizedEquipment.some((item: string) => /dumbbell|bodyweight/.test(item))
  ) {
    return /curl|raise|fly|extension/.test(name) ? 15 : 12;
  }

  return goal === "muscle" ? 8 : 8;
};

const getSetTarget = (goal: string, exercise: any) => {
  if (exercise.type === "timed") {
    return 1;
  }

  if (goal === "strength") {
    return /curl|raise|pushdown|fly|extension/.test(normalizeName(exercise.name))
      ? 3
      : 4;
  }

  return goal === "muscle" ? 4 : 3;
};

const getRestTarget = (goal: string, exercise: any) => {
  if (exercise.type === "timed") {
    return 0;
  }

  const name = normalizeName(exercise.name);

  if (/deadlift|squat|bench|press|row/.test(name)) {
    return goal === "strength" ? 150 : 120;
  }

  if (/pull-up|pulldown|lunge|step-up|romanian deadlift/.test(name)) {
    return 105;
  }

  return goal === "conditioning" ? 45 : 75;
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
  name: string,
  goal: string,
  profile: SetupFormValues,
  excludedNames: Set<string> = new Set()
): GeneratedExercise => {
  const catalogExercise =
    resolveExerciseForProfile(name, profile, excludedNames) ??
    ((!profile.equipmentAccess.length || profile.equipmentAccess.includes("Full gym"))
      ? resolveCatalogExercise(name)
      : null);
  const resolvedExercise =
    catalogExercise ?? createFallbackExerciseDefinition(name);

  if (resolvedExercise.type === "timed") {
    const timedDefaults = getWeightDefaults(goal, true);
    return {
      name: resolvedExercise.name,
      type: "timed",
      rest: timedDefaults.rest,
      complete: false,
      sets: Array.from({ length: timedDefaults.sets }, (_, index) => ({
        name: `Timed Set ${index + 1}`,
        hours: 0,
        minutes: timedDefaults.minutes,
        seconds: 0,
        totalSeconds: timedDefaults.minutes * 60,
        complete: false,
      })),
    };
  }

  const defaults = getWeightDefaults(goal, false);
  const setTarget = getSetTarget(goal, resolvedExercise);
  const repTarget = getRepTarget(goal, resolvedExercise, profile) ?? defaults.reps;
  const restTarget = getRestTarget(goal, resolvedExercise);
  const targetWeight = getTargetWeight(resolvedExercise, profile);
  return {
    name: resolvedExercise.name,
    type: "weight",
    max: targetWeight,
    rest: restTarget,
    complete: false,
    sets: Array.from({ length: setTarget }, (_, index) => ({
      name: `Working Set ${index + 1}`,
      reps: repTarget,
      weight: targetWeight,
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

  return exerciseNames.map((name) => {
    const exercise = buildExercise(name, goal, profile, usedNames);
    usedNames.add(normalizeName(exercise.name));
    return exercise;
  });
};

const pickDays = (profile: SetupFormValues) => {
  const preferred = profile.preferredTrainingDays
    .map((day) => weekdayLookup[day.toLowerCase().slice(0, 3)])
    .filter(Boolean);

  const count = Math.max(
    2,
    Math.min(6, Number(profile.workoutDaysPerWeek || preferred.length || 3))
  );

  const defaultsByCount: Record<number, (typeof dayKeys)[number][]> = {
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

const buildFallbackSplit = (profile: SetupFormValues) => {
  const goal = profile.trainingGoal || "consistency";
  const normalizedGoal = normalizeGoalForProgramming(goal);
  const days = pickDays(profile);

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
  const split = templates[normalizedGoal] ?? templates.consistency;

  return days.map((dayKey, index) => {
    const template = split[index % split.length];
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
  return {
    summary:
      "Built a practical weekly plan from your goal, weekly frequency, and available equipment.",
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
    profile.currentFitnessLevel
      ? `The starting difficulty was shaped around your current fitness baseline: ${profile.currentFitnessLevel.replace(
          /_/g,
          " "
        )}.`
      : null,
    profile.workoutDaysPerWeek
      ? `It matches your weekly target of about ${profile.workoutDaysPerWeek} sessions.`
      : null,
    profile.workoutLength
      ? `Exercise count was kept practical for sessions around ${profile.workoutLength} minutes.`
      : null,
    profile.equipmentAccess.length > 0
      ? `It favors the equipment you said you usually have: ${profile.equipmentAccess.join(
          ", "
        )}.`
      : null,
    profile.limitations
      ? `It should be easier to work around your noted limitations: ${profile.limitations}.`
      : null,
  ].filter(Boolean) as string[];

  const tips = [
    "Start by opening the first scheduled day and adjusting any exercise you know you want to swap.",
    "Treat the first week as a baseline and use your logged performance to refine the recommendations.",
    profile.notes
      ? `Keep your own priority in mind as you run the plan: ${profile.notes}.`
      : "If a day feels too long, trim one accessory first instead of skipping the whole session.",
  ];

  return {
    headline: "Your workout plan is ready",
    summary: plan.summary,
    openingMessage: `I mapped out a ${sessionCount}-day plan aimed at ${goalLabel} and kept it realistic for the schedule, equipment, and training context you gave me.`,
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
