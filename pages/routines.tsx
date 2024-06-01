import React, { Fragment, useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { Session } from "next-auth";
import { fetchUser, fetchWorkouts } from "../utils/helpers";
import { useRouter } from "next/router";
import WorkoutsManager from "../components/WorkoutsManager";
import { FaSignOutAlt, FaSpinner } from "react-icons/fa";
import UserProfile from "../components/UserProfile";
import { Button } from "react-bootstrap";

const RoutinesPage: React.FC = () => {
  const router = useRouter();
  const { date } = router.query;
  const { data: session, status } = useSession() as {
    data: (Session & { token: { user } }) | null;
    status: any;
  };
  const [routine, setRoutine] = useState<{
    name: string;
    description: string;
  } | null>(null);
  const [user, setUser] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return; // Wait until session status is resolved

    // Check if session exists in client-side storage
    const storedSession = localStorage.getItem("session");
    if (!session && storedSession) {
      signIn(); // Restore session if it exists in storage
    }
  }, [session, status]);

  useEffect(() => {
    if (session) {
      // Save session data to client-side storage
      localStorage.setItem("session", JSON.stringify(session));
    } else {
      // Clear session data from client-side storage
      localStorage.removeItem("session");
    }
  }, [session]);

  useEffect(() => {
    if (!session && status === "authenticated") {
      router.push("/");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (
      session &&
      session.token &&
      session.token.user &&
      session.token.user._id
    ) {
      const fetchUserData = async () => {
        try {
          await Promise.all([
            fetchWorkouts(setRoutine, session.token.user._id),
            fetchUser(setUser, session.token.user._id),
          ]);
        } catch (error) {
          console.error("Error fetching data:", error);
        } finally {
          setLoading(false); // Update loading state after fetching data
        }
      };
      fetchUserData();
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    // Request wake lock permission
    let wakeLock: any = null; // Use 'any' type for navigator

    const requestWakeLock = async () => {
      try {
        // Use type assertion to inform TypeScript that 'navigator' has 'wakeLock' property
        wakeLock = await (navigator as any).wakeLock.request("screen");
        console.log("Wake Lock active!");
      } catch (err) {
        console.error(`${err.name}, ${err.message}`);
      }
    };

    requestWakeLock();

    // Cleanup function to release wake lock when the component unmounts
    return () => {
      if (wakeLock !== null) {
        wakeLock.release();
        console.log("Wake Lock released!");
      }
    };
  }, []);

  useEffect(() => {
    if (user && user.darkMode !== undefined && !darkMode) {
      setDarkMode(user.darkMode);
    }
  }, [user]);
  const handleSignOut = async () => {
    try {
      setDarkMode(null);
      await signOut({ redirect: true, callbackUrl: "/" });
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };
  return (
    <div
      className={`container p-2 vh-100 ${darkMode ? "text-white bg-dark" : ""}`}
      style={{ maxWidth: 600, height: "100vh", overflowY: "auto" }}
    >
      {!loading && user && routine ? (
        <Fragment>
          <div className="d-flex justify-content-between ">
            <UserProfile
              user={user}
              setUser={setUser}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
            />
            <Button
              variant={darkMode ? "bg-custom-dark text-white" : "white"}
              onClick={handleSignOut}
            >
              <FaSignOutAlt />
            </Button>
          </div>
          <hr />
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
