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
}) => {
  return (
    <div className="d-flex align-items-center input-group input-group-sm">
      <input
        type="number"
        className="form-control font-Inter form-control font-Inter-sm text-center"
        value={hours}
        placeholder="Hours"
        onChange={(e) => handleInputChange(e.target.value, setHours)}
        onBlur={handleBlur}
      />
      <span className="input-group-text font-InterTight">h</span>

      <input
        type="number"
        className="form-control font-Inter form-control font-Inter-sm text-center"
        value={minutes}
        placeholder="Minutes"
        onChange={(e) => handleInputChange(e.target.value, setMinutes)}
        onBlur={handleBlur}
      />
      <span className="input-group-text font-InterTight">m</span>

      <input
        type="number"
        className="form-control font-Inter form-control font-Inter-sm text-center"
        value={seconds}
        placeholder="Seconds"
        onChange={(e) => handleInputChange(e.target.value, setSeconds)}
        onBlur={handleBlur}
      />
      <span className="input-group-text font-InterTight">s</span>
    </div>
  );
};

export default TimerInput;
