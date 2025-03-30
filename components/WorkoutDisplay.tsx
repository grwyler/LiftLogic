import React, { useEffect, useState } from "react";
import { Box, Button } from "@mui/material";
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
          variant="outlined"
          size="small"
          title="Adds an exercise only to the currently selected day"
          onClick={() => {
            setIsPersistent(false);
            setIsAddingExercise(true);
          }}
          startIcon={<AddIcon />}
          sx={{
            color: darkMode ? "white" : "black",
            borderColor: darkMode ? "grey.700" : "grey.300",
            backgroundColor: darkMode ? "grey.800" : "white",
            "&:hover": {
              backgroundColor: darkMode ? "grey.700" : "grey.100",
            },
          }}
        >
          Add Exercise to Today
        </Button>
      </Box>
    </Box>
  );
};

export default WorkoutDisplay;
