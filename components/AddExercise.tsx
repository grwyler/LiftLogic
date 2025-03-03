import React, { Fragment, useEffect, useState } from "react";
import { FaChevronLeft, FaPlus } from "react-icons/fa";
import { initialExercises, requiredEquipment } from "../utils/sample-data";
import { Button } from "react-bootstrap";
import ExerciseEditItem from "./ExerciseEditItem";
import ExerciseSearchItem from "./ExerciseSearchItem";
import EquipmentAccordion from "./EquipmentAccordion";
import { deepCopy } from "../utils/helpers";
import { v4 } from "uuid";
import axios from "axios";

const AddExercise = ({
  setIsAddingExercise,
  currentWorkout,
  setCurrentWorkout,
  updateWorkoutInRoutine,
  darkMode,
}) => {
  const {
    exercises,
    setExercises,
    selectedExercises,
    setSelectedExercises,
    validExercises,
    selectedEquipment,
    setSelectedEquipment,
  } = useAddExerciseState();

  const handleSearch = (event) => {
    const exercisesCopy = deepCopy(exercises);
    const filterText = event.target.value.toLowerCase();
    setExercises(
      exercisesCopy.filter(
        (exercise) =>
          exercise.name.toLowerCase().includes(filterText) ||
          exercise.type.toLowerCase().includes(filterText)
      )
    );
  };
  const handleAddExercise = (exercise) => {
    const selectedExercisesCopy = JSON.parse(JSON.stringify(selectedExercises));

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
    const selectedExercisesCopy = JSON.parse(JSON.stringify(selectedExercises));
    setSelectedExercises(
      selectedExercisesCopy.filter((e) => e.name !== exercise.name)
    );
  };

  return (
    <Fragment>
      <div
        style={{ zIndex: 2 }}
        className={`d-flex m-2 align-items-center sticky-top justify-content-between ${
          darkMode ? "bg-dark text-white" : "bg-white"
        }`}
      >
        <Button
          onClick={() => setIsAddingExercise(false)}
          variant={darkMode ? "dark" : "white"}
          className="me-2"
        >
          <FaChevronLeft />
        </Button>
        {validExercises.length > 0 && (
          <Button
            onClick={handleAddExercises}
            disabled={validExercises.length === 0}
            className="m-2 d-flex align-items-center"
            variant="outline-success"
          >
            Add {validExercises.length}
            <FaPlus className="ms-2" />
          </Button>
        )}
      </div>
      <div className="container-fluid">
        {selectedExercises.map((exercise, index) => (
          <ExerciseEditItem
            key={`exercise-edit-item-${exercise.name}`}
            index={index}
            exercise={exercise}
            selectedExercises={selectedExercises}
            setSelectedExercises={setSelectedExercises}
            handleRemoveExercise={handleRemoveExercise}
            isValid={validExercises.includes(exercise)}
            darkMode={darkMode}
          />
        ))}
        <EquipmentAccordion
          selectedEquipment={selectedEquipment}
          setSelectedEquipment={setSelectedEquipment}
          requiredEquipment={requiredEquipment}
          darkMode={darkMode}
        />
        <input
          type="text"
          className="form-control my-2"
          placeholder="Search..."
          onChange={handleSearch}
        />
        {/* {exercises.map((exercise, index) => {
          if (
            !currentWorkout.exercises.some((e) => e.name === exercise.name) &&
            !selectedExercises.includes(exercise)
          ) {
            return (
              <ExerciseSearchItem
                key={`exercise-search-item-${exercise.name}-${index}`}
                index={index}
                exercise={exercise}
                handleAddExercise={handleAddExercise}
                darkMode={darkMode}
              />
            );
          }
        })} */}
        {/* {exercises.map((exercise, index) => {
          if (
            !currentWorkout.exercises.some((e) => e.name === exercise.name) &&
            !selectedExercises.includes(exercise)
          ) {
            return (
              <ExerciseSearchItem
                key={`exercise-search-item-${exercise.name}-${index}`}
                index={index}
                exercise={exercise}
                handleAddExercise={handleAddExercise}
                darkMode={darkMode}
              />
            );
          }
        })} */}
        <div>
          <h2>Exercise List</h2>
          <ul>
            {exercises.slice(0, 10).map((exercise) => (
              <li key={exercise.id}>
                <strong>{exercise.name}</strong> - {exercise.bodyPart} (
                {exercise.equipment})
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Fragment>
  );
};

const useAddExerciseState = () => {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [validExercises, setValidExercises] = useState([]);

  useEffect(() => {
    const fetchExercises = async () => {
      try {
        const response = await axios.get("/api/exercises");
        setExercises(response.data);
      } catch (err) {
        setError("Failed to load exercises.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchExercises();
  }, []);
  // useEffect(() => {
  //   const exercisesCopy = deepCopy(initialExercises);
  //   const filteredExercises = exercisesCopy.filter((exercise) =>
  //     exercise.requiredEquipment.every((equipment) =>
  //       selectedEquipment.includes(equipment)
  //     )
  //   );
  //   setExercises(filteredExercises);
  // }, [selectedEquipment]);
  // useEffect(() => {
  //   if (selectedEquipment.length === 0) {
  //     setExercises(deepCopy(initialExercises)); // Show all exercises when no filter is applied
  //   } else {
  //     const exercisesCopy = deepCopy(initialExercises);
  //     const filteredExercises = exercisesCopy.filter((exercise) =>
  //       exercise.requiredEquipment.some((equipment) =>
  //         selectedEquipment.includes(equipment)
  //       )
  //     );
  //     setExercises(filteredExercises);
  //   }
  // }, [selectedEquipment]);
  useEffect(() => {
    // Make a copy of the selectedExercises list
    const selectedExercisesCopy = [...selectedExercises];

    // Filter out exercises with sets length greater than 0
    const filteredExercises = selectedExercisesCopy.filter(
      (exercise) => exercise.sets.length > 0
    );

    // Set the validExercises state to the filtered array
    setValidExercises(filteredExercises);
  }, [selectedExercises]);
  return {
    exercises,
    setExercises,
    selectedExercises,
    setSelectedExercises,
    validExercises,
    selectedEquipment,
    setSelectedEquipment,
  };
};

export default AddExercise;
