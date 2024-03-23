import React, { Fragment } from "react";
import { v4 } from "uuid";
import { roundToNearestFive } from "../utils/helpers";
import { Button } from "react-bootstrap";
import { IoMdClose } from "react-icons/io";

const SetItem = ({ set, handleDeleteSet, type, darkMode }) => {
  const { weight, reps, seconds, minutes, hours } = set;

  return (
    <div
      key={v4()}
      className={`card m-2 ${
        darkMode
          ? "bg-dark text-light border-secondary"
          : "bg-light text-secondary"
      }`}
    >
      <div className="d-flex justify-content-between small px-3 py-2 align-items-center">
        {type === "weight" && (
          <Fragment>
            <div>{roundToNearestFive(weight)} lbs.</div>
            <div>{set.name}</div>
            <div>{reps} reps</div>
          </Fragment>
        )}
        {type === "timed" && (
          <Fragment>
            <div></div>
            <div>{set.name}</div>
            {hours > 0 && <div>{hours}h</div>}
            {minutes > 0 && <div>{minutes}m</div>}
            {seconds > 0 && <div>{seconds}s</div>}
          </Fragment>
        )}
        <div>
          <Button
            size="sm"
            className="p-0 m-0"
            variant={darkMode ? "dark" : "light"}
            onClick={() => handleDeleteSet(set.name)}
          >
            <IoMdClose />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SetItem;
