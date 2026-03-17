import { initialExercises } from "./sample-data";
import { SetupFormValues, defaultSetupForm } from "./profileSetup";

export type StarterPlanPreset = {
  id: string;
  title: string;
  description: string;
  commitment: string;
  preview: string[];
  draft: Partial<SetupFormValues>;
};

export type LimitationInsight = {
  id: string;
  title: string;
  summary: string;
  avoidLabel: string;
  substitutions: string[];
};

type LimitationRule = LimitationInsight & {
  pattern: RegExp;
  avoidExercisePattern: RegExp;
};

export type ExerciseExecutionGuidance = {
  title: string;
  cues: string[];
  warmup: {
    title: string;
    steps: string[];
    rampSets: string[];
  } | null;
  regression: {
    name: string;
    reason: string;
  } | null;
};

export type LowEnergyWorkoutGuide = {
  headline: string;
  supportingCopy: string;
  focusLabel: string;
  completionCopy: string;
};

const hasCatalogExercise = (name: string) =>
  initialExercises.some((exercise) => exercise.name === name);

export const starterPlanLibrary: StarterPlanPreset[] = [
  {
    id: "starter_strength_3day",
    title: "3-day strength starter",
    description: "Simple full-gym split built around the big patterns without overcomplicating week one.",
    commitment: "3 days / 45-60 min",
    preview: ["Lower strength", "Upper strength", "Full-body reset"],
    draft: {
      ...defaultSetupForm,
      trainingGoal: "strength",
      workoutDaysPerWeek: "3",
      currentFitnessLevel: "active_but_inconsistent",
      experienceLevel: "beginner",
      workoutLength: "55",
      equipmentAccess: ["Full gym"],
      preferredTrainingDays: ["Mon", "Wed", "Fri"],
      notes: "Keep week one simple, repeatable, and easy to learn.",
    },
  },
  {
    id: "busy_muscle_4day",
    title: "Busy-week muscle plan",
    description: "Shorter upper/lower split for people who want visible structure without long gym sessions.",
    commitment: "4 days / 30-45 min",
    preview: ["Lower A", "Upper A", "Lower B", "Upper B"],
    draft: {
      ...defaultSetupForm,
      trainingGoal: "muscle",
      workoutDaysPerWeek: "4",
      currentFitnessLevel: "training_consistently",
      experienceLevel: "intermediate",
      workoutLength: "40",
      equipmentAccess: ["Full gym"],
      preferredTrainingDays: ["Mon", "Tue", "Thu", "Sat"],
      notes: "Keep sessions tight and use straightforward accessories.",
    },
  },
  {
    id: "home_dumbbell_consistency",
    title: "Home dumbbell consistency",
    description: "A realistic starter week for home training with dumbbells and limited setup friction.",
    commitment: "3 days / 20-30 min",
    preview: ["Lower + core", "Push + pull", "Conditioning + carry"],
    draft: {
      ...defaultSetupForm,
      trainingGoal: "consistency",
      workoutDaysPerWeek: "3",
      currentFitnessLevel: "starting_out",
      experienceLevel: "beginner",
      workoutLength: "25",
      equipmentAccess: ["Dumbbells", "Bodyweight only"],
      preferredTrainingDays: ["Tue", "Thu", "Sat"],
      notes: "Home-gym friendly and easy to complete on low-energy days.",
    },
  },
];

