import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Badge,
  Button,
  Collapse,
  IconButton,
  Paper,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
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
  calendarViewDate,
  handleCurrentDayChange,
  setCurrentDate,
  setCalendarViewDate,
  darkMode,
  calendarStatusMap = {},
}) => {
  const theme = useTheme();
  const isCompactViewport = useMediaQuery(theme.breakpoints.down("md"));
  const [isInline, setIsInline] = useState(!isCompactViewport);

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
    setCalendarViewDate?.(today);
    handleCurrentDayChange(today, true);
  };

  const isToday = currentDate.toDateString() === new Date().toDateString();
  const selectedDayStatus = calendarStatusMap[getDateKey(currentDate)] ?? null;
  const selectedDaySummary = useMemo(() => {
    if (selectedDayStatus?.hasCompleted) {
      return "Completed workout logged";
    }

    if (selectedDayStatus?.hasLogged) {
      return "Workout in progress";
    }

    if (selectedDayStatus?.hasRecurring) {
      return "Workout scheduled";
    }

    return "No workout logged";
  }, [
    selectedDayStatus?.hasCompleted,
    selectedDayStatus?.hasLogged,
    selectedDayStatus?.hasRecurring,
  ]);
  const selectedDayExerciseCount = selectedDayStatus?.exerciseCount ?? 0;

  useEffect(() => {
    setIsInline(!isCompactViewport);
  }, [isCompactViewport]);

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.5, sm: 1.75 },
        mb: 2,
        borderRadius: 4,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: darkMode ? "rgba(12,18,30,0.76)" : "rgba(255,255,255,0.84)",
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
          <IconButton
            onClick={handlePreviousDay}
            size="small"
            aria-label="Previous workout day"
            sx={{ minWidth: 44, minHeight: 44 }}
          >
            <ChevronLeft fontSize="small" />
          </IconButton>

          <Box
            sx={{
              minWidth: 0,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              overflow: "visible",
            }}
          >
            <Typography
              variant="overline"
              sx={{ color: "text.secondary", letterSpacing: "0.12em" }}
            >
              Selected Day
            </Typography>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                value={currentDate}
                onChange={(newDate) => {
                  if (newDate) {
                    setCalendarViewDate?.(newDate);
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
                        maxWidth: 320,
                        "& .MuiInputBase-root": {
                          justifyContent: "center",
                        },
                        "& input": {
                          fontFamily: 'var(--font-display), "Manrope", sans-serif',
                          fontSize: { xs: "1rem", sm: "1.1rem" },
                          fontWeight: 800,
                          textAlign: "center",
                          letterSpacing: "-0.03em",
                          textOverflow: "ellipsis",
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
            </LocalizationProvider>
            <Typography
              variant="caption"
              sx={{ mt: 0.2, color: "text.secondary", textAlign: "center" }}
            >
              {selectedDaySummary}
              {selectedDayExerciseCount > 0
                ? ` | ${selectedDayExerciseCount} exercise${
                    selectedDayExerciseCount === 1 ? "" : "s"
                  }`
                : ""}
            </Typography>
          </Box>

          <IconButton
            onClick={handleNextDay}
            size="small"
            aria-label="Next workout day"
            sx={{ minWidth: 44, minHeight: 44 }}
          >
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
            size={isCompactViewport ? "medium" : "small"}
            startIcon={isInline ? <CalendarViewDay /> : <CalendarToday />}
            onClick={() => setIsInline((prev) => !prev)}
            sx={{ minHeight: 44 }}
          >
            {isInline ? "Collapse calendar" : "Show calendar"}
          </Button>
          {!isToday ? (
            <Button
              variant="text"
              size={isCompactViewport ? "medium" : "small"}
              onClick={handleBackToToday}
              sx={{ minHeight: 44 }}
            >
              Today
            </Button>
          ) : null}
        </Box>

        <Collapse in={isInline} mountOnEnter unmountOnExit>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1.25,
            }}
          >
            <Box
              sx={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                overflow: "visible",
                "& .MuiDateCalendar-root": {
                  width: { xs: "100%", sm: 320 },
                  maxWidth: { xs: "100%", sm: 320 },
                  marginInline: "auto",
                },
                "& .MuiDayCalendar-slideTransition": {
                  minHeight: 220,
                },
                "& .MuiPickersCalendarHeader-labelContainer": {
                  minWidth: 0,
                },
                "& .MuiPickersCalendarHeader-root": {
                  paddingLeft: { xs: 0, sm: 1 },
                  paddingRight: { xs: 0, sm: 1 },
                },
                "& .MuiPickersDay-root": {
                  width: { xs: 36, sm: 36 },
                  height: { xs: 36, sm: 36 },
                  margin: { xs: "0 2px", sm: "0 2px" },
                  fontSize: { xs: "0.92rem", sm: "0.95rem" },
                },
                "& .MuiDayCalendar-weekContainer": {
                  justifyContent: { xs: "space-evenly", sm: "space-between" },
                  mx: { xs: 0.25, sm: 1 },
                },
                "& .MuiDayCalendar-header": {
                  justifyContent: { xs: "space-evenly", sm: "space-between" },
                  mx: { xs: 0.25, sm: 1 },
                },
                "& .MuiIconButton-root": {
                  padding: { xs: "6px", sm: "8px" },
                },
                "& .MuiTypography-caption": {
                  fontSize: { xs: "0.72rem", sm: "0.75rem" },
                },
              }}
            >
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <StaticDatePicker
                  displayStaticWrapperAs="desktop"
                  value={currentDate}
                  referenceDate={calendarViewDate}
                  onMonthChange={(newMonth) => {
                    if (newMonth) {
                      setCalendarViewDate?.(newMonth);
                    }
                  }}
                  onChange={(newDate) => {
                    if (newDate) {
                      setCalendarViewDate?.(newDate);
                      setCurrentDate(newDate);
                      handleCurrentDayChange(newDate, true);
                    }
                  }}
                  slots={{
                    day: (dayProps: any) => {
                      const status = calendarStatusMap[getDateKey(dayProps.day)] ?? null;
                      const hasActivity =
                        status?.hasCompleted || status?.hasLogged || status?.hasRecurring;
                      const exerciseCount = status?.exerciseCount ?? 0;
                      const badgeColor = status?.hasCompleted
                        ? "success.main"
                        : status?.hasLogged
                        ? "info.main"
                        : "warning.main";

                      return (
                        <Badge
                          overlap="circular"
                          badgeContent={exerciseCount > 0 ? exerciseCount : undefined}
                          invisible={!hasActivity || exerciseCount <= 0}
                          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                          sx={{
                            "& .MuiBadge-badge": {
                              backgroundColor: badgeColor,
                              color: "#fff",
                              minWidth: 18,
                              height: 18,
                              fontSize: "0.65rem",
                              fontWeight: 700,
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
              </LocalizationProvider>
            </Box>

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
                  Scheduled
                </Typography>
              </Box>
            </Box>
          </Box>
        </Collapse>
      </Box>
    </Paper>
  );
};

export default DaySwitcher;
