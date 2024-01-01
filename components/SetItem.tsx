import React from "react";
import { v4 } from "uuid";
import { roundToNearestFive } from "../utils/helpers";

const SetItem = ({ set }) => {
  const { weight, reps } = set;

  return (
    <div key={v4()} className="card bg-light text-secondary small my-1">
      <div>{set.name}</div>
      <div className="row small">
        <div className="col small">{roundToNearestFive(weight)} lbs.</div>
        <div className="col small">{reps} reps</div>
      </div>
    </div>
  );
};

export default SetItem;
