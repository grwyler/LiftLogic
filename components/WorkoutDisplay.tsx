import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { Button } from "react-bootstrap";
import {
  FaChevronLeft,
  FaChevronRight,
  FaCheck,
  FaList,
  FaSpinner,
} from "react-icons/fa";
import {
  getWorkoutVariables,
  updateWorkoutWithExercises,
} from "../utils/helpers";
import { useSession } from "next-auth/react";
import { Session } from "next-auth";
import ExercisesDisplay from "../components/ExercisesDisplay";

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

const WorkoutDisplay = ({ routine }) => {
  // local state
  const router = useRouter();
  const [currentDayIndex, setCurrentDayIndex] = useState(new Date().getDay());
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(-1);
  const [isLoadingWorkout, setIsLoadingWorkout] = useState(true);
  // const [workout, setWorkout] = useState<Workout | null>({
  //   ...routine.days[Object.keys(routine.days)[currentDayIndex]],
  // });
  const [workout, setWorkout] = useState<Workout | null>(() => {
    const currentDayKey = Object.keys(routine.days)[currentDayIndex];
    const initialWorkout = routine.days[currentDayKey];

    // Deep copy the initial state to avoid mutation
    return JSON.parse(JSON.stringify(initialWorkout));
  });
  const currentDay = Object.keys(routine.days)[currentDayIndex];
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: session } = useSession() as {
    data: (Session & { token: { user } }) | null;
  };

  const { formattedDate, previousDayShort, nextDayShort } = getWorkoutVariables(
    currentDate,
    routine,
    currentDayIndex
  );

  useEffect(() => {
    const fetchExercises = async () => {
      try {
        const url = `/api/exercise?userId=${session?.token.user._id}&date=${formattedDate}&routineName=${routine.name}`;
        const response = await fetch(url);

        if (response.ok) {
          const data = await response.json();

          if (data.exercises.length > 0) {
            const updatedExercises = routine.days[currentDay].exercises.map(
              (exercise) => {
                const matchingExercise = data.exercises.find(
                  (updatedExercise) => updatedExercise.name === exercise.name
                );

                // If there's a matching exercise, use it, otherwise, keep the original exercise
                return matchingExercise ? matchingExercise : exercise;
              }
            );

            // Deep copy routine to avoid mutation
            const updatedWorkout = JSON.parse(
              JSON.stringify(routine.days[currentDay])
            );

            // Update the deep copy
            updatedWorkout.exercises = updatedExercises;

            setWorkout(updatedWorkout);
          } else {
            // Deep copy routine to avoid mutation
            const updatedRoutine = JSON.parse(JSON.stringify(routine));

            setWorkout({
              ...updatedRoutine.days[currentDay],
              exercises: [...updatedRoutine.days[currentDay].exercises],
            });
          }
        }
      } catch (error) {
        console.error("Error fetching exercises:", error);
      } finally {
        setIsLoadingWorkout(false);
      }
    };

    if (session?.token.user._id && formattedDate) {
      fetchExercises();
    }
  }, [session?.token.user._id, formattedDate, currentDay]);

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

  return isLoadingWorkout ? (
    <div className="spinning m-3 text-center">
      <FaSpinner />
    </div>
  ) : (
    <React.Fragment>
      <div className="d-flex justify-content-between align-items-center border bg-light p-3">
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
      <div className="d-flex justify-content-center align-items-center m-3">
        <h5 className={workout.complete ? "text-success" : ""}>
          {workout.title}
        </h5>
        <div>
          <FaCheck
            className={`ms-1 text-success ${!workout.complete && "invisible"}`}
          />
        </div>
      </div>

      <ExercisesDisplay
        workout={workout}
        currentExerciseIndex={currentExerciseIndex}
        setCurrentExerciseIndex={setCurrentExerciseIndex}
        formattedDate={formattedDate}
        routineName={routine.name}
      />
    </React.Fragment>
  );
};

export default WorkoutDisplay;
