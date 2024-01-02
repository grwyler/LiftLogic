import React from "react";
import { v4 } from "uuid";
import { roundToNearestFive } from "../utils/helpers";
import { Button } from "react-bootstrap";
import { IoMdClose } from "react-icons/io";

const SetItem = ({ set, handleDeleteSet, type }) => {
  const { weight, reps, seconds, minutes, hours } = set;

  return (
    <div key={v4()} className="card bg-light text-secondary small my-1 ">
      <div className="row">
        <div className="col-10">{set.name}</div>
        <div className="col-2">
          <Button
            size="sm"
            className=""
            variant="light"
            onClick={() => handleDeleteSet(set.name)}
          >
            <IoMdClose />
          </Button>
        </div>
      </div>
      <div className="row">
        {type === "weight" && (
          <React.Fragment>
            <div className="col">{roundToNearestFive(weight)} lbs.</div>
            <div className="col">{reps} reps</div>
          </React.Fragment>
        )}
        {type === "timed" && (
          <React.Fragment>
            {hours > 0 && <div className="col">{hours} hours</div>}
            {minutes > 0 && <div className="col">{minutes} minutes</div>}
            {seconds > 0 && <div className="col">{seconds} seconds</div>}
          </React.Fragment>
        )}
      </div>
    </div>
  );
};

export default SetItem;
