import React, { Fragment, useState } from "react";
import { Button } from "react-bootstrap";
import { FaSave, FaTimes } from "react-icons/fa";
import { IoEllipsisVertical } from "react-icons/io5";
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
}) => {
  const [workoutTitle, setWorkoutTitle] = useState(currentWorkout.title || "");
  const [isEditTitle, setIsEditTitle] = useState(false);
  const [isCreateTitle, setIsCreateTitle] = useState(workouts[0].title === "");
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
    setWorkoutTitle(`Workout ${workouts.length}`);
  };
  const handleCurrentWorkoutChange = (e) => {
    const selectedIndex = e.target.selectedIndex;
    setSelectedWorkoutIndex(selectedIndex);
  };
  const handleEditClick = () => {
    setIsEditTitle(true);
    setShowMenu(false);
    setWorkoutTitle(currentWorkout.title);
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
        (w) => w.title !== currentWorkout.title
      );
      updateWorkoutsInRoutine(updatedWorkouts);
      setShowMenu(false);
      setSelectedWorkoutIndex(0);
    }
  };
  const handleCancelEditTitle = () => {
    setIsEditTitle(false);
    setWorkoutTitle(currentWorkout.title);
  };
  const handleCancelSaveTitle = () => {
    setIsCreateTitle(false);
    setWorkoutTitle(currentWorkout.title);
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
  };
  return (
    <div className="row m-0  rounded">
      <div
        className={`${isEditTitle || isCreateTitle ? "col-12" : "col-10"} p-2`}
      >
        {isEditTitle || isCreateTitle ? (
          <input
            className="form-control form-control-sm "
            type="text"
            value={workoutTitle}
            autoFocus
            onChange={(e) => setWorkoutTitle(e.target.value)}
            placeholder="Workout name"
          />
        ) : (
          <Fragment>
            {workouts.length === 1 && (
              <div className="text-center pt-1">
                {workouts[selectedWorkoutIndex].title}
              </div>
            )}
            {workouts.length > 1 && (
              <div className="dropdown text-center ">
                <select
                  className={`btn btn-outline-white dropdown-toggle w-100 ${
                    darkMode ? "text-white" : ""
                  }`}
                  onChange={handleCurrentWorkoutChange}
                  defaultValue={currentWorkout.title}
                >
                  {workouts.map((workout) => {
                    return (
                      <option
                        className="dropdown-item text-dark"
                        key={`${workout.title}-dropdown-item`}
                        value={workout.title}
                      >
                        {workout.title}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </Fragment>
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
                workoutTitle === currentWorkout.title ||
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
      ) : isCreateTitle ? (
        <div className="col-12">
          <div className="text-center">
            <Button
              size="sm"
              variant="light text-success"
              onClick={handleCreateWorkout}
              disabled={
                workoutTitle === "" ||
                workouts.some(
                  (w, i) =>
                    w.title === workoutTitle && i !== selectedWorkoutIndex
                )
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
      ) : (
        <div className="col-2 pt-1 text-end pe-0">
          <Button
            size="sm"
            variant={`${showMenu ? "light" : darkMode ? "dark" : "white"}`}
            onClick={() => setShowMenu(!showMenu)}
          >
            <IoEllipsisVertical />
          </Button>

          <CRUDMenu
            handleCreate={handleAddWorkout}
            canRead={showMenu}
            handleUpdate={handleEditClick}
            handleDelete={workouts.length > 1 ? handleDeleteWorkout : undefined}
          />
        </div>
      )}
    </div>
  );
};

export default WorkoutSelector;
