import React, { useEffect, useRef, useState } from "react";
import {
  calculateWeights,
  formatTime,
  roundToNearestFive,
  saveExercise,
} from "../utils/helpers";
import { Button } from "react-bootstrap";
import { useSession } from "next-auth/react";
import { Session } from "next-auth";
import { FaPause, FaPlay } from "react-icons/fa";

const SetItem = ({
  routineName,
  set,
  currentExercise,
  setIndex,
  currentExerciseIndex,
  setCurrentSetIndex,
  formattedDate,
  setCurrentExerciseIndex,
  workout,
}) => {
  const { sets } = currentExercise;
  const {
    weight,
    reps,
    actualReps,
    actualWeight,
    name,
    actualSeconds,
    actualMinutes,
    actualHours,
  } = set;
  const [hours, setHours] = useState(
    actualHours === "" ? parseInt(set.hours) : parseInt(actualHours) || 0
  );
  const [minutes, setMinutes] = useState(
    actualMinutes === "" ? parseInt(set.minutes) : parseInt(actualMinutes) || 0
  );
  const [seconds, setSeconds] = useState(
    actualSeconds === "" ? parseInt(set.seconds) : parseInt(actualSeconds) || 0
  );
  const [setName, setSetName] = useState(name);
  const [currentSetWeight, setCurrentSetWeight] = useState(
    actualWeight || roundToNearestFive(weight).toString()
  );
  const [currentSetReps, setCurrentSetReps] = useState(actualReps || reps);
  const repsInputRef = useRef(null);
  const weightInputRef = useRef(null);
  const { data: session } = useSession() as {
    data: (Session & { token: { user } }) | null;
  };
  const [timerActive, setTimerActive] = useState(false);
  const [initialTimerActive, setInitialTimerActive] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(
    hours * 3600 + minutes * 60 + seconds
  );

  const handleInputChange = (value, setValue) => {
    const trimmedValue = value.toString().replace(/^0+/, ""); // Remove leading zeros
    const intValue = parseInt(trimmedValue, 10);
    setValue(isNaN(intValue) ? 0 : trimmedValue);
  };

  const handleBlur = () => {
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    setTotalSeconds(totalSeconds);
  };

  useEffect(() => {
    let interval;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prevCountdown) => prevCountdown - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdown]);

  const handleStartTimer = () => {
    setCountdown(3); // Start countdown from 3 seconds
    setTimerActive(true);
    setInitialTimerActive(true);
  };
  const handlePauseTimer = () => {
    setTimerActive(false);
    if (!initialTimerActive) {
      setTotalSeconds(countdown);
      const remainingSeconds = countdown % 3600;
      const newHours = Math.floor(totalSeconds / 3600);
      const newMinutes = Math.floor(remainingSeconds / 60);
      const newSeconds = remainingSeconds % 60;
      setSeconds(newSeconds);
      setMinutes(newMinutes);
      setHours(newHours);
    }
  };

  useEffect(() => {
    if (countdown === 0 && (timerActive || initialTimerActive)) {
      const timerDuration = totalSeconds || 0;
      setCountdown(timerDuration);
    }
  }, [countdown, totalSeconds]);
  useEffect(() => {
    if (countdown === 0 && timerActive && !initialTimerActive) {
      // Timer is complete
      setTimerActive(false);
      handleLogSet();
    } else if (countdown === 0 && initialTimerActive) {
      setInitialTimerActive(false);
    }
  }, [countdown, totalSeconds]);

  const handleLogSet = () => {
    let nextIndex = setIndex + 1;
    while (sets[nextIndex] && sets[nextIndex].complete) {
      nextIndex++;
    }
    setCurrentSetIndex(nextIndex);
    set.actualWeight = currentSetWeight;
    set.actualReps = currentSetReps;
    set.actualSeconds = seconds;
    set.actualMinutes = minutes;
    set.totalSeconds = totalSeconds - countdown;
    set.complete = true;
    set.name = setName;

    currentExercise.sets = [
      ...sets.slice(0, setIndex),
      set,
      ...sets.slice(setIndex + 1),
    ];

    // Check if all exercises are complete for the workout
    currentExercise.complete = sets.every((s) => s.complete);
    if (currentExercise.complete) {
      currentExercise.date = formattedDate;
      currentExercise.userId = session?.token.user._id;
      currentExercise.routineName = routineName;
      saveExercise(currentExercise);
      nextIndex = currentExerciseIndex + 1;
      let nextSetIndex = 0;
      while (
        workout.exercises[nextIndex] &&
        workout.exercises[nextIndex].complete
      ) {
        nextIndex++;
      }
      workout.complete = !workout.exercises[nextIndex];
      if (!workout.complete) {
        setCurrentExerciseIndex(nextIndex);
        while (
          workout.exercises[nextIndex] &&
          workout.exercises[nextIndex].sets[nextSetIndex] &&
          workout.exercises[nextIndex].sets[nextSetIndex].complete
        ) {
          nextSetIndex++;
        }
        setCurrentSetIndex(nextSetIndex);
      }
    }
  };
  return (
    <div
      key={setIndex}
      style={{ transition: "margin .2s ease" }}
      className="my-2"
    >
      <div
        style={{
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
          transition: "box-shadow 2s ease",
          overflow: "visible",
        }}
        className="card border small"
      >
        <div className="fw-bold d-flex justify-content-evenly">
          <input
            className="m-2 form-control form-control-sm"
            value={setName}
            onChange={(e) => {
              setSetName(e.target.value);
            }}
          />
          {currentExercise.type === "timed" && timerActive && (
            <Button variant="white text-secondary" onClick={handlePauseTimer}>
              <FaPause />
            </Button>
          )}
          {currentExercise.type === "timed" && !timerActive && (
            <Button
              disabled={
                currentExercise.type === "timed" &&
                seconds === 0 &&
                minutes === 0 &&
                hours === 0
              }
              variant="white text-success"
              onClick={handleStartTimer}
            >
              <FaPlay />
            </Button>
          )}
          {currentExercise.type === "weight" ||
            (currentExercise.type === "timed" && timerActive && (
              <Button
                type="button"
                disabled={
                  (currentExercise.type === "timed" && initialTimerActive) ||
                  (currentExercise.type === "timed" &&
                    seconds === 0 &&
                    minutes === 0 &&
                    hours === 0) ||
                  (currentExercise.type === "weight" && !currentSetReps) ||
                  (currentExercise.type === "weight" && !currentSetWeight)
                }
                size="sm"
                variant="success m-1"
                onClick={handleLogSet}
              >
                {timerActive && currentExercise.type === "timed" ? (
                  <>Complete Set</>
                ) : currentExercise.type === "weight" ? (
                  <>Log Set</>
                ) : (
                  <>Start Timer</>
                )}
              </Button>
            ))}
        </div>
        <div className="container p-1">
          {currentExercise.type === "weight" && (
            <React.Fragment>
              <div className="row small">
                <div className="col small">
                  <div className="text-secondary">
                    {calculateWeights(roundToNearestFive(set.weight))}
                  </div>{" "}
                  {roundToNearestFive(weight)} lbs.
                </div>
                <div className="col small">{reps} reps</div>
              </div>
              <div className="row small">
                <div className="col small">
                  <input
                    ref={weightInputRef}
                    type="number"
                    className="form-control form-control-sm"
                    value={currentSetWeight}
                    onChange={(e) => {
                      const newValue = parseFloat(e.target.value);
                      setCurrentSetWeight(
                        isNaN(newValue) ? "" : newValue.toString()
                      );
                    }}
                    onFocus={() => {
                      setCurrentSetIndex(setIndex);
                    }}
                  />
                </div>
                <div className="col small">
                  <input
                    ref={repsInputRef}
                    type="number"
                    className="form-control form-control-sm"
                    value={currentSetReps}
                    onChange={(e) => {
                      setCurrentSetReps(e.target.value);
                    }}
                    onFocus={() => {
                      setCurrentSetIndex(setIndex);
                    }}
                  />
                </div>
              </div>
            </React.Fragment>
          )}
          {currentExercise.type === "timed" && !timerActive ? (
            <div className="d-flex align-items-center">
              <input
                type="number"
                className="form-control form-control-sm text-center me-1 "
                value={hours}
                placeholder="Hours"
                onChange={(e) => handleInputChange(e.target.value, setHours)}
                onBlur={handleBlur}
              />
              <span className="me-1">h</span>

              <input
                type="number"
                className="form-control form-control-sm text-center me-1"
                value={minutes}
                placeholder="Minutes"
                onChange={(e) => handleInputChange(e.target.value, setMinutes)}
                onBlur={handleBlur}
              />
              <span className="me-1">m</span>

              <input
                type="number"
                className="form-control form-control-sm text-center me-1"
                value={seconds}
                placeholder="Seconds"
                onChange={(e) => handleInputChange(e.target.value, setSeconds)}
                onBlur={handleBlur}
              />
              <span>s</span>
            </div>
          ) : (
            <div className="fw-bold m-1">{formatTime(countdown)}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetItem;
