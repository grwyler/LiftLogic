// pages/routines.tsx
import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Session } from "next-auth";
import WorkoutDisplay from "../components/WorkoutDisplay";
import { fetchWorkouts } from "../utils/helpers";
import { useRouter } from "next/router";
import WorkoutsManager from "../components/WorkoutsManager";

const RoutinesPage: React.FC = () => {
  const router = useRouter();
  const { date } = router.query;
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
    routine && (
      <WorkoutsManager routine={routine} setRoutine={setRoutine} date={date} />
    )
  );
};

export default RoutinesPage;
