import React, { useEffect, useRef, useState } from "react";
import {
  calculateWeights,
  formatTime,
  roundToNearestFive,
  saveExercise,
} from "../utils/helpers";
import {
  Box,
  Divider,
  Paper,
  TextField,
  Typography,
  Button,
} from "@mui/material";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import TimerInput from "./TimerInput";
import { useSession } from "next-auth/react";
import { Session } from "next-auth";

const DEFAULT_MAX_WEIGHT = 35; // fallback value if weight is missing

const SelectedSetItem = ({
  routineName,
  set,
  currentExercise,
  setIndex,
  currentExerciseIndex,
  setCurrentSetIndex,
  formattedDate,
  setCurrentExerciseIndex,
  workout,
  darkMode,
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

  // Compute an initial weight value.
  // The following calculation (using calculateWeights and roundToNearestFive)
  // is specifically for barbell exercises to simplify selecting the appropriate weight.
  const initialWeightValue =
    actualWeight || roundToNearestFive(weight || DEFAULT_MAX_WEIGHT).toString();

  // Initialize states
  const [hours, setHours] = useState(
    actualHours === "" ? parseInt(set.hours) || 0 : parseInt(actualHours) || 0
  );
  const [minutes, setMinutes] = useState(
    actualMinutes === ""
      ? parseInt(set.minutes) || 0
      : parseInt(actualMinutes) || 0
  );
  const [seconds, setSeconds] = useState(
    actualSeconds === ""
      ? parseInt(set.seconds) || 0
      : parseInt(actualSeconds) || 0
  );
  const [setName, setSetName] = useState(name);
  const [currentSetWeight, setCurrentSetWeight] = useState(initialWeightValue);
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

  const handleInputChange = (value: any, setValue: (v: any) => void) => {
    const trimmedValue = value.toString().replace(/^0+/, "");
    const intValue = parseInt(trimmedValue, 10);
    setValue(isNaN(intValue) ? 0 : trimmedValue);
  };

  const handleBlur = () => {
    const totalSec = hours * 3600 + minutes * 60 + seconds;
    setTotalSeconds(totalSec);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdown]);

  const handleStartTimer = () => {
    setCountdown(3); // Countdown from 3 seconds
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
  }, [countdown, totalSeconds, timerActive, initialTimerActive]);

  useEffect(() => {
    if (countdown === 0 && timerActive && !initialTimerActive) {
      setTimerActive(false);
      handleLogSet();
    } else if (countdown === 0 && initialTimerActive) {
      setInitialTimerActive(false);
    }
  }, [countdown, totalSeconds, timerActive, initialTimerActive]);

  const handleLogSet = () => {
    let nextIndex = setIndex + 1;
    while (sets[nextIndex] && sets[nextIndex].complete) {
      nextIndex++;
    }
    setCurrentSetIndex(nextIndex);
    // Update set values
    set.actualWeight = currentSetWeight;
    set.actualReps = currentSetReps;
    set.actualSeconds = seconds;
    set.actualMinutes = minutes;
    set.totalSeconds = totalSeconds - countdown;
    set.complete = true;
    set.completedDate = new Date();
    set.name = setName;

    currentExercise.sets = [
      ...sets.slice(0, setIndex),
      set,
      ...sets.slice(setIndex + 1),
    ];

    currentExercise.complete = sets.every((s) => s.complete);
    if (currentExercise.complete) {
      currentExercise.date = formattedDate;
      currentExercise.userId = session?.token.user._id;
      currentExercise.routineName = routineName;
      currentExercise.completedDate = new Date();

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
    saveExercise(currentExercise);
  };

  return (
    <Paper
      key={setIndex}
      sx={{
        p: 2,
        m: 2,
        borderRadius: 2,
        boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
        transition: "box-shadow 0.5s ease",
        backgroundColor: darkMode ? "grey.900" : "white",
      }}
    >
      {/* Set Name and Timer Controls */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <TextField
          value={setName}
          onChange={(e) => setSetName(e.target.value)}
          variant="outlined"
          fullWidth
          size="small"
          label="Set Name"
          sx={{
            backgroundColor: darkMode ? "grey.800" : "inherit",
            "& input": { color: darkMode ? "white" : "inherit" },
          }}
        />
        {currentExercise.type === "timed" &&
          (timerActive ? (
            <Button
              variant="text"
              color="secondary"
              onClick={handlePauseTimer}
              sx={{ ml: 1 }}
            >
              <PauseIcon />
            </Button>
          ) : (
            <Button
              disabled={
                currentExercise.type === "timed" &&
                seconds === 0 &&
                minutes === 0 &&
                hours === 0
              }
              variant="text"
              color="primary"
              onClick={handleStartTimer}
              sx={{ ml: 1 }}
            >
              <PlayArrowIcon />
            </Button>
          ))}
        <Button
          disabled={
            (!timerActive && currentExercise.type === "timed") ||
            (currentExercise.type === "timed" && initialTimerActive) ||
            (currentExercise.type === "timed" &&
              seconds === 0 &&
              minutes === 0 &&
              hours === 0) ||
            (currentExercise.type === "weight" && !currentSetReps) ||
            (currentExercise.type === "weight" && !currentSetWeight)
          }
          variant="contained"
          color="success"
          size="small"
          onClick={handleLogSet}
          sx={{ ml: 1 }}
        >
          {timerActive && currentExercise.type === "timed"
            ? "Complete Set"
            : currentExercise.type === "weight"
            ? "Log Set"
            : "Complete Set"}
        </Button>
      </Box>

      {/* Weight-Based Exercises */}
      {currentExercise.type === "weight" && (
        <>
          {/* Recommended Section for Barbell Exercises */}
          <Paper
            variant="outlined"
            sx={{
              p: 1,
              mb: 1,
              backgroundColor: darkMode ? "grey.800" : "grey.100",
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: "bold", mb: 0.5, display: "block" }}
            >
              Recommended
            </Typography>
            <Typography variant="body2">
              {roundToNearestFive(set.weight)} lbs | {reps} reps
            </Typography>
            <Typography>
              {calculateWeights(roundToNearestFive(set.weight))}
            </Typography>
          </Paper>

          <Divider sx={{ mb: 1 }} />

          {/* User Input Section */}
          <Box sx={{ mb: 1 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: "bold", mb: 0.5, display: "block" }}
            >
              Your Input
            </Typography>
            <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
              <TextField
                inputRef={weightInputRef}
                type="number"
                value={currentSetWeight}
                onChange={(e) => {
                  const newValue = parseFloat(e.target.value);
                  setCurrentSetWeight(
                    isNaN(newValue) ? "" : newValue.toString()
                  );
                }}
                onFocus={() => setCurrentSetIndex(setIndex)}
                variant="outlined"
                size="small"
                fullWidth
                label="Weight"
                autoFocus
                sx={{
                  backgroundColor: darkMode ? "grey.800" : "inherit",
                  "& input": { color: darkMode ? "white" : "inherit" },
                }}
              />
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  pl: 1,
                  border: "1px solid",
                  borderColor: darkMode ? "grey.700" : "grey.400",
                  borderRadius: 1,
                  minWidth: 80,
                  p: 0.5,
                }}
              >
                <Typography variant="button">lbs</Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                inputRef={repsInputRef}
                type="number"
                value={currentSetReps}
                onChange={(e) => setCurrentSetReps(e.target.value)}
                onFocus={() => setCurrentSetIndex(setIndex)}
                variant="outlined"
                size="small"
                fullWidth
                label="Reps"
                sx={{
                  backgroundColor: darkMode ? "grey.800" : "inherit",
                  "& input": { color: darkMode ? "white" : "inherit" },
                }}
              />
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  pl: 1,
                  border: "1px solid",
                  borderColor: darkMode ? "grey.700" : "grey.400",
                  borderRadius: 1,
                  minWidth: 80,
                  p: 0.5,
                }}
              >
                <Typography variant="button">reps</Typography>
              </Box>
            </Box>
          </Box>
        </>
      )}

      {/* Timed Exercises */}
      {currentExercise.type === "timed" &&
        (!timerActive ? (
          <TimerInput
            hours={hours}
            setHours={setHours}
            minutes={minutes}
            setMinutes={setMinutes}
            seconds={seconds}
            setSeconds={setSeconds}
            handleBlur={handleBlur}
            handleInputChange={handleInputChange}
            darkMode={darkMode}
          />
        ) : (
          <Typography variant="h6" sx={{ fontWeight: "bold", m: 1 }}>
            {formatTime(countdown)}
          </Typography>
        ))}

      <Divider sx={{ my: 2 }} />

      {/* Removed Action Buttons for Active Workout Tracking */}
    </Paper>
  );
};

export default SelectedSetItem;
