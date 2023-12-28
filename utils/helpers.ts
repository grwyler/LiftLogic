export const saveExercise = async (exercise) => {
  try {
    const response = await fetch("/api/exercise", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ exercise }),
    });

    if (response.ok) {
      console.log("User inputs saved successfully!");
    } else {
      console.error("Failed to save user inputs");
    }
  } catch (error) {
    console.error("Error saving user inputs:", error);
  }
};

export const updateWorkoutWithExercises = (workout, exercises) => {
  const updatedExercises = workout.exercises.map((exercise) => {
    const matchingExercise = exercises.find((fetchedExercise) => {
      const isMatch = exercise.name === fetchedExercise.name;
      return isMatch;
    });

    if (matchingExercise) {
      const updatedSets = exercise.sets.map((set, setIndex) => {
        const fetchedSet = matchingExercise.sets[setIndex];
        return {
          ...set,
          actualReps: fetchedSet.actualReps,
          actualWeight: fetchedSet.actualWeight,
        };
      });

      return {
        ...exercise,
        sets: updatedSets,
        complete: matchingExercise.complete,
      };
    } else {
      return exercise; // Keep unchanged exercises as is
    }
  });

  return {
    ...workout,
    exercises: updatedExercises,
  };
};

export const getWorkoutVariables = (currentDate, routine, currentDayIndex) => {
  const formattedDate = currentDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const currentDay = Object.keys(routine)[currentDayIndex];
  const previousDayIndex = currentDayIndex === 0 ? 6 : currentDayIndex - 1;
  const previousDay = Object.keys(routine)[previousDayIndex];
  const capitalizedPreviousDay =
    previousDay.charAt(0).toUpperCase() + previousDay.slice(1);
  const nextDayIndex = currentDayIndex === 6 ? 0 : currentDayIndex + 1;
  const nextDay = Object.keys(routine)[nextDayIndex];
  const capitalizedNextDay = nextDay.charAt(0).toUpperCase() + nextDay.slice(1);
  return {
    formattedDate,
    currentDay,
    capitalizedNextDay,
    capitalizedPreviousDay,
  };
};
