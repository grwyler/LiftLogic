import React, { useState } from "react";
import { Box, Paper, IconButton, Button, TextField, Typography, Chip } from "@mui/material";
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
        p: { xs: 1.25, sm: 1.5 },
        mb: 2.5,
        borderRadius: 5,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: darkMode
          ? "rgba(15,23,42,0.72)"
          : "rgba(255,255,255,0.86)",
        color: theme.palette.text.primary,
        boxShadow: darkMode
          ? "0 18px 44px rgba(2,6,23,0.22)"
          : "0 18px 38px rgba(148,163,184,0.16)",
      })}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1.25,
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "44px minmax(0, 1fr) 44px",
            alignItems: "center",
            gap: 1,
          }}
        >
          <IconButton
            onClick={handlePreviousDay}
            size="small"
            sx={{
              width: 44,
              height: 44,
              border: "1px solid",
              borderColor: "divider",
              backgroundColor: darkMode
                ? "rgba(255,255,255,0.04)"
                : "rgba(248,250,252,0.92)",
            }}
          >
            <ChevronLeft fontSize="small" />
          </IconButton>

          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="overline"
              sx={{
                display: "block",
                textAlign: "center",
                color: "text.secondary",
                letterSpacing: "0.12em",
              }}
            >
              Workout Day
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
                  slotProps={{
                    openPickerButton: {
                      sx: { display: "none" },
                    },
                    inputAdornment: {
                      sx: { display: "none" },
                    },
                  }}
                  slots={{
                    textField: (params) => (
                      <TextField
                        {...params}
                        variant="standard"
                        sx={{
                          width: "100%",
                          textAlign: "center",
                          "& .MuiInputBase-root": {
                            justifyContent: "center",
                          },
                          "& .MuiInputAdornment-root": {
                            display: "none",
                          },
                          "& input": {
                            fontFamily: '"Manrope", sans-serif',
                            fontSize: { xs: "1.05rem", sm: "1.2rem" },
                            fontWeight: 800,
                            textAlign: "center",
                            letterSpacing: "-0.02em",
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

          <IconButton
            onClick={handleNextDay}
            size="small"
            sx={{
              width: 44,
              height: 44,
              border: "1px solid",
              borderColor: "divider",
              backgroundColor: darkMode
                ? "rgba(255,255,255,0.04)"
                : "rgba(248,250,252,0.92)",
            }}
          >
            <ChevronRight fontSize="small" />
          </IconButton>
        </Box>

        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          {isToday && <Chip size="small" label="Today" color="primary" variant="outlined" />}
          <Button
            variant="text"
            size="small"
            startIcon={!isInline ? <CalendarToday /> : <CalendarViewDay />}
            onClick={() => setIsInline((prev) => !prev)}
            sx={{ minWidth: "auto" }}
          >
            {isInline ? "Hide Calendar" : "Pick Date"}
          </Button>
          {!isToday && (
            <Button variant="text" size="small" onClick={handleBackToToday}>
              Jump to Today
            </Button>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

export default DaySwitcher;
