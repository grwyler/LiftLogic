import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { Button } from "react-bootstrap";
import { FaChevronLeft, FaChevronRight, FaCheck, FaList } from "react-icons/fa";
import { routines } from "../../utils/sample-data";
import {
  getWorkoutVariables,
  updateWorkoutWithExercises,
} from "../../utils/helpers";
import { useSession } from "next-auth/react";
import { Session } from "next-auth";
import ExercisesDisplay from "../../components/ExercisesDisplay";

type Workout = {
  title: string;
  complete: boolean;
  exercises: Exercise[];
  date?: string;
  userID?: string;
};

type Exercise = {
  name: string;
  type: "weight" | "timed";
  max: number;
  rest: number;
  complete: boolean;
  sets: Set[];
};

type Set = {
  name: string;
  reps: number;
  percentage: number;
  actualReps: string;
  actualWeight: string;
  weight: number;
};

const WorkoutPage = () => {
  // local state
  const router = useRouter();
  const { id } = router.query;
  const initialRoutine = routines[typeof id === "string" ? id : "1"];
  const initialRoutineCopy = { ...initialRoutine };
  const [currentDayIndex, setCurrentDayIndex] = useState(new Date().getDay());
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(null);
  const [routine, setRoutine] = useState(initialRoutine);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [workout, setWorkout] = useState<Workout | null>();
  const { data: session } = useSession() as {
    data: (Session & { token: { user } }) | null;
  };

  const { formattedDate, currentDay, previousDayShort, nextDayShort } =
    getWorkoutVariables(currentDate, routine, currentDayIndex);

  useEffect(() => {
    const fetchExercises = async () => {
      try {
        const url = `/api/exercise?userId=${session?.token.user._id}&date=${formattedDate}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();

          if (data.exercises.length > 0) {
            setWorkout(
              updateWorkoutWithExercises(
                initialRoutineCopy[currentDay],
                data.exercises
              )
            );
          } else {
            setRoutine(initialRoutineCopy);
            setWorkout(routine[currentDay]);
          }
        }
      } catch (error) {
        console.error("Error fetching exercises:", error);
      }
    };

    if (session?.token.user._id && formattedDate) {
      fetchExercises();
    }
  }, [session?.token.user._id, formattedDate]);

  const handleCurrentDayChange = (change) => {
    if (change < 0 && currentDayIndex === 0) {
      setCurrentDayIndex(6);
    } else if (change > 0 && currentDayIndex === 6) {
      setCurrentDayIndex(0);
    } else {
      setCurrentDayIndex(currentDayIndex + change);
    }
    setCurrentExerciseIndex(-1);
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + change);
    setCurrentDate(newDate);
  };

  return (
    <div className="container-fluid">
      {workout && (
        <React.Fragment>
          <div className="d-flex justify-content-between align-items-center bg-light">
            <div>
              <Button
                size="sm"
                variant="light"
                onClick={() => handleCurrentDayChange(-1)}
              >
                <FaChevronLeft /> {previousDayShort}
              </Button>
            </div>
            <div>
              <div className="fw-bold">{formattedDate}</div>
            </div>
            <div>
              <Button
                size="sm"
                variant="light"
                onClick={() => handleCurrentDayChange(1)}
              >
                {nextDayShort} <FaChevronRight />
              </Button>
            </div>
          </div>
          <div className="d-flex justify-content-between align-items-center">
            <Button
              className="me-2 float-start"
              size="sm"
              variant="light"
              href="/routines"
            >
              <FaList />
            </Button>
            <h5 className={workout.complete ? "text-success" : ""}>
              {workout.title}
            </h5>
            <div>
              {" "}
              <FaCheck
                className={`ms-1 text-success ${
                  !workout.complete && "invisible"
                }`}
              />
            </div>
          </div>
          {workout && (
            <ExercisesDisplay
              workout={workout}
              currentExerciseIndex={currentExerciseIndex}
              setCurrentExerciseIndex={setCurrentExerciseIndex}
              formattedDate={formattedDate}
              setRoutine={setRoutine}
            />
          )}
        </React.Fragment>
      )}
    </div>
  );
};

export default WorkoutPage;
