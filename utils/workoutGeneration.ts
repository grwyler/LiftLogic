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
  if (/band/.test(normalized)) tags.add("bands");
  if (/bike|cycling|treadmill|rowing|stair|elliptical|cardio/.test(normalized)) {
    tags.add("cardio");
  }
  if (/bike|cycling/.test(normalized)) tags.add("bike");
  if (/treadmill/.test(normalized)) tags.add("treadmill");
  if (/rowing/.test(normalized)) tags.add("rowing");
  if (/stair|elliptical/.test(normalized)) tags.add("stair_elliptical");

  return tags;
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

  const equipmentTags = equipment.flatMap((item) => Array.from(getEquipmentTags(item)));
  const selectedTags = profile.equipmentAccess.flatMap((item) =>
    Array.from(getEquipmentTags(item))
  );

  if (selectedTags.includes("bodyweight")) {
    return equipmentTags.every((item) => item === "bodyweight");
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

    if (tag === "bench" && selectedTags.includes("dumbbells")) {
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
  profile: SetupFormValues
) => {
  const original = resolveCatalogExercise(exerciseName);
  const candidates = initialExercises.filter((exercise) =>
    equipmentMatchesProfile(exercise.equipment, profile)
  );

  if (!original) {
    return candidates[0] ?? null;
  }

  return (
    candidates.find(
      (exercise) =>
        exercise.type === original.type && exercise.target === original.target
    ) ??
    candidates.find(
      (exercise) =>
        exercise.type === original.type && exercise.bodyPart === original.bodyPart
    ) ??
    candidates.find((exercise) => exercise.type === original.type) ??
    null
  );
};

const resolveExerciseForProfile = (name: string, profile: SetupFormValues) => {
  const direct = resolveCatalogExercise(name);
  if (direct && equipmentMatchesProfile(direct.equipment, profile)) {
    return direct;
  }

  return findEquipmentFriendlyAlternative(name, profile);
};

const parsePositiveNumber = (value?: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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

const getRepTarget = (goal: string, exercise: any) => {
  if (exercise.type === "timed") {
    return null;
  }

  if (goal === "strength") {
    return /curl|raise|pushdown|fly|extension/.test(normalizeName(exercise.name))
      ? 8
      : 5;
  }

  if (goal === "conditioning" || goal === "fat_loss") {
    return 10;
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

const buildExercise = (
  name: string,
  goal: string,
  profile: SetupFormValues
): GeneratedExercise => {
  const catalogExercise =
    resolveExerciseForProfile(name, profile) ?? resolveCatalogExercise(name);

  if (catalogExercise?.type === "timed") {
    const timedDefaults = getWeightDefaults(goal, true);
    return {
      name: catalogExercise.name,
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
  const setTarget = getSetTarget(goal, catalogExercise);
  const repTarget = getRepTarget(goal, catalogExercise) ?? defaults.reps;
  const restTarget = getRestTarget(goal, catalogExercise);
  const targetWeight = getTargetWeight(catalogExercise, profile);
  return {
    name: catalogExercise?.name ?? name,
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

  const templates: Record<string, { title: string; exerciseNames: string[] }[]> = {
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

  const split = templates[normalizedGoal] ?? templates.consistency;

  return days.map((dayKey, index) => {
    const template = split[index % split.length];
    return {
      dayKey,
      title: template.title,
      exercises: template.exerciseNames.map((name) =>
        buildExercise(name, normalizedGoal, profile)
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
  const allowedExerciseNames = initialExercises.map((exercise) => exercise.name).join(", ");

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
        { "name": "Bench Press" },
        { "name": "Overhead Press" }
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
        exercises: exerciseNames.map((name: string) =>
          buildExercise(name, goal, profile)
        ),
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
