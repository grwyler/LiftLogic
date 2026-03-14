import React, { Dispatch, SetStateAction, useState } from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import ExerciseSelector from "./ExerciseSelector";
import ExerciseEditItem from "./ExerciseEditItem";
import {
  fetchExerciseProgress,
  saveRecurringRule,
  saveWorkoutEntry,
} from "../utils/helpers";
import { emitDevBugInteraction } from "../utils/devBugRecorder";

interface ExerciseManagerProps {
  index: number;
  darkMode: boolean;
  currentWorkoutTitle: string;
  currentExercises?: any[];
  setIsAddingExercise: (value: boolean) => void;
  userId: string;
  date: string;
  setRefetchExercises: Dispatch<SetStateAction<boolean>>;
  refreshCalendarStatuses?: () => void;
}

const DEFAULT_MAX_WEIGHT = 35;
const DEFAULT_TIMED_SECONDS = 60;

const getTimedExerciseProfile = (exercise: any) => {
  const name = String(exercise?.name ?? "").toLowerCase();
  const equipment = Array.isArray(exercise?.equipment)
    ? exercise.equipment.join(" ").toLowerCase()
    : String(exercise?.equipment ?? "").toLowerCase();

  if (/cycling|bike|bicycle|spin/.test(name + " " + equipment)) {
    return { sets: 1, hours: 0, minutes: 30, seconds: 0 };
  }

  if (/running|run|jog|treadmill/.test(name + " " + equipment)) {
    return { sets: 1, hours: 0, minutes: 20, seconds: 0 };
  }

  if (/walk|walking/.test(name)) {
    return { sets: 1, hours: 0, minutes: 20, seconds: 0 };
  }

  if (/jump rope/.test(name)) {
    return { sets: 1, hours: 0, minutes: 10, seconds: 0 };
  }

  if (/plank/.test(name)) {
    return { sets: 3, hours: 0, minutes: 1, seconds: 0 };
  }

  if (/stretch|mobility|warmup|warm-up/.test(name)) {
    return { sets: 1, hours: 0, minutes: 10, seconds: 0 };
  }

  if (/yoga/.test(name)) {
    return { sets: 1, hours: 0, minutes: 30, seconds: 0 };
  }

  return { sets: 1, hours: 0, minutes: 5, seconds: 0 };
};

