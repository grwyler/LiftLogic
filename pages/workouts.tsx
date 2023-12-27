// pages/workouts.tsx
import React, { useState } from "react";
import WorkoutItem from "../components/WorkoutItem";
import { initialWorkouts } from "../utils/sample-data";
import { useRouter } from "next/router";

const WorkoutsPage: React.FC = () => {
  const [workouts, setWorkouts] =
    useState<Array<{ id: number; name: string }>>(initialWorkouts);

  const router = useRouter();

  const handleSwipeLeft = (id) => {
    setWorkouts((prevWorkouts) =>
      prevWorkouts.filter((workout) => workout.id !== id)
    );
  };

  const handleSignOut = () => {
    // Clear the session identifier from local storage
    localStorage.removeItem("sessionId");

    // Redirect to the home page
    router.push("/");
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-evenly">
        <h1>Workout Routines</h1>
        <button className="btn btn-secondary mt-2" onClick={handleSignOut}>
          Sign Out
        </button>
      </div>

      <div>
        {workouts.map((workout) => (
          <WorkoutItem
            key={workout.id}
            workout={workout}
            onSwipeLeft={() => handleSwipeLeft(workout.id)}
          />
        ))}
      </div>
      <button
        className="btn btn-primary"
        onClick={() => console.log("Create Workout")}
      >
        Create Workout
      </button>
    </div>
  );
};

export default WorkoutsPage;
