import React, { useState } from "react";
import { Box, Paper, IconButton, Button, TextField } from "@mui/material";
import {
  ChevronLeft,
  ChevronRight,
  CalendarToday,
  CalendarViewDay,
} from "@mui/icons-material";
import { DatePicker, StaticDatePicker } from "@mui/x-date-pickers";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

const DaySwitcher = ({
  currentDate,
  handleCurrentDayChange,
  setCurrentDate,
  darkMode,
}) => {
  const [isInline, setIsInline] = useState(false);

  const handlePreviousDay = () => {
    setCurrentDate((prevDate) => {
      handleCurrentDayChange(-1);
      const newDate = new Date(prevDate);
      newDate.setDate(prevDate.getDate() - 1);
      return newDate;
    });
  };

  const handleNextDay = () => {
    setCurrentDate((prevDate) => {
      handleCurrentDayChange(1);
      const newDate = new Date(prevDate);
      newDate.setDate(prevDate.getDate() + 1);
      return newDate;
    });
  };

  const handleBackToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    handleCurrentDayChange(today, true);
  };

  const isToday = currentDate.toDateString() === new Date().toDateString();

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        bgcolor: darkMode ? "grey.900" : "background.paper",
        color: darkMode ? "grey.100" : "text.primary",
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between">
        {!isInline && (
          <IconButton onClick={handlePreviousDay} size="large">
            <ChevronLeft fontSize="inherit" />
          </IconButton>
        )}

        <LocalizationProvider dateAdapter={AdapterDateFns}>
          {isInline ? (
            <StaticDatePicker
              displayStaticWrapperAs="desktop"
              value={currentDate}
              onChange={(newDate) => {
                if (newDate) {
                  setCurrentDate(newDate);
                  handleCurrentDayChange(newDate, true);
                }
              }}
            />
          ) : (
            <DatePicker
              value={currentDate}
              onChange={(newDate) => {
                if (newDate) {
                  setCurrentDate(newDate);
                  handleCurrentDayChange(newDate, true);
                }
              }}
              format="EEEE, MMMM d"
              slots={{
                textField: (params) => (
                  <TextField
                    {...params}
                    variant="standard"
                    sx={{ mx: 2, width: "100%", textAlign: "center" }}
                    InputProps={{
                      ...params.InputProps,
                      style: { textAlign: "center", fontWeight: 600 },
                      readOnly: true,
                    }}
                  />
                ),
              }}
            />
          )}
        </LocalizationProvider>

        {!isInline && (
          <IconButton onClick={handleNextDay} size="large">
            <ChevronRight fontSize="inherit" />
          </IconButton>
        )}
      </Box>

      <Box display="flex" justifyContent="center" mt={2}>
        <Button
          variant="text"
          startIcon={!isInline ? <CalendarToday /> : <CalendarViewDay />}
          onClick={() => setIsInline((prev) => !prev)}
        >
          {isInline ? "Inline" : "Popper"}
        </Button>
      </Box>

      {!isToday && (
        <Box display="flex" justifyContent="center" mt={1}>
          <Button variant="outlined" onClick={handleBackToToday}>
            Back to Today
          </Button>
        </Box>
      )}
    </Paper>
  );
};

export default DaySwitcher;
