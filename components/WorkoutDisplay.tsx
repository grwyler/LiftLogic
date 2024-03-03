import React, { Fragment } from "react";
import { Button } from "react-bootstrap";
import ExerciseItem from "./ExerciseItem";

import { v4 } from "uuid";

const WorkoutDisplay = ({
  currentWorkout,
  currentExerciseIndex,
  setCurrentExerciseIndex,
  formattedDate,
  routineName,
  setIsAddingExercise,
}) => {
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
            />
          );
        })}
      <div className="p-2">
        <Button
          onClick={() => setIsAddingExercise(true)}
          variant="outline-info"
          className="w-100"
        >
          Add Exercise
        </Button>
      </div>
    </Fragment>
  );
};

export default WorkoutDisplay;
