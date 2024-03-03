import React, { Fragment, useState } from "react";
import { FaChevronLeft, FaPlus } from "react-icons/fa";
import { initialExercises } from "../utils/sample-data";
import { Button } from "react-bootstrap";
import { saveRoutine } from "../utils/helpers";

const AddExercise = ({
  setIsAddingExercise,
  currentWorkout,
  updateWorkoutInRoutine,
}) => {
  const [exercises, setExercises] = useState(initialExercises);
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
    if (selectedExercisesCopy.some((e) => e.name === exercise.name)) {
      setSelectedExercises(
        selectedExercisesCopy.filter((e) => e.name !== exercise.name)
      );
    } else {
      selectedExercisesCopy.push(exercise);
      setSelectedExercises(selectedExercisesCopy);
    }
  };

  const handleAddExercises = () => {
    const currentWorkoutCopy = { ...currentWorkout };

    selectedExercises.forEach((exercise) => {
      currentWorkoutCopy.exercises.push(exercise);
    });
    updateWorkoutInRoutine(currentWorkoutCopy);
    setIsAddingExercise(false);
  };
  return (
    <Fragment>
      <div className="d-flex m-2 align-items-center sticky-top bg-white justify-content-between">
        <Button onClick={() => setIsAddingExercise(false)} variant="white">
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
          className="m-2"
          variant="success"
        >
          <FaPlus />
        </Button>
      </div>
      <div className="container">
        {exercises.map((exercise, index) => (
          <div
            key={index}
            className={`card m-2 ${
              selectedExercises.some((e) => e.name === exercise.name)
                ? "bg-primary text-white"
                : ""
            }`}
            onClick={() => handleAddExercise(exercise)}
          >
            <div className="card-body">
              <h5 className="card-title">{exercise.name}</h5>
              <p className="card-text">{exercise.type}</p>
            </div>
          </div>
        ))}
      </div>
    </Fragment>
  );
};

export default AddExercise;
