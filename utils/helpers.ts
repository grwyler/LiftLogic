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

export const saveSet = async (set) => {
  try {
    const response = await fetch("/api/set", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ set }),
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
export const saveRoutine = async (routine) => {
  try {
    const response = await fetch("/api/routine", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ routine }),
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
  const { previousDayShort, nextDayShort } = getShortenedDays(currentDate);

  return {
    formattedDate,
    previousDayShort,
    nextDayShort,
  };
};

export const roundToNearestFive = (number) => {
  return Math.round(number / 5) * 5;
};

// local helpers

const getShortenedDays = (currentDate) => {
  // Create Date objects for the previous and next days
  const prevDay = new Date(currentDate);
  prevDay.setDate(currentDate.getDate() - 1);

  const nextDay = new Date(currentDate);
  nextDay.setDate(currentDate.getDate() + 1);

  // Format the dates to get the shortened days
  const formattedPrevDay = prevDay.toLocaleDateString("en-US", {
    weekday: "short",
  });
  const formattedNextDay = nextDay.toLocaleDateString("en-US", {
    weekday: "short",
  });

  return { previousDayShort: formattedPrevDay, nextDayShort: formattedNextDay };
};

export const calculateWeights = (totalWeight) => {
  const barbellWeight = 45;
  const availableWeights = {
    "45": 6,
    "35": 2,
    "25": 2,
    "10": 4,
    "5": 2,
    "2.5": 2,
  };

  let remainingWeight = (totalWeight - barbellWeight) / 2; // Divide by 2 for each side
  const requiredWeights = [];
  // Sort weights in descending order
  const sortedWeights = Object.keys(availableWeights).sort(
    (a, b) => parseInt(b) - parseInt(a)
  );

  for (const weight of sortedWeights) {
    const plateWeight = parseFloat(weight);
    let count = Math.min(
      Math.floor(remainingWeight / plateWeight),
      availableWeights[weight]
    );

    if (count > 0) {
      requiredWeights.push(`${count} ${weight}${count > 1 ? "s" : ""}`);
      remainingWeight -= count * plateWeight;
    }
  }

  if (remainingWeight > 0) {
    return "Cannot achieve the exact weight with the available plates.";
  }

  return requiredWeights.join(", ");
};
