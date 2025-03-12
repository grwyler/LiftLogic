import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { FaSpinner } from "react-icons/fa";
import { saveRoutine } from "../utils/helpers";
import { useSession } from "next-auth/react";
import { Session } from "next-auth";
import WorkoutSelector from "./WorkoutSelector";
import DaySwitcher from "./DaySwitcher";
import WorkoutDisplay from "./WorkoutDisplay";
import ExerciseSelector from "./ExerciseSelector";

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

const generateWeightedSets = (maxWeight) => [
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

const generateTimedSet = (time) => [
  {
    name: "Timed Set",
    duration: time,
    actualDuration: "",
    complete: false,
  },
];

const WorkoutsManager = ({ routine, setRoutine, darkMode }) => {
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
    updateExercisesInRoutine,
    formattedDate,
  } = useWorkoutsManagerState(startDate, routine, setRoutine);

  const [isPersistent, setIsPersistent] = useState(true);

  const handleCurrentDayChange = (change, isDateSelection) => {
    let newDate;
    let newDayIndex;

    if (isDateSelection) {
      newDate = new Date(change);
      newDayIndex = newDate.getDay();
    } else {
      newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + change);
      newDayIndex = (currentDayIndex + change + 7) % 7; // Ensures it wraps around correctly
    }

    setCurrentDayIndex(newDayIndex);
    setCurrentExerciseIndex(-1);
  };

  const updateWorkoutsInRoutine = (
    myWorkouts = workouts // default to the current day's workouts
  ) => {
    setRoutine((prevRoutine) => {
      // Ensure the routine exists and that the current day key is valid
      if (!prevRoutine || !prevRoutine.days || !prevRoutine.days[currentDay]) {
        return prevRoutine;
      }

      // Create a deep copy of the routine to avoid mutation
      const updatedRoutine = structuredClone(prevRoutine);

      // Update the workouts for the current day
      updatedRoutine.days[currentDay] = myWorkouts;

      // Save the updated routine
      saveRoutine(updatedRoutine);

      return updatedRoutine;
    });
  };

  const addExerciseToWorkout = (exercise) => {
    const workoutCopy = structuredClone(currentWorkout);
    const exercisesCopy = structuredClone(workoutCopy.exercises);
    const isWeighted =
      exercise?.equipment?.toString().trim().toLowerCase() !== "bodyweight";
    const workoutType = isWeighted ? "weight" : "timed";
    const transformedExercise = {
      name: exercise.name,
      type: exercise.type || workoutType,
      max: exercise.max || isWeighted ? DEFAULT_MAX_WEIGHT : DEFAULT_TIME,
      rest: exercise.rest || DEFAULT_REST_TIME,
      complete: exercise.complete || false,
      sets:
        exercise.sets || isWeighted
          ? generateWeightedSets(DEFAULT_MAX_WEIGHT)
          : generateTimedSet(DEFAULT_TIME),
      isPersistent: exercise.isPersistent || isPersistent,
    } as Exercise;
    exercisesCopy.push(transformedExercise);
    updateExercisesInRoutine(exercisesCopy);
  };

  return (
    <Fragment>
      {isAddingExercise ? (
        <ExerciseSelector
          setIsAddingExercise={setIsAddingExercise}
          addExerciseToWorkout={addExerciseToWorkout}
          darkMode={false}
          isPersistent={isPersistent}
        />
      ) : (
        <Fragment>
          <DaySwitcher
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            handleCurrentDayChange={handleCurrentDayChange}
            darkMode={darkMode}
          />
          <hr />
          {isLoadingWorkout || !currentWorkout ? (
            <Fragment>
              <div className="spinning m-3 text-center">
                <FaSpinner />
              </div>
            </Fragment>
          ) : (
            <Fragment>
              <WorkoutSelector
                setRoutine={setRoutine}
                isEditTitle={isEditTitle}
                setIsEditTitle={setIsEditTitle}
                isCreateTitle={isCreateTitle}
                setIsCreateTitle={setIsCreateTitle}
                currentWorkout={currentWorkout}
                workouts={workouts}
                selectedWorkoutIndex={selectedWorkoutIndex}
                setSelectedWorkoutIndex={setSelectedWorkoutIndex}
                updateWorkoutsInRoutine={updateWorkoutsInRoutine}
                darkMode={darkMode}
                setIsAddingExercise={setIsAddingExercise}
                setIsPersistent={setIsPersistent}
                currentDay={currentDay}
              />
              <hr />
              {!isEditTitle && !isCreateTitle && (
                <WorkoutDisplay
                  currentWorkout={currentWorkout}
                  currentExerciseIndex={currentExerciseIndex}
                  setCurrentExerciseIndex={setCurrentExerciseIndex}
                  formattedDate={formattedDate}
                  routineName={routine.name}
                  setIsAddingExercise={setIsAddingExercise}
                  updateExercisesInRoutine={updateExercisesInRoutine}
                  darkMode={darkMode}
                  setIsPersistent={setIsPersistent}
                />
              )}
            </Fragment>
          )}
        </Fragment>
      )}
    </Fragment>
  );
};

