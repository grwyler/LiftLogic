import React, { useEffect, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
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
          pt: 0.5,
          pb: 1.5,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography variant="h6">{routineName}</Typography>
          <Typography sx={{ color: "text.secondary" }}>
            {exercises.length} exercise{exercises.length === 1 ? "" : "s"} scheduled
          </Typography>
        </Box>
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
            px: 2.5,
            py: 1.1,
            backgroundColor: darkMode ? "rgba(255,255,255,0.08)" : "#1f2937",
            color: darkMode ? "white" : "#f9fafb",
            "&:hover": {
              backgroundColor: darkMode ? "rgba(255,255,255,0.14)" : "#111827",
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
