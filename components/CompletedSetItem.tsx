import React from "react";
import { FaCheckCircle, FaCheckDouble } from "react-icons/fa";
import { v4 } from "uuid";

const SetItem = ({ set, setIndex, setCurrentSetIndex }) => {
  const { actualReps, actualWeight } = set;

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
        <div className="col small">{actualWeight} lbs.</div>
        <div className="col small">{actualReps} reps</div>
      </div>
    </div>
  );
};

export default SetItem;
