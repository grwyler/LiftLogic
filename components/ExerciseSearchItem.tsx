import React from "react";
import { Button } from "react-bootstrap";
import { FaPlus } from "react-icons/fa";

const ExerciseSearchItem = ({ index, exercise, handleAddExercise }) => {
  return (
    <div key={index} className={`card m-2`}>
      <div
        className={`card-header d-flex justify-content-between align-items-center`}
      >
        <div className="card-title">{exercise.name}</div>
        <Button
          variant="primary"
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