const getExerciseProfile = (exercise: any) => {
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

const getDefaultRestSeconds = (exercise: any) => {
  const name = String(exercise?.name ?? "").toLowerCase();
  const equipment = Array.isArray(exercise?.equipment)
    ? exercise.equipment.join(" ").toLowerCase()
    : String(exercise?.equipment ?? "").toLowerCase();

  if (exercise?.type === "timed") {
    return 0;
  }

  if (/deadlift|squat|leg press/.test(name)) {
    return 150;
  }

  if (/bench|row|pull down|pulldown|overhead press|shoulder press|press|dip/.test(name)) {
    return 120;
  }

  if (/curl|raise|tricep|fly|extension/.test(name)) {
    return 60;
  }

  if (/bodyweight/.test(equipment) || /pull-up|push-up|dip|plank|lunge|bulgarian/.test(name)) {
    return 90;
  }

  return 90;
};

const parseLocalDate = (value: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  return new Date(value);
};

const ExerciseManager: React.FC<ExerciseManagerProps> = ({
  index,
  darkMode,
  currentWorkoutTitle,
  currentExercises = [],
  setIsAddingExercise,
  userId,
  date,
  setRefetchExercises,
  refreshCalendarStatuses,
}) => {
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const parsedBaseDate = parseLocalDate(date);
  const [recurrenceType, setRecurrenceType] = useState<
    "daily" | "weekly" | "custom" | "monthly"
  >("weekly");
  const [repeatInterval, setRepeatInterval] = useState(1);
  const [repeatDayOfWeek, setRepeatDayOfWeek] = useState(
    Number.isNaN(parsedBaseDate.getTime()) ? 0 : parsedBaseDate.getDay()
  );
  const [repeatDaysOfWeek, setRepeatDaysOfWeek] = useState<number[]>([
    Number.isNaN(parsedBaseDate.getTime()) ? 0 : parsedBaseDate.getDay(),
  ]);
  const [repeatDayOfMonth, setRepeatDayOfMonth] = useState(
    Number.isNaN(parsedBaseDate.getTime()) ? 1 : parsedBaseDate.getDate()
  );
  const [repeatEndDate, setRepeatEndDate] = useState("");

  const normalizeExerciseId = (exercise: any) => {
    if (!exercise) {
      throw new Error("Exercise is required");
    }

    return String(
      exercise.exerciseId ??
        exercise.id ??
        exercise._id ??
        exercise.name?.toLowerCase().replace(/\s+/g, "-")
    );
  };

  const resolveExerciseType = (exercise: any) =>
    exercise.type === "timed" ? "timed" : "weight";

  const buildExerciseDraft = async (exercise: any) => {
    const exerciseType = resolveExerciseType(exercise);
    const normalizedExerciseId = normalizeExerciseId(exercise);
    const progress = await fetchExerciseProgress(userId, normalizedExerciseId).catch(
      () => null
    );
    const recommendation = progress?.recommendation ?? null;
    const profile = getExerciseProfile(exercise);
    const recommendedSetCount =
      recommendation?.recommendedSets ?? profile.sets ?? 3;
    const recommendedReps =
      recommendation?.recommendedReps ?? profile.reps ?? 8;
    const recommendedWeight =
      recommendation?.recommendedWeight ??
      profile.weight ??
      exercise.max ??
      exercise.defaultMax ??
      DEFAULT_MAX_WEIGHT;
    const timedProfile = getTimedExerciseProfile(exercise);

    const defaultSets = Array.from({ length: recommendedSetCount }, (_, index) => ({
      ...(exerciseType === "timed"
        ? {
            name: `Timed Set ${index + 1}`,
            hours: timedProfile.hours,
            minutes: timedProfile.minutes,
            seconds: timedProfile.seconds,
            totalSeconds:
              timedProfile.hours * 3600 +
              timedProfile.minutes * 60 +
              timedProfile.seconds,
            actualHours: "",
            actualMinutes: "",
            actualSeconds: "",
          }
        : {
            name: `Working Set ${index + 1}`,
            reps: recommendedReps,
            weight: recommendedWeight,
            actualWeight: "",
            actualReps: "",
          }),
      complete: false,
    }));

    const resolvedSets =
      exerciseType === "timed" ? timedProfile.sets : recommendedSetCount;
    const timedSets =
      exerciseType === "timed"
        ? Array.from({ length: resolvedSets }, (_, index) => ({
            name: `Timed Set ${index + 1}`,
            hours: timedProfile.hours,
            minutes: timedProfile.minutes,
            seconds: timedProfile.seconds,
            totalSeconds:
              timedProfile.hours * 3600 +
              timedProfile.minutes * 60 +
              timedProfile.seconds,
            actualHours: "",
            actualMinutes: "",
            actualSeconds: "",
            complete: false,
          }))
        : defaultSets;

    const newExercise = {
      ...exercise,
      type: exerciseType,
      exerciseId: normalizedExerciseId,
      sortOrder: currentExercises.length,
      routineName: currentWorkoutTitle,
      userId,
      date,
      isRecurring,
      recurrenceType: isRecurring ? recurrenceType : undefined,
      interval: isRecurring ? repeatInterval : undefined,
      intervalWeeks: isRecurring ? repeatInterval : undefined,
      dayOfWeek: isRecurring ? repeatDayOfWeek : undefined,
      daysOfWeek: isRecurring
        ? recurrenceType === "custom"
          ? repeatDaysOfWeek
          : [repeatDayOfWeek]
        : undefined,
      dayOfMonth: isRecurring ? repeatDayOfMonth : undefined,
      endDate: isRecurring && repeatEndDate ? repeatEndDate : undefined,
      max: exercise.max ?? exercise.defaultMax ?? recommendedWeight,
      rest:
        exercise.rest ??
        exercise.defaultRest ??
        getDefaultRestSeconds(exercise),
      sets: timedSets,
    };

    return newExercise;
  };

  const persistExercise = async (updatedExercise: any) => {
    if (updatedExercise.isRecurring) {
      const parsedDate = parseLocalDate(updatedExercise.date);
      if (isNaN(parsedDate.getTime())) {
        throw new Error(`Invalid recurring date: ${updatedExercise.date}`);
      }

      await saveRecurringRule({
        userId: updatedExercise.userId,
        exerciseId: normalizeExerciseId(updatedExercise),
        exerciseName: updatedExercise.name,
        exerciseType: resolveExerciseType(updatedExercise),
        routineName: updatedExercise.routineName,
        recurrenceType: updatedExercise.recurrenceType ?? recurrenceType,
        interval: updatedExercise.interval ?? repeatInterval,
        dayOfWeek: updatedExercise.dayOfWeek ?? repeatDayOfWeek,
        daysOfWeek:
          updatedExercise.daysOfWeek ??
          (updatedExercise.recurrenceType ?? recurrenceType) === "custom"
            ? repeatDaysOfWeek
            : [updatedExercise.dayOfWeek ?? repeatDayOfWeek],
        dayOfMonth: updatedExercise.dayOfMonth ?? repeatDayOfMonth,
        intervalWeeks: updatedExercise.intervalWeeks ?? updatedExercise.interval ?? repeatInterval,
        startDate: parsedDate,
        endDate: updatedExercise.endDate ?? (repeatEndDate || undefined),
        templateSets: updatedExercise.sets,
        defaultMax: updatedExercise.max,
        defaultRest: updatedExercise.rest,
        active: true,
      } as any);
    } else {
      await saveWorkoutEntry({
        ...updatedExercise,
        exerciseId: normalizeExerciseId(updatedExercise),
      });
    }
  };

  // When an exercise is added, default it to one set and open the modal for editing.
  const handleAddExercise = async (exercise: any) => {
    emitDevBugInteraction({
      type: "click",
      kind: "semantic",
      label: `Start adding exercise "${exercise?.name || "exercise"}"`,
      expected: "Exercise draft opens in the editor.",
      actual: `Preparing draft for ${exercise?.name || "exercise"}.`,
      status: "info",
    });
    const newExercise = await buildExerciseDraft(exercise);
    setSelectedExercise(newExercise);
    setOpenEditModal(true);
  };

  const handleQuickAddExercise = async (exercise: any) => {
    emitDevBugInteraction({
      type: "click",
      kind: "semantic",
      label: `Quick add exercise "${exercise?.name || "exercise"}"`,
      expected: "Exercise is added to today's workout.",
      actual: `Building and saving ${exercise?.name || "exercise"}.`,
      status: "info",
    });
    const newExercise = await buildExerciseDraft(exercise);
    await persistExercise(newExercise);
    setRefetchExercises((prev) => !prev);
    refreshCalendarStatuses?.();
    setIsAddingExercise(false);
  };

  // When saving, call updateExercise so the parent can update the existing exercise.
  const handleSaveEdit = async (updatedExercise: any) => {
    emitDevBugInteraction({
      type: "submit",
      kind: "semantic",
      label: `Save exercise "${updatedExercise?.name || "exercise"}"`,
      expected: "Edited exercise persists and appears in the workout.",
      actual: `Saving ${updatedExercise?.name || "exercise"}.`,
      status: "info",
    });
    await persistExercise(updatedExercise);
    setRefetchExercises((prev) => !prev);
    refreshCalendarStatuses?.();
    setOpenEditModal(false);
    setIsAddingExercise(false);
  };

  const handleCancelEdit = () => {
    emitDevBugInteraction({
      type: "click",
      kind: "semantic",
      label: "Cancel exercise edit",
      expected: "Exercise editor closes without saving.",
      actual: "Exercise editor was closed.",
      status: "info",
    });
    setOpenEditModal(false);
    setIsAddingExercise(false);
  };

  return (
    <>
      <ExerciseSelector
        darkMode={darkMode}
        isRecurring={isRecurring}
        setIsRecurring={setIsRecurring}
        recurrenceType={recurrenceType}
        setRecurrenceType={setRecurrenceType}
        repeatInterval={repeatInterval}
        setRepeatInterval={setRepeatInterval}
        repeatDayOfWeek={repeatDayOfWeek}
        setRepeatDayOfWeek={setRepeatDayOfWeek}
        repeatDaysOfWeek={repeatDaysOfWeek}
        setRepeatDaysOfWeek={setRepeatDaysOfWeek}
        repeatDayOfMonth={repeatDayOfMonth}
        setRepeatDayOfMonth={setRepeatDayOfMonth}
        repeatEndDate={repeatEndDate}
        setRepeatEndDate={setRepeatEndDate}
        userId={userId}
        currentWorkoutTitle={currentWorkoutTitle}
        currentExercises={currentExercises}
        addExerciseToWorkout={handleAddExercise} // delegate add handler
        quickAddExerciseToWorkout={handleQuickAddExercise}
        setIsAddingExercise={setIsAddingExercise}
      />

      <Dialog
        open={openEditModal}
        onClose={handleCancelEdit}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            maxHeight: "calc(100vh - 48px)",
            display: "flex",
          },
        }}
      >
        <DialogTitle>Edit Exercise</DialogTitle>
        <DialogContent
          sx={{
            p: 2,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {selectedExercise && (
            <ExerciseEditItem
              index={index}
              exercise={selectedExercise}
              onSave={handleSaveEdit}
              onCancel={handleCancelEdit}
              darkMode={darkMode}
              isValid={true}
              autoFocusWeight={true} // instruct child to autofocus on first weight input
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ExerciseManager;
