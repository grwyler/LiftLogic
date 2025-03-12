import React, { useState } from "react";
import WorkoutTitleAccordion from "./WorkoutTitleAccordion";
import { saveRoutine } from "../utils/helpers";

const WorkoutSelector = ({
  setRoutine,
  currentWorkout,
  workouts,
  selectedWorkoutIndex,
  setSelectedWorkoutIndex,
  updateWorkoutsInRoutine,
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
  const capitalizedDay =
    currentDay.charAt(0).toUpperCase() + currentDay.slice(1);

  const handleSaveTitleEdit = () => {
    // Create the updated workout object with the new title.
    const updatedWorkout = {
      ...currentWorkout,
      title: workoutTitle,
    };

    // Update the routine state with the new workout title.
    setRoutine((prevRoutine) => {
      // Ensure routine exists and that the current day key is valid.
      if (!prevRoutine || !prevRoutine.days || !prevRoutine.days[currentDay]) {
        return prevRoutine;
      }

      // Create a deep copy of the routine to avoid mutations.
      const updatedRoutine = structuredClone(prevRoutine);

      // Replace the workout at the selected index with the updated workout.
      updatedRoutine.days[currentDay][selectedWorkoutIndex] = updatedWorkout;

      // Save the updated routine (e.g. to local storage or backend).
      saveRoutine(updatedRoutine);

      return updatedRoutine;
    });

    // Exit title edit modes.
    setIsEditTitle(false);
    setIsCreateTitle(false);
  };

  const handleAddWorkout = () => {
    setIsCreateTitle(true);
    setWorkoutTitle(`Workout ${workouts.length + 1}`);
  };
  const handleCurrentWorkoutChange = (index) => {
    setSelectedWorkoutIndex(index);
  };
  const handleEditClick = () => {
    setIsEditTitle(true);
    setWorkoutTitle(workoutTitle);
  };
  const handleDeleteWorkout = () => {
    // Display a confirmation dialog
    const isConfirmed = window.confirm(
      "Are you sure you want to delete this workout?"
    );

    // Check if the user confirmed
    if (isConfirmed) {
      const workoutsCopy = structuredClone(workouts);
      // Filter out the workout with matching title
      const updatedWorkouts = workoutsCopy.filter(
        (w) => w.title !== workouts[selectedWorkoutIndex].title
      );
      updateWorkoutsInRoutine(updatedWorkouts);
      setSelectedWorkoutIndex(0);
      setWorkoutTitle(updatedWorkouts[0].title);
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
    updateWorkoutsInRoutine(workoutsCopy);
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
