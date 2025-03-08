import React, { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { Session } from "next-auth";
import { fetchUser, fetchWorkouts } from "../utils/helpers";
import { useRouter } from "next/router";
import WorkoutsManager from "../components/WorkoutsManager";
import Header from "../components/Header";
import LoadingIndicator from "../components/LoadingIndicator";
import dynamic from "next/dynamic";

const RoutinesPage: React.FC = () => {
  const router = useRouter();
  const { date } = router.query;
  const { data: session, status } = useSession() as {
    data: (Session & { token: { user: { _id: string } } }) | null;
    status: any;
  };

  const [routine, setRoutine] = useState<{
    name: string;
    description: string;
  } | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Handle session persistence
  useEffect(() => {
    if (status === "loading") return; // Wait until session is resolved

    const storedSession = localStorage.getItem("session");
    if (!session && storedSession) {
      signIn(); // Restore session if available
    }
  }, [session, status]);

  useEffect(() => {
    if (session) {
      localStorage.setItem("session", JSON.stringify(session));
    } else {
      localStorage.removeItem("session");
    }
  }, [session]);

  useEffect(() => {
    if (!session && status === "authenticated") {
      router.push("/");
    }
  }, [session, status, router]);

  // Fetch user and routine data
  useEffect(() => {
    if (!session?.token?.user?._id) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        await Promise.all([
          fetchWorkouts(setRoutine, session.token.user._id),
          fetchUser(setUser, session.token.user._id),
        ]);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session]);

  // Wake Lock
  useEffect(() => {
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      try {
        wakeLock = await (navigator as any).wakeLock.request("screen");
      } catch (err) {
        console.error(`${err.name}, ${err.message}`);
      }
    };

    requestWakeLock();

    return () => {
      if (wakeLock) {
        wakeLock.release();
      }
    };
  }, []);

  const darkMode = user?.darkMode || false;

  return (
    <div
      className={`container p-2 vh-100 ${darkMode ? "text-white bg-dark" : ""}`}
      style={{ maxWidth: 600, height: "100vh", overflowY: "auto" }}
    >
      {loading ? (
        <LoadingIndicator />
      ) : user && routine ? (
        <>
          <Header user={user} setUser={setUser} />
          <hr />
          <WorkoutsManager
            routine={routine}
            setRoutine={setRoutine}
            date={date}
            darkMode={darkMode}
          />
        </>
      ) : null}
    </div>
  );
};

export default RoutinesPage;
