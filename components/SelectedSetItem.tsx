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
  routineName,
  set,
  currentExercise,
  setIndex,
  currentExerciseIndex,
  setCurrentSetIndex,
  formattedDate,
  setCurrentExerciseIndex,
  workout,
}) => {
  const { sets } = currentExercise;
  const { weight, reps, actualReps, actualWeight, name } = set;
  const [setName, setSetName] = useState(name);
  const [currentSetWeight, setCurrentSetWeight] = useState(
    actualWeight || roundToNearestFive(weight).toString()
  );
  const [currentSetReps, setCurrentSetReps] = useState(actualReps || reps);
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
    set.name = setName;

    currentExercise.sets = [
      ...sets.slice(0, setIndex),
      set,
      ...sets.slice(setIndex + 1),
    ];

    // Check if all exercises are complete for the workout
    currentExercise.complete = sets.every((s) => s.complete);
    if (currentExercise.complete) {
      currentExercise.date = formattedDate;
      currentExercise.userId = session?.token.user._id;
      currentExercise.routineName = routineName;
      saveExercise(currentExercise);
      nextIndex = currentExerciseIndex + 1;
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
          <input
            className="m-2 form-control form-control-sm"
            value={setName}
            onChange={(e) => {
              setSetName(e.target.value);
            }}
          />
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
              {roundToNearestFive(weight)} lbs.
            </div>
            <div className="col small">{reps} reps</div>
          </div>
          <div className="row small">
            <div className="col small">
              <input
                ref={weightInputRef}
                type="number"
                className="form-control form-control-sm"
                value={currentSetWeight}
                onChange={(e) => {
                  const newValue = parseFloat(e.target.value);
                  setCurrentSetWeight(
                    isNaN(newValue) ? "" : newValue.toString()
                  );
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
                value={currentSetReps}
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
