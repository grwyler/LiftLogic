"use client";

import React, { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { Session } from "next-auth";
import { fetchUser, fetchRoutine } from "../utils/helpers";
import { useRouter } from "next/router";
import WorkoutsManager from "../components/WorkoutsManager";
import Header from "../components/Header";
import LoadingIndicator from "../components/LoadingIndicator";

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
  // Replace _id with whatever ID field your DB actually has
  _id?: string;
  userId?: string;
  // If your routine doc structure is exactly the same as intitialRoutine,
  // you might have "days" with sunday, monday, etc.
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

const RoutinesPage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession() as {
    data: (Session & { token: { user: { _id: string } } }) | null;
    status: any;
  };
  const [routine, setRoutine] = useState<Routine[]>(null);

  // const [routine, setRoutine] = useState<{
  //   name: string;
  //   description: string;
  // } | null>(null);
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
    const userId = session?.token?.user?._id;
    if (!userId) return;

    // If user is already set, no need to fetch again.
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

  useEffect(() => {
    const userId = session?.token?.user?._id;
    if (!userId) return;

    // If routine is already set, no need to fetch again.
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

  // useEffect(() => {
  //   (async function fetchRoutines() {
  //     try {
  //       const res = await fetch(`/api/routine?userId=${user._id}`);
  //       if (!res.ok) {
  //         throw new Error("Failed to fetch routines.");
  //       }
  //       const data = await res.json();
  //       // data.routines should be an array of routine documents
  //       setRoutine(data.routines || []);
  //     } catch (error) {
  //       console.error(error);
  //     }
  //   })();
  // }, [user?._id]);

  // Create or update a routine
  // In many cases you’d manage a single routine object
  // and store that, but here’s a bare-bones version:
  async function handleSaveRoutine(routineToSave: Routine) {
    try {
      const response = await fetch("/api/routine", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ routine: routineToSave }),
      });

      if (!response.ok) {
        throw new Error("Error saving routine.");
      }
      // Optionally refetch or optimistically update local state
      console.log("Routine saved successfully!");
    } catch (error) {
      console.error("Error saving routine:", error);
    }
  }

  // Delete a routine by `name` (as used in your DELETE logic)
  async function handleDeleteRoutine(nameOfRoutine: string) {
    try {
      // The API code expects ?userId and ?name
      const res = await fetch(
        `/api/routine?userId=${user._id}&name=${encodeURIComponent(
          nameOfRoutine
        )}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        throw new Error("Error deleting routine.");
      }
      // Remove the routine from local state to reflect the deletion
      setRoutine((prev) =>
        prev.filter((rt) => rt.days?.[nameOfRoutine] === undefined)
      );
      console.log("Routine deleted successfully!");
    } catch (error) {
      console.error(error);
    }
  }

  const darkMode = user?.darkMode || false;

  return (
    routine && (
      <div
        className={`container p-2 vh-100 ${
          darkMode ? "text-white bg-dark" : ""
        }`}
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
              darkMode={darkMode}
            />
          </>
        ) : null}
      </div>
    )
  );
};

export default RoutinesPage;
