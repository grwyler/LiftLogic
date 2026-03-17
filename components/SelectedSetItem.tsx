import React, { useEffect, useRef, useState } from "react";
import {
  calculateWeights,
  formatTime,
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
import { toast } from "react-toastify";
import { emitDevBugInteraction } from "../utils/devBugRecorder";
import {
  validateTimedSetInput,
  validateWeightSetInput,
  WORKOUT_VALUE_LIMITS,
} from "../utils/workoutValidation";
import {
  formatWeight,
  formatWeightValue,
  getDisplayWeightFromSet,
  getWeightInputConfig,
  normalizeWeightUnit,
  roundToWeightIncrement,
} from "../utils/weightUnits";

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
  exercises,
  setExercises,
  darkMode,
  onStartRestTimer,
  setRefetchExercises,
  refreshCalendarStatuses,
  isRestTimerBlocking,
  preferredUnits = "lb",
  onLogSetAttempt,
  onLogSetPersisted,
  onLogSetFailed,
}) => {
  const weightUnit = normalizeWeightUnit(preferredUnits);
  const weightInputConfig = getWeightInputConfig(weightUnit);
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
  // The planning view rounds to the user's active unit increment so the
  // initial value matches the labels shown elsewhere in the workout flow.
  const initialDisplayWeight =
    getDisplayWeightFromSet(set, "actual", weightUnit) ??
    getDisplayWeightFromSet(set, "planned", weightUnit) ??
    (typeof weight === "number" && weight > 0
      ? roundToWeightIncrement(weight, weightUnit)
      : null);
  const initialWeightValue =
    initialDisplayWeight == null ? "" : formatWeightValue(initialDisplayWeight);

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
  const currentUserId =
    (session as any)?.token?.user?._id ?? (session as any)?.user?._id;
  const [timerActive, setTimerActive] = useState(false);
  const [initialTimerActive, setInitialTimerActive] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(
    hours * 3600 + minutes * 60 + seconds
  );
  const [liveAdjustment, setLiveAdjustment] = useState<any>(null);
  const [shouldAutoFocusInput, setShouldAutoFocusInput] = useState(false);
  const [loggingSet, setLoggingSet] = useState(false);
  const [logSetError, setLogSetError] = useState<string | null>(null);
  const weightValidationErrors =
    currentExercise.type === "weight"
      ? validateWeightSetInput({
          weight: currentSetWeight,
          reps: currentSetReps,
          unit: weightUnit,
          prefix: "Logged set",
        })
      : [];
  const timedValidationErrors =
    currentExercise.type === "timed"
      ? validateTimedSetInput({
          hours,
          minutes,
          seconds,
          prefix: "Logged set",
        })
      : [];
  const activeValidationMessage =
    weightValidationErrors[0] ?? timedValidationErrors[0] ?? null;

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
    const displayWeight =
      getDisplayWeightFromSet(set, "actual", weightUnit) ??
      getDisplayWeightFromSet(set, "planned", weightUnit) ??
      (typeof weight === "number" && weight > 0
        ? roundToWeightIncrement(weight, weightUnit)
        : null);
    const nextWeightValue =
      displayWeight == null ? "" : formatWeightValue(displayWeight);

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
    weightUnit,
  ]);

  const handleInputChange = (
    value: any,
    setValue: (v: any) => void,
    key?: "hours" | "minutes" | "seconds"
  ) => {
    const normalizedValue = String(value ?? "").trim();
    const parsedValue = Math.max(0, parseInt(normalizedValue, 10) || 0);
    setValue(parsedValue);

    if (key === "hours") {
      setHours(parsedValue);
    }
    if (key === "minutes") {
      setMinutes(parsedValue);
    }
    if (key === "seconds") {
      setSeconds(parsedValue);
    }
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
      const newHours = Math.floor(countdown / 3600);
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

  const handleLogSet = async () => {
    if (loggingSet) {
      return;
    }

    if (activeValidationMessage) {
      setLogSetError(activeValidationMessage);
      toast.error(activeValidationMessage);
      return;
    }

    const completedBefore =
      sets.filter((existingSet) => existingSet.complete).length ?? 0;
    const expectedCompletedCount = Math.min(completedBefore + 1, sets.length);

    onLogSetAttempt?.({
      setName,
      expectedCompletedCount,
    });
    emitDevBugInteraction({
      type: "click",
      kind: "semantic",
      label: `Log set "${setName}" for ${currentExercise.name}`,
      expected:
        currentExercise.type === "weight"
          ? `Set count increases to ${expectedCompletedCount}/${sets.length}.`
          : "Timed set completes and moves to the next step.",
      actual:
        currentExercise.type === "weight"
          ? `Submitting ${currentSetWeight || "?"} ${weightUnit} for ${
              currentSetReps || "?"
            } reps.`
          : `Submitting ${hours}h ${minutes}m ${seconds}s.`,
      status: "info",
    });

    /* ------------------------------------------------------------------ */
    /* 1. Build an immutable copy of the updated set array                */
    /* ------------------------------------------------------------------ */
    const updatedSets = sets.map((s, i) => {
      const loggedTotalSeconds =
        currentExercise.type === "timed"
          ? hours * 3600 + minutes * 60 + seconds
          : totalSeconds - countdown;

      if (i !== setIndex) {
        return s;
      }

      return {
        ...s,
        name: setName,
        ...(currentExercise.type === "weight"
          ? {
              actualWeight: currentSetWeight,
              actualWeightUnit: weightUnit,
              actualReps: currentSetReps,
            }
          : {
              actualWeight: undefined,
              actualReps: undefined,
            }),
        actualSeconds: seconds,
        actualMinutes: minutes,
        actualHours: hours,
        totalSeconds: loggedTotalSeconds,
        complete: true,
        completedDate: new Date(),
      };
    });

    const adjustedResult =
      currentExercise.type === "weight"
        ? adjustRemainingSetsAfterLoggedSet(
            updatedSets,
            setIndex,
            progressionStyle
          )
        : { sets: updatedSets, adjustment: null };
    const adjustedSets = adjustedResult.sets;

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
        userId: currentUserId,
        routineName,
        completedDate: new Date(),
      }),
    };

    /* ------------------------------------------------------------------ */
    /* 4. Splice the exercise back into the workout array                 */
    /* ------------------------------------------------------------------ */
    const updatedExercises = [...(Array.isArray(exercises) ? exercises : [])];
    updatedExercises[currentExerciseIndex] = updatedExercise;
    const previousExercise = currentExercise;
    const previousExercises = [...(Array.isArray(exercises) ? exercises : [])];
    const nextExerciseIndexAfterLog = exerciseComplete
      ? updatedExercises.findIndex(
          (ex, i) => i > currentExerciseIndex && !ex.complete
        )
      : -1;
    const nextSetIndexAfterLog =
      nextSetIndex === -1 ? adjustedSets.length : nextSetIndex;

    /* ------------------------------------------------------------------ */
    /* 5. Advance local workout state before persistence completes        */
    /* ------------------------------------------------------------------ */
    try {
      setLoggingSet(true);
      setLogSetError(null);
      setLiveAdjustment(adjustedResult.adjustment);
      setCurrentExercise(updatedExercise);
      setExercises?.(updatedExercises);

      if (exerciseComplete) {
        if (nextExerciseIndexAfterLog !== -1) {
          setCurrentExerciseIndex(nextExerciseIndexAfterLog);

          const firstOpenSet = updatedExercises[nextExerciseIndexAfterLog].sets.findIndex(
            (s) => !s.complete
          );
          setCurrentSetIndex(firstOpenSet === -1 ? 0 : firstOpenSet);
        } else {
          workout.complete = true; // whole routine finished
          setCurrentSetIndex(adjustedSets.length);
        }
      } else {
        setCurrentSetIndex(nextSetIndexAfterLog);
      }

      if (!currentUserId) {
        throw new Error("Missing userId while logging set");
      }

      await saveWorkoutEntry({
        // WorkoutEntryDoc shape
        _id: updatedExercise._id,
        weightUnit:
          updatedExercise.weightUnit ??
          updatedExercise.sets?.find((exerciseSet) => exerciseSet?.weightUnit)?.weightUnit ??
          weightUnit,
        entryInstanceId:
          updatedExercise.entryInstanceId ??
          updatedExercise._id?.toString?.() ??
          updatedExercise._id,
        userId: currentUserId,
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

      if (exerciseComplete) {
        onStartRestTimer?.(0);
      } else {
        if (nextSetIndex !== -1) {
          onStartRestTimer?.(currentExercise.rest ?? 0);
        }
      }

      refreshCalendarStatuses?.();
      onLogSetPersisted?.();
    } catch (error) {
      console.error("Failed to log set", error);
      workout.complete = false;
      setLiveAdjustment(null);
      setCurrentExercise(previousExercise);
      setExercises?.(previousExercises);
      setCurrentExerciseIndex(currentExerciseIndex);
      setCurrentSetIndex(setIndex);
      setLogSetError("This set was not saved. Check your connection and try again.");
      onLogSetFailed?.(
        error instanceof Error ? error.message : "The set did not save."
      );
      toast.error("This set was not saved. Check your connection and try again.");
    } finally {
      setLoggingSet(false);
    }
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
          alignItems: { xs: "stretch", sm: "center" },
          flexDirection: { xs: "column", sm: "row" },
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
              loggingSet ||
              (!timerActive && currentExercise.type === "timed") ||
              (currentExercise.type === "timed" && initialTimerActive) ||
              Boolean(activeValidationMessage) ||
              (currentExercise.type === "weight" && isRestTimerBlocking) ||
              (currentExercise.type === "weight" && !currentSetReps) ||
              (currentExercise.type === "weight" && !currentSetWeight)
            }
            variant="contained"
            color="success"
            size="small"
            onClick={handleLogSet}
            sx={{
              minHeight: 52,
              minWidth: { xs: "100%", sm: 168 },
              borderRadius: 12,
              px: 2.25,
              fontWeight: 800,
              backgroundColor: darkMode ? "#e5e7eb" : "#111827",
              color: darkMode ? "#111827" : "#f9fafb",
              boxShadow: darkMode
                ? "0 18px 34px rgba(148,163,184,0.16)"
                : "0 16px 32px rgba(17,24,39,0.16)",
              "&:hover": {
                backgroundColor: darkMode ? "#f3f4f6" : "#000000",
              },
            }}
          >
            {loggingSet
              ? "Saving..."
              : timerActive && currentExercise.type === "timed"
              ? "Complete Set"
              : logSetError
              ? "Retry Log Set"
              : currentExercise.type === "weight"
              ? "Log Set"
              : "Complete Set"}
          </Button>
        </Box>
      </Box>

      {logSetError ? (
        <Typography
          sx={{
            mb: 1.25,
            color: darkMode ? "#fca5a5" : "#b91c1c",
            fontWeight: 600,
          }}
        >
          {logSetError}
        </Typography>
      ) : null}

      {currentExercise.type === "weight" && isRestTimerBlocking ? (
        <Typography sx={{ mb: 1.25, color: "text.secondary" }}>
          Rest timer is active. Let it finish, pause it, or skip it before
          logging the next set.
        </Typography>
      ) : null}

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
              <Chip label={formatWeight(getDisplayWeightFromSet(set, "planned", weightUnit), weightUnit)} variant="outlined" />
              <Chip label={`${reps} reps`} variant="outlined" />
            </Box>
            <Typography sx={{ mt: 1, color: "text.secondary" }}>
              {calculateWeights(
                getDisplayWeightFromSet(set, "planned", weightUnit),
                weightUnit
              )}
            </Typography>
            {(set as any).adjustmentReason && (
              <Typography sx={{ mt: 0.75, color: "text.secondary" }}>
                Live adjustment: {(set as any).adjustmentReason}
              </Typography>
            )}
            {liveAdjustment && (
              <Typography sx={{ mt: 0.75, color: "text.secondary" }}>
                Next sets updated to {formatWeight(liveAdjustment.weight, weightUnit)} x {liveAdjustment.reps}.
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
                error={weightValidationErrors.some((message) =>
                  message.toLowerCase().includes("weight")
                )}
                helperText={
                  weightValidationErrors.find((message) =>
                    message.toLowerCase().includes("weight")
                  ) ??
                  (currentSetWeight
                    ? `Use ${formatWeightValue(weightInputConfig.step)} ${weightUnit} increments, ${formatWeightValue(weightInputConfig.min)}-${formatWeightValue(weightInputConfig.max)} ${weightUnit}.`
                    : `Start with the empty bar or a light warm-up load, then pick a weight that leaves about 2-3 reps in reserve.`)
                }
                inputProps={{
                  min: weightInputConfig.min,
                  max: weightInputConfig.max,
                  step: weightInputConfig.step,
                }}
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
                <Typography variant="button">{weightUnit}</Typography>
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
                error={weightValidationErrors.some((message) =>
                  message.toLowerCase().includes("reps")
                )}
                helperText={
                  weightValidationErrors.find((message) =>
                    message.toLowerCase().includes("reps")
                  ) ??
                  `Whole reps only, ${WORKOUT_VALUE_LIMITS.reps.min}-${WORKOUT_VALUE_LIMITS.reps.max}.`
                }
                inputProps={{
                  min: WORKOUT_VALUE_LIMITS.reps.min,
                  max: WORKOUT_VALUE_LIMITS.reps.max,
                  step: 1,
                }}
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
                disabled={Boolean(timedValidationErrors[0])}
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
            <Typography
              sx={{
                mt: 1,
                color: timedValidationErrors[0] ? "error.main" : "text.secondary",
              }}
            >
              {timedValidationErrors[0] ??
                `Use ${WORKOUT_VALUE_LIMITS.hours.min}-${WORKOUT_VALUE_LIMITS.hours.max}h, ${WORKOUT_VALUE_LIMITS.minutes.min}-${WORKOUT_VALUE_LIMITS.minutes.max}m, and ${WORKOUT_VALUE_LIMITS.seconds.min}-${WORKOUT_VALUE_LIMITS.seconds.max}s. Total duration must be at least ${WORKOUT_VALUE_LIMITS.totalSeconds.min} second.`}
            </Typography>
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
