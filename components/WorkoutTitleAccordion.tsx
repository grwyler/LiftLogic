import React, { useState } from "react";
import { Button } from "react-bootstrap";
import { FaPlus, FaSave, FaTimes, FaChevronDown } from "react-icons/fa";
import WorkoutDropdown from "./WorkoutsDropdown";
import { CSSTransition } from "react-transition-group";
import CRUDMenuButton from "./CRUDMenuButton";

const WorkoutTitleAccordion = ({
  workoutTitle,
  workouts,
  selectedWorkoutIndex,
  isEditTitle,
  isCreateTitle,
  darkMode,
  handleEditClick,
  handleDeleteWorkout,
  handleCurrentWorkoutChange,
  handleAddWorkout,
  setIsAddingExercise,
  handleCreateWorkout,
  handleSaveTitleEdit,
  handleCancelEditTitle,
  setWorkoutTitle,
  setIsPersistent,
}) => {
  // Track whether accordion is open
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [showTitleMenu, setShowTitleMenu] = useState(false);

  // Helper to capitalize day or other text
  function capitalizeFirstLetter(str = "") {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // For demonstration, assume currentDay is "tuesday"
  const currentDay = "tuesday";
  const capitalizedDay = capitalizeFirstLetter(currentDay);

  const handleUpdateWorkout = () => {
    handleEditClick();
    setShowTitleMenu(false);
  };

  return (
    <div className="row m-0 rounded">
      <div className="col-12">
        {/* If we're editing or creating, show input */}
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
            {/* Title Area / Accordion Toggle */}
            <div
              className="d-flex align-items-center justify-content-between w-100"
              onClick={() => {
                setShowTitleMenu(false);
                setIsAccordionOpen(!isAccordionOpen);
              }}
            >
              <FaChevronDown
                className={`flip-icon ${isAccordionOpen ? "rotate-180" : ""}`}
                style={{ transition: "transform 0.2s ease-in-out" }}
              />
              <h2 className="fw-bold">{workoutTitle}</h2>
              <CRUDMenuButton
                darkMode={darkMode}
                handleDelete={handleDeleteWorkout}
                handleUpdate={handleUpdateWorkout}
                onClickMenuButton={() => {
                  setShowTitleMenu(!showTitleMenu);
                }}
                show={showTitleMenu}
              />
            </div>
            <CSSTransition
              in={isAccordionOpen}
              timeout={300}
              classNames="accordion"
              unmountOnExit
            >
              <div className="container">
                {workouts.length > 1 && (
                  <div className="row text-center">
                    <WorkoutDropdown
                      workouts={workouts}
                      darkMode={darkMode}
                      handleCurrentWorkoutChange={handleCurrentWorkoutChange}
                    />
                  </div>
                )}
                <div className="row">
                  <Button
                    onClick={handleAddWorkout}
                    variant={darkMode ? "dark" : "white"}
                    size="sm"
                  >
                    <FaPlus /> Add New Workout Routine
                  </Button>
                </div>
                <div className="row">
                  <Button
                    variant="white"
                    size="sm"
                    title={`Adds an Exercise that repeats every ${capitalizedDay}`}
                    onClick={() => {
                      setIsPersistent(true);
                      setIsAddingExercise(true);
                    }}
                  >
                    <FaPlus /> Add Recurring Exercise
                  </Button>
                </div>
              </div>
            </CSSTransition>
          </div>
        )}
      </div>

      {/* Save / Cancel Buttons (shown if editing or creating) */}
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

export default WorkoutTitleAccordion;