const limitationRules: LimitationRule[] = [
  {
    id: "shoulder_friendly",
    title: "Shoulder-friendly pressing",
    summary: "Bias stable pressing angles, neutral-grip options, and upper-back support work before aggressive overhead volume.",
    avoidLabel: "Overhead pressing, deep dips, and high-irritation shoulder positions",
    substitutions: ["Dumbbell Floor Press", "Push-Up", "Chest-Supported Row"],
    pattern: /(shoulder|rotator cuff|imping|overhead pain|pressing pain)/i,
    avoidExercisePattern: /(overhead press|shoulder press|dip|incline bench press|skullcrusher)/i,
  },
  {
    id: "knee_friendly",
    title: "Knee-friendly lower body",
    summary: "Use hip-dominant patterns, shorter ranges, and controlled unilateral work before loading deep knee-flexion movements.",
    avoidLabel: "Deep knee flexion under fatigue and high-volume quad-dominant work",
    substitutions: ["Romanian Deadlift", "Hip Thrust", "Glute Bridge"],
    pattern: /(knee|patella|patellar|meniscus|deep knee flexion)/i,
    avoidExercisePattern: /(back squat|front squat|leg press|walking lunge|reverse lunge|step-up|bulgarian split squat)/i,
  },
  {
    id: "low_back_friendly",
    title: "Low-back-friendly loading",
    summary: "Favor supported rows, bridge patterns, and simpler squat variations when spinal loading tolerance is limited.",
    avoidLabel: "Heavy spinal loading and unsupported hinging when fatigue builds",
    substitutions: ["Chest-Supported Row", "Goblet Squat", "Glute Bridge"],
    pattern: /(low[- ]back|back pain|lumbar|disc|spinal|hinge caution)/i,
    avoidExercisePattern: /(deadlift|romanian deadlift|barbell row|back squat|good morning)/i,
  },
];

export const parseLimitations = (limitations: string): LimitationInsight[] => {
  const trimmed = limitations.trim();
  if (!trimmed) {
    return [];
  }

  return limitationRules.filter((rule) => rule.pattern.test(trimmed)).map((rule) => ({
    id: rule.id,
    title: rule.title,
    summary: rule.summary,
    avoidLabel: rule.avoidLabel,
    substitutions: rule.substitutions.filter(hasCatalogExercise),
  }));
};

export const getLimitationAwareReplacementOptions = (
  exerciseName: string,
  limitations: string
) => {
  const matchedRules = limitationRules.filter(
    (rule) =>
      rule.pattern.test(limitations) && rule.avoidExercisePattern.test(exerciseName)
  );

  return matchedRules.flatMap((rule) => rule.substitutions).filter(hasCatalogExercise);
};

