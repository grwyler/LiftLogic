import React, { Fragment, useState } from "react";
import { Button } from "react-bootstrap";
import { FaSave, FaPlus, FaEdit, FaTrash, FaTimes } from "react-icons/fa";
import { IoEllipsisVertical } from "react-icons/io5";
import CRUDMenu from "./CRUDMenu";

const WorkoutSelector = ({
  currentWorkout,
  setCurrentWorkout,
  workouts,
  setWorkouts,
  selectedWorkoutIndex,
  setSelectedWorkoutIndex,
  updateWorkoutsInRoutine,
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
    const workoutsCopy = JSON.parse(JSON.stringify(workouts));
    const newWorkout = {
      title: `Workout ${workouts.length}`,
      complete: false,
      exercises: [],
    };
    setCurrentWorkout(newWorkout);
    setSelectedWorkoutIndex(workoutsCopy.length);

    workoutsCopy.push(newWorkout);
    setWorkouts(workoutsCopy);

    setWorkoutTitle(newWorkout.title);
    setShowMenu(false);
    setIsCreateTitle(true);
  };
  const handleCurrentWorkoutChange = (e) => {
    const selectedTitle = e.target.value;
    const selectedIndex = e.target.selectedIndex;
    const selectedWorkout = workouts.find(
      (workout) => workout.title === selectedTitle
    );
    // setCurrentWorkout(selectedWorkout);
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
      // Filter out the workout with matching title
      const updatedWorkouts = workouts.filter(
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
  return (
    <div className="row m-0">
      <div
        className={`${isEditTitle || isCreateTitle ? "col-12" : "col-10"} p-2`}
      >
        {isEditTitle || isCreateTitle ? (
          <input
            className="form-control form-control-sm"
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
              <div className="dropdown text-center">
                <select
                  className="btn btn-outline-white dropdown-toggle w-100"
                  onChange={handleCurrentWorkoutChange}
                  defaultValue={currentWorkout.title}
                >
                  {workouts.map((workout) => {
                    return (
                      <option
                        className="dropdown-item"
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
        <div className="col-12">
          <div className="text-center">
            <button
              className="btn btn-sm btn-light text-success "
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
              className="btn btn-sm btn-light "
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
              onClick={handleSaveTitleEdit}
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
          </div>
        </div>
      ) : (
        <div className="col-2 pt-1">
          <Button
            size="sm"
            variant={`${showMenu ? "light" : "white"}`}
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
