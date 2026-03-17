import { useEffect, useMemo, useState } from "react";
import { fetchExerciseProgress, getWorkoutEntryIdentity } from "../../utils/helpers";
import {
  ExerciseProgressSummary,
  getPersonalRecordHighlights,
  getProgressTrendHighlight,
} from "../../utils/performance";
import { UserDoc } from "../../utils/types";
import {
  WorkoutDisplayExercise,
  WorkoutProgressLookup,
} from "./workoutDisplayTypes";

export const isWorkoutExerciseComplete = (
  exercise: WorkoutDisplayExercise | null | undefined
) => {
  const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
  return Boolean(
    exercise?.complete || (sets.length > 0 && sets.every((set) => set.complete))
  );
};

const asExerciseProgressSummary = (
  value: unknown
): ExerciseProgressSummary | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as ExerciseProgressSummary;
};

export const useWorkoutProgressData = ({
  currentUserId,
  currentExerciseIndex,
  exercises,
  userProfile,
}: {
  currentUserId: string;
  currentExerciseIndex: number;
  exercises: WorkoutDisplayExercise[];
  userProfile?: Partial<UserDoc> | null;
}) => {
  const [exerciseProgressById, setExerciseProgressById] = useState<WorkoutProgressLookup>(
    {}
  );
  const [loadingProgressById, setLoadingProgressById] = useState<Record<string, boolean>>(
    {}
  );

  const getExerciseCacheKey = (exercise: WorkoutDisplayExercise): string =>
    String(exercise?.exerciseId ?? exercise?._id ?? "");
  const getExerciseIdentity = (
    exercise: WorkoutDisplayExercise,
    fallbackIndex = 0
  ): string =>
    getWorkoutEntryIdentity(exercise, fallbackIndex);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    const activeExercise =
      currentExerciseIndex >= 0 ? exercises[currentExerciseIndex] ?? null : null;
    const nextIncompleteExercise =
      exercises.find((exercise) => !isWorkoutExerciseComplete(exercise)) ?? null;
    const nextExerciseIds: string[] = Array.from(
      new Set(
        [activeExercise, nextIncompleteExercise]
          .filter((exercise): exercise is NonNullable<typeof exercise> =>
            Boolean(exercise?.type === "weight")
          )
          .map((exercise) => getExerciseCacheKey(exercise).trim())
          .filter(Boolean)
      )
    );

    const uncachedExerciseIds = nextExerciseIds.filter(
      (exerciseId) =>
        !exerciseProgressById[exerciseId] && !loadingProgressById[exerciseId]
    );

    if (uncachedExerciseIds.length === 0) {
      return;
    }

    let cancelled = false;

    setLoadingProgressById((prev) => {
      const next = { ...prev };
      uncachedExerciseIds.forEach((exerciseId) => {
        next[exerciseId] = true;
      });
      return next;
    });

    void Promise.all(
      uncachedExerciseIds.map(async (exerciseId) => {
        try {
          const result = await fetchExerciseProgress(currentUserId, exerciseId);
          if (cancelled) {
            return;
          }

          setExerciseProgressById((prev) => ({
            ...prev,
            [exerciseId]: {
              summary: result?.summary ?? null,
              recommendation: result?.recommendation ?? null,
            },
          }));
        } catch (error) {
          console.error("Failed to load exercise recommendation", error);
          if (!cancelled) {
            setExerciseProgressById((prev) => ({
              ...prev,
              [exerciseId]: {
                summary: null,
                recommendation: null,
              },
            }));
          }
        } finally {
          if (!cancelled) {
            setLoadingProgressById((prev) => ({
              ...prev,
              [exerciseId]: false,
            }));
          }
        }
      })
    );

    return () => {
      cancelled = true;
    };
  }, [
    currentUserId,
    currentExerciseIndex,
    exercises,
    exerciseProgressById,
    loadingProgressById,
  ]);

  const completedExercises = useMemo(
    () => exercises.filter((exercise) => isWorkoutExerciseComplete(exercise)),
    [exercises]
  );
  const plannedExercises = useMemo(
    () => exercises.filter((exercise) => !isWorkoutExerciseComplete(exercise)),
    [exercises]
  );
  const nextExercise = useMemo(
    () => exercises.find((exercise) => !isWorkoutExerciseComplete(exercise)) ?? null,
    [exercises]
  );
  const nextExerciseIndex = useMemo(
    () => exercises.findIndex((exercise) => !isWorkoutExerciseComplete(exercise)),
    [exercises]
  );
  const prHighlights = useMemo(
    () =>
      completedExercises.filter((exercise) => {
        const summary = asExerciseProgressSummary(
          exerciseProgressById[getExerciseCacheKey(exercise)]?.summary ?? null
        );
        return Boolean(summary?.latestWorkoutBrokePR);
      }).length,
    [completedExercises, exerciseProgressById]
  );
  const recentPersonalRecords = useMemo(
    () =>
      completedExercises.flatMap((exercise) => {
        const summary = asExerciseProgressSummary(
          exerciseProgressById[getExerciseCacheKey(exercise)]?.summary ?? null
        );
        if (!summary) {
          return [];
        }
        return getPersonalRecordHighlights(
          summary,
          userProfile?.preferredUnits ?? exercise?.weightUnit
        ).map((highlight) => ({
          ...highlight,
          exerciseName: exercise?.name ?? "Exercise",
        }));
      }),
    [completedExercises, exerciseProgressById, userProfile?.preferredUnits]
  );
  const progressTrendCards = useMemo(
    () =>
      exercises
        .map((exercise, index) => {
          const summary = asExerciseProgressSummary(
            exerciseProgressById[getExerciseCacheKey(exercise)]?.summary ?? null
          );
          if (!summary) {
            return null;
          }
          const highlight = getProgressTrendHighlight(
            summary,
            userProfile?.preferredUnits ?? exercise?.weightUnit
          );

          if (!highlight) {
            return null;
          }

          return {
            id: `${getExerciseIdentity(exercise, index)}::${highlight.status}`,
            exerciseName: exercise?.name ?? "Exercise",
            ...highlight,
          };
        })
        .filter((value): value is NonNullable<typeof value> => Boolean(value)),
    [exerciseProgressById, exercises, userProfile?.preferredUnits]
  );
  const progressTrendSummary = useMemo(() => {
    const counts = progressTrendCards.reduce(
      (totals, card) => {
        totals[card.status] += 1;
        return totals;
      },
      { new: 0, up: 0, steady: 0, down: 0 }
    );

    const headline =
      counts.up > 0
        ? `${counts.up} lift${counts.up === 1 ? "" : "s"} improved recently`
        : counts.steady > 0
        ? "Recent work is holding steady"
        : counts.down > 0
        ? "Recent logs show a temporary dip"
        : "Progress will show up here once you log comparable sessions";

    const supportingCopy =
      counts.up > 0
        ? "You have visible momentum versus the last workout. Keep the next session boring and repeatable."
        : counts.steady > 0
        ? "No major swing yet. That usually means the base is stable and the next clean jump is still in play."
        : counts.down > 0
        ? "A lower day is still useful information. Treat it like signal, recover, and compare again next time."
        : "Once a lift has a prior benchmark, this section will call out what is improving, holding, or backing off.";

    return { counts, headline, supportingCopy };
  }, [progressTrendCards]);

  return {
    exerciseProgressById,
    loadingProgressById,
    getExerciseCacheKey,
    getExerciseIdentity,
    completedExercises,
    plannedExercises,
    nextExercise,
    nextExerciseIndex,
    prHighlights,
    recentPersonalRecords,
    progressTrendCards,
    progressTrendSummary,
  };
};
