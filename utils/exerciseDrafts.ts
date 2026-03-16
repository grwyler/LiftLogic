const DEFAULT_MAX_WEIGHT = 35;

export const getExerciseProfile = (exercise: any) => {
  const name = String(exercise?.name ?? "").toLowerCase();
  const equipment = Array.isArray(exercise?.equipment)
    ? exercise.equipment.join(" ").toLowerCase()
    : String(exercise?.equipment ?? "").toLowerCase();

  if (/deadlift/.test(name)) {
    return { sets: 3, reps: 5, weight: 135 };
  }

  if (/squat|leg press/.test(name)) {
    return { sets: 3, reps: 6, weight: 135 };
  }

  if (/bench/.test(name)) {
    return { sets: 3, reps: 6, weight: 95 };
  }

  if (/overhead press|shoulder press/.test(name)) {
    return { sets: 3, reps: 6, weight: 65 };
  }

  if (/assisted pull-up|assisted pull up/.test(name)) {
    return { sets: 3, reps: 8, weight: 90 };
  }

  if (/row|pull down|pulldown/.test(name)) {
    return { sets: 3, reps: 8, weight: 90 };
  }

  if (/curl|raise|tricep|fly|extension/.test(name)) {
    return { sets: 3, reps: 10, weight: 25 };
  }

  if (/bodyweight/.test(equipment) || /pull-up|push-up|dip|plank/.test(name)) {
    return { sets: 3, reps: 10, weight: 0 };
  }

  if (/dumbbell/.test(equipment)) {
    return { sets: 3, reps: 8, weight: 35 };
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
