import React from "react";
import { Button } from "react-bootstrap";
import DatePicker from "react-datepicker";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const DaySwitcher = ({ currentDate, handleCurrentDayChange, darkMode }) => {
  return (
    <div className="d-flex justify-content-between align-items-center p-2">
      {/* Left Button */}
      <Button
        size="lg"
        variant={darkMode ? "dark" : "white"}
        onClick={() => handleCurrentDayChange(-1)}
      >
        <FaChevronLeft />
      </Button>

      {/* Date Picker Wrapper (Ensures Full Width) */}
      <div className="d-flex flex-grow-1 px-2">
        <DatePicker
          selected={currentDate}
          className={`form-control text-center fw-bold w-100 ${
            darkMode ? "bg-dark text-white" : ""
          }`}
          onChange={(date: Date | null) => handleCurrentDayChange(date, true)}
          dateFormat="EEEE, MMMM d"
          showPopperArrow={false}
          popperPlacement="bottom"
          wrapperClassName="w-100"
          onFocus={(e) => e.target.blur()}
          onChangeRaw={(e) => e.preventDefault()}
        />
      </div>

      {/* Right Button */}
      <Button
        size="lg"
        variant={darkMode ? "dark" : "white"}
        onClick={() => handleCurrentDayChange(1)}
      >
        <FaChevronRight />
      </Button>
    </div>
  );
};

export default DaySwitcher;
