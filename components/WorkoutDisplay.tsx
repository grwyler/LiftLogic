import React, { Fragment, useState } from "react";
import { Button } from "react-bootstrap";
import ExerciseItem from "./ExerciseItem";

import { v4 } from "uuid";
import { IoAddCircleOutline } from "react-icons/io5";
import { FaPlus } from "react-icons/fa";

const WorkoutDisplay = ({
  currentWorkout,
  setCurrentWorkout,
  currentExerciseIndex,
  setCurrentExerciseIndex,
  formattedDate,
  routineName,
  setIsAddingExercise,
  updateWorkoutInRoutine,
  darkMode,
}) => {
  const [shownMenuIndex, setShownMenuIndex] = useState(-1);

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
              setCurrentWorkout={setCurrentWorkout}
              shownMenuIndex={shownMenuIndex}
              setShownMenuIndex={setShownMenuIndex}
              updateWorkoutInRoutine={updateWorkoutInRoutine}
              darkMode={darkMode}
            />
          );
        })}
      <div className="p-2 d-flex justify-content-center">
        {/* <Button
          onClick={() => setIsAddingExercise(true)}
          variant="white text-primary"
          className="w-100"
        >
          Add Exercise <IoAddCircleOutline />
        </Button> */}
        <Button
          variant="outline-secondary"
          className="mt-2"
          onClick={() => setIsAddingExercise(true)}
        >
          <FaPlus /> Add Exercise
        </Button>
      </div>
    </Fragment>
  );
};

export default WorkoutDisplay;
