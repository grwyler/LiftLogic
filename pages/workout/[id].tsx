import { useRouter } from "next/router";
import React, { useState } from "react";
import { Button } from "react-bootstrap";
import { FaChevronLeft, FaChevronRight, FaCheck } from "react-icons/fa";
import { routines } from "../../utils/sample-data";
import SetsDisplay from "../../components/SetsDisplay";
import { saveWorkout } from "../../utils/helpers";

const WorkoutPage = () => {
  // local state
  const router = useRouter();
  const { id } = router.query;
  const initialRoutine = routines[typeof id === "string" ? id : "1"];
  const [currentDayIndex, setCurrentDayIndex] = useState(new Date().getDay());
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [routine, setRoutine] = useState(initialRoutine);

  // derived state
  const currentDay = Object.keys(routine)[currentDayIndex];
  const workout = routine[currentDay];
  const capitalizedCurrentDay =
    currentDay.charAt(0).toUpperCase() + currentDay.slice(1);
  const currentExercise = workout.exercises[currentExerciseIndex];
  const previousDayIndex = currentDayIndex === 0 ? 6 : currentDayIndex - 1;
  const previousDay = Object.keys(routine)[previousDayIndex];
  const capitalizedPreviousDay =
    previousDay.charAt(0).toUpperCase() + previousDay.slice(1);
  const nextDayIndex = currentDayIndex === 6 ? 0 : currentDayIndex + 1;
  const nextDay = Object.keys(routine)[nextDayIndex];
  const capitalizedNextDay = nextDay.charAt(0).toUpperCase() + nextDay.slice(1);

  const handleResetExercise = () => {
    currentExercise.sets.forEach((s) => {
      s.actualReps = "";
      s.actualWeight = "";
    });
    setCurrentSetIndex(0);
    setRoutine((prevRoutine) => ({
      ...prevRoutine,
    }));
  };

  const handleCurrentDayChange = (change) => {
    if (change < 0 && currentDayIndex === 0) {
      setCurrentDayIndex(6);
    } else if (change > 0 && currentDayIndex === 6) {
      setCurrentDayIndex(0);
    } else {
      setCurrentDayIndex(currentDayIndex + change);
    }
  };
  const handleWorkoutButtonClick = (exerciseIndex) => {
    if (currentExerciseIndex === exerciseIndex) {
      setCurrentExerciseIndex(-1);
    } else {
      setCurrentExerciseIndex(exerciseIndex);
      workout.exercises[exerciseIndex].complete = false;
      workout.complete = false;
    }
  };

  const handleCompleteExercise = () => {
    let nextIndex = currentExerciseIndex + 1;
    while (
      workout.exercises[nextIndex] &&
      workout.exercises[nextIndex].complete
    ) {
      nextIndex++;
    }
    setCurrentExerciseIndex(nextIndex);
    setCurrentSetIndex(0);
    currentExercise.complete = true;
    workout.complete = workout.exercises.every((e) => e.complete);
    saveWorkout(workout);
  };

  return (
    <div className="container-fluid">
      {workout && (
        <React.Fragment>
          <div className="row text-center align-items-center bg-light">
            <div className="col">
              <Button
                variant="light"
                onClick={() => handleCurrentDayChange(-1)}
              >
                <FaChevronLeft /> {capitalizedPreviousDay}
              </Button>
            </div>
            <div className="col">
              <div className="fw-bold">{capitalizedCurrentDay}</div>
            </div>
            <div className="col">
              {" "}
              <Button variant="light" onClick={() => handleCurrentDayChange(1)}>
                {capitalizedNextDay} <FaChevronRight />
              </Button>
            </div>
          </div>
          <div className="d-flex justify-content-center align-items-center">
            <h5 className={workout.complete ? "text-success" : ""}>
              {workout.title}
            </h5>
            <div>
              {" "}
              <FaCheck
                className={`ms-1 text-success ${
                  !workout.complete && "invisible"
                }`}
              />
            </div>
          </div>

          {workout.exercises.map((e, exerciseIndex) => {
            const isCurrentExerciseComplete = e.sets.every(
              (s) =>
                s.actualReps &&
                s.actualReps !== "" &&
                s.actualWeight &&
                s.actualReps !== ""
            );
            if (!isCurrentExerciseComplete) {
              e.complete = false;
            }
            return (
              <div className="text-center">
                <div className="d-flex justify-content-center alignt-items-center">
                  <Button
                    variant="light"
                    className={`w-100 m-1 ${e.complete && "text-success"} ${
                      currentExerciseIndex === exerciseIndex && "fw-bold"
                    }`}
                    onClick={() => handleWorkoutButtonClick(exerciseIndex)}
                  >
                    {e.name}{" "}
                    <FaCheck
                      className={`ms-1 text-success ${
                        !e.complete && "invisible"
                      }`}
                    />
                  </Button>
                  {exerciseIndex === currentExerciseIndex && (
                    <Button
                      onClick={handleResetExercise}
                      className="m-1"
                      variant="secondary"
                    >
                      Reset
                    </Button>
                  )}
                </div>
                {exerciseIndex === currentExerciseIndex &&
                  e.type === "weight" && (
                    <SetsDisplay
                      sets={e.sets}
                      currentExercise={currentExercise}
                      currentSetIndex={currentSetIndex}
                      setRoutine={setRoutine}
                      setCurrentSetIndex={setCurrentSetIndex}
                    />
                  )}
                {currentExerciseIndex === exerciseIndex && (
                  <Button
                    disabled={
                      !isCurrentExerciseComplete || currentExercise.complete
                    }
                    onClick={handleCompleteExercise}
                    className="m-2"
                    variant="success"
                  >
                    Complete Exercise
                  </Button>
                )}
              </div>
            );
          })}
        </React.Fragment>
      )}
    </div>
  );
};

