import React, { useEffect, useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Box, IconButton, Paper, TextField, Typography } from "@mui/material";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import CloseIcon from "@mui/icons-material/Close";
import TimerInput from "./TimerInput";
import { emptyOrNullToZero } from "../utils/helpers";

const SetEditTimerItem = ({
  set,
  index,
  darkMode,
  onChangeSet,
  handleDeleteSet,
}) => {
  const [hours, setHours] = useState(emptyOrNullToZero(set.hours));
  const [minutes, setMinutes] = useState(emptyOrNullToZero(set.minutes));
  const [seconds, setSeconds] = useState(emptyOrNullToZero(set.seconds));
  const [setName, setSetName] = useState(set.name);

  useEffect(() => {
    setHours(emptyOrNullToZero(set.hours));
    setMinutes(emptyOrNullToZero(set.minutes));
    setSeconds(emptyOrNullToZero(set.seconds));
    setSetName(set.name);
  }, [set.hours, set.minutes, set.name, set.seconds]);

  const pushChange = (nextValues: Record<string, unknown>) => {
    onChangeSet?.({
      ...set,
      name: setName,
      hours,
      minutes,
      seconds,
      ...nextValues,
    });
  };

  const handleBlur = () => {
    pushChange({});
  };

  const handleInputChange = (value: any, setValue: (v: any) => void, key: string) => {
    const trimmedValue = value.toString().replace(/^0+/, "");
    const intValue = parseInt(trimmedValue, 10);
    const safeValue = isNaN(intValue) ? 0 : intValue;
    setValue(safeValue);
    pushChange({ [key]: safeValue });
  };

  return (
    <Draggable draggableId={`set-${index}`} index={index}>
      {(provided, snapshot) => (
        <Paper
          {...provided.draggableProps}
          ref={provided.innerRef}
          sx={{
            my: 1.25,
            p: 1.5,
            borderRadius: 3,
            border: "1px solid",
            borderColor: darkMode
              ? "rgba(148,163,184,0.12)"
              : "rgba(17,24,39,0.08)",
            backgroundColor: darkMode
              ? "rgba(17,24,39,0.84)"
              : "rgba(255,255,255,0.92)",
            boxShadow: snapshot.isDragging
              ? "0 14px 32px rgba(15,23,42,0.16)"
              : "none",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 1.25,
            }}
          >
            <Box
              {...provided.dragHandleProps}
              sx={{
                display: "grid",
                placeItems: "center",
                color: "text.secondary",
                cursor: "grab",
              }}
            >
              <DragIndicatorIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Timed Set {index + 1}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Adjust the label and timer length.
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={() => handleDeleteSet?.(set)}
              sx={{ ml: "auto", color: "text.secondary" }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box sx={{ display: "grid", gap: 1.25 }}>
            <TextField
              fullWidth
              label="Set label"
              size="small"
              value={setName}
              onChange={(event) => {
                const nextName = event.target.value;
                setSetName(nextName);
                onChangeSet?.({
                  ...set,
                  name: nextName,
                  hours,
                  minutes,
                  seconds,
                });
              }}
            />

            <Box>
              <Typography
                variant="body2"
                sx={{ mb: 1, color: "text.secondary", fontWeight: 600 }}
              >
                Timer length
              </Typography>
              <TimerInput
                hours={hours}
                setHours={setHours}
                minutes={minutes}
                setMinutes={setMinutes}
                seconds={seconds}
                setSeconds={setSeconds}
                handleBlur={handleBlur}
                handleInputChange={handleInputChange}
                darkMode={darkMode}
              />
            </Box>
          </Box>
        </Paper>
      )}
    </Draggable>
  );
};

export default SetEditTimerItem;
