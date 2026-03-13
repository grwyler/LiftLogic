import React, { Dispatch, SetStateAction, useState } from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import ExerciseSelector from "./ExerciseSelector";
import ExerciseEditItem from "./ExerciseEditItem";
import {
  fetchExerciseProgress,
  saveRecurringRule,
  saveWorkoutEntry,
} from "../utils/helpers";

interface ExerciseManagerProps {
  index: number;
  darkMode: boolean;
  currentWorkoutTitle: string;
  setIsAddingExercise: (value: boolean) => void;
  userId: string;
  date: string;
  setRefetchExercises: Dispatch<SetStateAction<boolean>>;
}

const DEFAULT_MAX_WEIGHT = 35;
const DEFAULT_TIMED_SECONDS = 60;

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
  setIsAddingExercise,
  userId,
  date,
  setRefetchExercises,
}) => {
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);

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

    const defaultSets = Array.from({ length: recommendedSetCount }, (_, index) => ({
      ...(exerciseType === "timed"
        ? {
            name: `Timed Set ${index + 1}`,
            seconds: DEFAULT_TIMED_SECONDS,
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

    const newExercise = {
      ...exercise,
      type: exerciseType,
      exerciseId: normalizedExerciseId,
      routineName: currentWorkoutTitle,
      userId,
      date,
      isRecurring,
      max: exercise.max ?? exercise.defaultMax ?? recommendedWeight,
      rest:
        exercise.rest ??
        exercise.defaultRest ??
        getDefaultRestSeconds(exercise),
      sets: defaultSets,
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
        dayOfWeek: parsedDate.getDay(),
        intervalWeeks: 1,
        startDate: parsedDate,
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
    const newExercise = await buildExerciseDraft(exercise);
    setSelectedExercise(newExercise);
    setOpenEditModal(true);
  };

  const handleQuickAddExercise = async (exercise: any) => {
    const newExercise = await buildExerciseDraft(exercise);
    await persistExercise(newExercise);
    setRefetchExercises((prev) => !prev);
    setIsAddingExercise(false);
  };

  // When saving, call updateExercise so the parent can update the existing exercise.
  const handleSaveEdit = async (updatedExercise: any) => {
    await persistExercise(updatedExercise);
    setRefetchExercises((prev) => !prev);
    setOpenEditModal(false);
    setIsAddingExercise(false);
  };

  const handleCancelEdit = () => {
    setOpenEditModal(false);
    setIsAddingExercise(false);
  };

  return (
    <>
      <ExerciseSelector
        darkMode={darkMode}
        isRecurring={isRecurring}
        setIsRecurring={setIsRecurring}
        currentWorkoutTitle={currentWorkoutTitle}
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
