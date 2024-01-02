import React from "react";
import { FaCheckCircle, FaCheckDouble } from "react-icons/fa";
import { v4 } from "uuid";
import { formatTime } from "../utils/helpers";

const SetItem = ({ set, setIndex, setCurrentSetIndex, type }) => {
  const { actualReps, actualWeight, totalSeconds } = set;

  const handleClickCompletedSet = () => {
    setCurrentSetIndex(setIndex);
  };
  return (
    <div
      key={v4()}
      onClick={handleClickCompletedSet}
      className="card bg-light text-success small my-1"
    >
      <div>
        {set.name} <FaCheckCircle />
      </div>
      <div className="row small">
        {type === "weight" && (
          <React.Fragment>
            <div className="col small">{actualWeight} lbs.</div>
            <div className="col small">{actualReps} reps</div>
          </React.Fragment>
        )}
        {type === "timed" && <div>{formatTime(totalSeconds)}</div>}
      </div>
    </div>
  );
};

export default SetItem;
