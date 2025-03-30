import React, { useState } from "react";
import { Card, CardContent, TextField, Typography, Box } from "@mui/material";
import TimerInput from "./TimerInput";
import { Draggable } from "react-beautiful-dnd";
import { emptyOrNullToZero } from "../utils/helpers";

const SetEditTimerItem = ({ set, index, darkMode }) => {
  const [hours, setHours] = useState(emptyOrNullToZero(set.hours));
  const [minutes, setMinutes] = useState(emptyOrNullToZero(set.minutes));
  const [seconds, setSeconds] = useState(emptyOrNullToZero(set.seconds));

  const handleBlur = () => {};
  const handleInputChange = () => {};

  return (
    <Draggable draggableId={`set-${index}`} index={index}>
      {(provided, snapshot) => (
        <Card
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          ref={provided.innerRef}
          sx={{
            my: 2,
            backgroundColor: darkMode ? "grey.900" : "white",
            color: darkMode ? "grey.100" : "text.primary",
            boxShadow: snapshot.isDragging
              ? "0 4px 8px rgba(0,0,0,0.2)"
              : "none",
            transition: "box-shadow 0.3s ease",
          }}
        >
          <CardContent>
            <Box mb={2}>
              <Typography variant="subtitle2" gutterBottom>
                Set Name
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                value={set.name}
                InputProps={{
                  readOnly: true,
                }}
                sx={{
                  backgroundColor: darkMode ? "grey.800" : "inherit",
                  "& input": { color: darkMode ? "white" : "inherit" },
                }}
              />
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Time
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
          </CardContent>
        </Card>
      )}
    </Draggable>
  );
};

export default SetEditTimerItem;
