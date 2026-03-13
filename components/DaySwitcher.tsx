import React, { useState } from "react";
import {
  Box,
  Badge,
  Button,
  IconButton,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import {
  ChevronLeft,
  ChevronRight,
  CalendarToday,
  CalendarViewDay,
} from "@mui/icons-material";
import { DatePicker, PickersDay, StaticDatePicker } from "@mui/x-date-pickers";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

const DaySwitcher = ({
  currentDate,
  handleCurrentDayChange,
  setCurrentDate,
  darkMode,
  calendarStatusMap = {},
}) => {
  const [isInline, setIsInline] = useState(false);

  const getDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

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
      sx={{
        p: { xs: 1.5, sm: 1.75 },
        mb: 2,
        borderRadius: 4,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: darkMode
          ? "rgba(12,18,30,0.76)"
          : "rgba(255,255,255,0.84)",
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "44px minmax(0, 1fr) 44px",
            alignItems: "center",
            gap: 1,
          }}
        >
          <IconButton onClick={handlePreviousDay} size="small">
            <ChevronLeft fontSize="small" />
          </IconButton>

          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="overline"
              sx={{
                display: "block",
                textAlign: "center",
                color: "text.secondary",
                letterSpacing: "0.14em",
              }}
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
                  slots={{
                    day: (dayProps: any) => {
                      const status = calendarStatusMap[getDateKey(dayProps.day)] ?? null;
                      const hasActivity =
                        status?.hasCompleted || status?.hasLogged || status?.hasRecurring;
                      const badgeColor = status?.hasCompleted
                        ? "success.main"
                        : status?.hasLogged
                        ? "info.main"
                        : "warning.main";

                      return (
                        <Badge
                          overlap="circular"
                          variant="dot"
                          invisible={!hasActivity}
                          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                          sx={{
                            "& .MuiBadge-badge": {
                              backgroundColor: badgeColor,
                              boxShadow: "0 0 0 2px var(--mui-palette-background-paper)",
                            },
                          }}
                        >
                          <PickersDay {...dayProps} />
                        </Badge>
                      );
                    },
                  }}
                  slotProps={{
                    actionBar: { actions: [] },
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
                          "& .MuiInputBase-root": {
                            justifyContent: "center",
                          },
                          "& input": {
                            fontFamily: '"Manrope", sans-serif',
                            fontSize: { xs: "1rem", sm: "1.1rem" },
                            fontWeight: 800,
                            textAlign: "center",
                            letterSpacing: "-0.03em",
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

          <IconButton onClick={handleNextDay} size="small">
            <ChevronRight fontSize="small" />
          </IconButton>
        </Box>

        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="text"
            size="small"
            startIcon={!isInline ? <CalendarToday /> : <CalendarViewDay />}
            onClick={() => setIsInline((prev) => !prev)}
          >
            {isInline ? "Hide calendar" : "Calendar view"}
          </Button>
          {!isToday && (
            <Button variant="text" size="small" onClick={handleBackToToday}>
              Today
            </Button>
          )}
        </Box>

        {isInline && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              gap: 1.25,
              flexWrap: "wrap",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "success.main",
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Completed
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "info.main",
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Logged
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "warning.main",
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Recurring scheduled
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default DaySwitcher;
