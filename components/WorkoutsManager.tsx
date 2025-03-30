import React, { useEffect, useMemo, useState } from "react";
import { saveRoutine } from "../utils/helpers";
import { useSession } from "next-auth/react";
import { Session } from "next-auth";
import WorkoutSelector from "./WorkoutSelector";
import DaySwitcher from "./DaySwitcher";
import WorkoutDisplay from "./WorkoutDisplay";
import LoadingIndicator from "./LoadingIndicator";
import { Box } from "@mui/material";
import ExerciseManager from "./ExerciseManager";

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

const DEFAULT_MAX_WEIGHT = 35; // Default max weight
const DEFAULT_TIME = 60; // Default time for timed exercises
const DEFAULT_REST_TIME = 120; // Rest time in seconds

const generateWeightedSets = (maxWeight: number) => [
  {
    name: "Working set 1",
    reps: 10,
    percentage: 0.75,
    actualReps: "",
    actualWeight: "",
    weight: maxWeight * 0.75,
  },
  {
    name: "Working set 2",
    reps: 10,
    percentage: 0.78,
    actualReps: "",
    actualWeight: "",
    weight: maxWeight * 0.78,
  },
  {
    name: "Working set 3",
    reps: 10,
    percentage: 0.82,
    actualReps: "",
    actualWeight: "",
    weight: maxWeight * 0.82,
  },
];

const generateTimedSet = (time: number) => [
  {
    name: "Timed Set",
    duration: time,
    actualDuration: "",
    complete: false,
  },
];

