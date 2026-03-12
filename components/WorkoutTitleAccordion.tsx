import React from "react";
import {
  Typography,
  Box,
  Button,
  TextField,
  Paper,
  Stack,
  IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import RepeatIcon from "@mui/icons-material/Repeat";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import WorkoutDropdown from "./WorkoutsDropdown";

const WorkoutTitleAccordion = ({
  workoutTitle,
  workouts,
  selectedWorkoutIndex,
  isEditTitle,
  isCreateTitle,
  darkMode,
  handleEditClick,
  handleDeleteWorkout,
  handleCurrentWorkoutChange,
  handleAddWorkout,
  setIsAddingExercise,
  handleCreateWorkout,
  handleSaveTitleEdit,
  handleCancelEditTitle,
  setWorkoutTitle,
  setIsPersistent,
}) => {
  const isLastWorkout = workouts.length === 1;
  const currentWorkout = workouts[selectedWorkoutIndex];

  return (
    <Paper
      elevation={0}
      sx={{
        mb: 2,
        borderRadius: 4,
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
        backgroundColor: darkMode
          ? "rgba(12,18,30,0.76)"
          : "rgba(255,255,255,0.88)",
      }}
    >
      <Box
        sx={{
          p: { xs: 1.75, sm: 2 },
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
        }}
      >
        {isEditTitle || isCreateTitle ? (
          <>
            <TextField
              value={workoutTitle}
              autoFocus
              onChange={(e) => setWorkoutTitle(e.target.value)}
              placeholder="Workout name"
              fullWidth
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                variant="contained"
                onClick={
                  isCreateTitle ? handleCreateWorkout : handleSaveTitleEdit
                }
                disabled={
                  !workoutTitle ||
                  workoutTitle === currentWorkout.title ||
                  workouts.some((w) => w.title === workoutTitle)
                }
                startIcon={<SaveIcon />}
              >
                {isCreateTitle ? "Create workout" : "Save name"}
              </Button>

              <Button
                variant="outlined"
                onClick={handleCancelEditTitle}
                disabled={isLastWorkout && !workoutTitle}
                startIcon={<CloseIcon />}
              >
                Cancel
              </Button>
            </Stack>
          </>
        ) : (
          <>
            <Box
              sx={{
                display: "flex",
                alignItems: { xs: "flex-start", sm: "center" },
                justifyContent: "space-between",
                gap: 1.25,
              }}
            >
              <Box>
                <Typography
                  variant="overline"
                  sx={{ color: "text.secondary", letterSpacing: "0.14em" }}
                >
                  Workout
                </Typography>
                <Typography variant="h5">{workoutTitle}</Typography>
              </Box>

              <Stack direction="row" spacing={0.75}>
                <IconButton
                  size="small"
                  onClick={handleEditClick}
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    backgroundColor: "background.paper",
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                {!isLastWorkout && (
                  <IconButton
                    size="small"
                    onClick={handleDeleteWorkout}
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      backgroundColor: "background.paper",
                      color: "error.main",
                    }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                )}
              </Stack>
            </Box>

            {workouts.length > 1 && (
              <Box>
                <WorkoutDropdown
                  workouts={workouts}
                  darkMode={darkMode}
                  handleCurrentWorkoutChange={handleCurrentWorkoutChange}
                />
              </Box>
            )}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                onClick={handleAddWorkout}
                variant="contained"
                fullWidth
                startIcon={<AddIcon />}
              >
                New workout
              </Button>

              <Button
                variant="outlined"
                fullWidth
                startIcon={<RepeatIcon />}
                onClick={() => {
                  setIsPersistent(true);
                  setIsAddingExercise(true);
                }}
              >
                Add recurring exercise
              </Button>
            </Stack>
          </>
        )}
      </Box>
    </Paper>
  );
};

export default WorkoutTitleAccordion;
