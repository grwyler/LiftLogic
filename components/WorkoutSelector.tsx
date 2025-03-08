import React, { Fragment, useState } from "react";
import { Button } from "react-bootstrap";
import { FaEdit, FaPlus, FaSave, FaTimes, FaTrash } from "react-icons/fa";

const WorkoutSelector = ({
  currentWorkout,
  workouts,
  selectedWorkoutIndex,
  setSelectedWorkoutIndex,
  updateWorkoutsInRoutine,
  darkMode,
  isEditTitle,
  setIsEditTitle,
  isCreateTitle,
  setIsCreateTitle,
}) => {
  const [workoutTitle, setWorkoutTitle] = useState(currentWorkout.title || "");
  const [showMenu, setShowMenu] = useState(false);
  const handleSaveTitleEdit = () => {
    setIsEditTitle(false);
    setIsCreateTitle(false);
    const workoutsCopy = structuredClone(workouts);
    const newWorkout = {
      ...currentWorkout,
      title: workoutTitle,
    };
    workoutsCopy[selectedWorkoutIndex] = newWorkout;
    updateWorkoutsInRoutine(workoutsCopy);
  };
  const handleAddWorkout = () => {
    setIsCreateTitle(true);
    setWorkoutTitle(`Workout ${workouts.length + 1}`);
  };
  const handleCurrentWorkoutChange = (index) => {
    setShowMenu(false);
    setSelectedWorkoutIndex(index);
  };
  const handleEditClick = () => {
    setIsEditTitle(true);
    setShowMenu(false);
    setWorkoutTitle(workoutTitle);
  };
  const handleDeleteWorkout = () => {
    // Display a confirmation dialog
    const isConfirmed = window.confirm(
      "Are you sure you want to delete this workout?"
    );

    // Check if the user confirmed
    if (isConfirmed) {
      const workoutsCopy = structuredClone(workouts);
      // Filter out the workout with matching title
      const updatedWorkouts = workoutsCopy.filter(
        (w) => w.title !== workouts[selectedWorkoutIndex].title
      );
      updateWorkoutsInRoutine(updatedWorkouts);
      setShowMenu(false);
      setSelectedWorkoutIndex(0);
      setWorkoutTitle(updatedWorkouts[0].title);
    }
  };
  const handleCancelEditTitle = () => {
    setIsEditTitle(false);
    setIsCreateTitle(false);
    setWorkoutTitle(workouts[selectedWorkoutIndex].title);
  };
  const handleCreateWorkout = () => {
    const workoutsCopy = structuredClone(workouts);
    const newWorkout = {
      title: workoutTitle,
      complete: false,
      exercises: [],
    };
    workoutsCopy.push(newWorkout);
    updateWorkoutsInRoutine(workoutsCopy);
    setShowMenu(false);
    setIsCreateTitle(false);
    setSelectedWorkoutIndex(workoutsCopy.length - 1);
  };
  return (
    <div className="row m-0 rounded">
      <div className="col-12">
        {isEditTitle || isCreateTitle ? (
          <input
            className={`form-control text-center ${
              darkMode ? "bg-dark text-white" : ""
            }`}
            type="text"
            value={workoutTitle}
            autoFocus
            onChange={(e) => setWorkoutTitle(e.target.value)}
            placeholder="Workout name"
          />
        ) : (
          <div className="d-flex flex-column align-items-center">
            {/* Title Area */}
            <div className="position-relative d-flex align-items-center">
              <button
                className={`fw-bold btn btn-link ${
                  darkMode ? "text-white" : "text-dark"
                } text-decoration-none`}
                onClick={() => {
                  if (workouts.length > 1) setShowMenu(!showMenu);
                  else handleEditClick();
                }}
              >
                <h2 className="fs-2 fw-bold mt-3">{workoutTitle}</h2>
              </button>
              {workouts.length > 1 && (
                <Fragment>
                  <Button size="sm" variant="white" onClick={handleEditClick}>
                    <FaEdit className="text-secondary" />
                  </Button>

                  <Button
                    size="sm"
                    variant="white"
                    onClick={handleDeleteWorkout}
                  >
                    <FaTrash className="text-danger" />
                  </Button>
                </Fragment>
              )}
            </div>

            {/* Dropdown for Selecting a Workout (only if multiple exist) */}
            {showMenu && workouts.length > 1 && (
              <div className="dropdown-menu show text-center">
                {workouts.map((workout, index) => (
                  <button
                    key={`${workout.title}-dropdown-item`}
                    className="dropdown-item"
                    onClick={() => handleCurrentWorkoutChange(index)}
                  >
                    {workout.title}
                  </button>
                ))}
              </div>
            )}

            {/* Context Hint */}
            <small className={`${darkMode ? "text-light" : "text-muted"}`}>
              {workouts.length > 1
                ? "Click to switch workout"
                : "Current workout"}
            </small>
            <Button
              variant={`${darkMode ? "dark" : "white"}`}
              className={`mt-2 `}
              size="sm"
              onClick={handleAddWorkout}
            >
              <FaPlus /> Add Workout
            </Button>
          </div>
        )}
      </div>

      {(isCreateTitle || isEditTitle) && (
        <div className="d-flex justify-content-center">
          <Button
            variant="success"
            className="mx-1 my-2"
            onClick={isCreateTitle ? handleCreateWorkout : handleSaveTitleEdit}
            disabled={
              workoutTitle === "" ||
              workoutTitle === workouts[selectedWorkoutIndex].title ||
              workouts.some((w) => w.title === workoutTitle)
            }
          >
            {isCreateTitle ? (
              <>
                <FaSave /> Create
              </>
            ) : (
              <>
                <FaSave /> Save
              </>
            )}
          </Button>

          <Button
            variant="secondary"
            className="mx-1 my-2"
            onClick={handleCancelEditTitle}
            disabled={workouts.length === 1 && workoutTitle === ""}
          >
            <FaTimes /> Cancel
          </Button>
        </div>
      )}
    </div>
  );
};

export default WorkoutSelector;
