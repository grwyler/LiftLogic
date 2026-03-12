import React, { Dispatch, SetStateAction, useState } from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import ExerciseSelector from "./ExerciseSelector";
import ExerciseEditItem from "./ExerciseEditItem";
import { saveRecurringRule, saveWorkoutEntry } from "../utils/helpers";

interface ExerciseManagerProps {
  index: number;
  darkMode: boolean;
  isPersistent: boolean;
  currentWorkoutTitle: string;
  setIsAddingExercise: (value: boolean) => void;
  userId: string;
  date: string;
  setRefetchExercises: Dispatch<SetStateAction<boolean>>;
}

const DEFAULT_MAX_WEIGHT = 35;

const ExerciseManager: React.FC<ExerciseManagerProps> = ({
  index,
  darkMode,
  isPersistent,
  currentWorkoutTitle,
  setIsAddingExercise,
  userId,
  date,
  setRefetchExercises,
}) => {
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [openEditModal, setOpenEditModal] = useState(false);

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

  const buildExerciseDraft = (exercise: any) => {
    const exerciseType = resolveExerciseType(exercise);
    const defaultSet = {
      ...(exerciseType === "timed"
        ? {
            name: "Timed Set 1",
            seconds: 60,
            actualSeconds: "",
          }
        : {
            name: "Working Set 1",
            reps: 10,
            weight: exercise.max || DEFAULT_MAX_WEIGHT,
            actualWeight: "",
            actualReps: "",
          }),
      complete: false,
    };
    const newExercise = {
      ...exercise,
      type: exerciseType,
      exerciseId: normalizeExerciseId(exercise),
      routineName: currentWorkoutTitle,
      userId,
      date,
      isPersistent,
      sets: [defaultSet], // default to 1 set
    };

    return newExercise;
  };

  const persistExercise = async (updatedExercise: any) => {
    if (isPersistent) {
      const parsedDate = new Date(updatedExercise.date);
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
  const handleAddExercise = (exercise: any) => {
    const newExercise = buildExerciseDraft(exercise);
    setSelectedExercise(newExercise);
    setOpenEditModal(true);
  };

  const handleQuickAddExercise = async (exercise: any) => {
    const newExercise = buildExerciseDraft(exercise);
    await persistExercise(newExercise);
    setRefetchExercises(true);
    setIsAddingExercise(false);
  };

  // When saving, call updateExercise so the parent can update the existing exercise.
  const handleSaveEdit = async (updatedExercise: any) => {
    await persistExercise(updatedExercise);
    setRefetchExercises(true);
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
        isPersistent={isPersistent}
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
      >
        <DialogTitle>Edit Exercise</DialogTitle>
        <DialogContent>
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
