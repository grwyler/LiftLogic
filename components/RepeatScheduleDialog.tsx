import React from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";

type RecurrenceType = "daily" | "weekly" | "custom" | "monthly";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  onDisable?: () => void;
  isRepeating: boolean;
  recurrenceType: RecurrenceType;
  setRecurrenceType: (value: RecurrenceType) => void;
  interval: number;
  setInterval: (value: number) => void;
  dayOfWeek: number;
  setDayOfWeek: (value: number) => void;
  daysOfWeek: number[];
  setDaysOfWeek: (value: number[]) => void;
  dayOfMonth: number;
  setDayOfMonth: (value: number) => void;
  endDate: string;
  setEndDate: (value: string) => void;
};

const WEEKDAY_OPTIONS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const RepeatScheduleDialog: React.FC<Props> = ({
  open,
  onClose,
  onSave,
  onDisable,
  isRepeating,
  recurrenceType,
  setRecurrenceType,
  interval,
  setInterval,
  dayOfWeek,
  setDayOfWeek,
  daysOfWeek,
  setDaysOfWeek,
  dayOfMonth,
  setDayOfMonth,
  endDate,
  setEndDate,
}) => {
  const toggleWeekday = (weekday: number) => {
    const nextDays = daysOfWeek.includes(weekday)
      ? daysOfWeek.filter((value) => value !== weekday)
      : [...daysOfWeek, weekday].sort((a, b) => a - b);

    setDaysOfWeek(nextDays.length > 0 ? nextDays : [weekday]);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {isRepeating ? "Edit repeating schedule" : "Repeat this exercise"}
      </DialogTitle>

      <DialogContent sx={{ display: "grid", gap: 2, pt: 1.5 }}>
        <Typography color="text.secondary">
          Set up a recurring schedule for this exercise. This works like a calendar rule, but without time of day.
        </Typography>

        <TextField
          select
          label="Repeats"
          value={recurrenceType}
          onChange={(event) => setRecurrenceType(event.target.value as RecurrenceType)}
          fullWidth
        >
          <MenuItem value="daily">Daily</MenuItem>
          <MenuItem value="weekly">Weekly</MenuItem>
          <MenuItem value="custom">Custom weekdays</MenuItem>
          <MenuItem value="monthly">Monthly</MenuItem>
        </TextField>

        <TextField
          type="number"
          label={
            recurrenceType === "daily"
              ? "Every N days"
              : recurrenceType === "monthly"
              ? "Every N months"
              : "Every N weeks"
          }
          value={interval}
          onChange={(event) =>
            setInterval(Math.max(1, Number(event.target.value) || 1))
          }
          inputProps={{ min: 1, max: 52 }}
          fullWidth
        />

        {recurrenceType === "weekly" ? (
          <TextField
            select
            label="On"
            value={dayOfWeek}
            onChange={(event) => setDayOfWeek(Number(event.target.value))}
            fullWidth
          >
            {WEEKDAY_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        ) : null}

        {recurrenceType === "custom" ? (
          <Box>
            <Typography sx={{ mb: 1, color: "text.secondary" }}>
              On these weekdays
            </Typography>
            <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
              {WEEKDAY_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  color={daysOfWeek.includes(option.value) ? "primary" : "default"}
                  variant={daysOfWeek.includes(option.value) ? "filled" : "outlined"}
                  onClick={() => toggleWeekday(option.value)}
                />
              ))}
            </Box>
          </Box>
        ) : null}

        {recurrenceType === "monthly" ? (
          <TextField
            type="number"
            label="Day of month"
            value={dayOfMonth}
            onChange={(event) =>
              setDayOfMonth(
                Math.max(1, Math.min(31, Number(event.target.value) || 1))
              )
            }
            inputProps={{ min: 1, max: 31 }}
            fullWidth
          />
        ) : null}

        <TextField
          type="date"
          label="Ends on (optional)"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 0.5 }}>
        {isRepeating && onDisable ? (
          <Button color="error" onClick={onDisable}>
            Remove schedule
          </Button>
        ) : null}
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onSave}>
          Save schedule
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RepeatScheduleDialog;
