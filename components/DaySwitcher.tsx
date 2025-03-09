import React, { Fragment, useState } from "react";
import { Button } from "react-bootstrap";
import DatePicker from "react-datepicker";
import {
  FaCalendar,
  FaCalendarDay,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

const DaySwitcher = ({ currentDate, handleCurrentDayChange, darkMode }) => {
  const [isInline, setIsInline] = useState(false);
  return (
    <Fragment>
      <div className="d-flex justify-content-between align-items-center">
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
            highlightDates={[new Date()]}
            inline={isInline}
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
      <div className="d-flex justify-content-center pt-2">
        <Button variant="white" onClick={() => setIsInline(!isInline)}>
          {!isInline ? <FaCalendar /> : <FaCalendarDay />}
        </Button>
      </div>
    </Fragment>
  );
};

export default DaySwitcher;
