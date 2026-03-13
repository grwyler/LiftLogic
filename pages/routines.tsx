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
  reps?: number;
  percentage?: number;
  actualReps?: string | number;
  actualWeight?: string | number;
  weight?: number;
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
    status: string;
  };
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    const userId = session?.token?.user?._id;
    if (!userId) return;

    const fetchPageData = async () => {
      try {
        setLoading(true);
        const [fetchedUser, fetchedRoutine] = await Promise.all([
          fetchUser(userId),
          fetchRoutine(userId),
        ]);
        setUser(fetchedUser);
        setRoutine(fetchedRoutine);
      } catch (error) {
        console.error("Error fetching routines page data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPageData();
  }, [session?.token?.user?._id]);

  useEffect(() => {
    if (user && typeof user.darkMode === "boolean") {
      setDarkMode(user.darkMode);
    }
  }, [user, setDarkMode]);

  useEffect(() => {
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      try {
        if ((navigator as any)?.wakeLock) {
          wakeLock = await (navigator as any).wakeLock.request("screen");
        }
      } catch (error: any) {
        console.error(`${error?.name}, ${error?.message}`);
      }
    };

    requestWakeLock();

    return () => {
      if (wakeLock) {
        wakeLock.release();
      }
    };
  }, []);

  const renderBody = () => {
    if (loading || status === "loading") {
      return <LoadingIndicator />;
    }

    if (user && routine) {
      return (
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
              Today&apos;s training
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
      );
    }

    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6">Loading your workouts...</Typography>
        <Typography sx={{ mt: 1, color: "text.secondary" }}>
          If this sticks, refresh once and I&apos;ll trace the next issue.
        </Typography>
      </Box>
    );
  };

  return (
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
        {renderBody()}
      </Box>
    </Box>
  );
};

export default RoutinesPage;
