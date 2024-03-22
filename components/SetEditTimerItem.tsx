import React, { useState } from "react";
import TimerInput from "./TimerInput";
import { Draggable } from "react-beautiful-dnd";

const SetEditTimerItem = ({ set, index }) => {
  const [hours, setHours] = useState(set.hours || 0);
  const [minutes, setMinutes] = useState(set.minutes || 0);
  const [seconds, setSeconds] = useState(set.seconds || 0);

  const handleBlur = () => {};

  const handleInputChange = () => {};
  return (
    <Draggable draggableId={`set-${index}`} index={index}>
      {(provided, snapshot) => (
        <div
          className="card my-2"
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
              <input className="form-control" value={set.name} />
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
              />
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default SetEditTimerItem;
