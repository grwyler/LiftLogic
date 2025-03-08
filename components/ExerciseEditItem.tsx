import React, { Fragment, useEffect, useState } from "react";
import { Button, FormCheck, FormLabel } from "react-bootstrap";
import FormRange from "react-bootstrap/esm/FormRange";
import {
  FaArrowCircleUp,
  FaMinus,
  FaPlus,
  FaRedo,
  FaSave,
  FaTimes,
} from "react-icons/fa";
import SetEditTimerItem from "./SetEditTimerItem";
import SetEditWeightItem from "./SetEditWeightItem";
import { DragDropContext, Droppable } from "react-beautiful-dnd";
import TimerInput from "./TimerInput";
import { emptyOrNullToZero } from "../utils/helpers";

const ExerciseEditItem = ({
  index,
  exercise,
  setCurrentExercise,
  handleRemoveExercise,
  selectedExercises,
  setSelectedExercises,
  isValid,
  darkMode,
  setIsEditing,
}) => {
  const {
    setMyOneRepMax,
    mySets,
    setMySets,
    myHours,
    setMyHours,
    myMinutes,
    setMyMinutes,
    mySeconds,
    setMySeconds,
    myOneRepMax,
    isManualEdit,
    setIsManualEdit,
    effort,
    setEffort,
  } = useExerciseEditItemState(
    selectedExercises,
    setSelectedExercises,
    exercise
  );

  const [desiredSetCount, setDesiredSetCount] = useState(3);

  const handleUpdateOneRepMax = (oneRepMax) => {
    const numericValue = parseFloat(oneRepMax);

    if (!isNaN(numericValue)) {
      setMyOneRepMax(numericValue);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) {
      return; // Dropped outside the list
    }

    const { source, destination } = result;
    if (source.index === destination.index) {
      return; // Item dropped at the same position
    }

    const newSets = Array.from(mySets);
    const [removed] = newSets.splice(source.index, 1);
    newSets.splice(destination.index, 0, removed);

    setMySets(newSets);
  };
  const handleInputChange = (value, setValue) => {
    const trimmedValue = value.toString().replace(/^0+/, ""); // Remove leading zeros
    const intValue = parseInt(trimmedValue, 10);
    setValue(isNaN(intValue) ? 0 : trimmedValue);
  };

  const handleAddSet = () => {
    const sets = [...exercise.sets];

    if (sets.length === 0) return; // Avoid error on empty sets

    const lastSet = sets[sets.length - 1];
    const newSetNumber = sets.length + 1;

    const newSet = {
      ...lastSet,
      weight: lastSet.weight + lastSet.weight * 0.05,
      actualWeight: "",
      actualReps: "",
      complete: false,
      name: `Working Set ${newSetNumber}`,
    };
    const newSets = [...sets, newSet];
    // const newExercise = { ...exercise, sets: newSets };
    // setCurrentExercise(newExercise);
    setMySets(newSets);
  };
  const handleManualToggle = () => {
    setIsManualEdit(!isManualEdit);
  };
  const handleChangeEffort = (e) => {
    setEffort(Number(e.target.value));
    setMySets(calculateSets());
  };

  const calculateSets = () => {
    if (!myOneRepMax || myOneRepMax <= 0 || isNaN(myOneRepMax)) return mySets; // Ensure 1RM is valid

    return mySets.map((set, index) => {
      const effortPercentage = effort / 100;
      // Calculate recommended weight
      const recommendedWeight = Math.round(myOneRepMax * effortPercentage);

      // Adjust reps: More intensity = fewer reps (arbitrary scaling formula)
      const adjustedReps = Math.max(
        3,
        Math.round(set.reps * (effortPercentage / 100))
      );

      return {
        ...set,
        weight: recommendedWeight,
        reps: adjustedReps,
      };
    });
  };

  const handleGenerateSets = () => {};
  return (
    <div
      key={index}
      className={`card border-primary m-2 ${
        isValid ? "border-primary" : "border-secondary"
      } `}
    >
      <div
        className={`card-header d-flex justify-content-between align-items-center ${
          isValid ? "bg-light" : "bg-secondary"
        } `}
      >
        <div className="card-title ">
          Editing <strong>{exercise.name}</strong>
        </div>
      </div>
      <div className={`card-body ${darkMode ? "bg-dark text-light" : ""}`}>
        <div className="container-fluid">
          <div className="row">
            {exercise.type === "timed" ? (
              <TimerInput
                hours={myHours}
                setHours={setMyHours}
                minutes={myMinutes}
                setMinutes={setMyMinutes}
                seconds={mySeconds}
                setSeconds={setMySeconds}
                handleBlur={() => {}}
                handleInputChange={handleInputChange}
                darkMode={darkMode}
              />
            ) : !isManualEdit ? (
              <Fragment>
                <div className="d-flex justify-content-center p-2">
                  <FormCheck
                    type="switch"
                    label="Manually Enter"
                    checked={isManualEdit}
                    onChange={handleManualToggle}
                  />
                </div>
                <div className="row">
                  <div className="col-8">
                    <FormLabel>One Rep Max (1RM)</FormLabel>
                  </div>
                  <div className="col-4">
                    <FormLabel>Sets</FormLabel>
                  </div>

                  <div className="row">
                    <div className="col-8">
                      <div className="input-group">
                        <input
                          type="number"
                          min={0}
                          max={1000}
                          className={`form-control ${
                            darkMode ? "bg-dark text-white" : ""
                          }`}
                          value={myOneRepMax}
                          onChange={(e) =>
                            handleUpdateOneRepMax(parseFloat(e.target.value))
                          }
                          aria-label="1 Rep Max"
                        />
                        <span
                          className={`input-group-text font-InterTight ${
                            darkMode ? "bg-dark text-white" : ""
                          }`}
                        >
                          lbs.
                        </span>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="input-group">
                        <input
                          type="number"
                          min={0}
                          max={1000}
                          className={`form-control ${
                            darkMode ? "bg-dark text-white" : ""
                          }`}
                          value={desiredSetCount}
                          onChange={(e) =>
                            setDesiredSetCount(parseFloat(e.target.value))
                          }
                          aria-label="1 Rep Max"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="row">
                  <div className="col">
                    <FormLabel>Effort {effort}%</FormLabel>
                    <FormRange
                      value={effort}
                      onChange={handleChangeEffort}
                      step={1}
                      min={1}
                      max={100}
                    />
                  </div>
                </div>
                <div className="row">
                  <div className="col d-flex justify-content-center p-2">
                    <Button variant="primary">Generate</Button>
                  </div>
                </div>
              </Fragment>
            ) : (
              <div className="d-flex justify-content-center p-2">
                <FormCheck
                  type="switch"
                  label="Manually Enter"
                  checked={isManualEdit}
                  onChange={handleManualToggle}
                />
              </div>
            )}
            <hr />
            <div className="h4">Sets</div>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="sets">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef}>
                    {mySets.map((set, index) => {
                      if (exercise.type === "timed") {
                        return (
                          <SetEditTimerItem
                            key={`set-edit-timer-${set.name}-${index}`}
                            set={set}
                            index={index}
                            darkMode={darkMode}
                          />
                        );
                      } else {
                        return (
                          <SetEditWeightItem
                            key={`set-edit-weight-${set.name}-${index}`}
                            set={set}
                            index={index}
                            isManualEdit={isManualEdit}
                            darkMode={darkMode}
                            handleDeleteSet={(set) => {
                              setMySets(
                                mySets.filter((s) => s.name === set.name)
                              );
                            }}
                          />
                        );
                      }
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </div>
        {isManualEdit && (
          <Button
            variant={darkMode ? "bg-custom-dark " : "white"}
            className="mt-3 mb-2 text-primary w-100 d-flex align-items-center justify-content-center"
            onClick={handleAddSet}
          >
            <FaPlus className="me-1" /> Add Set
          </Button>
        )}
      </div>

      <div className="d-flex justify-content-center">
        <Button
          variant="success"
          className="mx-1 my-2"
          // onClick={isCreateTitle ? handleCreateWorkout : handleSaveTitleEdit}
          // disabled={
          //   workoutTitle === "" ||
          //   workoutTitle === workouts[selectedWorkoutIndex].title ||
          //   workouts.some((w) => w.title === workoutTitle)
          // }
        >
          <FaSave /> Save
        </Button>
        <Button
          variant="secondary"
          className="mx-1 my-2"
          onClick={() => {
            setIsEditing(false);
          }}
          // disabled={workouts.length === 1 && workoutTitle === ""}
        >
          <FaTimes /> Cancel
        </Button>
        <Button
          variant="outline-dark"
          className="mx-1 my-2"
          onClick={() => {
            setIsEditing(false);
          }}
          // disabled={exercise === myEx}
        >
          <FaRedo /> Reset
        </Button>
      </div>
    </div>
  );
};

const useExerciseEditItemState = (
  selectedExercises,
  setSelectedExercises,
  exercise
) => {
  const [mySets, setMySets] = useState(exercise.sets);
  const [mySetLength, setMySetLength] = useState(exercise.sets.length);
  const [myOneRepMax, setMyOneRepMax] = useState(exercise.oneRepMax);

  const [myHours, setMyHours] = useState(emptyOrNullToZero(exercise.hours));
  const [myMinutes, setMyMinutes] = useState(
    emptyOrNullToZero(exercise.minuntes)
  );
  const [mySeconds, setMySeconds] = useState(
    emptyOrNullToZero(exercise.seconds)
  );
  const [isManualEdit, setIsManualEdit] = useState(false);
  const [effort, setEffort] = useState(50);
  const isInvalid =
    (!myOneRepMax && exercise.type === "weight") ||
    (!myHours && !myMinutes && !mySeconds && exercise.type === "timed");
  useEffect(() => {
    if (
      ((exercise.type === "weight" && myOneRepMax) ||
        exercise.type === "timed") &&
      mySetLength >= 0 &&
      mySetLength !== mySets.length
    ) {
      const minWeight = myOneRepMax * 0.6;
      // exerciseCopy.sets = [];
      setMySets([]);
      let newSets = [];
      if (mySetLength === 1) {
        // If only one set is requested, set weight directly to 195 (or closest to 1 rep max)
        const roundedWeight = Math.round((myOneRepMax * 0.8) / 2.5) * 2.5; // Round to nearest 2.5 lbs
        let newSet;
        if (exercise.type === "weight") {
          newSet = {
            name: "Working Set 1",
            reps: 5,
            actualReps: "",
            actualWeight: "",
            weight: roundedWeight,
          };
        } else {
          newSet = {
            name: "Working Set 1",
            seconds: mySeconds,
            minutes: myMinutes,
            hours: myHours,
            actualSeconds: "",
            actualMinutes: "",
            actualHours: "",
          };
        }
        newSets.push(newSet);
      } else if (mySetLength > 1 && mySetLength > mySets.length) {
        const increment = (myOneRepMax - minWeight) / mySetLength - 1; // Calculate the weight increment

        for (let i = 0; i < mySetLength; i++) {
          let newSet;
          if (exercise.type === "weight") {
            let weight = minWeight + increment * i; // Start from minWeight and increment by the calculated amount
            let roundedWeight = Math.round(weight / 2.5) * 2.5; // Round to nearest 2.5 lbs
            let reps = i === 0 ? 10 : i === mySetLength - 1 ? 2 : 6; // 10 reps for first set, 6 reps for intermediate sets, 2 rep for last set
            newSet = {
              name: `Working Set ${i + 1}`,
              reps,
              actualReps: "",
              actualWeight: "",
              weight: roundedWeight,
            };
          } else {
            newSet = {
              name: `Working Set ${i + 1}`,
              seconds: mySeconds,
              minutes: myMinutes,
              hours: myHours,
              actualSeconds: "",
              actualMinutes: "",
              actualHours: "",
            };
          }

          newSets.push(newSet);
        }
      } else if (mySetLength > 1 && mySetLength < mySets.length) {
        newSets = newSets.slice(0, mySetLength);
      }
      setMySets(newSets);
      const selectedExercisesCopy = JSON.parse(
        JSON.stringify(selectedExercises)
      );
      selectedExercisesCopy[selectedExercises.indexOf(exercise)] = {
        ...exercise,
        sets: newSets,
      };
      setSelectedExercises(selectedExercisesCopy);
    }
  }, [mySetLength, myOneRepMax, mySets, mySeconds, myMinutes, myHours]);
  return {
    setMyOneRepMax,
    mySets,
    setMySets,
    myHours,
    setMyHours,
    myMinutes,
    setMyMinutes,
    mySeconds,
    setMySeconds,
    myOneRepMax,
    isManualEdit,
    setIsManualEdit,
    effort,
    setEffort,
  };
};

export default ExerciseEditItem;
