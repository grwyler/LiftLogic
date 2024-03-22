import React, { useEffect, useState } from "react";
import { Button } from "react-bootstrap";
import { FaCheck } from "react-icons/fa";
import SelectedSetItem from "./SelectedSetItem";
import CompletedSetItem from "./CompletedSetItem";
import SetItem from "./SetItem";
import { v4 } from "uuid";
import {
  IoAddCircleOutline,
  IoCaretDown,
  IoEllipsisHorizontal,
} from "react-icons/io5";
import CRUDMenu from "./CRUDMenu";
const ExerciseItem = ({
  exercise,
  exerciseIndex,
  workout,
  currentExerciseIndex,
  setCurrentExerciseIndex,
  formattedDate,
  routineName,
  setCurrentWorkout,
  shownMenuIndex,
  setShownMenuIndex,
  updateWorkoutInRoutine,
}) => {
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [currentExercise, setCurrentExercise] = useState(exercise);

  const handleWorkoutButtonClick = (exerciseIndex) => {
    if (currentExerciseIndex === exerciseIndex) {
      setCurrentExerciseIndex(-1);
    } else {
      setCurrentExerciseIndex(exerciseIndex);
    }
    let index = 0;

    while (
      currentExercise.sets[index] &&
      currentExercise.sets[index].complete
    ) {
      index++;
    }

    setCurrentSetIndex(index);
  };
  const handleAddSet = () => {
    const sets = [...currentExercise.sets];
    if (sets && sets.length > 0) {
      const lastSet = sets[sets.length - 1];
      const count = isNaN(parseInt(lastSet.name.slice(lastSet.name.length - 1)))
        ? 0
        : parseInt(lastSet.name.slice(lastSet.name.length - 1)) + 1;
      const newSet = {
        ...lastSet,
        weight: lastSet.weight + lastSet.weight * 0.05,
        reps: lastSet.reps,
        actualWeight: "",
        actualReps: "",
        complete: false,
        name: `${lastSet.name.slice(0, lastSet.name.length - 1)}${count}`,
      };
      sets.push(newSet);
      setCurrentExercise({ ...currentExercise, sets });
    }
  };
  const handleDeleteSet = (setName) => {
    const sets = [...currentExercise.sets];
    setCurrentExercise({
      ...currentExercise,
      sets: sets.filter((s) => s.name !== setName),
    });
  };
  const handleDeleteExercise = () => {
    const workoutCopy = JSON.parse(JSON.stringify(workout));
    workoutCopy.exercises.splice(exerciseIndex, 1);
    const currentWorkout = {
      ...workout,
      exercises: workoutCopy.exercises,
    };

    setCurrentWorkout(currentWorkout);
    updateWorkoutInRoutine(currentWorkout);

    setShownMenuIndex(-1);
  };
  return (
    <div
      key={v4()}
      className={`text-center mx-2 rounded ${
        currentExerciseIndex === exerciseIndex ? "bg-light" : ""
      }`}
      style={{
        boxShadow:
          currentExerciseIndex === exerciseIndex
            ? "0px 0px 10px rgba(50, 50, 50, .8)"
            : "none",
      }}
    >
      <div className="d-flex justify-content-center align-items-center">
        <div className={`w-100 m-2 bg-light rounded p-1 `}>
          <Button
            size="sm"
            variant="light"
            className="float-start"
            onClick={() => handleWorkoutButtonClick(exerciseIndex)}
          >
            {currentExerciseIndex === exerciseIndex ? (
              <IoCaretDown className="flip-icon rotate" />
            ) : (
              <IoCaretDown className="flip-icon" />
            )}
          </Button>
          {currentExercise.name}

          {currentExercise.complete && (
            <FaCheck className={`ms-2 text-success `} />
          )}

          <div className="float-end">
            <Button
              size="sm"
              variant={shownMenuIndex === exerciseIndex ? "secondary" : "light"}
              onClick={() =>
                setShownMenuIndex(
                  shownMenuIndex === exerciseIndex ? -1 : exerciseIndex
                )
              }
            >
              <IoEllipsisHorizontal />
            </Button>
            <CRUDMenu
              canRead={shownMenuIndex === exerciseIndex}
              handleDelete={handleDeleteExercise}
            />
          </div>
        </div>
      </div>
      {exerciseIndex === currentExerciseIndex &&
        currentExercise.sets &&
        currentExercise.sets.map((s, i) => {
          return i === currentSetIndex ? (
            <SelectedSetItem
              key={v4()}
              routineName={routineName}
              set={s}
              currentExercise={currentExercise}
              setIndex={i}
              currentExerciseIndex={currentExerciseIndex}
              setCurrentSetIndex={setCurrentSetIndex}
              formattedDate={formattedDate}
              setCurrentExerciseIndex={setCurrentExerciseIndex}
              workout={workout}
            />
          ) : s.complete ? (
            <CompletedSetItem
              key={v4()}
              set={s}
              setIndex={i}
              setCurrentSetIndex={setCurrentSetIndex}
              type={currentExercise.type}
            />
          ) : (
            <SetItem
              key={v4()}
              set={s}
              handleDeleteSet={(setName) => handleDeleteSet(setName)}
              type={currentExercise.type}
            />
          );
        })}
      {exerciseIndex === currentExerciseIndex && (
        <Button
          variant="white text-primary"
          className="m-2"
          onClick={handleAddSet}
        >
          Add Set <IoAddCircleOutline />
        </Button>
      )}
    </div>
  );
};

export default ExerciseItem;
