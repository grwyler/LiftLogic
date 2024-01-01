import React, { useEffect, useState } from "react";
import { Button } from "react-bootstrap";
import { FaCheck, FaPlus } from "react-icons/fa";
import { v4 } from "uuid";
import { useSession } from "next-auth/react";
import { Session } from "next-auth";
import SetItem from "./SetItem";
import SelectedSetItem from "./SelectedSetItem";
import CompletedSetItem from "./CompletedSetItem";
import ExerciseItem from "./ExerciseItem";

const ExercisesDisplay = ({
  workout,
  currentExerciseIndex,
  setCurrentExerciseIndex,
  formattedDate,
  routineName,
}) => {
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [currentExercise, setCurrentExercise] = useState(null);
  // const currentExercise = workout.exercises
  //   ? workout.exercises[currentExerciseIndex]
  //   : null;

  const { data: session } = useSession() as {
    data: (Session & { token: { user } }) | null;
  };

  useEffect(() => {
    if (currentExerciseIndex) {
      const exercises = [...workout.exercises];
      setCurrentExercise(exercises[currentExerciseIndex]);
    }
  }, [currentExerciseIndex]);

  return (
    workout.exercises &&
    workout.exercises.map((e, exerciseIndex) => {
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
        <ExerciseItem
          exercise={e}
          exerciseIndex={exerciseIndex}
          workout={workout}
          currentExerciseIndex={currentExerciseIndex}
          setCurrentExerciseIndex={setCurrentExerciseIndex}
          formattedDate={formattedDate}
          routineName={routineName}
        />
        // <div key={v4()} className="text-center container-fluid">
        //   <div className="d-flex justify-content-center alignt-items-center">
        //     <Button
        //       variant="secondary"
        //       className={`w-100 my-2 ${e.complete && "text-white bg-success"} ${
        //         currentExerciseIndex === exerciseIndex && "fw-bold"
        //       }`}
        //       onClick={() => handleWorkoutButtonClick(exerciseIndex)}
        //       style={{
        //         boxShadow:
        //           currentExerciseIndex === exerciseIndex
        //             ? "0 0 10px rgba(0, 120, 244, 0.6)"
        //             : "none",
        //       }}
        //     >
        //       {e.name}{" "}
        //       <FaCheck
        //         className={`ms-1 text-white ${!e.complete && "invisible"}`}
        //       />
        //     </Button>
        //   </div>
        //   {exerciseIndex === currentExerciseIndex &&
        //     e.type === "weight" &&
        //     currentExercise &&
        //     currentExercise.sets &&
        //     currentExercise.sets.map((s, i) => {
        //       return i === currentSetIndex ? (
        //         <SelectedSetItem
        //           key={v4()}
        //           routineName={routineName}
        //           set={s}
        //           currentExercise={currentExercise}
        //           setIndex={i}
        //           currentExerciseIndex={currentExerciseIndex}
        //           setCurrentSetIndex={setCurrentSetIndex}
        //           formattedDate={formattedDate}
        //           setCurrentExerciseIndex={setCurrentExerciseIndex}
        //           workout={workout}
        //         />
        //       ) : s.complete ? (
        //         <CompletedSetItem
        //           key={v4()}
        //           set={s}
        //           setIndex={i}
        //           setCurrentSetIndex={setCurrentSetIndex}
        //         />
        //       ) : (
        //         <SetItem key={v4()} set={s} handleDeleteSet={handleDeleteSet} />
        //       );
        //     })}
        //   {exerciseIndex === currentExerciseIndex && (
        //     <Button
        //       variant="outline-info"
        //       className="w-100"
        //       onClick={handleAddSet}
        //     >
        //       Add Set <FaPlus />
        //     </Button>
        //   )}
        // </div>
      );
    })
  );
};

export default ExercisesDisplay;
