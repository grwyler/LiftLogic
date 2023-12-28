import React, { useState } from "react";
import { Button } from "react-bootstrap";
import { FaCheck } from "react-icons/fa";
import SetsDisplay from "./SetsDisplay";
import { v4 } from "uuid";
import { saveExercise } from "../utils/helpers";
import { useSession } from "next-auth/react";
import { Session } from "next-auth";

const ExercisesDisplay = ({
  workout,
  currentExerciseIndex,
  setCurrentExerciseIndex,
  formattedDate,
  setRoutine,
}) => {
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const currentExercise = workout.exercises[currentExerciseIndex];
  const { data: session } = useSession() as {
    data: (Session & { token: { user } }) | null;
  };

  const handleCompleteExercise = async () => {
    let nextIndex = currentExerciseIndex + 1;
    while (
      workout.exercises[nextIndex] &&
      workout.exercises[nextIndex].complete
    ) {
      nextIndex++;
    }
    setCurrentExerciseIndex(nextIndex);
    setCurrentSetIndex(0);

    currentExercise.complete = true;
    currentExercise.date = formattedDate;
    currentExercise.userId = session?.token.user._id;
    saveExercise(currentExercise);

    // Check if all exercises are complete for the workout
    workout.complete = workout.exercises.every((e) => e.complete);
  };
  const handleWorkoutButtonClick = (exerciseIndex) => {
    if (currentExerciseIndex === exerciseIndex) {
      setCurrentExerciseIndex(-1);
    } else {
      setCurrentExerciseIndex(exerciseIndex);
    }
    setCurrentSetIndex(0);
  };
  const handleResetExercise = () => {
    currentExercise.sets.forEach((s) => {
      s.actualReps = "";
      s.actualWeight = "";
    });
    setCurrentSetIndex(0);
    currentExercise.complete = false;
    workout.complete = false;
    setRoutine((prevRoutine) => ({
      ...prevRoutine,
    }));
  };

  return workout.exercises.map((e, exerciseIndex) => {
    const isCurrentExerciseComplete = e.sets.every(
      (s) =>
        s.actualReps &&
        s.actualReps !== "" &&
        s.actualWeight &&
        s.actualReps !== ""
    );
    if (!isCurrentExerciseComplete) {
      e.complete = isCurrentExerciseComplete;
    }
    return (
      <div key={v4()} className="text-center">
        <div className="d-flex justify-content-center alignt-items-center">
          <Button
            variant="light"
            className={`w-100 m-1 ${e.complete && "text-success"} ${
              currentExerciseIndex === exerciseIndex && "fw-bold"
            }`}
            onClick={() => handleWorkoutButtonClick(exerciseIndex)}
          >
            {e.name}{" "}
            <FaCheck
              className={`ms-1 text-success ${!e.complete && "invisible"}`}
            />
          </Button>
          {exerciseIndex === currentExerciseIndex && (
            <Button
              onClick={handleResetExercise}
              className="m-1"
              variant="secondary"
            >
              Reset
            </Button>
          )}
        </div>
        {exerciseIndex === currentExerciseIndex && e.type === "weight" && (
          <SetsDisplay
            sets={e.sets}
            currentExercise={currentExercise}
            currentSetIndex={currentSetIndex}
            setRoutine={setRoutine}
            setCurrentSetIndex={setCurrentSetIndex}
          />
        )}
        {currentExerciseIndex === exerciseIndex &&
          !currentExercise.complete && (
            <Button
              onClick={handleCompleteExercise}
              className="m-2"
              variant="success"
            >
              Complete Exercise
            </Button>
          )}
      </div>
    );
  });
};

export default ExercisesDisplay;
