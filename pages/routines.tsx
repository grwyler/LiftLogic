// pages/routines.tsx
import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Session } from "next-auth";
import WorkoutDisplay from "../components/WorkoutDisplay";
import { fetchWorkouts } from "../utils/helpers";

const RoutinesPage: React.FC = () => {
  const { data: session } = useSession() as {
    data: (Session & { token: { user } }) | null;
  };
  const [routine, setRoutine] = useState<{
    name: string;
    description: string;
  } | null>(null);

  useEffect(() => {
    if (session?.token.user._id) {
      fetchWorkouts(setRoutine, session?.token.user._id);
    }
  }, [session?.token.user._id]);
  return (
    routine && <WorkoutDisplay routine={routine} setRoutine={setRoutine} />
  );
};

export default RoutinesPage;
