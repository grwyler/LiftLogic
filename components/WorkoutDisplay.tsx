import React, { useEffect, useState } from "react";
import { Box, Button, Typography, Chip } from "@mui/material";
import ExerciseItem from "./ExerciseItem";
import AddIcon from "@mui/icons-material/Add";

const WorkoutDisplay = ({
  exercises,
  currentWorkout,
  currentExerciseIndex,
  setCurrentExerciseIndex,
  formattedDate,
  routineName,
  setIsAddingExercise,
  darkMode,
  setIsPersistent,
  setRefetchExercises,
}) => {
  const [shownMenuIndex, setShownMenuIndex] = useState(-1);
  const loggedSetCount = exercises.reduce(
    (total, exercise) =>
      total + (exercise.sets?.filter((set) => set.complete).length ?? 0),
    0
  );

  useEffect(() => {
    if (exercises.length === 1) {
      setCurrentExerciseIndex(0);
    }
  }, [exercises, setCurrentExerciseIndex]);

  return (
    <Box>
      <Box
        sx={{
          px: 0.5,
          pt: 0.25,
          pb: 1.25,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontFamily: '"Manrope", sans-serif',
              letterSpacing: "-0.03em",
            }}
          >
            {routineName}
          </Typography>
          <Typography sx={{ color: "text.secondary" }}>
            {exercises.length} exercise{exercises.length === 1 ? "" : "s"} on deck
          </Typography>
        </Box>
        <Chip
          size="small"
          label={
            loggedSetCount > 0
              ? `${loggedSetCount} set${loggedSetCount === 1 ? "" : "s"} logged`
              : "Ready to train"
          }
          variant="outlined"
          sx={{
            backgroundColor: darkMode
              ? "rgba(255,255,255,0.03)"
              : "rgba(255,255,255,0.7)",
            borderColor: darkMode
              ? "rgba(148,163,184,0.14)"
              : "rgba(17,24,39,0.08)",
            color: "text.secondary",
          }}
        />
      </Box>
      {exercises.map((e, exerciseIndex) => (
        <ExerciseItem
          setRefetchExercises={setRefetchExercises}
          key={`exercise-item-${exerciseIndex}`}
          exercise={e}
          exerciseIndex={exerciseIndex}
          workout={currentWorkout}
          currentExerciseIndex={currentExerciseIndex}
          setCurrentExerciseIndex={setCurrentExerciseIndex}
          formattedDate={formattedDate}
          routineName={routineName}
          shownMenuIndex={shownMenuIndex}
          setShownMenuIndex={setShownMenuIndex}
          darkMode={darkMode}
        />
      ))}
      <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
        <Button
          variant="contained"
          title="Adds an exercise only to the currently selected day"
          onClick={() => {
            setIsPersistent(false);
            setIsAddingExercise(true);
          }}
          startIcon={<AddIcon />}
          sx={{
            px: 3,
            py: 1.1,
            borderRadius: 10,
            backgroundColor: darkMode ? "rgba(255,255,255,0.08)" : "#111827",
            color: darkMode ? "#f3f4f6" : "#f8fafc",
            "&:hover": {
              backgroundColor: darkMode ? "rgba(255,255,255,0.14)" : "#000000",
            },
          }}
        >
          Add Exercise
        </Button>
      </Box>
    </Box>
  );
};

export default WorkoutDisplay;
