import React, { useEffect, useMemo, useState } from "react";
import {
  buildDayWorkoutsFromEntriesAndRules,
  doesRecurringRuleMatchDate,
  fetchWorkoutCalendarSummary,
  fetchWorkoutEntriesForDay,
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

type MonthSummaryCacheEntry = {
  entries: WorkoutEntryDoc[];
  rules: RecurringRuleDoc[];
  statusMap: CalendarStatusMap;
};

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

const getEntriesForDateKey = (entries: WorkoutEntryDoc[], dateISO: string) =>
  entries.filter((entry) => {
    const entryDate = new Date(entry.date);
    return !Number.isNaN(entryDate.getTime()) && toLocalDateKey(entryDate) === dateISO;
  });

const WorkoutsManager: React.FC<{
  routine: any;
  setRoutine: (routine: any) => void;
  darkMode: boolean;
  userProfile?: {
    name?: string;
    username?: string;
    sex?: string;
    age?: string;
    preferredUnits?: "lb" | "kg";
  } | null;
}> = ({ routine, setRoutine, darkMode, userProfile }) => {
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
          setExercises={setExercises}
          refreshCalendarStatuses={refreshCalendarStatuses}
          userProfile={userProfile}
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
              userProfile={userProfile}
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

  const [dayRefreshTick, setDayRefreshTick] = useState(0);
  const [calendarRefreshTick, setCalendarRefreshTick] = useState(0);
  const [calendarStatusMap, setCalendarStatusMap] = useState<CalendarStatusMap>(
    {}
  );
  const [monthSummaryCache, setMonthSummaryCache] = useState<
    Record<string, MonthSummaryCacheEntry>
  >({});
  const sessionUserId =
    session?.token?.user?._id ?? (session?.user as { _id?: string } | undefined)?._id;
  const currentMonthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
  const visibleMonthKey = `${calendarViewDate.getFullYear()}-${calendarViewDate.getMonth()}`;
  const currentMonthSummary = monthSummaryCache[currentMonthKey];

  useEffect(() => {
    setCalendarViewDate(currentDate);
  }, [currentDate]);

  useEffect(() => {
    if (!userId || !dateISO || !currentDate || !currentDay || !currentMonthSummary) {
      return;
    }

    setIsLoadingWorkout(true);

    fetchWorkoutEntriesForDay(userId, dateISO)
      .then((entries) => {
        const routines = buildDayWorkoutsFromEntriesAndRules(
          entries,
          currentMonthSummary.rules,
          dateISO
        );
        const mergedExercises = routines.flatMap((dayWorkout) =>
          Array.isArray(dayWorkout?.exercises) ? dayWorkout.exercises : []
        );
        setExercises(mergedExercises);
        reconcilePendingLogAttempt(mergedExercises);
      })
      .catch((error) => {
        console.error("Error loading selected workout day:", error);
        const fallbackEntries = getEntriesForDateKey(
          currentMonthSummary.entries,
          dateISO
        );
        const fallbackRoutines = buildDayWorkoutsFromEntriesAndRules(
          fallbackEntries,
          currentMonthSummary.rules,
          dateISO
        );
        const mergedExercises = fallbackRoutines.flatMap((dayWorkout) =>
          Array.isArray(dayWorkout?.exercises) ? dayWorkout.exercises : []
        );
        setExercises(mergedExercises);
        reconcilePendingLogAttempt(mergedExercises);
      })
      .finally(() => {
        setIsLoadingWorkout(false);
      });
  }, [userId, currentDate, currentDay, dateISO, dayRefreshTick, currentMonthSummary]);

  useEffect(() => {
    if (!userId) {
      setCalendarStatusMap({});
      return;
    }

    let isMounted = true;

    const loadCalendarStatus = async () => {
      const cached = monthSummaryCache[visibleMonthKey];
      if (cached) {
        setCalendarStatusMap(cached.statusMap);
        return;
      }

      try {
        const { entries, rules } = await fetchWorkoutCalendarSummary(
          userId,
          calendarViewDate
        );

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
          const normalizedDayEntries = [...dayEntries];
          const exerciseKeys = new globalThis.Set(
            normalizedDayEntries
              .filter((entry) => Boolean(entry.ruleId))
              .map(
                (entry) =>
                  `${String(entry.ruleId ?? "")}::${String(entry.routineName ?? "")}`
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
            const ruleExerciseKey = `${String(rule._id ?? rule.exerciseId ?? "")}::${String(
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

        setMonthSummaryCache((prev) => ({
          ...prev,
          [visibleMonthKey]: {
            entries,
            rules,
            statusMap: nextMap,
          },
        }));
        setCalendarStatusMap(nextMap);
      } catch (error) {
        console.error("Error loading workout calendar data:", error);
      }
    };

    loadCalendarStatus();

    return () => {
      isMounted = false;
    };
  }, [userId, calendarViewDate, visibleMonthKey, calendarRefreshTick, monthSummaryCache]);

  useEffect(() => {
    const cached = monthSummaryCache[visibleMonthKey];
    if (cached) {
      setCalendarStatusMap(cached.statusMap);
    }
  }, [monthSummaryCache, visibleMonthKey]);

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
    setRefetchExercises: () => setDayRefreshTick((prev) => prev + 1),
    refreshCalendarStatuses: () => {
      setMonthSummaryCache((prev) => {
        const next = { ...prev };
        delete next[currentMonthKey];
        return next;
      });
      setCalendarRefreshTick((prev) => prev + 1);
    },
    calendarStatusMap,
    sessionUserId,
  };
};

export default WorkoutsManager;
