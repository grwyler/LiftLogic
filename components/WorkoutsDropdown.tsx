import React, { useState } from "react";
import { Button, Menu, MenuItem } from "@mui/material";
import CachedIcon from "@mui/icons-material/Cached"; // Similar to FaRetweet

function WorkoutDropdown({ workouts, darkMode, handleCurrentWorkoutChange }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleItemClick = (index) => {
    handleCurrentWorkoutChange(index);
    handleClose();
  };

  return (
    <>
      <Button
        size="small"
        variant={darkMode ? "contained" : "outlined"}
        onClick={handleClick}
        startIcon={<CachedIcon />}
      >
        Switch Workout
      </Button>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        {workouts.map((workout, index) => (
          <MenuItem
            key={`${workout.title}-${index}`}
            onClick={() => handleItemClick(index)}
          >
            {workout.title}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export default WorkoutDropdown;
