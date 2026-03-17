import { useState } from "react";
import { toast } from "react-toastify";
import { saveWorkoutEntry, toLocalDateKey } from "../../utils/helpers";

export const useRestTimerActions = ({
  currentDate,
  currentUserId,
  exercises,
  routineName,
  setExercises,
}: any) => {
  const [activeRestTimer, setActiveRestTimer] = useState<{
    exerciseKey: string;
    exerciseName: string;
    seconds: number;
    restSeconds: number;
  } | null>(null);

  const handleOpenRestTimer = ({
    exerciseKey,
    exerciseName,
    seconds,
    restSeconds,
  }: {
    exerciseKey: string;
    exerciseName: string;
    seconds: number;
    restSeconds: number;
  }) => {
    if (!seconds || seconds <= 0) {
      setActiveRestTimer(null);
      return;
    }

    setActiveRestTimer({
      exerciseKey,
      exerciseName,
      seconds,
      restSeconds,
    });
  };

  const handleCloseRestTimer = () => {
    setActiveRestTimer(null);
  };

  const handleSaveRestTimerValue = async (
    nextRest: number,
    getExerciseIdentity: (exercise: any, index?: number) => string
  ) => {
    if (!activeRestTimer || !currentUserId) {
      return;
    }

    const exerciseIndex = exercises.findIndex(
      (exercise: any, index: number) =>
        getExerciseIdentity(exercise, index) === activeRestTimer.exerciseKey
    );

    if (exerciseIndex === -1) {
      return;
    }

    const exercise = exercises[exerciseIndex];
    const updatedExercise = {
      ...exercise,
      userId: exercise.userId ?? currentUserId,
      exerciseId: exercise.exerciseId ?? exercise._id ?? exercise.name,
      routineName,
      date: toLocalDateKey(currentDate),
      rest: nextRest,
    };

    setExercises((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((currentExercise, index) =>
        index === exerciseIndex
          ? {
              ...currentExercise,
              rest: nextRest,
            }
          : currentExercise
      )
    );

    await saveWorkoutEntry(updatedExercise as any);
    setActiveRestTimer((prev) =>
      prev
        ? {
            ...prev,
            seconds: nextRest,
            restSeconds: nextRest,
          }
        : prev
    );
    toast.success("Rest updated");
  };

  return {
    activeRestTimer,
    handleOpenRestTimer,
    handleCloseRestTimer,
    handleSaveRestTimerValue,
  };
};
