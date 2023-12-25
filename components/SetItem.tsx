import React, { useEffect, useState } from "react";
import { Button } from "react-bootstrap";

const SetItem = ({ set, setUserWeightInput, setUserRepsInput }) => {
  return (
    <div className="row">
      <div className="col">{set.name}</div>
      <div className="col">
        <div className="row">
          <div className="col">
            {roundToNearestTwoPointFive(set.weight)} lbs.
          </div>
          <div className="col">{set.reps} reps</div>
        </div>
        <div className="row">
          <div className="col">
            {set.actualWeight ? (
              set.actualWeight
            ) : (
              <input
                className="form-control form-control-sm"
                onChange={(e) => setUserWeightInput(e.target.value)}
              />
            )}
          </div>
          <div className="col">
            {set.actualReps ? (
              set.actualReps
            ) : (
              <input
                className="form-control form-control-sm"
                onChange={(e) => setUserRepsInput(e.target.value)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const roundToNearestTwoPointFive = (number) => {
  return Math.round(number / 2.5) * 2.5;
};

export default SetItem;
