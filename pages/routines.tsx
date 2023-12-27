// pages/routines.tsx
import React, { useEffect, useState } from "react";
import RoutineItem from "../components/RoutineItem";
import { initialWorkouts } from "../utils/sample-data";
import { useRouter } from "next/router";
import { useSession, signOut } from "next-auth/react";

const RoutinesPage: React.FC = () => {
  const { data: session } = useSession();
  const [routines, setRoutines] =
    useState<Array<{ id: number; name: string }>>(initialWorkouts);

  const router = useRouter();

  const handleSwipeLeft = (id) => {
    setRoutines((prevRoutines) =>
      prevRoutines.filter((routine) => routine.id !== id)
    );
  };

  const handleSignOut = () => {
    // Clear the session identifier from local storage
    localStorage.removeItem("sessionId");

    // Redirect to the home page
    router.push("/");
    signOut({ redirect: false });
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
        {routines.map((workout) => (
          <RoutineItem
            key={workout.id}
            workout={workout}
            onSwipeLeft={() => handleSwipeLeft(workout.id)}
          />
        ))}
      </div>
      <button className="btn btn-primary">Create Routine</button>
    </div>
  );
};

export default RoutinesPage;
