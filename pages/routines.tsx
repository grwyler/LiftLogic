// pages/routines.tsx
import React, { useEffect, useState } from "react";
import RoutineItem from "../components/RoutineItem";
import { useRouter } from "next/router";
import { useSession, signOut } from "next-auth/react";
import {
  FaArrowLeft,
  FaBackward,
  FaEdit,
  FaList,
  FaPlus,
  FaSignOutAlt,
  FaStepBackward,
} from "react-icons/fa";
import { Button } from "react-bootstrap";
import { Session } from "next-auth";
import WorkoutDisplay from "../components/WorkoutDisplay";
import { IoMdArrowBack } from "react-icons/io";
import Link from "next/link";
import styles from "../styles/routines.module.css";
import CreateRoutine from "../components/CreateRoutine";

const RoutinesPage: React.FC = () => {
  const [isCreatingRoutine, setIsCreatingRoutine] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [isLoadingRoutines, setIsLoadingRoutines] = useState(true);
  const { data: session } = useSession() as {
    data: (Session & { token: { user } }) | null;
  };
  const [routines, setRoutines] = useState<
    Array<{ name: string; description: string }>
  >([]);

  const router = useRouter();

  const handleSwipeLeft = (name) => {
    setRoutines((prevRoutines) =>
      prevRoutines.filter((routine) => routine.name !== name)
    );
  };

  const handleSignOut = () => {
    // Clear the session identifier from local storage
    localStorage.removeItem("sessionId");

    // Redirect to the home page
    router.push("/");
    signOut({ redirect: false });
  };

  const fetchWorkouts = async () => {
    try {
      const response = await fetch(
        `/api/routine?userId=${session?.token.user._id}`
      );
      if (response.ok) {
        const data = await response.json();
        setRoutines(data.routines || []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoadingRoutines(false);
    }
  };
  useEffect(() => {
    if (session?.token.user._id) {
      setIsLoadingRoutines(true);
      fetchWorkouts();
    }
  }, [session?.token.user._id]);
  return (
    <div>
      <nav className={styles.navigation}>
        {(selectedRoutine || isCreatingRoutine) && (
          <Button
            onClick={() => {
              setSelectedRoutine(null);
              setIsCreatingRoutine(false);
            }}
            size="sm"
            variant="link"
            className={styles.navLink}
          >
            <FaArrowLeft />
          </Button>
        )}

        <Button
          size="sm"
          variant="link"
          className={styles.navLink}
          onClick={handleSignOut}
        >
          <FaSignOutAlt />
        </Button>
      </nav>
      {selectedRoutine ? (
        <WorkoutDisplay routine={selectedRoutine} />
      ) : isCreatingRoutine ? (
        <CreateRoutine
          setIsCreatingRoutine={setIsCreatingRoutine}
          routines={routines}
        />
      ) : (
        <div className="">
          {isLoadingRoutines ? (
            <div className="p-3 small text-center">Loading routines...</div>
          ) : routines.length === 0 ? (
            <div className="text-secondary p-3 small text-center">
              No saved routines
            </div>
          ) : (
            <div>
              <h5 className="text-center p-3">Saved Routines</h5>
              {routines.map((routine) => (
                <RoutineItem
                  key={routine.name}
                  routine={routine}
                  onSwipeLeft={() => handleSwipeLeft(routine.name)}
                  setSelectedRoutine={setSelectedRoutine}
                />
              ))}
            </div>
          )}
          <Button
            size="sm"
            className="mx-3 mt-3"
            onClick={() => setIsCreatingRoutine(true)}
          >
            Create Routine <FaPlus />
          </Button>
        </div>
      )}
    </div>
  );
};

export default RoutinesPage;
