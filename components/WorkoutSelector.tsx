import React, { useEffect, useState } from "react";
import WorkoutTitleAccordion from "./WorkoutTitleAccordion";

interface WorkoutSelectorProps {
  setRoutine: (workout: any) => void;
  currentWorkout: any;
  darkMode: boolean;
  isEditTitle: boolean;
  setIsEditTitle: (value: boolean) => void;
}

const WorkoutSelector: React.FC<WorkoutSelectorProps> = ({
  setRoutine,
  currentWorkout,
  darkMode,
  isEditTitle,
  setIsEditTitle,
}) => {
  const [workoutTitle, setWorkoutTitle] = useState(currentWorkout?.title || "");

  useEffect(() => {
    setWorkoutTitle(currentWorkout?.title || "");
  }, [currentWorkout?.title]);

  const handleSaveTitleEdit = () => {
    setRoutine({
      ...currentWorkout,
      title: workoutTitle.trim() || currentWorkout?.title || "Workout",
    });
    setIsEditTitle(false);
  };

  const handleCancelEditTitle = () => {
    setWorkoutTitle(currentWorkout?.title || "");
    setIsEditTitle(false);
  };

  return (
    <WorkoutTitleAccordion
      workoutTitle={workoutTitle}
      currentWorkout={currentWorkout}
      isEditTitle={isEditTitle}
      darkMode={darkMode}
      handleEditClick={() => setIsEditTitle(true)}
      handleSaveTitleEdit={handleSaveTitleEdit}
      handleCancelEditTitle={handleCancelEditTitle}
      setWorkoutTitle={setWorkoutTitle}
    />
  );
};

export default WorkoutSelector;