const useWorkoutsManagerState = (startDate, routine, setRoutine) => {
  // Local state
  const [currentDayIndex, setCurrentDayIndex] = useState(startDate.getDay());
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(-1);
  const [isLoadingWorkout, setIsLoadingWorkout] = useState(false);
  // const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);

  const [selectedWorkoutIndex, setSelectedWorkoutIndex] = useState(0);
  const [currentDate, setCurrentDate] = useState(startDate);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [isEditTitle, setIsEditTitle] = useState(false);
  const [isCreateTitle, setIsCreateTitle] = useState(false);

  const { data: session } = useSession() as {
    data: (Session & { token: { user } }) | null;
  };

  // Derived state
  const currentDay = useMemo(() => {
    return routine ? Object.keys(routine.days)[currentDayIndex] : null;
  }, [routine, currentDayIndex]);

  const workouts = useMemo(() => {
    // Only attempt to access workouts if both routine and currentDay exist
    return routine && currentDay ? routine.days[currentDay] : null;
  }, [routine, currentDay]);

  const currentWorkout = useMemo(() => {
    // If workouts exist, select the workout by index
    return workouts ? workouts[selectedWorkoutIndex] || null : null;
  }, [workouts, selectedWorkoutIndex]);

  const userId = session?.token?.user?._id;

  const formattedDate = currentDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Derive current workout instead of storing it separately
  // const currentWorkout = useMemo(
  //   () => workouts[selectedWorkoutIndex] || null,
  //   [workouts, selectedWorkoutIndex]
  // );

  /** Updates the entire workout list in routine */
  // const updateWorkoutsInRoutine = useCallback(
  //   (updatedWorkouts: Workout[]) => {
  //     if (!routine || !currentDay) return;

  //     const newRoutine = structuredClone(routine);
  //     const newWorkouts = structuredClone(updatedWorkouts).map((workout) => ({
  //       ...workout,
  //       complete: false,
  //       exercises: workout.exercises.map((exercise) => ({
  //         ...exercise,
  //         complete: false,
  //         sets: exercise.sets.map((set) => ({
  //           ...set,
  //           actualReps: "",
  //           actualWeight: "",
  //           complete: false,
  //         })),
  //       })),
  //     }));

  //     // newRoutine.days[currentDay] = newWorkouts;
  //     newRoutine.userId = userId;

  //     setWorkouts(newWorkouts);
  //     setRoutine(newRoutine);
  //     saveRoutine(newRoutine);
  //   },
  //   [routine, currentDay, userId, setRoutine]
  // );

  /** Updates a single workout inside the routine */
  // const updateWorkoutInRoutine = useCallback(
  //   (updatedWorkout: Workout) => {
  //     const newWorkouts = structuredClone(workouts);
  //     newWorkouts[selectedWorkoutIndex] = updatedWorkout;
  //     updateWorkoutsInRoutine(newWorkouts);
  //   },
  //   [workouts, selectedWorkoutIndex, updateWorkoutsInRoutine]
  // );

  // // Effect: Update workouts when the current day changes
  // useEffect(() => {
  //   if (!routine || !currentDay) return;

  //   setWorkouts(() => {
  //     if (currentWorkout) {
  //       setSelectedWorkoutIndex(0);
  //     }
  //     return structuredClone(routine.days[currentDay]) || [];
  //   });
  // }, [routine, currentDay]);

  const updateExercisesInRoutine = (myExercises = currentWorkout.exercises) => {
    setRoutine((prevRoutine) => {
      // Make sure the routine exists and has the expected structure
      if (!prevRoutine || !prevRoutine.days || !prevRoutine.days[currentDay]) {
        return prevRoutine;
      }

      // Clone the routine to avoid mutations
      const updatedRoutine = structuredClone(prevRoutine);

      // Check if the specific workout exists
      if (!updatedRoutine.days[currentDay][selectedWorkoutIndex]) {
        return prevRoutine;
      }

      // Update the exercises for the given workout
      updatedRoutine.days[currentDay][selectedWorkoutIndex].exercises =
        myExercises;
      debugger;

      // save routine in the database
      saveRoutine(updatedRoutine);

      return updatedRoutine;
    });
  };

  // Effect: Fetch exercises when user, date, or workout changes
  useEffect(() => {
    if (!userId || !formattedDate || !currentDay || !routine) return;

    const fetchExercises = async () => {
      setIsLoadingWorkout(true);
      try {
        const response = await fetch(
          `/api/exercise?userId=${userId}&date=${formattedDate}&routineName=${routine.name}`
        );
        if (!response.ok) return;

        const data = await response.json();
        if (data.exercises.length === 0) return;

        updateExercisesInRoutine(data.exercises);

        setExercises(data.exercises);
      } catch (error) {
        console.error("Error fetching exercises:", error);
      } finally {
        setIsLoadingWorkout(false);
      }
    };

    fetchExercises();
  }, [userId, formattedDate, currentDay, selectedWorkoutIndex, routine]);

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
    // updateWorkoutInRoutine,
    updateExercisesInRoutine,
    formattedDate,
  };
};

export default WorkoutsManager;
