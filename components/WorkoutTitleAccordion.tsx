import React from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Button,
  TextField,
  Chip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import WorkoutDropdown from "./WorkoutsDropdown";
import CRUDMenuButton from "./CRUDMenuButton";

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
  const [expanded, setExpanded] = React.useState(false);
  const [showTitleMenu, setShowTitleMenu] = React.useState(false);

  // Force the accordion open if editing or creating
  const forcedOpen = isEditTitle || isCreateTitle;

  // Helper to capitalize day or other text
  function capitalizeFirstLetter(str = "") {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // For demonstration, assume currentDay is "tuesday"
  const currentDay = "tuesday";
  const capitalizedDay = capitalizeFirstLetter(currentDay);

  const handleAccordionToggle = (event, newExpanded) => {
    // Only allow toggling if we aren't forced open
    if (!forcedOpen) {
      setShowTitleMenu(false);
      setExpanded(newExpanded);
    }
  };

  const handleUpdateWorkout = () => {
    handleEditClick();
    setShowTitleMenu(false);
  };

  const isLastWorkout = workouts.length === 1;
  const currentWorkout = workouts[selectedWorkoutIndex];

  return (
    <Accordion
      expanded={forcedOpen || expanded}
      onChange={handleAccordionToggle}
      sx={{
        mb: 2,
        borderRadius: "24px !important",
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
        backgroundColor: darkMode
          ? "rgba(255,255,255,0.03)"
          : "rgba(255,255,255,0.56)",
        color: "text.primary",
        boxShadow: "none",
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          px: { xs: 2, sm: 2.5 },
          py: 1,
          "& .MuiAccordionSummary-content": {
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
          },
        }}
      >
        {isEditTitle || isCreateTitle ? (
          <Box flex={1} display="flex" justifyContent="center">
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
          </Box>
        ) : (
          <>
            <Box onClick={(e) => e.stopPropagation()}>
              <CRUDMenuButton
                darkMode={darkMode}
                handleDelete={isLastWorkout ? undefined : handleDeleteWorkout}
                handleUpdate={handleUpdateWorkout}
                onClickMenuButton={() => setShowTitleMenu((prev) => !prev)}
                show={showTitleMenu}
              />
            </Box>
            <Typography
              variant="h6"
              component="div"
              sx={{
                flexGrow: 1,
                textAlign: "center",
                fontWeight: "bold",
                fontFamily: '"Manrope", sans-serif',
              }}
            >
              {workoutTitle}
            </Typography>
            <Chip
              size="small"
              label={`${workouts.length} routine${workouts.length === 1 ? "" : "s"}`}
              sx={{
                borderRadius: 999,
                backgroundColor: darkMode
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(184,106,31,0.08)",
                color: "text.secondary",
              }}
            />
          </>
        )}
      </AccordionSummary>

      <AccordionDetails>
        {isEditTitle || isCreateTitle ? (
          <Box display="flex" justifyContent="center" mt={1} gap={1.25} flexWrap="wrap">
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
              {isCreateTitle ? "Create" : "Save"}
            </Button>

            <Button
              variant="outlined"
              onClick={handleCancelEditTitle}
              disabled={isLastWorkout && !workoutTitle}
              startIcon={<CloseIcon />}
            >
              Cancel
            </Button>
          </Box>
        ) : (
          <Box sx={{ px: { xs: 0.5, sm: 1 }, pb: 0.5 }}>
            {/* Show the WorkoutDropdown if there's more than one workout */}
            {workouts.length > 1 && (
              <Box sx={{ textAlign: "center", mb: 2 }}>
                <WorkoutDropdown
                  workouts={workouts}
                  darkMode={darkMode}
                  handleCurrentWorkoutChange={handleCurrentWorkoutChange}
                />
              </Box>
            )}

            <Box sx={{ mb: 2 }}>
              <Button
                onClick={handleAddWorkout}
                variant="contained"
                fullWidth
                startIcon={<AddIcon />}
                sx={{
                  py: 1.15,
                  background:
                    "linear-gradient(135deg, rgba(184,106,31,1) 0%, rgba(224,155,62,1) 100%)",
                  color: "#fffaf3",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, rgba(166,92,21,1) 0%, rgba(209,142,53,1) 100%)",
                  },
                }}
              >
                Add New Workout Routine
              </Button>
            </Box>

            <Box>
              <Button
                variant="outlined"
                fullWidth
                title={`Adds an Exercise that repeats every ${capitalizedDay}`}
                startIcon={<AddIcon />}
                onClick={() => {
                  setIsPersistent(true);
                  setIsAddingExercise(true);
                }}
                sx={{ py: 1.1 }}
              >
                Add Recurring Exercise
              </Button>
            </Box>
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default WorkoutTitleAccordion;
