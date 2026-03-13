import React, { useEffect, useMemo, useState } from "react";
import {
  fetchDay,
  fetchRecurringRules,
  fetchWorkoutMonthEntries,
} from "../utils/helpers";
import { useSession } from "next-auth/react";
import { Session } from "next-auth";
import DaySwitcher from "./DaySwitcher";
import WorkoutDisplay from "./WorkoutDisplay";
import LoadingIndicator from "./LoadingIndicator";
import { Box } from "@mui/material";
import ExerciseManager from "./ExerciseManager";
import { RecurringRuleDoc, WorkoutEntryDoc } from "../utils/types";

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
  max?: number;
  rest: number;
  complete: boolean;
  sets: Set[];
};

type Set = {
  name: string;
  reps?: number;
  percentage?: number;
  actualReps?: number | string;
  actualWeight?: number | string;
  weight?: number;
};

type CalendarStatusMap = Record<
  string,
  {
    hasLogged: boolean;
    hasCompleted: boolean;
    hasRecurring: boolean;
  }
>;

const toDayWorkoutTitle = (dayName?: string) => {
  if (!dayName) {
    return "Workout";
  }

  return `${dayName.charAt(0).toUpperCase()}${dayName.slice(1)} Workout`;
};

const normalizeDayWorkout = (dayName: string | null, workouts: Workout[] = []) => {
  const mergedExercises = workouts.flatMap((workout) =>
    Array.isArray(workout?.exercises) ? workout.exercises : []
  );

  const baseWorkout = workouts[0] ?? {
    title: toDayWorkoutTitle(dayName || undefined),
    complete: false,
    exercises: [],
  };

  return {
    ...baseWorkout,
    title: baseWorkout.title || toDayWorkoutTitle(dayName || undefined),
    complete: mergedExercises.length > 0
      ? mergedExercises.every((exercise) => Boolean(exercise.complete))
      : false,
    exercises: mergedExercises,
  };
};

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
    currentWorkout,
    currentExerciseIndex,
    setCurrentExerciseIndex,
    isAddingExercise,
    setIsAddingExercise,
    isLoadingWorkout,
    formattedDate,
    dateISO,
    exercises,
    setRefetchExercises,
    calendarStatusMap,
    sessionUserId,
  } = useWorkoutsManagerState(startDate, routine, setRoutine);

  const handleCurrentDayChange = (change: number, isDateSelection: boolean) => {
    let newDate: Date;
    let newDayIndex: number;

    if (isDateSelection) {
      newDate = new Date(change);
      newDayIndex = newDate.getDay();
    } else {
      newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + change);
      newDayIndex = (currentDayIndex + change + 7) % 7;
    }

    setCurrentDayIndex(newDayIndex);
    setCurrentExerciseIndex(-1);
  };

  return (
    <Box>
      {isAddingExercise ? (
        <ExerciseManager
          index={currentExerciseIndex}
          darkMode={darkMode}
          currentWorkoutTitle={currentWorkout.title}
          setIsAddingExercise={setIsAddingExercise}
          userId={sessionUserId}
          date={dateISO}
          setRefetchExercises={setRefetchExercises}
        />
      ) : (
        <Box>
          <DaySwitcher
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            handleCurrentDayChange={handleCurrentDayChange}
            darkMode={darkMode}
            calendarStatusMap={calendarStatusMap}
          />

          {isLoadingWorkout || !currentWorkout ? (
            <LoadingIndicator />
          ) : (
            <WorkoutDisplay
              exercises={exercises}
              currentWorkout={currentWorkout}
              currentExerciseIndex={currentExerciseIndex}
              setCurrentExerciseIndex={setCurrentExerciseIndex}
              formattedDate={formattedDate}
              routineName={currentWorkout.title}
              setIsAddingExercise={setIsAddingExercise}
              darkMode={darkMode}
              setRefetchExercises={setRefetchExercises}
            />
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
  const [currentDate, setCurrentDate] = useState(startDate);
  const [isAddingExercise, setIsAddingExercise] = useState(false);

  const { data: session } = useSession() as {
    data: (Session & { token: { user: any } }) | null;
  };

  const currentDay = useMemo(() => {
    return routine ? Object.keys(routine.days)[currentDayIndex] : null;
  }, [routine, currentDayIndex]);

  const currentWorkout = useMemo(() => {
    const dayWorkouts =
      routine && currentDay && Array.isArray(routine.days[currentDay])
        ? routine.days[currentDay]
        : [];

    return normalizeDayWorkout(currentDay, dayWorkouts);
  }, [routine, currentDay]);

  const userId = session?.token?.user?._id;

  const formattedDate = currentDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const dateISO = currentDate.toISOString().slice(0, 10);

  const [refetchExercises, setRefetchExercises] = useState<boolean>(false);
  const [calendarStatusMap, setCalendarStatusMap] = useState<CalendarStatusMap>(
    {}
  );
  const sessionUserId =
    session?.token?.user?._id ?? (session?.user as { _id?: string } | undefined)?._id;

  useEffect(() => {
    if (!userId || !dateISO || !currentDate || !currentDay) {
      return;
    }

    setRefetchExercises(false);
    setIsLoadingWorkout(true);

    fetchDay(userId, dateISO)
      .then((routines) => {
        const mergedExercises = routines.flatMap((dayWorkout) =>
          Array.isArray(dayWorkout?.exercises) ? dayWorkout.exercises : []
        );
        setExercises(mergedExercises);
      })
      .finally(() => {
        setIsLoadingWorkout(false);
      });
  }, [userId, currentDate, currentDay, dateISO, refetchExercises]);

  useEffect(() => {
    if (!userId) {
      setCalendarStatusMap({});
      return;
    }

    let isMounted = true;

    const loadCalendarStatus = async () => {
      try {
        const [entries, rules] = await Promise.all([
          fetchWorkoutMonthEntries(userId, currentDate),
          fetchRecurringRules(userId),
        ]);

        if (!isMounted) {
          return;
        }

        const nextMap: CalendarStatusMap = {};
        const monthStart = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          1
        );
        const monthEnd = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          0
        );

        entries.forEach((entry: WorkoutEntryDoc) => {
          const entryDate = new Date(entry.date);
          if (isNaN(entryDate.getTime())) {
            return;
          }

          const key = entryDate.toISOString().slice(0, 10);
          nextMap[key] = {
            hasLogged: true,
            hasCompleted: Boolean(
              entry.complete || entry.sets?.some((set) => Boolean(set.complete))
            ),
            hasRecurring: nextMap[key]?.hasRecurring ?? false,
          };
        });

        rules.forEach((rule: RecurringRuleDoc) => {
          if (rule.active === false) {
            return;
          }

          const startDate = new Date(rule.startDate);
          startDate.setHours(0, 0, 0, 0);
          const intervalWeeks = Math.max(1, Number(rule.intervalWeeks) || 1);

          for (
            let cursor = new Date(monthStart);
            cursor <= monthEnd;
            cursor.setDate(cursor.getDate() + 1)
          ) {
            const sameWeekday = cursor.getDay() === rule.dayOfWeek;
            const afterStart = !rule.startDate || cursor >= startDate;

            if (!sameWeekday || !afterStart) {
              continue;
            }

            const diffDays = Math.floor(
              (cursor.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            const diffWeeks = Math.floor(diffDays / 7);

            if (diffWeeks < 0 || diffWeeks % intervalWeeks !== 0) {
              continue;
            }

            const key = cursor.toISOString().slice(0, 10);
            nextMap[key] = {
              hasLogged: nextMap[key]?.hasLogged ?? false,
              hasCompleted: nextMap[key]?.hasCompleted ?? false,
              hasRecurring: true,
            };
          }
        });

        setCalendarStatusMap(nextMap);
      } catch (error) {
        console.error("Error loading workout calendar data:", error);
      }
    };

    loadCalendarStatus();

    return () => {
      isMounted = false;
    };
  }, [userId, currentDate, refetchExercises]);

  return {
    currentDay,
    currentDayIndex,
    setCurrentDayIndex,
    currentDate,
    setCurrentDate,
    currentWorkout,
    currentExerciseIndex,
    setCurrentExerciseIndex,
    isAddingExercise,
    setIsAddingExercise,
    isLoadingWorkout,
    formattedDate,
    dateISO,
    exercises,
    refetchExercises,
    setRefetchExercises,
    calendarStatusMap,
    sessionUserId,
  };
};

export default WorkoutsManager;
