import React, { useEffect, useRef, useState } from "react";
import { v4 } from "uuid";
import {
  calculateWeights,
  roundToNearestFive,
  saveExercise,
  saveSet,
} from "../utils/helpers";
import { Button } from "react-bootstrap";
import { useSession } from "next-auth/react";
import { Session } from "next-auth";

const SetItem = ({
  set,
  currentExercise,
  setIndex,
  currentExerciseIndex,
  setCurrentSetIndex,
  formattedDate,
  setRoutine,
  setCurrentExerciseIndex,
  workout,
}) => {
  const { sets } = currentExercise;
  const { actualReps, actualWeight } = set;
  const [currentSetWeight, setCurrentSetWeight] = useState(actualWeight);
  const [currentSetReps, setCurrentSetReps] = useState(actualReps);
  const repsInputRef = useRef(null);
  const weightInputRef = useRef(null);
  const { data: session } = useSession() as {
    data: (Session & { token: { user } }) | null;
  };

  const handleLogSet = () => {
    let nextIndex = setIndex + 1;
    while (sets[nextIndex] && sets[nextIndex].complete) {
      nextIndex++;
    }
    setCurrentSetIndex(nextIndex);
    set.actualWeight = currentSetWeight;
    set.actualReps = currentSetReps;
    set.complete = true;
    set.date = formattedDate;
    set.userId = session?.token.user._id;

    currentExercise.sets = [
      ...sets.slice(0, setIndex),
      set,
      ...sets.slice(setIndex + 1),
    ];

    // Check if all exercises are complete for the workout
    currentExercise.complete = sets.every((s) => s.complete);
    if (currentExercise.complete) {
      saveExercise(currentExercise);
      let nextIndex = currentExerciseIndex + 1;
      let nextSetIndex = 0;
      while (
        workout.exercises[nextIndex] &&
        workout.exercises[nextIndex].complete
      ) {
        nextIndex++;
      }
      workout.complete = !workout.exercises[nextIndex];
      if (!workout.complete) {
        setCurrentExerciseIndex(nextIndex);
        while (
          workout.exercises[nextIndex] &&
          workout.exercises[nextIndex].sets[nextSetIndex] &&
          workout.exercises[nextIndex].sets[nextSetIndex].complete
        ) {
          nextSetIndex++;
        }
        setCurrentSetIndex(nextSetIndex);
      }
    }
    setRoutine((prevRoutine) => ({
      ...prevRoutine,
    }));
  };
  return (
    <div
      key={setIndex}
      style={{ transition: "margin .2s ease" }}
      className="my-2"
    >
      <div
        style={{
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
          transition: "box-shadow 2s ease",
          overflow: "visible",
        }}
        className="card border small"
      >
        <div className="fw-bold d-flex justify-content-evenly">
          <div className="m-1">{set.name}</div>
          <Button
            type="button"
            disabled={!currentSetWeight || !currentSetReps}
            size="sm"
            variant="success m-1"
            onClick={handleLogSet}
          >
            Log Set
          </Button>
        </div>
        <div className="container p-1 fw-bold">
          <div className="row small">
            <div className="col small">
              <div className="text-secondary">
                {calculateWeights(roundToNearestFive(set.weight))}
              </div>{" "}
              {roundToNearestFive(set.weight)} lbs.
            </div>
            <div className="col small">{set.reps} reps</div>
          </div>
          <div className="row small">
            <div className="col small">
              <input
                ref={weightInputRef}
                type="number"
                className="form-control form-control-sm"
                value={actualWeight || currentSetWeight || ""}
                onChange={(e) => {
                  setCurrentSetWeight(e.target.value);
                }}
                onFocus={() => {
                  setCurrentSetIndex(setIndex);
                }}
              />
            </div>
            <div className="col small">
              <input
                ref={repsInputRef}
                type="number"
                className="form-control form-control-sm"
                value={currentSetReps || ""}
                onChange={(e) => {
                  setCurrentSetReps(e.target.value);
                }}
                onFocus={() => {
                  setCurrentSetIndex(setIndex);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetItem;
