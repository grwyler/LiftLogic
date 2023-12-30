import React from "react";
import { v4 } from "uuid";

const SetItem = ({ set, setIndex, setCurrentSetIndex }) => {
  const { actualReps, actualWeight } = set;

  return (
    <div
      key={v4()}
      onClick={() => setCurrentSetIndex(setIndex)}
      className="card bg-light text-success small"
    >
      <div>{set.name}</div>
      <div className="row small">
        <div className="col small">{actualWeight} lbs.</div>
        <div className="col small">{actualReps} reps</div>
      </div>
    </div>
  );
};

export default SetItem;
