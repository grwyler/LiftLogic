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
  regression: {
    name: string;
    reason: string;
  } | null;
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
      regression: {
        name: "Dead Bug",
        reason: "Teaches trunk control with less global fatigue than longer holds.",
      },
    };
  }

  return null;
};
