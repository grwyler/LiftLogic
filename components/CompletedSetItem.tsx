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
      className="card bg-light text-success medium my-2 py-2 px-3"
    >

      <div className="d-flex row small">
        {type === "weight" && (
          <React.Fragment>
            <div className="col">{actualWeight} lbs.</div>
            <div className="col medium">{set.name} <FaCheckCircle /></div>
            <div className="col">{actualReps} reps</div>
          </React.Fragment>
        )}
        {type === "timed" && (
          <React.Fragment>
            <div className="col"></div>
            <div className="col medium">{set.name} <FaCheckCircle /></div>
            <div className="col">{formatTime(totalSeconds)}</div>
          </React.Fragment>
        )}
      </div>
    </div>
  );
};

export default SetItem;
