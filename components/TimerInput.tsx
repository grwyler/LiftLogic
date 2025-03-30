import React from "react";
import { Box, TextField, Typography } from "@mui/material";
import { TextFieldProps } from "@mui/material/TextField";

const TimerInput = ({
  hours,
  setHours,
  minutes,
  setMinutes,
  seconds,
  setSeconds,
  handleBlur,
  handleInputChange,
  darkMode,
}) => {
  const commonProps: Partial<TextFieldProps> = {
    variant: "outlined", // This is now typed as "outlined"
    size: "small", // Typed as "small"
    type: "number",
    inputProps: { style: { textAlign: "center" } },
    sx: {
      width: 80,
      backgroundColor: darkMode ? "grey.800" : "inherit",
      "& input": { color: darkMode ? "white" : "inherit" },
    },
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <TextField
        {...commonProps}
        value={hours}
        placeholder="Hours"
        onChange={(e) => handleInputChange(e.target.value, setHours)}
        onBlur={handleBlur}
      />
      <Typography variant="body1">h</Typography>
      <TextField
        {...commonProps}
        value={minutes}
        placeholder="Minutes"
        onChange={(e) => handleInputChange(e.target.value, setMinutes)}
        onBlur={handleBlur}
      />
      <Typography variant="body1">m</Typography>
      <TextField
        {...commonProps}
        value={seconds}
        placeholder="Seconds"
        onChange={(e) => handleInputChange(e.target.value, setSeconds)}
        onBlur={handleBlur}
        autoFocus
      />
      <Typography variant="body1">s</Typography>
    </Box>
  );
};

export default TimerInput;
