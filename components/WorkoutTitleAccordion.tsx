import React from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Button,
  IconButton,
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
        backgroundColor: darkMode ? "grey.900" : "background.paper",
        color: darkMode ? "grey.100" : "text.primary",
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          "& .MuiAccordionSummary-content": {
            alignItems: "center",
            justifyContent: "space-between",
          },
        }}
      >
        {isEditTitle || isCreateTitle ? (
          <Box flex={1} display="flex" justifyContent="center">
            <input
              type="text"
              value={workoutTitle}
              autoFocus
              onChange={(e) => setWorkoutTitle(e.target.value)}
              placeholder="Workout name"
              style={{
                textAlign: "center",
                backgroundColor: darkMode ? "#333" : "inherit",
                color: darkMode ? "#fff" : "inherit",
                border: "1px solid #ccc",
                borderRadius: 4,
                padding: "8px",
                width: "100%",
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
              sx={{ flexGrow: 1, textAlign: "center", fontWeight: "bold" }}
            >
              {workoutTitle}
            </Typography>
          </>
        )}
      </AccordionSummary>

      <AccordionDetails>
        {isEditTitle || isCreateTitle ? (
          <Box display="flex" justifyContent="center" mt={2}>
            <Button
              variant="contained"
              color="success"
              sx={{ mx: 1 }}
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
              sx={{ mx: 1 }}
              onClick={handleCancelEditTitle}
              disabled={isLastWorkout && !workoutTitle}
              startIcon={<CloseIcon />}
            >
              Cancel
            </Button>
          </Box>
        ) : (
          <Box>
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
                variant={darkMode ? "contained" : "outlined"}
                size="small"
                fullWidth
                startIcon={<AddIcon />}
              >
                Add New Workout Routine
              </Button>
            </Box>

            <Box>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                title={`Adds an Exercise that repeats every ${capitalizedDay}`}
                startIcon={<AddIcon />}
                onClick={() => {
                  setIsPersistent(true);
                  setIsAddingExercise(true);
                }}
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
