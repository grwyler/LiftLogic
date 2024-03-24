import React, { useState } from "react";
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
        <div
          className={`card my-2 ${darkMode ? "bg-custom-dark text-white" : ""}`}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          ref={provided.innerRef}
          style={{
            ...provided.draggableProps.style,
            boxShadow: snapshot.isDragging
              ? "0 4px 8px 0 rgba(0, 0, 0, 0.2)"
              : "none",
          }}
        >
          <div className="card-body ">
            <div>
              Set Name
              <input
                className={`form-control ${
                  darkMode ? "bg-dark text-white" : ""
                }`}
                value={set.name}
              />
            </div>
            <div>
              Time
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
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default SetEditTimerItem;
