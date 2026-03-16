import { ExerciseSet } from "./types";

export const createExerciseSetId = () => {
  if (
    typeof globalThis !== "undefined" &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `set-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const ensureExerciseSetIds = (sets?: ExerciseSet[] | null): ExerciseSet[] => {
  if (!Array.isArray(sets)) {
    return [];
  }

  return sets.map((set) => ({
    ...set,
    id:
      typeof set?.id === "string" && set.id.trim()
        ? set.id.trim()
        : createExerciseSetId(),
  }));
};
