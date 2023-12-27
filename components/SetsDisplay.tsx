import React from "react";
import { v4 } from "uuid";

const SetsDisplay = ({
  sets,
  currentExercise,
  currentSetIndex,
  setRoutine,
  setCurrentSetIndex,
}) => {
  return sets.map((s, setIndex) => {
    const actualReps = currentExercise.sets[setIndex].actualReps;
    const actualWeight = currentExercise.sets[setIndex].actualWeight;
    const previeousActualReps = currentExercise.sets[setIndex - 1]?.actualReps;
    const previeousActualWeight =
      currentExercise.sets[setIndex - 1]?.actualWeight;
    return (
      <div
        key={v4()}
        style={{ transition: "margin .2s ease" }}
        className={`p-0 ${setIndex === currentSetIndex ? "mb-2" : ""}`}
      >
        <div
          style={{
            boxShadow:
              setIndex === currentSetIndex && "0 2px 4px rgba(0, 0, 0, 0.3)",
            transition: "box-shadow .5s ease",
            overflow: "visible",
          }}
          className={`card ${setIndex === currentSetIndex ? "bg-light" : ""}`}
        >
          <div
            className={`card-header ${
              setIndex === currentSetIndex ? "fw-bold" : ""
            }`}
          >
            {s.name}
          </div>
          <div
            className={`card-body ${
              setIndex === currentSetIndex ? "fw-bold" : ""
            }`}
          >
            <div className="row">
              <div className="col">
                {roundToNearestTwoPointFive(s.weight)} lbs.
              </div>
              <div className="col">{s.reps} reps</div>
            </div>
            <div className="row">
              <div className="col">
                <input
                  disabled={
                    (actualWeight === "" || !actualWeight) &&
                    setIndex !== currentSetIndex &&
                    (!previeousActualWeight ||
                      previeousActualWeight === "" ||
                      !previeousActualReps ||
                      previeousActualReps === "")
                  }
                  type="number"
                  className="form-control form-control-sm"
                  value={actualWeight || ""}
                  onChange={(e) => {
                    currentExercise.sets[setIndex].actualWeight =
                      e.target.value === "" ? null : parseFloat(e.target.value);
                    setRoutine((prevRoutine) => ({
                      ...prevRoutine,
                    }));
                  }}
                  onFocus={() => {
                    setCurrentSetIndex(setIndex);
                  }}
                />
              </div>
              <div className="col">
                <input
                  disabled={
                    (actualReps === "" || !actualReps) &&
                    setIndex !== currentSetIndex &&
                    (!previeousActualWeight ||
                      previeousActualWeight === "" ||
                      !previeousActualReps ||
                      previeousActualReps === "")
                  }
                  type="number"
                  className="form-control form-control-sm"
                  value={actualReps || ""}
                  onChange={(e) => {
                    currentExercise.sets[setIndex].actualReps =
                      e.target.value === "" ? null : parseInt(e.target.value);
                    setRoutine((prevRoutine) => ({
                      ...prevRoutine,
                    }));
                  }}
                  onFocus={() => {
                    setCurrentSetIndex(setIndex);
                  }}
                  onBlur={() => {
                    // if (
                    //   actualWeight &&
                    //   actualWeight !== "" &&
                    //   actualReps &&
                    //   actualReps !== ""
                    // ) {
                    //   updateMaxFromSet(
                    //     currentExercise,
                    //     currentSetIndex,
                    //     actualReps,
                    //     actualWeight
                    //   );
                    // }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  });
};

const roundToNearestTwoPointFive = (number) => {
  return Math.round(number / 2.5) * 2.5;
};

export default SetsDisplay;
