import React from "react";
import { Button } from "react-bootstrap";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const DaySwitcher = ({ formattedDate, handleCurrentDayChange, darkMode }) => {
  return (
    <div className="d-flex justify-content-between align-items-center p-2">
      <div>
        <Button
          size="sm"
          variant={darkMode ? "dark" : "white"}
          onClick={() => handleCurrentDayChange(-1)}
        >
          <FaChevronLeft />
        </Button>
      </div>
      <div>
        <div className="fw-bold font-InterTight">{formattedDate}</div>
      </div>
      <div>
        <Button
          size="sm"
          variant={darkMode ? "dark" : "white"}
          onClick={() => handleCurrentDayChange(1)}
        >
          <FaChevronRight />
        </Button>
      </div>
    </div>
  );
};

export default DaySwitcher;
