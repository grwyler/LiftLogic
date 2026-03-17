import { toast } from "react-toastify";
import { saveRecurringRule, saveWorkoutEntry, toLocalDateKey } from "../../utils/helpers";

export const useWorkoutExerciseOrder = ({
  completedExercises,
  currentDate,
  currentUserId,
  plannedExercises,
  refreshCalendarStatuses,
  routineName,
  setExercises,
  setRefetchExercises,
}: any) => {
  const persistExerciseOrder = async (orderedExercises: any[]) => {
    await Promise.all(
      orderedExercises.map(async (exercise, index) => {
        const nextSortOrder = index;
        const updatedExercise = {
          ...exercise,
          sortOrder: nextSortOrder,
          userId: exercise.userId ?? currentUserId,
          exerciseId: exercise.exerciseId ?? exercise._id ?? exercise.name,
          routineName,
          date: toLocalDateKey(currentDate),
        };

        if (exercise?.ruleId) {
          await saveRecurringRule({
            userId: updatedExercise.userId,
            exerciseId: updatedExercise.exerciseId,
            exerciseName: updatedExercise.name,
            exerciseType: updatedExercise.type,
            routineName,
            sortOrder: nextSortOrder,
            recurrenceType: updatedExercise.recurrenceType ?? "weekly",
            interval: updatedExercise.interval ?? updatedExercise.intervalWeeks ?? 1,
            dayOfWeek:
              updatedExercise.dayOfWeek ??
              (Array.isArray(updatedExercise.daysOfWeek)
                ? updatedExercise.daysOfWeek[0]
                : currentDate.getDay()),
            daysOfWeek:
              Array.isArray(updatedExercise.daysOfWeek) &&
              updatedExercise.daysOfWeek.length > 0
                ? updatedExercise.daysOfWeek
                : [updatedExercise.dayOfWeek ?? currentDate.getDay()],
            dayOfMonth: updatedExercise.dayOfMonth ?? currentDate.getDate(),
            intervalWeeks: updatedExercise.intervalWeeks ?? updatedExercise.interval ?? 1,
            startDate: currentDate,
            endDate: updatedExercise.endDate || undefined,
            templateSets: updatedExercise.sets,
            defaultMax: updatedExercise.max,
            defaultRest: updatedExercise.rest,
            active: true,
            _id: updatedExercise.ruleId,
          } as any);
        }

        await saveWorkoutEntry(updatedExercise as any);
        return updatedExercise;
      })
    );
  };

  const handleExerciseDragEnd = async (result: any) => {
    if (!result.destination) {
      return;
    }

    if (result.source.index === result.destination.index) {
      return;
    }

    const reorderedPlanned = [...plannedExercises];
    const [movedExercise] = reorderedPlanned.splice(result.source.index, 1);
    reorderedPlanned.splice(result.destination.index, 0, movedExercise);

    const reorderedAllExercises = [...reorderedPlanned, ...completedExercises].map(
      (exercise, index) => ({
        ...exercise,
        sortOrder: index,
      })
    );

    setExercises(reorderedAllExercises as any);

    try {
      await persistExerciseOrder(reorderedAllExercises);
      setRefetchExercises((prev: boolean) => !prev);
      refreshCalendarStatuses?.();
      toast.success("Exercise order updated");
    } catch (error) {
      console.error(error);
      toast.error("Couldn't save the new exercise order");
      setRefetchExercises((prev: boolean) => !prev);
    }
  };

  return {
    handleExerciseDragEnd,
    persistExerciseOrder,
  };
};
