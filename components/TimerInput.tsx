import React from "react";

const TimerInput = ({
  hours,
  setHours,
  minutes,
  setMinutes,
  seconds,
  setSeconds,
  handleBlur,
  handleInputChange,
  darkMode,
}) => {
  return (
    <div className="d-flex align-items-center input-group input-group-sm ">
      <input
        type="number"
        className={`form-control font-Inter form-control font-Inter-sm text-center ${
          darkMode ? "bg-dark text-white" : ""
        }`}
        value={hours}
        placeholder="Hours"
        onChange={(e) => handleInputChange(e.target.value, setHours)}
        onBlur={handleBlur}
      />
      <span
        className={`input-group-text font-InterTight ${
          darkMode ? "bg-dark text-white" : ""
        }`}
      >
        h
      </span>

      <input
        type="number"
        className={`form-control font-Inter form-control font-Inter-sm text-center ${
          darkMode ? "bg-dark text-white" : ""
        }`}
        value={minutes}
        placeholder="Minutes"
        onChange={(e) => handleInputChange(e.target.value, setMinutes)}
        onBlur={handleBlur}
      />
      <span
        className={`input-group-text font-InterTight ${
          darkMode ? "bg-dark text-white" : ""
        }`}
      >
        m
      </span>

      <input
        type="number"
        className={`form-control font-Inter form-control font-Inter-sm text-center ${
          darkMode ? "bg-dark text-white" : ""
        }`}
        value={seconds}
        placeholder="Seconds"
        onChange={(e) => handleInputChange(e.target.value, setSeconds)}
        onBlur={handleBlur}
        autoFocus
      />
      <span
        className={`input-group-text font-InterTight ${
          darkMode ? "bg-dark text-white" : ""
        }`}
      >
        s
      </span>
    </div>
  );
};

export default TimerInput;
