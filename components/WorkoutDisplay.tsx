import React, { Fragment, useState } from "react";
import { Button } from "react-bootstrap";
import ExerciseItem from "./ExerciseItem";

import { v4 } from "uuid";
import { IoAddCircleOutline } from "react-icons/io5";

const WorkoutDisplay = ({
  currentWorkout,
  setCurrentWorkout,
  currentExerciseIndex,
  setCurrentExerciseIndex,
  formattedDate,
  routineName,
  setIsAddingExercise,
  updateWorkoutInRoutine,
}) => {
  const [shownMenuIndex, setShownMenuIndex] = useState(-1);

  return (
    <Fragment>
      {currentWorkout.exercises &&
        currentWorkout.exercises.map((e, exerciseIndex) => {
          return (
            <ExerciseItem
              key={v4()}
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
            />
          );
        })}
      <div className="p-2">
        <Button
          onClick={() => setIsAddingExercise(true)}
          variant="white text-primary"
          className="w-100"
        >
          Add Exercise <IoAddCircleOutline />
        </Button>
      </div>
    </Fragment>
  );
};

export default WorkoutDisplay;
