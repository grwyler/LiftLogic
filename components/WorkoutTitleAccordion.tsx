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
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";

const getDisplayWorkoutTitle = (workoutTitle?: string) => {
  if (!workoutTitle) {
    return "Workout";
  }

  if (/^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s+workout$/i.test(workoutTitle)) {
    return "Workout";
  }

  return workoutTitle;
};

const WorkoutTitleAccordion = ({
  workoutTitle,
  currentWorkout,
  isEditTitle,
  darkMode,
  handleEditClick,
  handleSaveTitleEdit,
  handleCancelEditTitle,
  setWorkoutTitle,
}) => {
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
          gap: 1.25,
        }}
      >
        {isEditTitle ? (
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
                onClick={handleSaveTitleEdit}
                disabled={!workoutTitle?.trim()}
                startIcon={<SaveIcon />}
              >
                Save name
              </Button>

              <Button
                variant="outlined"
                onClick={handleCancelEditTitle}
                startIcon={<CloseIcon />}
              >
                Cancel
              </Button>
            </Stack>
          </>
        ) : (
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
              <Typography variant="h5">
                {getDisplayWorkoutTitle(currentWorkout?.title)}
              </Typography>
              <Typography sx={{ mt: 0.5, color: "text.secondary" }}>
                One workout flow for this day. Add exercises below and log them
                in order.
              </Typography>
            </Box>

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
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default WorkoutTitleAccordion;
