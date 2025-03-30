import React, { Dispatch, SetStateAction, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  useRadioGroup,
} from "@mui/material";
import ExerciseSelector from "./ExerciseSelector";
import ExerciseEditItem from "./ExerciseEditItem";
import { saveExercise } from "../utils/helpers";

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
  const dayOfTheWeek = date.split(",")[0].trim();
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [openEditModal, setOpenEditModal] = useState(false);

  // When an exercise is added, default it to one set and open the modal for editing.
  const handleAddExercise = (exercise: any) => {
    const defaultSet = {
      name: "Working Set 1",
      reps: 10,
      weight: exercise.max || DEFAULT_MAX_WEIGHT,
      actualWeight: "",
      actualReps: "",
      complete: false,
    };
    const newExercise = {
      ...exercise,
      routineName: currentWorkoutTitle,
      userId,
      date: isPersistent ? dayOfTheWeek : date,
      isPersistent,
      sets: [defaultSet], // default to 1 set
    };

    // Add the new exercise to the routine
    // addExerciseToWorkout(newExercise);

    // Set this as the selected exercise and open the modal for further editing.
    setSelectedExercise(newExercise);
    setOpenEditModal(true);
  };

  // When saving, call updateExercise so the parent can update the existing exercise.
  const handleSaveEdit = (updatedExercise: any) => {
    // updateExercise(updatedExercise);
    // setSelectedExercise(updatedExercise);
    setOpenEditModal(false);
    setIsAddingExercise(false);
    saveExercise(updatedExercise);
    setRefetchExercises((prev: boolean) => !prev);
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
