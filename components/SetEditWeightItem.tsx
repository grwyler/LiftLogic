import React, { useState } from "react";
import { Draggable } from "react-beautiful-dnd";
import { Button } from "react-bootstrap";
import { FaTrash } from "react-icons/fa";

const SetEditWeightItem = ({
  set,
  index,
  darkMode,
  handleDeleteSet,
  isManualEdit,
}) => {
  const [mySet, setMySet] = useState(set);

  return (
    <Draggable draggableId={`set-${index}`} index={index}>
      {(provided, snapshot) => (
        <div
          className={`card my-2 ${
            darkMode ? "bg-custom-dark text-white " : ""
          }`}
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
              className={`form-control ${darkMode ? "bg-dark text-white" : ""}`}
              value={mySet.name}
              onChange={(e) => setMySet({ ...mySet, name: e.target.value })}
            />
            <Button
              variant="light"
              className="ms-3"
              disabled={index === 0}
              onClick={() => handleDeleteSet(mySet)}
            >
              <FaTrash />
            </Button>
          </div>

          <div className="card-body d-flex">
            <div className="p-1">
              <div className="d-flex input-group">
                <input
                  className={`form-control  ${
                    darkMode ? "bg-dark text-white" : ""
                  }`}
                  disabled={!isManualEdit}
                  value={mySet.weight}
                  onChange={(e) =>
                    setMySet({ ...mySet, weight: e.target.value })
                  }
                />
                <span
                  className={`input-group-text font-InterTight ${
                    darkMode ? "bg-dark text-white" : ""
                  }`}
                >
                  lbs.
                </span>
              </div>
            </div>
            <div className="p-1">
              <div className="d-flex input-group">
                <input
                  className={`form-control  ${
                    darkMode ? "bg-dark text-white" : ""
                  }`}
                  disabled={!isManualEdit}
                  value={mySet.reps}
                  onChange={(e) => setMySet({ ...mySet, reps: e.target.value })}
                />
                <span
                  className={`input-group-text font-InterTight ${
                    darkMode ? "bg-dark text-white" : ""
                  }`}
                >
                  Reps
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default SetEditWeightItem;
