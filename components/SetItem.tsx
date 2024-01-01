import React from "react";
import { v4 } from "uuid";
import { roundToNearestFive } from "../utils/helpers";
import { Button } from "react-bootstrap";
import { IoMdClose } from "react-icons/io";

const SetItem = ({ set, handleDeleteSet }) => {
  const { weight, reps } = set;

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
        <div className="col">{roundToNearestFive(weight)} lbs.</div>
        <div className="col">{reps} reps</div>
      </div>
    </div>
  );
};

export default SetItem;
