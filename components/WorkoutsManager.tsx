import React, { Fragment, useEffect, useState } from "react";
import { FaSpinner } from "react-icons/fa";
import { getWorkoutVariables, saveRoutine } from "../utils/helpers";
import { useSession } from "next-auth/react";
import { Session } from "next-auth";
import WorkoutSelector from "./WorkoutSelector";
import AddExercise from "./AddExercise";
import DaySwitcher from "./DaySwitcher";
import WorkoutDisplay from "./WorkoutDisplay";

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

const WorkoutsManager = ({ routine, setRoutine, date }) => {
  const startDate = date ? new Date(date) : new Date();
  const {
    currentDayIndex,
    setCurrentDayIndex,
    setCurrentExerciseIndex,
    currentDate,
    setCurrentDate,
    workouts,
    setWorkouts,
    currentWorkout,
    setCurrentWorkout,
    selectedWorkoutIndex,
    setSelectedWorkoutIndex,
    userId,
    isAddingExercise,
    setIsAddingExercise,
    previousDayShort,
    formattedDate,
    nextDayShort,
    isLoadingWorkout,
    currentExerciseIndex,
  } = useWorkoutsManagerState(startDate, routine);

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

  const updateWorkoutInRoutine = (workout) => {
    const workoutsCopy = [...workouts];
    setCurrentWorkout(workout);
    workoutsCopy[selectedWorkoutIndex] = workout;
    updateWorkoutsInRoutine(workoutsCopy);
  };
  const updateWorkoutsInRoutine = (theWorkouts) => {
    const routineCopy = { ...routine };
    const currentDayKey = Object.keys(routine.days)[currentDayIndex];
    setWorkouts(theWorkouts);
    routineCopy.days[currentDayKey] = theWorkouts;
    routineCopy.userId = userId;
    setRoutine(routineCopy);
    saveRoutine(routineCopy);
  };
  return (
    <Fragment>
      {isAddingExercise ? (
        <AddExercise
          setIsAddingExercise={setIsAddingExercise}
          currentWorkout={currentWorkout}
          updateWorkoutInRoutine={updateWorkoutInRoutine}
        />
      ) : (
        <Fragment>
          <DaySwitcher
            previousDayShort={previousDayShort}
            formattedDate={formattedDate}
            nextDayShort={nextDayShort}
            handleCurrentDayChange={handleCurrentDayChange}
          />

          {isLoadingWorkout || !currentWorkout ? (
            <Fragment>
              <div className="spinning m-3 text-center">
                <FaSpinner />
              </div>
              {/* <button
            onClick={() => {
              const routineCopy = routines.Primary;
              routineCopy.userId = session?.token.user._id;
              saveRoutine(routineCopy);
            }}
          >
            save
          </button> */}
            </Fragment>
          ) : (
            <Fragment>
              <WorkoutSelector
                currentWorkout={currentWorkout}
                setCurrentWorkout={setCurrentWorkout}
                workouts={workouts}
                setWorkouts={setWorkouts}
                selectedWorkoutIndex={selectedWorkoutIndex}
                setSelectedWorkoutIndex={setSelectedWorkoutIndex}
                updateWorkoutsInRoutine={updateWorkoutsInRoutine}
              />
              <WorkoutDisplay
                currentWorkout={currentWorkout}
                currentExerciseIndex={currentExerciseIndex}
                setCurrentExerciseIndex={setCurrentExerciseIndex}
                formattedDate={formattedDate}
                routineName={routine.name}
                setIsAddingExercise={setIsAddingExercise}
              />
            </Fragment>
          )}
        </Fragment>
      )}
    </Fragment>
  );
};

const useWorkoutsManagerState = (startDate, routine) => {
  // local state
  const [currentDayIndex, setCurrentDayIndex] = useState(startDate.getDay());
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(-1);
  const [isLoadingWorkout, setIsLoadingWorkout] = useState(true);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedWorkoutIndex, setSelectedWorkoutIndex] = useState(0);
  debugger;
  const [currentWorkout, setCurrentWorkout] = useState<Workout | null>(
    workouts.length > 0 ? workouts[selectedWorkoutIndex] : null
  );
  const [currentDate, setCurrentDate] = useState(startDate);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const { data: session } = useSession() as {
    data: (Session & { token: { user } }) | null;
  };

  // derived state
  const currentDay = routine
    ? Object.keys(routine.days)[currentDayIndex]
    : null;
  const userId = session?.token.user._id;

  const { formattedDate, previousDayShort, nextDayShort } = getWorkoutVariables(
    currentDate,
    routine,
    currentDayIndex
  );
  useEffect(() => {
    if (workouts.length > 0) {
      const selectedWorkout =
        workouts[currentWorkout === null ? 0 : selectedWorkoutIndex];
      setCurrentWorkout(selectedWorkout);
    }
  }, [selectedWorkoutIndex, workouts.length]);

  useEffect(() => {
    setWorkouts(() => {
      if (routine) {
        if (currentWorkout) {
          setCurrentWorkout(null);
          setSelectedWorkoutIndex(0);
        }
        const currentDayKey = Object.keys(routine.days)[currentDayIndex];
        const initialWorkouts = routine.days[currentDayKey];

        // Deep copy the initial state to avoid mutation
        return JSON.parse(JSON.stringify(initialWorkouts));
      }
    });
  }, [currentDayIndex]);

  useEffect(() => {
    const fetchExercises = async () => {
      try {
        const url = `/api/exercise?userId=${session?.token.user._id}&date=${formattedDate}&routineName=${routine.name}`;
        const response = await fetch(url);

        if (response.ok) {
          const data = await response.json();

          if (data.exercises.length > 0) {
            const updatedExercises = routine.days[currentDay][
              selectedWorkoutIndex
            ].exercises.map((exercise) => {
              const matchingExercise = data.exercises.find(
                (updatedExercise) => updatedExercise.name === exercise.name
              );

              // If there's a matching exercise, use it, otherwise, keep the original exercise
              return matchingExercise ? matchingExercise : exercise;
            });

            // Deep copy routine to avoid mutation
            const updatedWorkout = JSON.parse(
              JSON.stringify(routine.days[currentDay][selectedWorkoutIndex])
            );

            // Update the deep copy
            updatedWorkout.exercises = updatedExercises;

            setCurrentWorkout(updatedWorkout);
          } else {
            // Deep copy routine to avoid mutation
            const updatedRoutine = JSON.parse(JSON.stringify(routine));
            if (updatedRoutine.days[currentDay][selectedWorkoutIndex]) {
              setCurrentWorkout({
                ...updatedRoutine.days[currentDay][selectedWorkoutIndex],
                exercises: [
                  ...updatedRoutine.days[currentDay][selectedWorkoutIndex]
                    .exercises,
                ],
              });
            }
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
  return {
    currentDayIndex,
    setCurrentDayIndex,
    setCurrentExerciseIndex,
    currentDate,
    setCurrentDate,
    workouts,
    setWorkouts,
    currentWorkout,
    setCurrentWorkout,
    selectedWorkoutIndex,
    setSelectedWorkoutIndex,
    userId,
    isAddingExercise,
    setIsAddingExercise,
    previousDayShort,
    formattedDate,
    nextDayShort,
    isLoadingWorkout,
    currentExerciseIndex,
  };
};

export default WorkoutsManager;
