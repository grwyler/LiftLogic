// pages/routines.tsx
import React, { Fragment, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Session } from "next-auth";
import { fetchUser, fetchWorkouts } from "../utils/helpers";
import { useRouter } from "next/router";
import WorkoutsManager from "../components/WorkoutsManager";
import { FaSpinner } from "react-icons/fa";
import UserProfile from "../components/UserProfile";

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
  const [user, setUser] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [isLoadingUser, setIsloadingUser] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setDarkMode(user.darkMode || false);
    }
  });
  useEffect(() => {
    if (session?.token.user._id) {
      fetchWorkouts(setRoutine, session?.token.user._id);
      fetchUser(setUser, session?.token.user._id);
    }
  }, [session?.token.user._id]);

  return (
    <div
      className={`container border p-2 rounded vh-100 ${
        darkMode ? "bg-dark text-white" : ""
      }`}
      style={{ maxWidth: 600, height: "100vh", overflowY: "auto" }}
    >
      {routine && user ? (
        <Fragment>
          <UserProfile
            user={user}
            setUser={setUser}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />
          <WorkoutsManager
            routine={routine}
            setRoutine={setRoutine}
            date={date}
            darkMode={darkMode}
          />
        </Fragment>
      ) : (
        <div className="spinning d-flex p-5 justify-content-center align-items-center">
          Loading
          <FaSpinner className="ms-2" />
        </div>
      )}
    </div>
  );
};

export default RoutinesPage;
