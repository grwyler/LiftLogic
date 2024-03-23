import React, { Fragment } from "react";
import { FaCheckCircle } from "react-icons/fa";
import { v4 } from "uuid";
import { formatTime } from "../utils/helpers";

const SetItem = ({ set, setIndex, setCurrentSetIndex, type, darkMode }) => {
  const { actualReps, actualWeight, totalSeconds } = set;

  const handleClickCompletedSet = () => {
    setCurrentSetIndex(setIndex);
  };
  return (
    <div
      key={v4()}
      onClick={handleClickCompletedSet}
      className={`card m-2 py-2 px-3 bg-${
        darkMode ? "dark text-light border-success" : "light"
      }`}
    >
      <div className="d-flex row">
        <div className="col">
          {set.name} <FaCheckCircle className="text-success" />
        </div>
      </div>

      <div className="d-flex row small">
        {type === "weight" && (
          <Fragment>
            <div className="col">{actualWeight} lbs.</div>
            <div className="col">{actualReps} reps</div>
          </Fragment>
        )}
        {type === "timed" && (
          <div className="col">{formatTime(totalSeconds)}</div>
        )}
      </div>
    </div>
  );
};

export default SetItem;
