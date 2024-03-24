import React, { Fragment, useEffect, useState } from "react";
import { Button } from "react-bootstrap";
import { FaMinus, FaPlus } from "react-icons/fa";
import SetEditTimerItem from "./SetEditTimerItem";
import SetEditWeightItem from "./SetEditWeightItem";
import { DragDropContext, Droppable } from "react-beautiful-dnd";
import TimerInput from "./TimerInput";
import { emptyOrNullToZero } from "../utils/helpers";

const ExerciseEditItem = ({
  index,
  exercise,
  handleRemoveExercise,
  selectedExercises,
  setSelectedExercises,
  isValid,
  darkMode,
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
    mySetLength,
    setMySetLength,
    isInvalid,
  } = useExerciseEditItemState(
    selectedExercises,
    setSelectedExercises,
    exercise
  );

  const handleUpdateOneRepMax = (oneRepMax) => {
    setMyOneRepMax(oneRepMax);
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

  return (
    <div
      key={index}
      className={`card border-primary m-2 ${
        isValid ? "border-primary" : "border-secondary"
      } `}
    >
      <div
        className={`card-header d-flex justify-content-between align-items-center text-white  ${
          isValid ? "bg-primary" : "bg-secondary"
        } `}
      >
        <div className="card-title">{exercise.name}</div>
        <Button
          variant={darkMode ? "dark" : "light"}
          size="sm"
          onClick={() => handleRemoveExercise(exercise)}
        >
          Remove <FaMinus />
        </Button>
      </div>
      <div className={`card-body ${darkMode ? "bg-dark text-light" : ""}`}>
        <div className="container-fluid">
          <div className="row my-2">
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
            ) : (
              <Fragment>
                <div className="col-5">1 Rep Max</div>
                <div className="col-7">
                  <div className="input-group">
                    <input
                      type="number"
                      min={0}
                      max={1000}
                      className={`form-control form-control-sm ${
                        darkMode ? "bg-dark text-white" : ""
                      }`}
                      autoFocus
                      value={myOneRepMax}
                      onChange={(e) => handleUpdateOneRepMax(e.target.value)}
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
              </Fragment>
            )}
          </div>
          <div className="row my-2">
            <div className="col-5">Sets</div>
            <div className="col-7">
              <div className="input-group">
                <Button
                  variant={darkMode ? "dark" : "light"}
                  size="sm"
                  className="border-light"
                  disabled={mySetLength === 0 || isInvalid}
                  onClick={() => setMySetLength(mySetLength - 1)}
                >
                  <FaMinus />
                </Button>
                <input
                  type="number"
                  min={0}
                  max={500}
                  className={`form-control form-control-sm text-center ${
                    darkMode ? "bg-dark text-white" : ""
                  }`}
                  value={mySetLength}
                  onChange={(e) => setMySetLength(e.target.value)}
                  disabled={isInvalid}
                />
                <Button
                  size="sm"
                  className="border-light"
                  variant={darkMode ? "dark" : "light"}
                  disabled={isInvalid}
                  onClick={() => setMySetLength(mySetLength + 1)}
                >
                  <FaPlus />
                </Button>
              </div>
            </div>
          </div>
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
                          darkMode={darkMode}
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
  const [myMinutes, setMyMinutes] = useState(emptyOrNullToZero(exercise.hours));
  const [mySeconds, setMySeconds] = useState(emptyOrNullToZero(exercise.hours));
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
    mySetLength,
    setMySetLength,
    isInvalid,
  };
};

export default ExerciseEditItem;
