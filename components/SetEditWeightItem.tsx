import React, { useState } from "react";
import { Draggable } from "react-beautiful-dnd";

const SetEditWeightItem = ({ set, index }) => {
  const [mySet, setMySet] = useState(set);
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
          <div className="card-header d-flex align-items-center justify-content-between">
            <input
              className="form-control"
              value={mySet.name}
              onChange={(e) => setMySet({ ...mySet, name: e.target.value })}
            />
          </div>

          <div className="card-body ">
            <div>
              Suggested Weight
              <div className="input-group">
                <input
                  className="form-control"
                  value={mySet.weight}
                  onChange={(e) =>
                    setMySet({ ...mySet, weight: e.target.value })
                  }
                />
                <span className="input-group-text font-InterTight">lbs.</span>
              </div>
            </div>
            <div>
              Reps
              <input
                className="form-control"
                value={mySet.reps}
                onChange={(e) => setMySet({ ...mySet, reps: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default SetEditWeightItem;
