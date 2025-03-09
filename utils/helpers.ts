import axios from "axios";
import { intitialRoutine } from "./sample-data";

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
export const saveUser = async (user) => {
  try {
    const response = await fetch("/api/user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user }),
    });

    if (response.ok) {
      const data = await response.json(); // ✅ Parse response JSON
      data.success = true;
      return data; // ✅ Return the response data
    } else {
      return { success: false };
    }
  } catch (error) {
    console.error("Error saving user inputs:", error);
  }
};

export const getWorkoutVariables = (currentDate, routine, currentDayIndex) => {
  const formattedDate = currentDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
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
      requiredWeights.push(`${count}x ${weight} lbs.`);
      remainingWeight -= count * plateWeight;
    }
  }

  if (remainingWeight > 0) {
    return "Cannot achieve the exact weight with the available plates.";
  }

  return requiredWeights.join(", ");
};

export const formatTime = (totalSeconds) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  const formattedTime = `${hours > 0 ? hours + "h " : ""}${
    minutes > 0 ? minutes + "m " : ""
  }${remainingSeconds > 0 ? remainingSeconds + "s" : ""}`;

  return formattedTime.trim();
};

export const fetchWorkouts = async (setRoutine, userId) => {
  try {
    const response = await fetch(`/api/routine?userId=${userId}`);
    if (response.ok) {
      const data = await response.json();
      setRoutine(data.routines[0] || intitialRoutine);
    }
  } catch (error) {
    console.error("Error fetching users:", error);
  }
};

export async function getImageFromOpenAI(
  setImage: Function,
  setIsLoading: Function,
  userInput: string
) {
  setIsLoading(true);

  const prompt = userInput;
  axios({
    method: "post",
    url: "https://api.openai.com/v1/images/generations",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer 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`,
    },
    data: {
      prompt,
      n: 1,
      size: "512x512",
      response_format: "url",
    },
  })
    .then((response) => {
      const imageUrl = response.data.data[0].url;
      setImage(imageUrl);
      setIsLoading(false);
    })
    .catch((error) => {
      console.error(error);
    });
}
export const fetchUser = async (setUser, id) => {
  try {
    const response = await fetch(`/api/user?id=${id}`);
    const data = await response.json();

    setUser(data.user);
  } catch (error) {
    console.error("Error fetching users:", error);
  }
};

export const emptyOrNullToZero = (value) => {
  // Check if the value is an empty string or null
  if (value === "" || !value) {
    return 0; // Return 0 if empty string or null
  } else {
    return value; // Return the original value if not empty string or null
  }
};

export const toTitleCase = (text: string) =>
  text.replace(/\b\w/g, (char) => char.toUpperCase());
