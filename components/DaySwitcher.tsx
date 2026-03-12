import React, { useState } from "react";
import { Box, Paper, IconButton, Button, TextField, Typography } from "@mui/material";
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
      elevation={0}
      sx={(theme) => ({
        p: { xs: 1.5, sm: 2 },
        mb: 2,
        borderRadius: 4,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: darkMode
          ? "rgba(255,255,255,0.03)"
          : "rgba(255,255,255,0.52)",
        color: theme.palette.text.primary,
      })}
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        sx={{ gap: 1 }}
      >
        {!isInline && (
          <IconButton
            onClick={handlePreviousDay}
            size="large"
            sx={{
              border: "1px solid",
              borderColor: "divider",
              backgroundColor: "background.paper",
            }}
          >
            <ChevronLeft fontSize="inherit" />
          </IconButton>
        )}

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="overline"
            sx={{ display: "block", textAlign: "center", color: "text.secondary" }}
          >
            Workout Date
          </Typography>
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
                      sx={{
                        mx: 2,
                        width: "100%",
                        textAlign: "center",
                        "& .MuiInputBase-root": {
                          justifyContent: "center",
                        },
                        "& input": {
                          fontFamily: '"Manrope", sans-serif',
                          fontSize: { xs: "1rem", sm: "1.15rem" },
                          fontWeight: 700,
                          textAlign: "center",
                        },
                      }}
                      InputProps={{
                        ...params.InputProps,
                        readOnly: true,
                        disableUnderline: true,
                      }}
                    />
                  ),
                }}
              />
            )}
          </LocalizationProvider>
        </Box>

        {!isInline && (
          <IconButton
            onClick={handleNextDay}
            size="large"
            sx={{
              border: "1px solid",
              borderColor: "divider",
              backgroundColor: "background.paper",
            }}
          >
            <ChevronRight fontSize="inherit" />
          </IconButton>
        )}
      </Box>

      <Box display="flex" justifyContent="center" mt={2} gap={1} flexWrap="wrap">
        <Button
          variant="outlined"
          startIcon={!isInline ? <CalendarToday /> : <CalendarViewDay />}
          onClick={() => setIsInline((prev) => !prev)}
        >
          {isInline ? "Compact Picker" : "Expanded Picker"}
        </Button>
        {!isToday && (
          <Button variant="outlined" onClick={handleBackToToday}>
            Back to Today
          </Button>
        )}
      </Box>
    </Paper>
  );
};

export default DaySwitcher;
