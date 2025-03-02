import React, { useState } from "react";
import { Button } from "react-bootstrap";
import { FaCheck } from "react-icons/fa";
import SelectedSetItem from "./SelectedSetItem";
import CompletedSetItem from "./CompletedSetItem";
import SetItem from "./SetItem";
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
  darkMode,
}) => {
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [currentExercise, setCurrentExercise] = useState(exercise);

  const handleWorkoutButtonClick = (index) => {
    setCurrentExerciseIndex((prevIndex) => (prevIndex === index ? -1 : index));

    const nextSetIndex = exercise.sets.findIndex((s) => !s.complete);
    setCurrentSetIndex(nextSetIndex !== -1 ? nextSetIndex : 0);
  };

  const handleAddSet = () => {
    const sets = [...currentExercise.sets];

    if (sets.length === 0) return; // Avoid error on empty sets

    const lastSet = sets[sets.length - 1];
    const newSetNumber = sets.length + 1;

    const newSet = {
      ...lastSet,
      weight: lastSet.weight + lastSet.weight * 0.05,
      actualWeight: "",
      actualReps: "",
      complete: false,
      name: `Working Set ${newSetNumber}`,
    };

    setCurrentExercise({ ...currentExercise, sets: [...sets, newSet] });
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
      key={`exercise-${exercise.name}-${exerciseIndex}`}
      className={`text-center m-2 rounded ${
        currentExerciseIndex === exerciseIndex
          ? darkMode
            ? "bg-custom-dark"
            : "bg-light"
          : ""
      }`}
      style={{
        border:
          currentExerciseIndex === exerciseIndex ? "2px solid #007bff" : "none",
        boxShadow:
          currentExerciseIndex === exerciseIndex
            ? "0px 4px 12px rgba(0, 123, 255, 0.2)" // Softer glow effect
            : "none",
        transition: "all 0.2s ease-in-out",
      }}
    >
      <div className="d-flex justify-content-center align-items-center ">
        <div
          className={`w-100 m-2 rounded p-1 ${
            darkMode ? "bg-custom-dark " : "bg-light"
          }`}
        >
          <Button
            size="sm"
            variant={darkMode ? "bg-custom-dark text-white" : "light"}
            className="float-start d-flex align-items-center"
            onClick={() => handleWorkoutButtonClick(exerciseIndex)}
          >
            <IoCaretDown
              className={`flip-icon ${
                currentExerciseIndex === exerciseIndex ? "rotate-180" : ""
              }`}
              style={{ transition: "transform 0.2s ease-in-out" }}
            />
          </Button>
          {currentExercise.name}

          {currentExercise.complete && (
            <FaCheck className={`ms-2 text-success `} />
          )}

          <div className="float-end">
            <Button
              size="sm"
              variant={
                shownMenuIndex === exerciseIndex
                  ? "secondary"
                  : darkMode
                  ? "bg-custom-dark text-white"
                  : "light"
              }
              className="ms-2 p-2"
              onClick={() =>
                setShownMenuIndex(
                  shownMenuIndex === exerciseIndex ? -1 : exerciseIndex
                )
              }
            >
              <IoEllipsisHorizontal size={18} />
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
              key={`selectedSetItem-${i}`}
              routineName={routineName}
              set={s}
              currentExercise={currentExercise}
              setIndex={i}
              currentExerciseIndex={currentExerciseIndex}
              setCurrentSetIndex={setCurrentSetIndex}
              formattedDate={formattedDate}
              setCurrentExerciseIndex={setCurrentExerciseIndex}
              workout={workout}
              darkMode={darkMode}
            />
          ) : s.complete ? (
            <CompletedSetItem
              key={`completedSetItem-${i}`}
              set={s}
              setIndex={i}
              setCurrentSetIndex={setCurrentSetIndex}
              type={currentExercise.type}
              darkMode={darkMode}
            />
          ) : (
            <SetItem
              key={`setItem-${i}`}
              set={s}
              handleDeleteSet={(setName) => handleDeleteSet(setName)}
              type={currentExercise.type}
              darkMode={darkMode}
            />
          );
        })}
      {exerciseIndex === currentExerciseIndex && (
        <Button
          variant={darkMode ? "bg-custom-dark " : "white"}
          className="mt-3 mb-2 text-primary w-100 d-flex align-items-center justify-content-center"
          onClick={handleAddSet}
        >
          <IoAddCircleOutline className="me-1" /> Add Set
        </Button>
      )}
    </div>
  );
};

export default ExerciseItem;
