import React, { useState } from "react";
import SetItem from "./SetItem";

const ExerciseItem = ({
  exercise,
  isCurrent,
  setMyworkout,
  myWorkout,
  currentExerciseIndex,
  currentSetIndex,
}) => {
  return (
    <div className="row justify-content-center">
      <h5>{exercise.name}</h5>
      {isCurrent &&
        exercise.type === "weight" &&
        exercise.sets.map((s, i) => {})}
    </div>
  );
};

export default ExerciseItem;
