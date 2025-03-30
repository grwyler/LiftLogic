"use client";

import React, { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { Session } from "next-auth";
import { fetchUser, fetchRoutine } from "../utils/helpers";
import { useRouter } from "next/router";
import WorkoutsManager from "../components/WorkoutsManager";
import Header from "../components/Header";
import LoadingIndicator from "../components/LoadingIndicator";
import { Box } from "@mui/material";

interface Set {
  name: string;
  reps: number;
  percentage: number;
  actualReps: string;
  actualWeight: string;
  weight: number;
}

interface Exercise {
  name: string;
  type: string;
  sets: Set[];
  equipment?: string[];
}

interface DayRoutine {
  title: string;
  exercises: Exercise[];
}

interface Routine {
  _id?: string;
  userId?: string;
  days: {
    sunday: DayRoutine[];
    monday: DayRoutine[];
    tuesday: DayRoutine[];
    wednesday: DayRoutine[];
    thursday: DayRoutine[];
    friday: DayRoutine[];
    saturday: DayRoutine[];
  };
}

const RoutinesPage = ({
  darkMode,
  setDarkMode,
}: {
  darkMode: boolean;
  setDarkMode: (darkMode: boolean) => void;
}) => {
  const router = useRouter();
  const { data: session, status } = useSession() as {
    data: (Session & { token: { user: { _id: string } } }) | null;
    status: any;
  };
  const [routine, setRoutine] = useState<Routine[]>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Handle session persistence
  useEffect(() => {
    if (status === "loading") return;
    const storedSession = localStorage.getItem("session");
    if (!session && storedSession) {
      signIn();
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

  // Fetch user data
  useEffect(() => {
    const userId = session?.token?.user?._id;
    if (!userId) return;
    if (user) return;
    const fetchAndSetUser = async () => {
      try {
        setLoading(true);
        const fetchedUser = await fetchUser(userId);
        setUser(fetchedUser);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAndSetUser();
  }, [session?.token?.user?._id, user]);

  // Fetch routine data
  useEffect(() => {
    const userId = session?.token?.user?._id;
    if (!userId) return;
    if (routine) return;
    const fetchAndSetRoutine = async () => {
      try {
        setLoading(true);
        const fetchedRoutine = await fetchRoutine(userId);
        setRoutine(fetchedRoutine);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAndSetRoutine();
  }, [session?.token?.user?._id, user, routine]);

  // Update darkMode based on the fetched user preference
  useEffect(() => {
    if (user && typeof user.darkMode === "boolean") {
      setDarkMode(user.darkMode);
    }
  }, [user]);

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

  return (
    routine && (
      <div className="container-fluid vh-100" style={{ maxWidth: 600 }}>
        <Box
          sx={{
            maxWidth: 600,
            height: "100vh",
            overflowY: "auto",
            backgroundColor: darkMode ? "grey.900" : "background.paper",
            color: darkMode ? "grey.100" : "text.primary",
          }}
        >
          {loading ? (
            <LoadingIndicator />
          ) : user && routine ? (
            <>
              <Header
                user={user}
                setUser={setUser}
                setDarkMode={setDarkMode}
                darkMode={darkMode}
              />
              <Box sx={{ borderBottom: 1, borderColor: "divider" }} />
              <WorkoutsManager
                routine={routine}
                setRoutine={setRoutine}
                darkMode={darkMode}
              />
            </>
          ) : null}
        </Box>
      </div>
    )
  );
};

export default RoutinesPage;
