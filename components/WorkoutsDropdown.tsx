import React from "react";
import { Dropdown } from "react-bootstrap";
import {
  FaArrowUp,
  FaCartArrowDown,
  FaRecycle,
  FaRetweet,
} from "react-icons/fa";

function WorkoutDropdown({ workouts, darkMode, handleCurrentWorkoutChange }) {
  return (
    <Dropdown>
      <Dropdown.Toggle variant={darkMode ? "dark" : "white"} size="sm">
        <FaRetweet /> Switch Workout
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {workouts.map((workout, index) => (
          <Dropdown.Item
            key={`${workout.title}-${index}`}
            onClick={() => handleCurrentWorkoutChange(index)}
          >
            {workout.title}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}

export default WorkoutDropdown;
