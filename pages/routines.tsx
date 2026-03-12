"use client";

import React, { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { Session } from "next-auth";
import { fetchUser, fetchRoutine } from "../utils/helpers";
import { useRouter } from "next/router";
import WorkoutsManager from "../components/WorkoutsManager";
import Header from "../components/Header";
import LoadingIndicator from "../components/LoadingIndicator";
import { Box, Typography } from "@mui/material";

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
      <Box
        sx={{
          minHeight: "100vh",
          px: { xs: 1.5, sm: 2.5 },
          py: { xs: 2, sm: 3 },
          background: darkMode
            ? "radial-gradient(circle at top, rgba(59,130,246,0.1), transparent 36%), linear-gradient(180deg, #020617 0%, #0f172a 100%)"
            : "radial-gradient(circle at top, rgba(148,163,184,0.14), transparent 32%), linear-gradient(180deg, #f8fbff 0%, #e7edf5 100%)",
        }}
      >
        <Box
          sx={{
            maxWidth: 760,
            mx: "auto",
            minHeight: "calc(100vh - 32px)",
            overflowY: "auto",
            backgroundColor: "background.paper",
            color: "text.primary",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: { xs: 4, sm: 5 },
            boxShadow: darkMode
              ? "0 28px 90px rgba(2,6,23,0.42)"
              : "0 26px 72px rgba(15,23,42,0.1)",
            backdropFilter: "blur(20px)",
            overflow: "hidden",
          }}
        >
          {loading ? (
            <LoadingIndicator />
          ) : user && routine ? (
            <>
              <Box
                sx={{
                  px: { xs: 2, sm: 3 },
                  pt: { xs: 2.5, sm: 3 },
                  pb: 2.25,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  background: darkMode
                    ? "linear-gradient(180deg, rgba(59,130,246,0.12) 0%, rgba(255,255,255,0) 100%)"
                    : "linear-gradient(180deg, rgba(148,163,184,0.08) 0%, rgba(255,255,255,0) 100%)",
                }}
              >
                <Typography
                  variant="overline"
                  sx={{
                    color: "text.secondary",
                    letterSpacing: "0.14em",
                    fontWeight: 700,
                  }}
                >
                  Workout Flow
                </Typography>
                <Typography
                  variant="h3"
                  sx={{
                    mt: 0.5,
                    fontFamily: '"Manrope", sans-serif',
                    letterSpacing: "-0.05em",
                  }}
                >
                  Today’s training
                </Typography>
                <Typography sx={{ mt: 1, color: "text.secondary" }}>
                  Pick the day, open the workout, and move through your sets
                  without extra clutter.
                </Typography>
                <Header
                  user={user}
                  setUser={setUser}
                  setDarkMode={setDarkMode}
                  darkMode={darkMode}
                />
              </Box>
              <Box sx={{ px: { xs: 1.5, sm: 2 }, py: { xs: 1.75, sm: 2.25 } }}>
                <WorkoutsManager
                  routine={routine}
                  setRoutine={setRoutine}
                  darkMode={darkMode}
                />
              </Box>
            </>
          ) : null}
        </Box>
      </Box>
    )
  );
};

export default RoutinesPage;
