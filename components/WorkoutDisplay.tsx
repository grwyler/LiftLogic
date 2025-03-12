import React, { Fragment, useEffect, useState } from "react";
import { Button } from "react-bootstrap";
import ExerciseItem from "./ExerciseItem";

import { v4 } from "uuid";
import { IoAddCircleOutline } from "react-icons/io5";
import { FaPlus } from "react-icons/fa";

const WorkoutDisplay = ({
  currentWorkout,
  currentExerciseIndex,
  setCurrentExerciseIndex,
  formattedDate,
  routineName,
  setIsAddingExercise,
  updateExercisesInRoutine,
  darkMode,
  setIsPersistent,
}) => {
  const [shownMenuIndex, setShownMenuIndex] = useState(-1);
  useEffect(() => {
    if (currentWorkout.exercises.length === 1) {
      setCurrentExerciseIndex(0);
    }
  }, []);
  return (
    <Fragment>
      {currentWorkout.exercises &&
        currentWorkout.exercises.map((e, exerciseIndex) => {
          return (
            <ExerciseItem
              key={`exercise-item-${exerciseIndex}`}
              exercise={e}
              exerciseIndex={exerciseIndex}
              workout={currentWorkout}
              currentExerciseIndex={currentExerciseIndex}
              setCurrentExerciseIndex={setCurrentExerciseIndex}
              formattedDate={formattedDate}
              routineName={routineName}
              shownMenuIndex={shownMenuIndex}
              setShownMenuIndex={setShownMenuIndex}
              updateExercisesInRoutine={updateExercisesInRoutine}
              darkMode={darkMode}
            />
          );
        })}
      <div className="d-flex justify-content-center">
        <Button
          variant="white"
          size="sm"
          title="Adds an exercise only to the currently selected day"
          onClick={() => {
            setIsPersistent(false);
            setIsAddingExercise(true);
          }}
        >
          <FaPlus /> Add Exercise to Today
        </Button>
      </div>
    </Fragment>
  );
};

export default WorkoutDisplay;
