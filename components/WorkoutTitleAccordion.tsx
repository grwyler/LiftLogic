import React from "react";
import { Typography, Box, Button, TextField, Chip, Paper, Stack, IconButton } from "@mui/material";
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
  function capitalizeFirstLetter(str = "") {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  const currentDay = "tuesday";
  const capitalizedDay = capitalizeFirstLetter(currentDay);
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
          ? "rgba(255,255,255,0.03)"
          : "rgba(255,255,255,0.56)",
        color: "text.primary",
      }}
    >
      <Box
        sx={{
          p: { xs: 2, sm: 2.5 },
          display: "flex",
          flexDirection: "column",
          gap: 2,
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
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 999,
                  backgroundColor: darkMode
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(255,255,255,0.84)",
                },
              }}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              <Button
                variant="contained"
                color="success"
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
                {isCreateTitle ? "Create Workout" : "Save Name"}
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
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                <Box>
                  <Typography
                    variant="overline"
                    sx={{ color: "text.secondary", letterSpacing: "0.12em" }}
                  >
                    Current Workout
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontFamily: '"Manrope", sans-serif',
                      lineHeight: 1.1,
                    }}
                  >
                    {workoutTitle}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Chip
                  size="small"
                  label={`${workouts.length} workout${workouts.length === 1 ? "" : "s"}`}
                  sx={{
                    borderRadius: 999,
                    backgroundColor: darkMode
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(59,130,246,0.08)",
                    color: "text.secondary",
                  }}
                />
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
              </Box>
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

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              <Button
                onClick={handleAddWorkout}
                variant="contained"
                fullWidth
                startIcon={<AddIcon />}
                sx={{
                  py: 1.15,
                  background:
                    "linear-gradient(135deg, rgba(37,99,235,1) 0%, rgba(14,165,233,1) 100%)",
                  color: "#eff6ff",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, rgba(29,78,216,1) 0%, rgba(2,132,199,1) 100%)",
                  },
                }}
              >
                New Workout
              </Button>

              <Button
                variant="outlined"
                fullWidth
                startIcon={<RepeatIcon />}
                title={`Adds an Exercise that repeats every ${capitalizedDay}`}
                onClick={() => {
                  setIsPersistent(true);
                  setIsAddingExercise(true);
                }}
                sx={{ py: 1.1 }}
              >
                Add Recurring Exercise
              </Button>
            </Stack>
          </>
        )}
      </Box>
    </Paper>
  );
};

export default WorkoutTitleAccordion;
