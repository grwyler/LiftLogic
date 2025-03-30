import React, { useState } from "react";
import WorkoutTitleAccordion from "./WorkoutTitleAccordion";
import { saveRoutine } from "../utils/helpers";

interface WorkoutSelectorProps {
  setRoutine: (routine: any) => void;
  currentWorkout: any;
  workouts: any[];
  selectedWorkoutIndex: number;
  setSelectedWorkoutIndex: (index: number) => void;
  // updateExercisesInRoutine: (workouts?: any) => void; // added property
  darkMode: boolean;
  isEditTitle: boolean;
  setIsEditTitle: (value: boolean) => void;
  isCreateTitle: boolean;
  setIsCreateTitle: (value: boolean) => void;
  setIsAddingExercise: (value: boolean) => void;
  currentDay: string;
  setIsPersistent: (value: boolean) => void;
}

const WorkoutSelector: React.FC<WorkoutSelectorProps> = ({
  setRoutine,
  currentWorkout,
  workouts,
  selectedWorkoutIndex,
  setSelectedWorkoutIndex,
  // updateExercisesInRoutine,
  darkMode,
  isEditTitle,
  setIsEditTitle,
  isCreateTitle,
  setIsCreateTitle,
  setIsAddingExercise,
  currentDay,
  setIsPersistent,
}) => {
  const [workoutTitle, setWorkoutTitle] = useState(currentWorkout.title || "");

  const handleSaveTitleEdit = () => {
    const updatedWorkout = {
      ...currentWorkout,
      title: workoutTitle,
    };

    setRoutine((prevRoutine: any) => {
      if (!prevRoutine || !prevRoutine.days || !prevRoutine.days[currentDay]) {
        return prevRoutine;
      }
      const updatedRoutine = structuredClone(prevRoutine);
      updatedRoutine.days[currentDay][selectedWorkoutIndex] = updatedWorkout;
      saveRoutine(updatedRoutine);
      return updatedRoutine;
    });

    setIsEditTitle(false);
    setIsCreateTitle(false);
  };

  const handleAddWorkout = () => {
    setIsCreateTitle(true);
    setWorkoutTitle(`Workout ${workouts.length + 1}`);
  };

  const handleCurrentWorkoutChange = (index: number) => {
    setSelectedWorkoutIndex(index);
  };

  const handleEditClick = () => {
    setIsEditTitle(true);
  };

  const handleDeleteWorkout = () => {
    const isConfirmed = window.confirm(
      "Are you sure you want to delete this workout?"
    );
    if (isConfirmed) {
      const workoutsCopy = structuredClone(workouts);
      const updatedWorkouts = workoutsCopy.filter(
        (w: any) => w.title !== workouts[selectedWorkoutIndex].title
      );
      // updateExercisesInRoutine(updatedWorkouts);
      setSelectedWorkoutIndex(0);
      if (updatedWorkouts.length > 0) {
        setWorkoutTitle(updatedWorkouts[0].title);
      } else {
        setWorkoutTitle("");
      }
    }
  };

  const handleCancelEditTitle = () => {
    setIsEditTitle(false);
    setIsCreateTitle(false);
    setWorkoutTitle(workouts[selectedWorkoutIndex].title);
  };

  const handleCreateWorkout = () => {
    const workoutsCopy = structuredClone(workouts);
    const newWorkout = {
      title: workoutTitle,
      complete: false,
      exercises: [],
    };
    workoutsCopy.push(newWorkout);
    // updateExercisesInRoutine(workoutsCopy);
    setIsCreateTitle(false);
    setSelectedWorkoutIndex(workoutsCopy.length - 1);
  };

  return (
    <WorkoutTitleAccordion
      workoutTitle={workoutTitle}
      workouts={workouts}
      selectedWorkoutIndex={selectedWorkoutIndex}
      isEditTitle={isEditTitle}
      isCreateTitle={isCreateTitle}
      darkMode={darkMode}
      handleEditClick={handleEditClick}
      handleDeleteWorkout={handleDeleteWorkout}
      handleCurrentWorkoutChange={handleCurrentWorkoutChange}
      handleAddWorkout={handleAddWorkout}
      setIsAddingExercise={setIsAddingExercise}
      handleCreateWorkout={handleCreateWorkout}
      handleSaveTitleEdit={handleSaveTitleEdit}
      handleCancelEditTitle={handleCancelEditTitle}
      setWorkoutTitle={setWorkoutTitle}
      setIsPersistent={setIsPersistent}
    />
  );
};

export default WorkoutSelector;
