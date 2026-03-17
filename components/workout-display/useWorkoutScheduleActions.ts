import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { toLocalDateKey } from "../../utils/helpers";
import {
  removeWorkoutSchedule,
  updateWorkoutSchedule,
} from "../../utils/recurringRuleService";

export const useWorkoutScheduleActions = ({
  currentDate,
  currentUserId,
  exercises,
  recurringSchedulingEnabled,
  refreshCalendarStatuses,
  routineName,
  setExercises,
  setRefetchExercises,
  onRequestRecurringUpgradePrompt,
}: any) => {
  const [showWorkoutRepeatDialog, setShowWorkoutRepeatDialog] = useState(false);
  const [savingWorkoutSchedule, setSavingWorkoutSchedule] = useState(false);

  const repeatingExercises = useMemo(
    () => exercises.filter((exercise: any) => Boolean(exercise?.isRepeating || exercise?.ruleId)),
    [exercises]
  );

  const sharedWorkoutSchedule = useMemo(() => {
    if (repeatingExercises.length === 0 || repeatingExercises.length !== exercises.length) {
      return null;
    }

    const [firstExercise, ...restExercises] = repeatingExercises;
    const baseSchedule = {
      recurrenceType: firstExercise?.recurrenceType ?? "weekly",
      interval: Number(firstExercise?.interval ?? firstExercise?.intervalWeeks ?? 1) || 1,
      dayOfWeek: Number(
        firstExercise?.dayOfWeek ??
          (Array.isArray(firstExercise?.daysOfWeek)
            ? firstExercise.daysOfWeek[0]
            : currentDate.getDay())
      ),
      daysOfWeek: Array.isArray(firstExercise?.daysOfWeek)
        ? firstExercise.daysOfWeek.map(Number)
        : [
            Number(
              firstExercise?.dayOfWeek ??
                (Array.isArray(firstExercise?.daysOfWeek)
                  ? firstExercise.daysOfWeek[0]
                  : currentDate.getDay())
            ),
          ],
      dayOfMonth: Number(firstExercise?.dayOfMonth ?? currentDate.getDate()) || currentDate.getDate(),
      endDate: firstExercise?.endDate ? String(firstExercise.endDate).slice(0, 10) : "",
    };

    const allMatch = restExercises.every((exercise: any) => {
      const exerciseDays = Array.isArray(exercise?.daysOfWeek)
        ? exercise.daysOfWeek.map(Number).sort().join(",")
        : "";
      const baseDays = [...baseSchedule.daysOfWeek].sort().join(",");

      return (
        (exercise?.recurrenceType ?? "weekly") === baseSchedule.recurrenceType &&
        (Number(exercise?.interval ?? exercise?.intervalWeeks ?? 1) || 1) === baseSchedule.interval &&
        Number(
          exercise?.dayOfWeek ??
            (Array.isArray(exercise?.daysOfWeek) ? exercise.daysOfWeek[0] : baseSchedule.dayOfWeek)
        ) === baseSchedule.dayOfWeek &&
        exerciseDays === baseDays &&
        Number(exercise?.dayOfMonth ?? baseSchedule.dayOfMonth) === baseSchedule.dayOfMonth &&
        String(exercise?.endDate ? String(exercise.endDate).slice(0, 10) : "") ===
          baseSchedule.endDate
      );
    });

    return allMatch ? baseSchedule : null;
  }, [currentDate, exercises.length, repeatingExercises]);

  const [recurrenceType, setRecurrenceType] = useState<
    "daily" | "weekly" | "custom" | "monthly"
  >(sharedWorkoutSchedule?.recurrenceType ?? "weekly");
  const [repeatInterval, setRepeatInterval] = useState(sharedWorkoutSchedule?.interval ?? 1);
  const [repeatDayOfWeek, setRepeatDayOfWeek] = useState(
    sharedWorkoutSchedule?.dayOfWeek ?? currentDate.getDay()
  );
  const [repeatDaysOfWeek, setRepeatDaysOfWeek] = useState<number[]>(
    sharedWorkoutSchedule?.daysOfWeek ?? [currentDate.getDay()]
  );
  const [repeatDayOfMonth, setRepeatDayOfMonth] = useState(
    sharedWorkoutSchedule?.dayOfMonth ?? currentDate.getDate()
  );
  const [repeatEndDate, setRepeatEndDate] = useState(sharedWorkoutSchedule?.endDate ?? "");

  const isWholeWorkoutRepeating =
    exercises.length > 0 && repeatingExercises.length === exercises.length;

  const openWorkoutRepeatDialog = () => {
    if (!recurringSchedulingEnabled) {
      onRequestRecurringUpgradePrompt?.();
      return;
    }

    const schedule = sharedWorkoutSchedule;
    setRecurrenceType(schedule?.recurrenceType ?? "weekly");
    setRepeatInterval(schedule?.interval ?? 1);
    setRepeatDayOfWeek(schedule?.dayOfWeek ?? currentDate.getDay());
    setRepeatDaysOfWeek(schedule?.daysOfWeek ?? [currentDate.getDay()]);
    setRepeatDayOfMonth(schedule?.dayOfMonth ?? currentDate.getDate());
    setRepeatEndDate(schedule?.endDate ?? "");
    setShowWorkoutRepeatDialog(true);
  };

  const handleSaveWorkoutSchedule = async () => {
    if (!currentUserId) {
      toast.error("Couldn't save the workout schedule");
      return;
    }

    if (!recurringSchedulingEnabled) {
      onRequestRecurringUpgradePrompt?.();
      return;
    }

    try {
      setSavingWorkoutSchedule(true);
      const data = await updateWorkoutSchedule({
        action: "save_workout_schedule",
        userId: currentUserId,
        routineName,
        date: toLocalDateKey(currentDate),
        exercises,
        schedule: {
          recurrenceType,
          interval: repeatInterval,
          dayOfWeek: repeatDayOfWeek,
          daysOfWeek:
            recurrenceType === "custom" ? repeatDaysOfWeek : [repeatDayOfWeek],
          dayOfMonth: repeatDayOfMonth,
          endDate: repeatEndDate || undefined,
        },
      });
      const nextExercises = Array.isArray(data.exercises) ? data.exercises : [];

      setExercises(nextExercises as any);
      setShowWorkoutRepeatDialog(false);
      setRefetchExercises((prev: boolean) => !prev);
      refreshCalendarStatuses?.();
      toast.success("Workout schedule updated");
    } catch (error) {
      console.error(error);
      toast.error("Couldn't save the workout schedule");
    } finally {
      setSavingWorkoutSchedule(false);
    }
  };

  const handleRemoveWorkoutSchedule = async () => {
    if (!currentUserId) {
      toast.error("Couldn't remove the workout schedule");
      return;
    }

    try {
      setSavingWorkoutSchedule(true);
      const data = await removeWorkoutSchedule({
        action: "remove_workout_schedule",
        userId: currentUserId,
        routineName,
        date: toLocalDateKey(currentDate),
        exercises,
      });
      const nextExercises = Array.isArray(data.exercises) ? data.exercises : [];

      setExercises(nextExercises as any);
      setShowWorkoutRepeatDialog(false);
      setRefetchExercises((prev: boolean) => !prev);
      refreshCalendarStatuses?.();
      toast.success("Workout schedule removed");
    } catch (error) {
      console.error(error);
      toast.error("Couldn't remove the workout schedule");
    } finally {
      setSavingWorkoutSchedule(false);
    }
  };

  return {
    showWorkoutRepeatDialog,
    setShowWorkoutRepeatDialog,
    savingWorkoutSchedule,
    recurrenceType,
    setRecurrenceType,
    repeatInterval,
    setRepeatInterval,
    repeatDayOfWeek,
    setRepeatDayOfWeek,
    repeatDaysOfWeek,
    setRepeatDaysOfWeek,
    repeatDayOfMonth,
    setRepeatDayOfMonth,
    repeatEndDate,
    setRepeatEndDate,
    isWholeWorkoutRepeating,
    openWorkoutRepeatDialog,
    handleSaveWorkoutSchedule,
    handleRemoveWorkoutSchedule,
  };
};
