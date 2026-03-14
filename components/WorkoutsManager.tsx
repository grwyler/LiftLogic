import React, { useEffect, useMemo, useState } from "react";
import {
  doesRecurringRuleMatchDate,
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
import { reconcilePendingLogAttempt } from "../utils/devBugRecorder";

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
    exerciseCount: number;
  }
>;

const toLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

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
    calendarViewDate,
    setCurrentDate,
    setCalendarViewDate,
    currentWorkout,
    currentExerciseIndex,
    setCurrentExerciseIndex,
    isAddingExercise,
    setIsAddingExercise,
    isLoadingWorkout,
    formattedDate,
    dateISO,
    exercises,
    setExercises,
    setRefetchExercises,
    refreshCalendarStatuses,
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
          currentExercises={exercises}
          setIsAddingExercise={setIsAddingExercise}
          userId={sessionUserId}
          date={dateISO}
          setRefetchExercises={setRefetchExercises}
          refreshCalendarStatuses={refreshCalendarStatuses}
        />
      ) : (
        <Box>
          <DaySwitcher
            currentDate={currentDate}
            calendarViewDate={calendarViewDate}
            setCurrentDate={setCurrentDate}
            setCalendarViewDate={setCalendarViewDate}
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
              currentDate={currentDate}
              formattedDate={formattedDate}
              routineName={currentWorkout.title}
              setIsAddingExercise={setIsAddingExercise}
              setExercises={setExercises}
              darkMode={darkMode}
              setRefetchExercises={setRefetchExercises}
              refreshCalendarStatuses={refreshCalendarStatuses}
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
  const [calendarViewDate, setCalendarViewDate] = useState(startDate);
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
  const dateISO = toLocalDateKey(currentDate);

  const [refetchExercises, setRefetchExercises] = useState<boolean>(false);
  const [calendarRefreshTick, setCalendarRefreshTick] = useState(0);
  const [calendarStatusMap, setCalendarStatusMap] = useState<CalendarStatusMap>(
    {}
  );
  const sessionUserId =
    session?.token?.user?._id ?? (session?.user as { _id?: string } | undefined)?._id;

  useEffect(() => {
    setCalendarViewDate(currentDate);
  }, [currentDate]);

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
        reconcilePendingLogAttempt(mergedExercises);
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
          fetchWorkoutMonthEntries(userId, calendarViewDate),
          fetchRecurringRules(userId),
        ]);

        if (!isMounted) {
          return;
        }

        const nextMap: CalendarStatusMap = {};
        const dayExerciseKeys = new Map<string, globalThis.Set<string>>();
        const monthStart = new Date(
          calendarViewDate.getFullYear(),
          calendarViewDate.getMonth(),
          1
        );
        const monthEnd = new Date(
          calendarViewDate.getFullYear(),
          calendarViewDate.getMonth() + 1,
          0
        );

        const entriesByDate = new Map<string, WorkoutEntryDoc[]>();

        entries.forEach((entry: WorkoutEntryDoc) => {
          const entryDate = new Date(entry.date);
          if (isNaN(entryDate.getTime())) {
            return;
          }

          const key = toLocalDateKey(entryDate);
          const groupedEntries = entriesByDate.get(key) ?? [];
          groupedEntries.push(entry);
          entriesByDate.set(key, groupedEntries);
        });

        entriesByDate.forEach((dayEntries, key) => {
          const latestEntriesByExercise = new Map<string, WorkoutEntryDoc>();

          dayEntries.forEach((entry) => {
            const dedupeKey = `${String(entry.exerciseId ?? "")}::${String(
              entry.routineName ?? ""
            )}`;
            const existing = latestEntriesByExercise.get(dedupeKey);

            if (!existing) {
              latestEntriesByExercise.set(dedupeKey, entry);
              return;
            }

            const existingUpdatedAt = new Date(
              (existing.updatedAt ?? existing.createdAt ?? existing.date) as any
            ).getTime();
            const nextUpdatedAt = new Date(
              (entry.updatedAt ?? entry.createdAt ?? entry.date) as any
            ).getTime();

            if (nextUpdatedAt >= existingUpdatedAt) {
              latestEntriesByExercise.set(dedupeKey, entry);
            }
          });

          const normalizedDayEntries = Array.from(latestEntriesByExercise.values());
          const exerciseKeys = new globalThis.Set(
            normalizedDayEntries.map(
              (entry) =>
                `${String(entry.exerciseId ?? "")}::${String(entry.routineName ?? "")}`
            )
          );
          dayExerciseKeys.set(key, exerciseKeys);
          const hasPlannedEntries = normalizedDayEntries.some((entry) => {
            const sets = Array.isArray(entry.sets) ? entry.sets : [];
            const hasCompletedSet = sets.some((set) => Boolean(set.complete));

            return Boolean(!entry.complete && !hasCompletedSet);
          });
          const hasLogged = normalizedDayEntries.some(
            (entry) => entry.sets?.some((set) => Boolean(set.complete)) || entry.complete
          );
          const hasCompleted =
            normalizedDayEntries.length > 0 &&
            normalizedDayEntries.every((entry) => {
              const sets = Array.isArray(entry.sets) ? entry.sets : [];
              return Boolean(
                entry.complete || (sets.length > 0 && sets.every((set) => Boolean(set.complete)))
              );
            });

          nextMap[key] = {
            hasLogged,
            hasCompleted,
            hasRecurring: hasPlannedEntries || nextMap[key]?.hasRecurring || false,
            exerciseCount: normalizedDayEntries.length,
          };
        });

        rules.forEach((rule: RecurringRuleDoc) => {
          if (rule.active === false) {
            return;
          }

          for (
            let cursor = new Date(monthStart);
            cursor <= monthEnd;
            cursor.setDate(cursor.getDate() + 1)
          ) {
            if (!doesRecurringRuleMatchDate(rule, cursor)) {
              continue;
            }

            const key = toLocalDateKey(cursor);
            const ruleExerciseKey = `${String(rule.exerciseId ?? "")}::${String(
              rule.routineName ?? ""
            )}`;
            const existingExerciseKeys =
              dayExerciseKeys.get(key) ?? new globalThis.Set<string>();
            const alreadyCounted = existingExerciseKeys.has(ruleExerciseKey);

            if (!alreadyCounted) {
              existingExerciseKeys.add(ruleExerciseKey);
              dayExerciseKeys.set(key, existingExerciseKeys);
            }

            nextMap[key] = {
              hasLogged: nextMap[key]?.hasLogged ?? false,
              hasCompleted: nextMap[key]?.hasCompleted ?? false,
              hasRecurring: true,
              exerciseCount:
                (nextMap[key]?.exerciseCount ?? 0) + (alreadyCounted ? 0 : 1),
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
  }, [userId, calendarViewDate, refetchExercises, calendarRefreshTick]);

  return {
    currentDay,
    currentDayIndex,
    setCurrentDayIndex,
    currentDate,
    calendarViewDate,
    setCurrentDate,
    setCalendarViewDate,
    currentWorkout,
    currentExerciseIndex,
    setCurrentExerciseIndex,
    isAddingExercise,
    setIsAddingExercise,
    isLoadingWorkout,
    formattedDate,
    dateISO,
    exercises,
    setExercises,
    refetchExercises,
    setRefetchExercises,
    refreshCalendarStatuses: () => setCalendarRefreshTick((prev) => prev + 1),
    calendarStatusMap,
    sessionUserId,
  };
};

export default WorkoutsManager;
