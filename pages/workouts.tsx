// pages/workouts.tsx
import React, { useState } from "react";
import WorkoutItem from "../components/WorkoutItem";
import { initialWorkouts } from "../utils/sample-data";

const WorkoutsPage: React.FC = () => {
  const [workouts, setWorkouts] =
    useState<Array<{ id: number; name: string }>>(initialWorkouts);

  const handleSwipeLeft = (id) => {
    setWorkouts((prevWorkouts) =>
      prevWorkouts.filter((workout) => workout.id !== id)
    );
  };

  return (
    <div className="container-fluid">
      <h1>Workout Routines</h1>
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
