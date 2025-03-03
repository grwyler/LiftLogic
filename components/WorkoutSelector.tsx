import React, { Fragment, useState } from "react";
import { Button } from "react-bootstrap";
import { FaEdit, FaPlus, FaSave, FaTimes, FaTrash } from "react-icons/fa";
import { IoAddCircleOutline, IoEllipsisVertical } from "react-icons/io5";
import CRUDMenu from "./CRUDMenu";
import { deepCopy } from "../utils/helpers";

const WorkoutSelector = ({
  currentWorkout,
  setCurrentWorkout,
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
  // const [isEditTitle, setIsEditTitle] = useState(false);
  // const [isCreateTitle, setIsCreateTitle] = useState(workouts[0].title === "");
  const [showMenu, setShowMenu] = useState(false);
  const handleSaveTitleEdit = () => {
    setIsEditTitle(false);
    setIsCreateTitle(false);
    const workoutsCopy = JSON.parse(JSON.stringify(workouts));
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
    // const selectedIndex = e.target.selectedIndex;
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
      const workoutsCopy = deepCopy(workouts);
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
    setWorkoutTitle(workouts[selectedWorkoutIndex].title);
  };
  const handleCancelSaveTitle = () => {
    setIsCreateTitle(false);
    setWorkoutTitle(workouts[selectedWorkoutIndex].title);
    setShowMenu(false);
  };
  const handleCreateWorkout = () => {
    const workoutsCopy = JSON.parse(JSON.stringify(workouts));
    const newWorkout = {
      title: workoutTitle,
      complete: false,
      exercises: [],
    };
    setCurrentWorkout(newWorkout);
    workoutsCopy.push(newWorkout);
    updateWorkoutsInRoutine(workoutsCopy);
    setShowMenu(false);
    setIsCreateTitle(false);
    setSelectedWorkoutIndex(workoutsCopy.length - 1);
  };
  return (
    <div className="row m-0  rounded">
      <div className="col-12">
        {isEditTitle || isCreateTitle ? (
          <input
            className="form-control form-control-sm text-center"
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
              variant="white"
              className="mt-2"
              size="sm"
              onClick={handleAddWorkout}
            >
              <FaPlus /> Add Workout
            </Button>
          </div>

          // <div className="d-flex justify-content-center align-items-center">
          //   {workouts.length === 1 && (
          //     <div>{workouts[selectedWorkoutIndex].title}</div>
          //   )}
          //   {workouts.length > 1 && (
          //     <div className="dropdown text-center ">
          //       <select
          //         className={`btn btn-outline-white dropdown-toggle w-100 ${
          //           darkMode ? "text-white" : ""
          //         }`}
          //         onChange={handleCurrentWorkoutChange}
          //         defaultValue={currentWorkout.title}
          //       >
          //         {workouts.map((workout) => {
          //           return (
          //             <option
          //               className="dropdown-item text-dark"
          //               key={`${workout.title}-dropdown-item`}
          //               value={workout.title}
          //             >
          //               {workout.title}
          //             </option>
          //           );
          //         })}
          //       </select>
          //     </div>
          //   )}
          //   <Button
          //     variant={darkMode ? "dark" : "white"}
          //     className="text-center pt-1"
          //     onClick={() => setShowMenu(!showMenu)}
          //   >
          //     <IoEllipsisVertical />
          //     <div className="mt-1">
          //       <CRUDMenu
          //         handleCreate={handleAddWorkout}
          //         canRead={showMenu}
          //         handleUpdate={handleEditClick}
          //         handleDelete={
          //           workouts.length > 1 ? handleDeleteWorkout : undefined
          //         }
          //       />
          //     </div>
          //   </Button>
          // </div>
        )}
      </div>

      {isEditTitle ? (
        <div className="col-12 ">
          <div className="text-center">
            <button
              className="btn btn-sm btn-white text-success "
              onClick={handleSaveTitleEdit}
              disabled={
                workoutTitle === "" ||
                workoutTitle === workouts[selectedWorkoutIndex].title ||
                workouts.some((w) => w.title === workoutTitle)
              }
            >
              <FaSave /> Save
            </button>

            <button
              className="btn btn-sm btn-white "
              onClick={handleCancelEditTitle}
              disabled={workouts.length === 1 && workoutTitle === ""}
            >
              <FaTimes /> Cancel
            </button>
          </div>
        </div>
      ) : (
        isCreateTitle && (
          <div className="col-12">
            <div className="text-center">
              <Button
                size="sm"
                variant="light text-success"
                onClick={handleCreateWorkout}
                disabled={
                  workoutTitle === "" ||
                  workouts[selectedWorkoutIndex].title === workoutTitle
                  // workouts.some(
                  //   (w, i) =>
                  //     w.title === workoutTitle && i !== selectedWorkoutIndex
                  // )
                }
              >
                <FaSave /> Create
              </Button>
              {
                <Button
                  variant="white"
                  size="sm"
                  onClick={handleCancelSaveTitle}
                  disabled={workouts.length === 1 && workoutTitle === ""}
                >
                  <FaTimes /> Cancel
                </Button>
              }
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default WorkoutSelector;
