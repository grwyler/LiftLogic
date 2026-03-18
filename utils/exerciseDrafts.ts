import { WeightUnit } from "./types";

const DEFAULT_MAX_WEIGHT = null;
const STARTER_WEIGHT_BY_UNIT = {
  lb: {
    light: 10,
    moderate: 20,
    barbell: 45,
  },
  kg: {
    light: 5,
    moderate: 10,
    barbell: 20,
  },
} as const;

const normalizeText = (value: unknown) =>
  String(value ?? "").trim().toLowerCase();

export const resolveExerciseStartingWeight = ({
  exercise,
  preferredUnits = "lb",
  candidateWeight,
}: {
  exercise: any;
  preferredUnits?: WeightUnit;
  candidateWeight?: number | null;
}) => {
  if (typeof candidateWeight === "number" && candidateWeight > 0) {
    return candidateWeight;
  }

  const unitDefaults = STARTER_WEIGHT_BY_UNIT[preferredUnits];
  const name = normalizeText(exercise?.name);
  const equipment = Array.isArray(exercise?.equipment)
    ? exercise.equipment.join(" ").toLowerCase()
    : normalizeText(exercise?.equipment);

  if (
    /deadlift|squat|bench|overhead press|shoulder press|front squat|romanian deadlift|trap bar|barbell row/.test(
      name
    ) ||
    /barbell|squat rack|trap bar/.test(equipment)
  ) {
    return unitDefaults.barbell;
  }

  if (
    /assisted pull-up|assisted pull up|pull-up|pull up|push-up|push up|dip|bodyweight|plank/.test(
      name
    ) ||
    /bodyweight|pull-up bar|dip bars|assisted pull-up machine/.test(equipment)
  ) {
    return unitDefaults.light;
  }

  return unitDefaults.moderate;
};

export const getExerciseProfile = (exercise: any) => {
  const name = String(exercise?.name ?? "").toLowerCase();
  const equipment = Array.isArray(exercise?.equipment)
    ? exercise.equipment.join(" ").toLowerCase()
    : String(exercise?.equipment ?? "").toLowerCase();

  if (/deadlift/.test(name)) {
    return { sets: 3, reps: 5, weight: null };
  }

  if (/squat|leg press/.test(name)) {
    return { sets: 3, reps: 6, weight: null };
  }

  if (/bench/.test(name)) {
    return { sets: 3, reps: 6, weight: null };
  }

  if (/overhead press|shoulder press/.test(name)) {
    return { sets: 3, reps: 6, weight: null };
  }

  if (/assisted pull-up|assisted pull up/.test(name)) {
    return { sets: 3, reps: 8, weight: null };
  }

  if (/row|pull down|pulldown/.test(name)) {
    return { sets: 3, reps: 8, weight: null };
  }

  if (/curl|raise|tricep|fly|extension/.test(name)) {
    return { sets: 3, reps: 10, weight: null };
  }

  if (/bodyweight/.test(equipment) || /pull-up|push-up|dip|plank/.test(name)) {
    return { sets: 3, reps: 10, weight: 0 };
  }

  if (/dumbbell/.test(equipment)) {
    return { sets: 3, reps: 8, weight: null };
  }

  return {
    sets: 3,
    reps: 8,
    weight:
      exercise?.max ??
      exercise?.defaultMax ??
      DEFAULT_MAX_WEIGHT,
  };
};

export { DEFAULT_MAX_WEIGHT };
