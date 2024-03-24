import React from "react";
import { Button } from "react-bootstrap";
import { FaPlus } from "react-icons/fa";

const ExerciseSearchItem = ({
  index,
  exercise,
  handleAddExercise,
  darkMode,
}) => {
  return (
    <div
      key={index}
      className={`card m-2 ${darkMode ? "bg-custom-dark text-white" : ""}`}
    >
      <div
        className={`card-header d-flex justify-content-between align-items-center`}
      >
        <div className="card-title">{exercise.name}</div>
        <Button
          variant="outline-primary"
          size="sm"
          onClick={() => handleAddExercise(exercise)}
        >
          Add <FaPlus />
        </Button>
      </div>
      <div className="card-body">
        <p className="card-text">{exercise.type}</p>
      </div>
    </div>
  );
};

export default ExerciseSearchItem;
