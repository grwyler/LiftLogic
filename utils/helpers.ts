export const saveWorkout = async (workout) => {
  try {
    const response = await fetch("/api/saveWorkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ workout }),
    });

    if (response.ok) {
      console.log("Workout saved successfully!");
    } else {
      console.error("Failed to save workout");
    }
  } catch (error) {
    console.error("Error saving workout:", error);
  }
};
