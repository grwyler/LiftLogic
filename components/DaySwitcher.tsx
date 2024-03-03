import React from "react";
import { Button } from "react-bootstrap";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const DaySwitcher = ({
  previousDayShort,
  formattedDate,
  nextDayShort,
  handleCurrentDayChange,
}) => {
  return (
    <div className="d-flex justify-content-between align-items-center border bg-light p-2">
      <div>
        <Button
          size="sm"
          variant="light font-InterTight"
          onClick={() => handleCurrentDayChange(-1)}
        >
          <FaChevronLeft /> {previousDayShort}
        </Button>
      </div>
      <div>
        <div className="fw-bold font-InterTight">{formattedDate}</div>
      </div>
      <div>
        <Button
          size="sm"
          variant="light font-InterTight"
          onClick={() => handleCurrentDayChange(1)}
        >
          {nextDayShort} <FaChevronRight />
        </Button>
      </div>
    </div>
  );
};

export default DaySwitcher;
