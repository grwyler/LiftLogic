import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { FaSpinner } from "react-icons/fa";
import { getWorkoutVariables, saveRoutine } from "../utils/helpers";
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
    updateWorkoutInRoutine,
    updateWorkoutsInRoutine,
    formattedDate,
  } = useWorkoutsManagerState(startDate, routine, setRoutine);

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
    setCurrentDate(newDate);
  };

  const addExerciseToWorkout = (exercise) => {
    const workoutCopy = structuredClone(workouts[selectedWorkoutIndex]);
    const exercisesCopy = structuredClone(workoutCopy.exercises);
    // Determine workout type based on equipment
    const isWeighted =
      exercise?.equipment?.trim().toLowerCase() !== "bodyweight";
    const workoutType = isWeighted ? "weight" : "timed";

    const transformedExercise = {
      name: exercise.name,
      type: workoutType,
      max: isWeighted ? DEFAULT_MAX_WEIGHT : DEFAULT_TIME,
      rest: DEFAULT_REST_TIME,
      complete: false,
      sets: isWeighted
        ? generateWeightedSets(DEFAULT_MAX_WEIGHT)
        : generateTimedSet(DEFAULT_TIME),
    } as Exercise;
    exercisesCopy.push(transformedExercise);
    updateWorkoutInRoutine({ ...workoutCopy, exercises: exercisesCopy });
  };

  return (
    <Fragment>
      {isAddingExercise ? (
        <ExerciseSelector
          setIsAddingExercise={setIsAddingExercise}
          addExerciseToWorkout={addExerciseToWorkout}
          darkMode={false}
        />
      ) : (
        <Fragment>
          <DaySwitcher
            currentDate={currentDate}
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
                  updateWorkoutInRoutine={updateWorkoutInRoutine}
                  darkMode={darkMode}
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
  const [isLoadingWorkout, setIsLoadingWorkout] = useState(true);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedWorkoutIndex, setSelectedWorkoutIndex] = useState(0);
  const [currentDate, setCurrentDate] = useState(startDate);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [isEditTitle, setIsEditTitle] = useState(false);
  const [isCreateTitle, setIsCreateTitle] = useState(false);

  const { data: session } = useSession() as {
    data: (Session & { token: { user } }) | null;
  };

  const userId = session?.token?.user?._id;

  // Derived state
  const currentDay = useMemo(
    () => (routine ? Object.keys(routine.days)[currentDayIndex] : null),
    [routine, currentDayIndex]
  );
  const { formattedDate } = getWorkoutVariables(
    currentDate,
    routine,
    currentDayIndex
  );

  // Derive current workout instead of storing it separately
  const currentWorkout = useMemo(
    () => workouts[selectedWorkoutIndex] || null,
    [workouts, selectedWorkoutIndex]
  );

  /** Updates the entire workout list in routine */
  const updateWorkoutsInRoutine = useCallback(
    (updatedWorkouts: Workout[]) => {
      if (!routine || !currentDay) return;

      const newRoutine = structuredClone(routine);
      const newWorkouts = structuredClone(updatedWorkouts).map((workout) => ({
        ...workout,
        complete: false,
        exercises: workout.exercises.map((exercise) => ({
          ...exercise,
          complete: false,
          sets: exercise.sets.map((set) => ({
            ...set,
            actualReps: "",
            actualWeight: "",
            complete: false,
          })),
        })),
      }));

      newRoutine.days[currentDay] = newWorkouts;
      newRoutine.userId = userId;

      setWorkouts(newWorkouts);
      setRoutine(newRoutine);
      saveRoutine(newRoutine);
    },
    [routine, currentDay, userId, setRoutine]
  );

  /** Updates a single workout inside the routine */
  const updateWorkoutInRoutine = useCallback(
    (updatedWorkout: Workout) => {
      const newWorkouts = structuredClone(workouts);
      newWorkouts[selectedWorkoutIndex] = updatedWorkout;
      updateWorkoutsInRoutine(newWorkouts);
    },
    [workouts, selectedWorkoutIndex, updateWorkoutsInRoutine]
  );

  // Effect: Update workouts when the current day changes
  useEffect(() => {
    if (!routine || !currentDay) return;

    setWorkouts(() => {
      if (currentWorkout) {
        setSelectedWorkoutIndex(0);
      }
      return structuredClone(routine.days[currentDay]) || [];
    });
  }, [routine, currentDay]);

  // Effect: Fetch exercises when user, date, or workout changes
  useEffect(() => {
    if (!userId || !formattedDate || !currentDay) return;

    const fetchExercises = async () => {
      setIsLoadingWorkout(true);
      try {
        const response = await fetch(
          `/api/exercise?userId=${userId}&date=${formattedDate}`
        );
        if (!response.ok) return;

        const data = await response.json();
        if (data.exercises.length === 0) return;

        setWorkouts((prevWorkouts) => {
          const newWorkouts = structuredClone(prevWorkouts);
          newWorkouts[selectedWorkoutIndex].exercises = newWorkouts[
            selectedWorkoutIndex
          ].exercises.map((exercise) => {
            const matchingExercise = data.exercises.find(
              (updatedExercise) => updatedExercise.name === exercise.name
            );
            return matchingExercise || exercise;
          });
          return newWorkouts;
        });
      } catch (error) {
        console.error("Error fetching exercises:", error);
      } finally {
        setIsLoadingWorkout(false);
      }
    };

    fetchExercises();
  }, [userId, formattedDate, currentDay, selectedWorkoutIndex]);

  return {
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
    updateWorkoutInRoutine,
    updateWorkoutsInRoutine,
    formattedDate,
  };
};

export default WorkoutsManager;