export const getExerciseExecutionGuidance = (
  exerciseName: string
): ExerciseExecutionGuidance | null => {
  const normalized = exerciseName.trim().toLowerCase();

  if (/squat/.test(normalized)) {
    return {
      title: "Squat setup",
      cues: [
        "Brace before you descend and keep your ribs stacked over your hips.",
        "Sit between your hips instead of tipping onto your toes.",
        "Drive up through the whole foot and finish with hips and chest rising together.",
      ],
      warmup: {
        title: "Warm up before working sets",
        steps: [
          "Start with 3-5 minutes of easy movement plus 1-2 bodyweight squat patterns to open the hips and ankles.",
          "Use the empty bar or a very light load to practice depth, bracing, and bar path before effort matters.",
        ],
        rampSets: [
          "Ramp set 1: 5 controlled reps with the easiest load that feels crisp.",
          "Ramp set 2: 3-4 reps at a moderate load to lock in position and speed.",
          "Ramp set 3: 1-2 reps near your first work-set load so the first heavy set is not a shock.",
        ],
      },
      regression: {
        name: "Goblet Squat",
        reason: "Easier to balance, easier to learn depth, and simpler to keep controlled.",
      },
    };
  }

  if (/bench press|floor press|push-up|push up/.test(normalized)) {
    return {
      title: "Pressing cues",
      cues: [
        "Set your upper back first so the press starts from a stable base.",
        "Lower with control toward the same touch point each rep.",
        "Press back up without letting the shoulders roll forward.",
      ],
      warmup: {
        title: "Warm up before pressing hard",
        steps: [
          "Prime the shoulders and upper back with light scapular retraction, band pull-aparts, or easy push-up reps.",
          "Take at least one empty-bar or very light set to find your touch point and pressing groove.",
        ],
        rampSets: [
          "Ramp set 1: 6-8 smooth reps with a load that feels easy.",
          "Ramp set 2: 3-5 reps at a moderate load to tighten setup and bar path.",
          "Ramp set 3: 1-2 reps close to work-set load before your first demanding set.",
        ],
      },
      regression: {
        name: "Push-Up",
        reason: "Lets beginners learn bracing and pressing rhythm before chasing load.",
      },
    };
  }

  if (/deadlift|romanian deadlift|rdl/.test(normalized)) {
    return {
      title: "Hinge cues",
      cues: [
        "Push your hips back first and keep the weight close to your body.",
        "Keep your ribs down so the hinge comes from the hips, not the low back.",
        "Stand tall by squeezing the glutes instead of leaning back at lockout.",
      ],
      warmup: {
        title: "Ramp up hinge tension first",
        steps: [
          "Start with easy hamstring and glute activation so the hinge begins in the hips, not the low back.",
          "Use a dowel, kettlebell, or empty bar to rehearse the hinge before loading the floor pull.",
        ],
        rampSets: [
          "Ramp set 1: 5 light reps to groove the path and brace.",
          "Ramp set 2: 3 reps at a moderate load with full resets between reps.",
          "Ramp set 3: 1-2 reps near work-set load so the heavy set starts with confidence, not surprise.",
        ],
      },
      regression: {
        name: "Glute Bridge",
        reason: "Builds hip-extension mechanics with much less balance and spinal demand.",
      },
    };
  }

  if (/row|pulldown|pull-up|pull up/.test(normalized)) {
    return {
      title: "Pulling cues",
      cues: [
        "Start by setting the shoulder blade, then pull with the elbow.",
        "Keep your neck relaxed instead of reaching your chin forward.",
        "Pause briefly at the strongest position before lowering under control.",
      ],
      warmup: null,
      regression: {
        name: "Chest-Supported Row",
        reason: "Reduces setup complexity and lets beginners feel the back working sooner.",
      },
    };
  }

  if (/lunge|split squat|step-up|step up/.test(normalized)) {
    return {
      title: "Single-leg control",
      cues: [
        "Stay tall through the torso and own the landing before pushing back up.",
        "Let the front foot stay heavy instead of drifting onto the toes.",
        "Use a shorter range first if balance is the limiting factor.",
      ],
      warmup: null,
      regression: {
        name: "Reverse Lunge",
        reason: "Usually easier to control and friendlier for beginners than forward-traveling options.",
      },
    };
  }

  if (/plank|dead bug|bird dog|wall sit/.test(normalized)) {
    return {
      title: "Control-first core work",
      cues: [
        "Exhale gently to brace before the rep or hold starts.",
        "Keep the movement small enough that your trunk stays quiet.",
        "Stop the set when you lose position, not just when the timer ends.",
      ],
      warmup: null,
      regression: {
        name: "Dead Bug",
        reason: "Teaches trunk control with less global fatigue than longer holds.",
      },
    };
  }

  return null;
};

export const getLowEnergyWorkoutGuide = (
  plannedExerciseCount: number
): LowEnergyWorkoutGuide => {
  const focusCount = Math.min(Math.max(plannedExerciseCount, 1), 2);

  return {
    headline: "Minimum win mode is on",
    supportingCopy:
      focusCount === 1
        ? "Today can still count. Focus on one priority lift, keep the effort clean, and leave the rest optional."
        : `Today can still count. Focus on your next ${focusCount} priority lifts, trim the extras, and protect consistency instead of perfection.`,
    focusLabel:
      focusCount === 1 ? "One priority lift" : `${focusCount} priority lifts`,
    completionCopy:
      "Reduced volume on purpose is still a success signal. Your recommendations can treat this as an intentional lighter day instead of a failed session.",
  };
};
