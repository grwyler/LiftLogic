export type SetupGoal =
  | "strength"
  | "muscle"
  | "fat_loss"
  | "recomp"
  | "general_fitness"
  | "athleticism"
  | "consistency"
  | "conditioning"
  | "";

export type SetupExperience = "beginner" | "intermediate" | "advanced" | "";
export type SetupSex = "male" | "female" | "prefer_not_to_say" | "";
export type SetupCurrentFitness =
  | "starting_out"
  | "getting_back_into_it"
  | "active_but_inconsistent"
  | "training_consistently"
  | "highly_trained"
  | "";

export type SetupFormValues = {
  sex: SetupSex;
  age: string;
  preferredUnits: "lb" | "kg";
  trainingGoal: SetupGoal;
  currentFitnessLevel: SetupCurrentFitness;
  workoutDaysPerWeek: string;
  experienceLevel: SetupExperience;
  workoutLength: string;
  equipmentAccess: string[];
  maxDumbbellWeight: string;
  preferredTrainingDays: string[];
  limitations: string;
  notes: string;
  setupPromptSeen?: boolean;
  setupCompleted?: boolean;
};

export const defaultSetupForm: SetupFormValues = {
  sex: "",
  age: "",
  preferredUnits: "lb",
  trainingGoal: "",
  currentFitnessLevel: "",
  workoutDaysPerWeek: "",
  experienceLevel: "",
  workoutLength: "",
  equipmentAccess: [],
  maxDumbbellWeight: "",
  preferredTrainingDays: [],
  limitations: "",
  notes: "",
  setupPromptSeen: false,
  setupCompleted: false,
};

export const goalOptions = [
  { value: "strength", label: "Get stronger" },
  { value: "muscle", label: "Build muscle" },
  { value: "fat_loss", label: "Lose fat" },
  { value: "recomp", label: "Recomp" },
  { value: "general_fitness", label: "General fitness" },
  { value: "athleticism", label: "Athleticism" },
  { value: "consistency", label: "Stay consistent" },
  { value: "conditioning", label: "Improve conditioning" },
] as const;

export const workoutFrequencyOptions = ["2", "3", "4", "5", "6"];

export const sexOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

export const unitOptions = [
  { value: "lb", label: "Pounds / inches" },
  { value: "kg", label: "Kilograms / centimeters" },
] as const;

export const experienceOptions = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
] as const;

export const currentFitnessOptions = [
  { value: "starting_out", label: "Starting out" },
  { value: "getting_back_into_it", label: "Getting back into it" },
  { value: "active_but_inconsistent", label: "Active but inconsistent" },
  { value: "training_consistently", label: "Training consistently" },
  { value: "highly_trained", label: "Highly trained" },
] as const;

export const workoutLengthOptions = [
  { value: "25", label: "20-30 min" },
  { value: "40", label: "30-45 min" },
  { value: "55", label: "45-60 min" },
  { value: "70", label: "60-75 min" },
  { value: "85", label: "75-90 min" },
  { value: "90", label: "90+ min" },
] as const;

export const equipmentOptions = [
  "Full gym",
  "Squat rack",
  "Barbell + plates",
  "Adjustable bench",
  "Dumbbells",
  "Kettlebells",
  "Cable machine",
  "Selectorized machines",
  "Smith machine",
  "Pull-up bar",
  "Resistance bands",
  "Bodyweight only",
  "Treadmill",
  "Bike / cycling",
  "Rowing machine",
  "Stair climber / elliptical",
];

export const weekdayOptions = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const goalLabels: Record<string, string> = {
  strength: "getting stronger",
  muscle: "building muscle",
  fat_loss: "losing fat",
  recomp: "recomposing",
  general_fitness: "improving general fitness",
  athleticism: "improving athleticism",
  consistency: "staying consistent",
  conditioning: "improving conditioning",
};

export const experienceLabels: Record<string, string> = {
  beginner: "a beginner",
  intermediate: "an intermediate lifter",
  advanced: "an advanced lifter",
};

export const sexLabels: Record<string, string> = {
  male: "male",
  female: "female",
  prefer_not_to_say: "prefer not to say",
};

export const currentFitnessLabels: Record<string, string> = {
  starting_out: "starting out",
  getting_back_into_it: "getting back into it",
  active_but_inconsistent: "active but inconsistent",
  training_consistently: "training consistently",
  highly_trained: "highly trained",
};

export const normalizeSetupForm = (user: any): SetupFormValues => ({
  sex: user?.sex || "",
  age: user?.age || "",
  preferredUnits: user?.preferredUnits || "lb",
  trainingGoal: user?.trainingGoal || "",
  currentFitnessLevel: user?.currentFitnessLevel || "",
  workoutDaysPerWeek: user?.workoutDaysPerWeek || "",
  experienceLevel: user?.experienceLevel || "",
  workoutLength: user?.workoutLength || "",
  equipmentAccess: Array.isArray(user?.equipmentAccess) ? user.equipmentAccess : [],
  maxDumbbellWeight: user?.maxDumbbellWeight || "",
  preferredTrainingDays: Array.isArray(user?.preferredTrainingDays)
    ? user.preferredTrainingDays
    : [],
  limitations: user?.limitations || "",
  notes: user?.notes || "",
  setupPromptSeen: Boolean(user?.setupPromptSeen),
  setupCompleted: Boolean(user?.setupCompleted),
});

export const buildWhatIHeardSummary = (setupForm: SetupFormValues) =>
  `${setupForm.sex
    ? `You told me your biological sex is ${sexLabels[setupForm.sex] || setupForm.sex}.`
    : "You have not told me your biological sex yet."} ${
    setupForm.age
      ? `You are ${setupForm.age} years old.`
      : "I do not know your age yet."
  } ${
    setupForm.trainingGoal
    ? `You want help with ${goalLabels[setupForm.trainingGoal] || "training"}.`
    : "You have not picked a main goal yet."} ${
    setupForm.currentFitnessLevel
      ? `Your current fitness sounds like ${currentFitnessLabels[setupForm.currentFitnessLevel] || setupForm.currentFitnessLevel}.`
      : "I do not know your current fitness baseline yet."
  } ${
    setupForm.workoutDaysPerWeek
      ? `I should expect about ${setupForm.workoutDaysPerWeek} workout${
          setupForm.workoutDaysPerWeek === "1" ? "" : "s"
        } per week.`
      : "I still need your weekly training target."
  } ${
    setupForm.experienceLevel
      ? `You train like ${
          experienceLabels[setupForm.experienceLevel] ||
          "a lifter with some experience"
        }.`
      : ""
  } ${
    setupForm.workoutLength
      ? `Your sessions are usually around ${setupForm.workoutLength} minutes.`
      : ""
  } ${
    setupForm.equipmentAccess.length > 0
      ? `You usually have access to ${setupForm.equipmentAccess.join(", ")}.`
      : ""
  } ${
    setupForm.maxDumbbellWeight
      ? `Your heaviest dumbbell is about ${setupForm.maxDumbbellWeight} ${setupForm.preferredUnits}.`
      : ""
  } ${
    setupForm.preferredTrainingDays.length > 0
      ? `You like training on ${setupForm.preferredTrainingDays.join(", ")}.`
      : ""
  } ${
    setupForm.limitations
      ? `I should respect these limitations: ${setupForm.limitations}.`
      : ""
  } ${
    setupForm.notes
      ? `You also want me to remember: ${setupForm.notes}`
      : "You can add notes later if you want more tailored suggestions."
  }`.replace(/\s+/g, " ").trim();
