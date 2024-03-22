import React, { Fragment, useState } from "react";
import { FaChevronLeft, FaPlus } from "react-icons/fa";
import { initialExercises } from "../utils/sample-data";
import { Button } from "react-bootstrap";
import ExerciseEditItem from "./ExerciseEditItem";
import ExerciseSearchItem from "./ExerciseSearchItem";

const AddExercise = ({
  setIsAddingExercise,
  currentWorkout,
  setCurrentWorkout,
  updateWorkoutInRoutine,
}) => {
  const [exercises, setExercises] = useState([]);
  const [selectedExercises, setSelectedExercises] = useState([]);
  const handleSearch = (event) => {
    const filterText = event.target.value.toLowerCase();
    setExercises(
      initialExercises.filter(
        (exercise) =>
          exercise.name.toLowerCase().includes(filterText) ||
          exercise.type.toLowerCase().includes(filterText)
      )
    );
  };
  const handleAddExercise = (exercise) => {
    const selectedExercisesCopy = [...selectedExercises];

    selectedExercisesCopy.push(exercise);
    setSelectedExercises(selectedExercisesCopy);
  };

  const handleAddExercises = () => {
    const currentWorkoutCopy = JSON.parse(JSON.stringify(currentWorkout));

    selectedExercises.forEach((exercise) => {
      currentWorkoutCopy.exercises.push(exercise);
    });
    setCurrentWorkout(currentWorkoutCopy);
    updateWorkoutInRoutine(currentWorkoutCopy);
    setIsAddingExercise(false);
  };

  const handleRemoveExercise = (exercise) => {
    const selectedExercisesCopy = [...selectedExercises];
    setSelectedExercises(
      selectedExercisesCopy.filter((e) => e.name !== exercise.name)
    );
  };
  return (
    <Fragment>
      <div className="d-flex m-2 align-items-center sticky-top bg-white justify-content-between">
        <Button
          onClick={() => setIsAddingExercise(false)}
          variant="white"
          className="me-2"
        >
          <FaChevronLeft />
        </Button>
        <input
          type="text"
          className="form-control"
          placeholder="Search..."
          onChange={handleSearch}
        />
        <Button
          onClick={handleAddExercises}
          disabled={selectedExercises.length === 0}
          className="m-2 d-flex align-items-center"
          variant="outline-success"
        >
          {selectedExercises.length}
          <FaPlus className="ms-2" />
        </Button>
      </div>
      <div className="container-fluid">
        {selectedExercises.map((exercise, index) => (
          <ExerciseEditItem
            index={index}
            exercise={exercise}
            selectedExercises={selectedExercises}
            setSelectedExercises={setSelectedExercises}
            handleRemoveExercise={handleRemoveExercise}
          />
        ))}
        {exercises.map((exercise, index) => {
          if (
            !currentWorkout.exercises.some((e) => e.name === exercise.name) &&
            !selectedExercises.includes(exercise)
          ) {
            return (
              <ExerciseSearchItem
                index={index}
                exercise={exercise}
                handleAddExercise={handleAddExercise}
              />
            );
          }
        })}
      </div>
    </Fragment>
  );
};

export default AddExercise;
