import React, { useEffect, useRef, useState } from "react";
import {
  calculateWeights,
  formatTime,
  roundToNearestFive,
  saveWorkoutEntry,
} from "../utils/helpers";
import { adjustRemainingSetsAfterLoggedSet } from "../utils/progression";
import {
  Box,
  Divider,
  Paper,
  TextField,
  Typography,
  Button,
  Chip,
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
  progressionStyle,
  setIndex,
  currentExerciseIndex,
  setCurrentSetIndex,
  setCurrentExercise,
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
  const [liveAdjustment, setLiveAdjustment] = useState<any>(null);
  const [shouldAutoFocusInput, setShouldAutoFocusInput] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 900px) and (pointer: fine)");
    const syncAutoFocus = () => setShouldAutoFocusInput(mediaQuery.matches);

    syncAutoFocus();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncAutoFocus);
      return () => mediaQuery.removeEventListener("change", syncAutoFocus);
    }

    mediaQuery.addListener(syncAutoFocus);
    return () => mediaQuery.removeListener(syncAutoFocus);
  }, []);

  useEffect(() => {
    const nextWeightValue =
      actualWeight || roundToNearestFive(weight || DEFAULT_MAX_WEIGHT).toString();

    setSetName(name);
    setCurrentSetWeight(nextWeightValue);
    setCurrentSetReps(actualReps || reps);
    setHours(
      actualHours === "" ? parseInt(set.hours) || 0 : parseInt(actualHours) || 0
    );
    setMinutes(
      actualMinutes === ""
        ? parseInt(set.minutes) || 0
        : parseInt(actualMinutes) || 0
    );
    setSeconds(
      actualSeconds === ""
        ? parseInt(set.seconds) || 0
        : parseInt(actualSeconds) || 0
    );
  }, [
    actualHours,
    actualMinutes,
    actualReps,
    actualSeconds,
    actualWeight,
    name,
    reps,
    set.hours,
    set.minutes,
    set.seconds,
    weight,
  ]);

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
    /* ------------------------------------------------------------------ */
    /* 1. Build an immutable copy of the updated set array                */
    /* ------------------------------------------------------------------ */
    const updatedSets = sets.map((s, i) =>
      i === setIndex
        ? {
            ...s,
            name: setName,
            actualWeight: currentSetWeight,
            actualReps: currentSetReps,
            actualSeconds: seconds,
            actualMinutes: minutes,
            totalSeconds: totalSeconds - countdown,
            complete: true,
            completedDate: new Date(),
          }
        : s
    );

    const adjustedResult =
      currentExercise.type === "weight"
        ? adjustRemainingSetsAfterLoggedSet(
            updatedSets,
            setIndex,
            progressionStyle
          )
        : { sets: updatedSets, adjustment: null };
    const adjustedSets = adjustedResult.sets;
    setLiveAdjustment(adjustedResult.adjustment);

    /* ------------------------------------------------------------------ */
    /* 2. Advance to next incomplete set (or stay at end if none)         */
    /* ------------------------------------------------------------------ */
    const nextSetIndex = adjustedSets.findIndex(
      (s, i) => i > setIndex && !s.complete
    );
    setCurrentSetIndex(nextSetIndex === -1 ? adjustedSets.length : nextSetIndex);

    /* ------------------------------------------------------------------ */
    /* 3. Update the current exercise object                              */
    /* ------------------------------------------------------------------ */
    const exerciseComplete = adjustedSets.every((s) => s.complete);

    const updatedExercise = {
      ...currentExercise,
      sets: adjustedSets,
      complete: exerciseComplete,
      ...(exerciseComplete && {
        date: formattedDate,
        userId: session?.token.user._id,
        routineName,
        completedDate: new Date(),
      }),
    };
    setCurrentExercise(updatedExercise);

    /* ------------------------------------------------------------------ */
    /* 4. Splice the exercise back into the workout array                 */
    /* ------------------------------------------------------------------ */
    const updatedExercises = [...workout.exercises];
    updatedExercises[currentExerciseIndex] = updatedExercise;

    /* ------------------------------------------------------------------ */
    /* 5. If the exercise is done, jump to the next incomplete exercise   */
    /* ------------------------------------------------------------------ */
    if (exerciseComplete) {
      const nextExerciseIndex = updatedExercises.findIndex(
        (ex, i) => i > currentExerciseIndex && !ex.complete
      );

      if (nextExerciseIndex !== -1) {
        setCurrentExerciseIndex(nextExerciseIndex);

        const firstOpenSet = updatedExercises[nextExerciseIndex].sets.findIndex(
          (s) => !s.complete
        );
        setCurrentSetIndex(firstOpenSet === -1 ? 0 : firstOpenSet);
      } else {
        workout.complete = true; // whole routine finished
      }
    }

    /* ------------------------------------------------------------------ */
    /* 6. Persist to the DB                                               */
    /* ------------------------------------------------------------------ */
    saveWorkoutEntry({
      // WorkoutEntryDoc shape
      userId: session?.token.user._id,
      exerciseId: updatedExercise.exerciseId ?? updatedExercise._id,
      name: updatedExercise.name,
      type: updatedExercise.type,
      max: updatedExercise.max,
      routineName,
      date: formattedDate,
      rest: updatedExercise.rest,
      complete: updatedExercise.complete,
      sets: updatedExercise.sets,
      ruleId: updatedExercise.ruleId,
    });
  };

  return (
    <Paper
      key={setIndex}
      sx={{
        p: { xs: 1.5, sm: 1.75 },
        m: 2,
        borderRadius: 3,
        border: "1px solid",
        borderColor: darkMode ? "rgba(148,163,184,0.14)" : "rgba(17,24,39,0.08)",
        boxShadow: darkMode
          ? "0 12px 28px rgba(0,0,0,0.14)"
          : "0 12px 28px rgba(17,24,39,0.06)",
        transition: "box-shadow 0.5s ease",
        backgroundColor: darkMode ? "rgba(17,24,39,0.92)" : "rgba(255,255,255,0.98)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 1,
          flexWrap: "wrap",
          mb: 1.5,
        }}
      >
        <Box>
          <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.12em" }}>
            Active Set
          </Typography>
          <Typography variant="h6" sx={{ lineHeight: 1.1 }}>
            {setName}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 0.75, alignItems: "center", flexWrap: "wrap" }}>
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
            sx={{
              borderRadius: 10,
              px: 1.75,
              backgroundColor: darkMode ? "#e5e7eb" : "#111827",
              color: darkMode ? "#111827" : "#f9fafb",
              "&:hover": {
                backgroundColor: darkMode ? "#f3f4f6" : "#000000",
              },
            }}
          >
            {timerActive && currentExercise.type === "timed"
              ? "Complete Set"
              : currentExercise.type === "weight"
              ? "Log Set"
              : "Complete Set"}
          </Button>
        </Box>
      </Box>

      {/* Weight-Based Exercises */}
      {currentExercise.type === "weight" && (
        <>
          <Paper
            variant="outlined"
            sx={{
              p: 1.25,
              mb: 1.25,
              borderRadius: 2,
              backgroundColor: darkMode ? "rgba(30,41,59,0.72)" : "rgba(249,250,251,0.92)",
              borderColor: darkMode ? "rgba(148,163,184,0.14)" : "rgba(17,24,39,0.08)",
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              Planned Target
            </Typography>
            <Box sx={{ display: "flex", gap: 0.75, mt: 0.75, flexWrap: "wrap" }}>
              <Chip label={`${roundToNearestFive(set.weight)} lbs`} variant="outlined" />
              <Chip label={`${reps} reps`} variant="outlined" />
            </Box>
            <Typography sx={{ mt: 1, color: "text.secondary" }}>
              {calculateWeights(roundToNearestFive(set.weight))}
            </Typography>
            {(set as any).adjustmentReason && (
              <Typography sx={{ mt: 0.75, color: "text.secondary" }}>
                Live adjustment: {(set as any).adjustmentReason}
              </Typography>
            )}
            {liveAdjustment && (
              <Typography sx={{ mt: 0.75, color: "text.secondary" }}>
                Next sets updated to {liveAdjustment.weight} lbs x {liveAdjustment.reps}.
              </Typography>
            )}
          </Paper>

          <Divider sx={{ mb: 1 }} />

          <Box sx={{ mb: 1 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 700, mb: 1, display: "block" }}
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
                autoFocus={shouldAutoFocusInput}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2.5,
                    backgroundColor: darkMode ? "rgba(31,41,55,0.9)" : "rgba(255,255,255,0.96)",
                  },
                  "& input": { color: darkMode ? "white" : "inherit" },
                }}
              />
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid",
                  borderColor: darkMode ? "grey.700" : "grey.400",
                  borderRadius: 2,
                  minWidth: 80,
                  px: 1.25,
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
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2.5,
                    backgroundColor: darkMode ? "rgba(31,41,55,0.9)" : "rgba(255,255,255,0.96)",
                  },
                  "& input": { color: darkMode ? "white" : "inherit" },
                }}
              />
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid",
                  borderColor: darkMode ? "grey.700" : "grey.400",
                  borderRadius: 2,
                  minWidth: 80,
                  px: 1.25,
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
          <>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                Timer Input
              </Typography>
              <Button
                disabled={seconds === 0 && minutes === 0 && hours === 0}
                variant="text"
                color="primary"
                onClick={handleStartTimer}
                startIcon={<PlayArrowIcon />}
                sx={{ minWidth: "auto" }}
              >
                Start
              </Button>
            </Box>
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
          </>
        ) : (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: "bold", m: 1 }}>
              {formatTime(countdown)}
            </Typography>
            <Button variant="text" color="secondary" onClick={handlePauseTimer} startIcon={<PauseIcon />}>
              Pause
            </Button>
          </Box>
        ))}
    </Paper>
  );
};

export default SelectedSetItem;