// const calculateEstimated1RM = (actualReps, actualWeight) => {
//   // Use a formula to estimate 1RM based on the entered data
//   // You can use the Epley, Lombardi, or other formulas depending on your preference
//   // Here, I'm using the Epley formula as an example:
//   const estimated1RM = actualWeight * (1 + actualReps / 30);
//   return estimated1RM;
// };

// const calculateEstimated1RM = (actualReps, actualWeight, effortPercentage) => {
//   // Use a formula to estimate 1RM based on the entered data and effort percentage
//   // Adjusting the formula to make estimated 1RM higher when the percentage is lower
//   // Here, I'm using the Epley formula as an example:
//   const baseEstimated1RM = actualWeight * (1 + actualReps / 30);
//   const divisionFactor = 1.4; // Adjust this factor as needed
//   const adjustedEstimated1RM =
//     baseEstimated1RM / (effortPercentage * divisionFactor);
//   return adjustedEstimated1RM;
// };

const calculateEstimated1RM = (
  actualReps,
  actualWeight,
  effortPercentage,
  previous1RM
) => {
  // Use a formula to estimate 1RM based on the entered data and effort percentage
  // Adjusting the formula based on the difference between actual and previous estimated 1RM
  // Here, I'm using the Epley formula as an example:
  const baseEstimated1RM = actualWeight * (1 + actualReps / 30);

  // Calculate the difference between actual and previous estimated 1RM
  const difference = actualWeight - previous1RM;

  // Adjust the estimated 1RM based on the difference
  const adjustedEstimated1RM =
    baseEstimated1RM + difference * (1 - effortPercentage);

  return adjustedEstimated1RM;
};

const calculateAdjustedEstimated1RM = (
  actualReps,
  actualWeight,
  effortPercentage
) => {
  const epleyEstimated1RM = actualWeight * (1 + actualReps / 30);

  // Calculate the product of actual weight and reps at 50% effort
  const productAt50Percent = actualWeight * actualReps * effortPercentage;

  // Adjust the estimated 1RM by adding a fraction of the difference
  const adjustmentFraction = 0.19; // Adjust as needed
  const adjustedEstimated1RM =
    epleyEstimated1RM +
    adjustmentFraction * (productAt50Percent - epleyEstimated1RM);

  return adjustedEstimated1RM;
};

const adjustSuggestedWeight = (
  suggestedWeight,
  actualWeight,
  suggestedReps,
  actualReps
) => {
  const weightDifference = actualWeight - suggestedWeight;
  const repsDifference = actualReps - suggestedReps;

  // Adjust the suggested weight proportionally based on the differences
  const adjustmentFactor = 0.1; // Adjust as needed
  const adjustedWeight =
    suggestedWeight +
    weightDifference * adjustmentFactor +
    repsDifference * adjustmentFactor;

  // Ensure the adjusted weight is not lower than the suggested weight
  return Math.max(suggestedWeight, adjustedWeight);
};

// const updateMaxFromSet = (
//   currentExercise,
//   currentSetIndex,
//   actualReps,
//   actualWeight
// ) => {
//   const currentSet = currentExercise.sets[currentSetIndex];

//   if (actualReps === currentSet.reps && actualWeight === currentSet.weight) {
//     // User logged the suggested reps and weight, do nothing
//     return currentExercise;
//   }
//   // Update currentExercise.max based on the entered data
//   const estimated1RM = calculateAdjustedEstimated1RM(
//     actualReps,
//     actualWeight,
//     currentSet.percentage
//   );
//   const adjustedWeight = adjustSuggestedWeight(
//     currentSet.weight,
//     actualWeight,
//     currentSet.reps,
//     actualReps
//   );

//   console.log(adjustedWeight);
//   // const offset = calculateEstimated1RM(actualReps * diff, actualWeight * diff);
//   currentExercise.max = estimated1RM;

//   // // Recalculate suggested weight for the remaining sets
//   for (let i = currentSetIndex + 1; i < currentExercise.sets.length; i++) {
//     const percentage = currentExercise.sets[i].percentage;
//     const suggestedWeight = roundToNearestTwoPointFive(
//       estimated1RM * percentage
//     );

//     currentExercise.sets[i].weight = adjustedWeight;
//   }

//   return currentExercise;
// };
const updateMaxFromSet = (
  currentExercise,
  currentSetIndex,
  actualReps,
  actualWeight
) => {
  const sets = currentExercise.sets;
  const currentSet = sets[currentSetIndex];

  if (actualReps === currentSet.reps && actualWeight === currentSet.weight) {
    // User logged the suggested reps and weight, do nothing
    return currentExercise;
  }

  // Update currentExercise.max based on the entered data
  const estimated1RM = calculateAdjustedEstimated1RM(
    actualReps,
    actualWeight,
    currentSet.percentage
  );

  // Recalculate suggested weight for the remaining sets
  for (let i = currentSetIndex + 1; i < sets.length; i++) {
    const suggestedReps = sets[i].reps;
    const suggestedWeight = sets[i].weight;

    // Adjust the suggested weight based on the user's actual performance in the current set
    const adjustedWeight = adjustSuggestedWeight(
      suggestedWeight,
      actualWeight,
      suggestedReps,
      actualReps
    );

    // Update the suggested weight for the next set independently
    sets[i].weight = adjustedWeight;
  }

  // currentExercise.max = estimated1RM;

  return currentExercise;
};

export default WorkoutPage;