const WorkoutsManager: React.FC<{
  routine: any;
  setRoutine: (routine: any) => void;
  darkMode: boolean;
}> = ({ routine, setRoutine, darkMode }) => {
  const startDate = new Date();
  const {
    currentDay,
    currentDayIndex,
    setCurrentDayIndex,
    currentDate,
    setCurrentDate,
    workouts,
    currentWorkout,
    selectedWorkoutIndex,
    setSelectedWorkoutIndex,
    currentExerciseIndex,
    setCurrentExerciseIndex,
    isAddingExercise,
    setIsAddingExercise,
    isEditTitle,
    setIsEditTitle,
    isCreateTitle,
    setIsCreateTitle,
    isLoadingWorkout,
    formattedDate,
    exercises,
    setRefetchExercises,
  } = useWorkoutsManagerState(startDate, routine, setRoutine);

  const [isPersistent, setIsPersistent] = useState(true);

  const handleCurrentDayChange = (change: number, isDateSelection: boolean) => {
    let newDate: Date;
    let newDayIndex: number;

    if (isDateSelection) {
      newDate = new Date(change);
      newDayIndex = newDate.getDay();
    } else {
      newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + change);
      newDayIndex = (currentDayIndex + change + 7) % 7; // wrap-around logic
    }

    setCurrentDayIndex(newDayIndex);
    setCurrentExerciseIndex(-1);
  };

  const updateWorkoutsInRoutine = (myWorkouts = workouts) => {
    setRoutine((prevRoutine) => {
      if (!prevRoutine || !prevRoutine.days || !prevRoutine.days[currentDay]) {
        return prevRoutine;
      }
      const updatedRoutine = structuredClone(prevRoutine);
      updatedRoutine.days[currentDay] = myWorkouts;
      saveRoutine(updatedRoutine);
      return updatedRoutine;
    });
  };

  return (
    <Box>
      {isAddingExercise ? (
        <ExerciseManager
          index={currentExerciseIndex}
          darkMode={darkMode}
          isPersistent={isPersistent}
          currentWorkoutTitle={currentWorkout.title}
          setIsAddingExercise={setIsAddingExercise}
          userId={routine.userId}
          date={formattedDate}
          setRefetchExercises={setRefetchExercises}
        />
      ) : (
        <Box>
          <DaySwitcher
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            handleCurrentDayChange={handleCurrentDayChange}
            darkMode={darkMode}
          />

          {isLoadingWorkout || !currentWorkout ? (
            <LoadingIndicator />
          ) : (
            <Box>
              <WorkoutSelector
                setRoutine={updateWorkoutsInRoutine}
                isEditTitle={isEditTitle}
                setIsEditTitle={setIsEditTitle}
                isCreateTitle={isCreateTitle}
                setIsCreateTitle={setIsCreateTitle}
                currentWorkout={currentWorkout}
                workouts={workouts}
                selectedWorkoutIndex={selectedWorkoutIndex}
                setSelectedWorkoutIndex={setSelectedWorkoutIndex}
                // updateExercisesInRoutine={updateExercisesInRoutine}
                darkMode={darkMode}
                setIsAddingExercise={setIsAddingExercise}
                setIsPersistent={setIsPersistent}
                currentDay={currentDay}
              />

              {!isEditTitle && !isCreateTitle && (
                <WorkoutDisplay
                  exercises={exercises}
                  currentWorkout={currentWorkout}
                  currentExerciseIndex={currentExerciseIndex}
                  setCurrentExerciseIndex={setCurrentExerciseIndex}
                  formattedDate={formattedDate}
                  routineName={routine.name}
                  setIsAddingExercise={setIsAddingExercise}
                  darkMode={darkMode}
                  setIsPersistent={setIsPersistent}
                  setRefetchExercises={setRefetchExercises}
                />
              )}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

const useWorkoutsManagerState = (
  startDate: Date,
  routine: any,
  setRoutine: any
) => {
  const [currentDayIndex, setCurrentDayIndex] = useState(startDate.getDay());
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(-1);
  const [isLoadingWorkout, setIsLoadingWorkout] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);

  const [selectedWorkoutIndex, setSelectedWorkoutIndex] = useState(0);
  const [currentDate, setCurrentDate] = useState(startDate);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [isEditTitle, setIsEditTitle] = useState(false);
  const [isCreateTitle, setIsCreateTitle] = useState(false);

  const { data: session } = useSession() as {
    data: (Session & { token: { user: any } }) | null;
  };

  const currentDay = useMemo(() => {
    return routine ? Object.keys(routine.days)[currentDayIndex] : null;
  }, [routine, currentDayIndex]);

  const workouts = useMemo(() => {
    return routine && currentDay ? routine.days[currentDay] : null;
  }, [routine, currentDay]);

  const currentWorkout = useMemo(() => {
    return workouts ? workouts[selectedWorkoutIndex] || null : null;
  }, [workouts, selectedWorkoutIndex]);

  const userId = session?.token?.user?._id;

  const formattedDate = currentDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const [refetchExercises, setRefetchExercises] = useState<boolean>(false);
  useEffect(() => {
    if (!userId || !formattedDate || !currentDay || !currentWorkout?.title)
      return;

    const fetchExercises = async () => {
      setIsLoadingWorkout(true);
      try {
        const response = await fetch(
          `/api/exercise?userId=${userId}&date=${formattedDate}&routineName=${currentWorkout.title}`
        );
        if (!response.ok) return;
        const data = await response.json();
        setExercises(data.exercises);
      } catch (error) {
        console.error("Error fetching exercises:", error);
      } finally {
        setIsLoadingWorkout(false);
      }
    };

    fetchExercises();
  }, [
    userId,
    formattedDate,
    currentDay,
    selectedWorkoutIndex,
    currentWorkout?.title,
    refetchExercises, // refetch when this state changes
  ]);

  return {
    currentDay,
    currentDayIndex,
    setCurrentDayIndex,
    currentDate,
    setCurrentDate,
    workouts,
    currentWorkout,
    selectedWorkoutIndex,
    setSelectedWorkoutIndex,
    currentExerciseIndex,
    setCurrentExerciseIndex,
    isAddingExercise,
    setIsAddingExercise,
    isEditTitle,
    setIsEditTitle,
    isCreateTitle,
    setIsCreateTitle,
    isLoadingWorkout,
    // updateExercisesInRoutine,
    formattedDate,
    exercises,
    refetchExercises,
    setRefetchExercises,
  };
};

export default WorkoutsManager;
