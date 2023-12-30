import React, { useState } from "react";
import { Button } from "react-bootstrap";
import { FaCheck } from "react-icons/fa";
import { v4 } from "uuid";
import { saveExercise } from "../utils/helpers";
import { useSession } from "next-auth/react";
import { Session } from "next-auth";
import SetDisplay from "./SetItem";
import SetItem from "./SetItem";
import SelectedSetItem from "./SelectedSetItem";
import CompletedSetItem from "./CompletedSetItem";

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

  const handleWorkoutButtonClick = (exerciseIndex) => {
    if (currentExerciseIndex === exerciseIndex) {
      setCurrentExerciseIndex(-1);
    } else {
      setCurrentExerciseIndex(exerciseIndex);
    }

    let index = 0;
    while (
      workout.exercises[exerciseIndex] &&
      workout.exercises[exerciseIndex].sets[index] &&
      workout.exercises[exerciseIndex].sets[index].complete
    ) {
      index++;
    }
    setCurrentSetIndex(index);
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
            variant="secondary"
            size="sm"
            className={`w-100 my-1 ${e.complete && "text-white bg-success"} ${
              currentExerciseIndex === exerciseIndex && "fw-bold"
            }`}
            onClick={() => handleWorkoutButtonClick(exerciseIndex)}
            style={{
              boxShadow:
                currentExerciseIndex === exerciseIndex
                  ? "0 0 10px rgba(0, 120, 244, 0.6)" // Add your preferred glow color and intensity
                  : "none",
            }}
          >
            {e.name}{" "}
            <FaCheck
              className={`ms-1 text-white ${!e.complete && "invisible"}`}
            />
          </Button>
        </div>
        {exerciseIndex === currentExerciseIndex &&
          e.type === "weight" &&
          currentExercise.sets.map((s, i) => {
            return i === currentSetIndex ? (
              <SelectedSetItem
                set={s}
                currentExercise={currentExercise}
                setIndex={i}
                currentExerciseIndex={currentExerciseIndex}
                setCurrentSetIndex={setCurrentSetIndex}
                formattedDate={formattedDate}
                setRoutine={setRoutine}
                setCurrentExerciseIndex={setCurrentExerciseIndex}
                workout={workout}
              />
            ) : s.complete ? (
              <CompletedSetItem
                set={s}
                setIndex={i}
                setCurrentSetIndex={setCurrentSetIndex}
              />
            ) : (
              <SetItem set={s} />
            );
          })}
      </div>
    );
  });
};

export default ExercisesDisplay;
