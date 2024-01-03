import React, { useState } from "react";
import { Button } from "react-bootstrap";
import { FaCheck, FaPlus } from "react-icons/fa";
import SelectedSetItem from "./SelectedSetItem";
import CompletedSetItem from "./CompletedSetItem";
import SetItem from "./SetItem";
import { v4 } from "uuid";
const ExerciseItem = ({
  exercise,
  exerciseIndex,
  workout,
  currentExerciseIndex,
  setCurrentExerciseIndex,
  formattedDate,
  routineName,
}) => {
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [currentExercise, setCurrentExercise] = useState(exercise);

  const handleWorkoutButtonClick = (exerciseIndex) => {
    if (currentExerciseIndex === exerciseIndex) {
      setCurrentExerciseIndex(-1);
    } else {
      setCurrentExerciseIndex(exerciseIndex);
    }

    let index = 0;
    while (
      currentExercise.sets[index] &&
      currentExercise.sets[index].complete
    ) {
      index++;
    }
    setCurrentSetIndex(index);
  };
  const handleAddSet = () => {
    const sets = [...currentExercise.sets];
    if (sets && sets.length > 0) {
      const lastSet = sets[sets.length - 1];
      const lastCharacterInName = parseInt(
        lastSet.name.slice(lastSet.name.length - 1)
      );
      let newName;
      if (isNaN(lastCharacterInName)) {
        newName = `${lastSet.name}-1`;
      } else {
        newName = `${lastSet.name.slice(0, lastSet.name.length - 1)}${
          lastCharacterInName + 1
        }`;
      }
      const count = isNaN(parseInt(lastSet.name.slice(lastSet.name.length - 1)))
        ? 0
        : parseInt(lastSet.name.slice(lastSet.name.length - 1)) + 1;
      const newSet = {
        ...lastSet,
        weight: lastSet.weight + lastSet.weight * 0.05,
        reps: lastSet.reps,
        actualWeight: "",
        actualReps: "",
        complete: false,
        name: `${lastSet.name.slice(0, lastSet.name.length - 1)}${count}`,
      };
      sets.push(newSet);
      setCurrentExercise({ ...currentExercise, sets });
    }
  };
  const handleDeleteSet = (setName) => {
    const sets = [...currentExercise.sets];
    setCurrentExercise({
      ...currentExercise,
      sets: sets.filter((s) => s.name !== setName),
    });
  };
  return (
    <div key={v4()} className="text-center container-fluid border-bottom border-secondary">
      <div className="d-flex justify-content-center alignt-items-center">
        <Button
          variant={`${(currentExerciseIndex === exerciseIndex) ? "primary" : "secondary"}`}
          className={`w-100 my-2 ${
            currentExercise.complete && "text-white bg-success"
          } ${currentExerciseIndex === exerciseIndex && "fw-normal"}`}
          onClick={() => handleWorkoutButtonClick(exerciseIndex)}
          style={{
            boxShadow:
              currentExerciseIndex === exerciseIndex
                ? "0 0 10px rgba(0, 120, 244, 0.6)"
                : "none",
          }}
        >
          <span className="font-Inter fw-light">{currentExercise.name}{" "}</span>
          <FaCheck
            className={`ms-1 text-white ${
              !currentExercise.complete && "invisible"
            }`}
          />
        </Button>
      </div>
      {exerciseIndex === currentExerciseIndex &&
        currentExercise.sets &&
        currentExercise.sets.map((s, i) => {
          return i === currentSetIndex ? (
            <SelectedSetItem
              key={v4()}
              routineName={routineName}
              set={s}
              currentExercise={currentExercise}
              setIndex={i}
              currentExerciseIndex={currentExerciseIndex}
              setCurrentSetIndex={setCurrentSetIndex}
              formattedDate={formattedDate}
              setCurrentExerciseIndex={setCurrentExerciseIndex}
              workout={workout}
            />
          ) : s.complete ? (
            <CompletedSetItem
              key={v4()}
              set={s}
              setIndex={i}
              setCurrentSetIndex={setCurrentSetIndex}
              type={currentExercise.type}
            />
          ) : (
            <SetItem
              key={v4()}
              set={s}
              handleDeleteSet={(setName) => handleDeleteSet(setName)}
              type={currentExercise.type}
            />
          );
        })}
      {exerciseIndex === currentExerciseIndex && (
        <Button
          variant="outline-info"
          className="w-100 mb-3"
          onClick={handleAddSet}
        >
          Add Set <FaPlus />
        </Button>
      )}
    </div>
  );
};

export default ExerciseItem;
