import React, { useEffect, useMemo, useState } from "react";
import {
  buildDayWorkoutsFromEntriesAndRules,
  doesRecurringRuleMatchDate,
  fetchWorkoutCalendarSummary,
  fetchWorkoutEntriesForDay,
  fetchWorkoutEntriesRange,
} from "../utils/helpers";
import { useSession } from "next-auth/react";
import { Session } from "next-auth";
import DaySwitcher from "./DaySwitcher";
import WorkoutDisplay from "./WorkoutDisplay";
import LoadingIndicator from "./LoadingIndicator";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Typography,
} from "@mui/material";
import ExerciseManager from "./ExerciseManager";
import { RecurringRuleDoc, WorkoutEntryDoc } from "../utils/types";
import { reconcilePendingLogAttempt } from "../utils/devBugRecorder";
import { parseLocalDateKey, toLocalDateKey } from "../utils/localDate";
import { buildMilestoneSummary } from "../utils/milestones";
import {
  WorkoutSessionDraft,
  discardWorkoutSessionDraft,
  readLatestWorkoutSessionDraftForUser,
  saveWorkoutSessionDraft,
  shouldPersistWorkoutSessionDraft,
} from "../utils/workoutSessionDraft";
import { buildTrainingAnalyticsSummary } from "../utils/workoutAnalytics";

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

type CalendarDayStatus = CalendarStatusMap[string];

type MonthSummaryCacheEntry = {
  entries: WorkoutEntryDoc[];
  rules: RecurringRuleDoc[];
  statusMap: CalendarStatusMap;
};

const HISTORY_START_DATE = new Date(2020, 0, 1);

type WeeklyConsistencyState = {
  target: number;
  completedCount: number;
  scheduledCount: number;
  remainingScheduledCount: number;
  state: "on_track" | "behind" | "goal_hit";
  headline: string;
  supportingCopy: string;
};

export type ComebackGuideState = {
  state: "missed_sessions" | "returning_after_lapse" | "missed_sessions_and_lapse";
  missedScheduledCount: number;
  daysSinceLastLog: number | null;
  headline: string;
  supportingCopy: string;
  lastCompletedLabel?: string | null;
  adjustmentCopy?: string | null;
};

export type WeeklyReviewPreviewState = {
  reviewHeadline: string;
  reviewCopy: string;
  previewHeadline: string;
  previewCopy: string;
  thisWeekCompleted: number;
  lastWeekCompleted: number;
  nextWeekScheduledCount: number;
  nextWeekFirstDayLabel: string | null;
  recommendedFocus?: string;
  recentBriefs?: Array<{
    id: string;
    label: string;
    headline: string;
    summary: string;
  }>;
};

const isScheduledDay = (dayStatus?: CalendarDayStatus | null) =>
  Boolean(dayStatus && (dayStatus.hasRecurring || dayStatus.exerciseCount > 0));

const isLoggedDay = (dayStatus?: CalendarDayStatus | null) =>
  Boolean(dayStatus && (dayStatus.hasCompleted || dayStatus.hasLogged));

export const buildComebackGuide = ({
  statusMap,
  currentDate,
  historyEntries = [],
}: {
  statusMap: CalendarStatusMap;
  currentDate: Date;
  historyEntries?: WorkoutEntryDoc[];
}): ComebackGuideState | null => {
  const today = new Date(currentDate);
  today.setHours(0, 0, 0, 0);

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());

  let missedScheduledCount = 0;
  for (const cursor = new Date(weekStart); cursor < today; cursor.setDate(cursor.getDate() + 1)) {
    const dayStatus = statusMap[toLocalDateKey(cursor)];
    if (isScheduledDay(dayStatus) && !isLoggedDay(dayStatus)) {
      missedScheduledCount += 1;
    }
  }

  const dateKeys = Object.keys(statusMap).sort().reverse();
  let daysSinceLastLog: number | null = null;
  let lastCompletedLabel: string | null = null;

  for (const key of dateKeys) {
    const dayStatus = statusMap[key];
    if (!isLoggedDay(dayStatus)) {
      continue;
    }

    const parsed = parseLocalDateKey(key) ?? new Date(`${key}T00:00:00`);
    if (Number.isNaN(parsed.getTime()) || parsed > today) {
      continue;
    }

    daysSinceLastLog = Math.round((today.getTime() - parsed.getTime()) / 86400000);
    lastCompletedLabel = parsed.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    break;
  }

  const hasMissedSessions = missedScheduledCount >= 2;
  const hasMeaningfulLapse = daysSinceLastLog !== null && daysSinceLastLog >= 8;

  if (!hasMissedSessions && !hasMeaningfulLapse) {
    return null;
  }

  if (hasMissedSessions && hasMeaningfulLapse) {
    return {
      state: "missed_sessions_and_lapse",
      missedScheduledCount,
      daysSinceLastLog,
      lastCompletedLabel,
      headline: "Fresh restart, no catching up required",
      supportingCopy: `A few planned sessions slipped and it has been about ${daysSinceLastLog} day${
        daysSinceLastLog === 1 ? "" : "s"
      } since your last logged workout. You do not need to make anything up. Resume with one good session or reshape the rest of this week.`,
      adjustmentCopy:
        "Recommendations ease back in after time away, so the first return session should feel conservative on purpose.",
    };
  }

  if (hasMeaningfulLapse) {
    return {
      state: "returning_after_lapse",
      missedScheduledCount,
      daysSinceLastLog,
      lastCompletedLabel,
      headline: "Welcome back. Today still counts.",
      supportingCopy: `It has been about ${daysSinceLastLog} day${
        daysSinceLastLog === 1 ? "" : "s"
      } since your last logged workout. The best move is a simple return session, not a perfect restart.`,
      adjustmentCopy:
        "The app will bias recommendations a little lighter after a longer gap so you can rebuild rhythm before pushing again.",
    };
  }

  const mostRecentCompletedEntry = [...historyEntries]
    .filter((entry) => isLoggedDay(statusMap[toLocalDateKey(new Date(entry.date))]))
    .sort((left, right) => +new Date(right.date) - +new Date(left.date))[0];

  return {
    state: "missed_sessions",
    missedScheduledCount,
    daysSinceLastLog,
    lastCompletedLabel:
      lastCompletedLabel ??
      (mostRecentCompletedEntry
        ? new Date(mostRecentCompletedEntry.date).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })
        : null),
    headline: "A couple sessions slipped. That is recoverable.",
    supportingCopy: `You missed ${missedScheduledCount} scheduled workout${
      missedScheduledCount === 1 ? "" : "s"
    } earlier this week. Treat today like a fresh win opportunity and adjust the rest of the week around what is realistic now.`,
    adjustmentCopy:
      "If the next recommendation looks slightly easier than usual, that is the app trying to lower friction for your return session.",
  };
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

const mergeHistoryEntriesForDateKey = ({
  existingEntries,
  replacementEntries,
  dateKey,
}: {
  existingEntries: WorkoutEntryDoc[];
  replacementEntries: WorkoutEntryDoc[];
  dateKey: string;
}) => {
  const retainedEntries = existingEntries.filter((entry) => {
    const entryDate = new Date(entry.date);
    return Number.isNaN(entryDate.getTime()) || toLocalDateKey(entryDate) !== dateKey;
  });

  return [...retainedEntries, ...replacementEntries].sort(
    (left, right) => +new Date(left.date) - +new Date(right.date)
  );
};

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
    workoutDaysPerWeek?: string;
  } | null;
  onRequestRecurringUpgradePrompt?: () => void;
  onRequestProgressionUpgradePrompt?: () => void;
  onRequestPersonalRecordUpgradePrompt?: () => void;
  onWeeklyTargetChange?: (nextTarget: string) => Promise<void> | void;
}> = ({
  routine,
  setRoutine,
  darkMode,
  userProfile,
  onRequestRecurringUpgradePrompt,
  onRequestProgressionUpgradePrompt,
  onRequestPersonalRecordUpgradePrompt,
  onWeeklyTargetChange,
}) => {
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
    lastQuickAddedExerciseIdentity,
    setLastQuickAddedExerciseIdentity,
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
    weeklyConsistency,
    weeklyReviewPreview,
    comebackGuide,
    milestoneSummary,
    trainingAnalytics,
  } = useWorkoutsManagerState(startDate, routine, setRoutine, userProfile);
  const [pendingRecoveryDraft, setPendingRecoveryDraft] =
    useState<WorkoutSessionDraft | null>(null);
  const [recoveryHandledKey, setRecoveryHandledKey] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionUserId || !currentWorkout?.title) {
      return;
    }

    if (
      shouldPersistWorkoutSessionDraft({
        exercises,
        currentExerciseIndex,
        isAddingExercise,
      })
    ) {
      saveWorkoutSessionDraft({
        version: 1,
        userId: sessionUserId,
        dateISO,
        routineName: currentWorkout.title,
        currentExerciseIndex,
        isAddingExercise,
        exercises,
        savedAt: new Date().toISOString(),
      });
      return;
    }

    discardWorkoutSessionDraft({
      userId: sessionUserId,
      dateISO,
      routineName: currentWorkout.title,
    });
  }, [
    currentExerciseIndex,
    currentWorkout?.title,
    dateISO,
    exercises,
    isAddingExercise,
    sessionUserId,
  ]);

  useEffect(() => {
    if (!sessionUserId || isLoadingWorkout || pendingRecoveryDraft) {
      return;
    }

    const nextDraft = readLatestWorkoutSessionDraftForUser(sessionUserId);
    if (!nextDraft) {
      return;
    }

    const nextDraftKey = `${nextDraft.userId}::${nextDraft.dateISO}::${nextDraft.routineName}`;
    if (recoveryHandledKey === nextDraftKey) {
      return;
    }

    if (
      !shouldPersistWorkoutSessionDraft({
        exercises: nextDraft.exercises,
        currentExerciseIndex: nextDraft.currentExerciseIndex,
        isAddingExercise: nextDraft.isAddingExercise,
      })
    ) {
      setRecoveryHandledKey(nextDraftKey);
      return;
    }

    setPendingRecoveryDraft(nextDraft);
  }, [isLoadingWorkout, pendingRecoveryDraft, recoveryHandledKey, sessionUserId]);

  const handleResumeRecoveredWorkout = () => {
    if (!pendingRecoveryDraft) {
      return;
    }

    const [year, month, day] = pendingRecoveryDraft.dateISO.split("-").map(Number);
    const recoveredDate = new Date(year, month - 1, day);
    setCurrentDate(recoveredDate);
    setCalendarViewDate(recoveredDate);
    setExercises(pendingRecoveryDraft.exercises);
    setCurrentExerciseIndex(pendingRecoveryDraft.currentExerciseIndex);
    setIsAddingExercise(pendingRecoveryDraft.isAddingExercise);
    setRecoveryHandledKey(
      `${pendingRecoveryDraft.userId}::${pendingRecoveryDraft.dateISO}::${pendingRecoveryDraft.routineName}`
    );
    setPendingRecoveryDraft(null);
  };

  const handleDiscardRecoveredWorkout = () => {
    if (!pendingRecoveryDraft) {
      return;
    }

    discardWorkoutSessionDraft({
      userId: pendingRecoveryDraft.userId,
      dateISO: pendingRecoveryDraft.dateISO,
      routineName: pendingRecoveryDraft.routineName,
    });
    setRecoveryHandledKey(
      `${pendingRecoveryDraft.userId}::${pendingRecoveryDraft.dateISO}::${pendingRecoveryDraft.routineName}`
    );
    setPendingRecoveryDraft(null);
  };

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
      <Dialog open={Boolean(pendingRecoveryDraft)} onClose={handleDiscardRecoveredWorkout}>
        <DialogTitle>Resume in-progress workout?</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "text.secondary" }}>
            Lift Logic found a saved workout draft for {pendingRecoveryDraft?.routineName || "your workout"} on{" "}
            {pendingRecoveryDraft?.dateISO || "a recent day"}. You can resume where you left off or discard the draft.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDiscardRecoveredWorkout}>Discard draft</Button>
          <Button variant="contained" onClick={handleResumeRecoveredWorkout}>
            Resume workout
          </Button>
        </DialogActions>
      </Dialog>
      {isAddingExercise ? (
        <ExerciseManager
          index={currentExerciseIndex}
          darkMode={darkMode}
          currentWorkoutTitle={currentWorkout.title}
          currentExercises={exercises}
          setIsAddingExercise={setIsAddingExercise}
          onQuickAddComplete={(exerciseIdentity) => {
            setLastQuickAddedExerciseIdentity(exerciseIdentity);
          }}
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

          {!currentWorkout ? (
            <LoadingIndicator />
          ) : (
            <Box sx={{ position: "relative" }}>
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
                weeklyConsistency={weeklyConsistency}
                weeklyReviewPreview={weeklyReviewPreview}
                comebackGuide={comebackGuide}
                milestoneSummary={milestoneSummary}
                trainingAnalytics={trainingAnalytics}
                onWeeklyTargetChange={onWeeklyTargetChange}
                lastQuickAddedExerciseIdentity={lastQuickAddedExerciseIdentity}
                clearLastQuickAddedExerciseIdentity={() =>
                  setLastQuickAddedExerciseIdentity(null)
                }
                onRequestRecurringUpgradePrompt={onRequestRecurringUpgradePrompt}
                onRequestProgressionUpgradePrompt={
                  onRequestProgressionUpgradePrompt
                }
                onRequestPersonalRecordUpgradePrompt={
                  onRequestPersonalRecordUpgradePrompt
                }
              />
              {isLoadingWorkout ? (
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "center",
                    pointerEvents: "none",
                    pt: 1,
                  }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      px: 1.5,
                      py: 0.8,
                      borderRadius: 999,
                      border: "1px solid",
                      borderColor: "divider",
                      backgroundColor: darkMode
                        ? "rgba(15,23,42,0.88)"
                        : "rgba(255,255,255,0.92)",
                      backdropFilter: "blur(12px)",
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", fontWeight: 700 }}
                    >
                      Loading next day...
                    </Typography>
                  </Paper>
                </Box>
              ) : null}
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
  setRoutine: any,
  userProfile?: {
    workoutDaysPerWeek?: string;
    preferredUnits?: "lb" | "kg";
  } | null
) => {
  const [currentDayIndex, setCurrentDayIndex] = useState(startDate.getDay());
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(-1);
  const [lastQuickAddedExerciseIdentity, setLastQuickAddedExerciseIdentity] =
    useState<string | null>(null);
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
  const [historyEntries, setHistoryEntries] = useState<WorkoutEntryDoc[]>([]);
  const [historyLoadedThroughKey, setHistoryLoadedThroughKey] = useState<string | null>(null);
  const [historyUserId, setHistoryUserId] = useState<string | null>(null);
  const sessionUserId =
    session?.token?.user?._id ?? (session?.user as { _id?: string } | undefined)?._id;
  const currentMonthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
  const visibleMonthKey = `${calendarViewDate.getFullYear()}-${calendarViewDate.getMonth()}`;
  const currentMonthSummary = monthSummaryCache[currentMonthKey];
  const previousMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  const nextMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  const previousMonthKey = `${previousMonthDate.getFullYear()}-${previousMonthDate.getMonth()}`;
  const nextMonthKey = `${nextMonthDate.getFullYear()}-${nextMonthDate.getMonth()}`;

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
        setHistoryEntries((previousEntries) =>
          mergeHistoryEntriesForDateKey({
            existingEntries: previousEntries,
            replacementEntries: entries,
            dateKey: dateISO,
          })
        );
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
        setHistoryEntries((previousEntries) =>
          mergeHistoryEntriesForDateKey({
            existingEntries: previousEntries,
            replacementEntries: fallbackEntries,
            dateKey: dateISO,
          })
        );
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

  useEffect(() => {
    if (userId !== historyUserId) {
      setHistoryEntries([]);
      setHistoryLoadedThroughKey(null);
      setHistoryUserId(userId ?? null);
    }
  }, [historyUserId, userId]);

  useEffect(() => {
    if (!userId) {
      setHistoryEntries([]);
      setHistoryLoadedThroughKey(null);
      return;
    }

    if (historyLoadedThroughKey) {
      return;
    }

    let cancelled = false;
    const nextLoadedThroughKey = toLocalDateKey(currentDate);

    void fetchWorkoutEntriesRange(userId, HISTORY_START_DATE, currentDate)
      .then((entries) => {
        if (!cancelled) {
          setHistoryEntries(entries);
          setHistoryLoadedThroughKey(nextLoadedThroughKey);
        }
      })
      .catch((error) => {
        console.error("Error loading workout history for milestones:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [currentDate, historyLoadedThroughKey, userId]);

  const weeklyConsistency = useMemo<WeeklyConsistencyState | null>(() => {
    const target = Number(userProfile?.workoutDaysPerWeek || 0);
    if (!target) {
      return null;
    }

    const weekStart = new Date(currentDate);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const mergedStatusMap = [
      monthSummaryCache[previousMonthKey],
      monthSummaryCache[currentMonthKey],
      monthSummaryCache[nextMonthKey],
    ]
      .filter(Boolean)
      .reduce<CalendarStatusMap>(
        (nextMap, summary) => ({
          ...nextMap,
          ...(summary as MonthSummaryCacheEntry).statusMap,
        }),
        {}
      );

    let completedCount = 0;
    let scheduledCount = 0;

    for (
      const cursor = new Date(weekStart);
      cursor <= weekEnd;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      const key = toLocalDateKey(cursor);
      const dayStatus = mergedStatusMap[key];
      if (!dayStatus) {
        continue;
      }

      if (dayStatus.hasRecurring || dayStatus.exerciseCount > 0) {
        scheduledCount += 1;
      }

      if (dayStatus.hasCompleted || dayStatus.hasLogged) {
        completedCount += 1;
      }
    }

    const remainingScheduledCount = Math.max(0, scheduledCount - completedCount);
    const state: WeeklyConsistencyState["state"] =
      completedCount >= target
        ? "goal_hit"
        : completedCount + remainingScheduledCount >= target
        ? "on_track"
        : "behind";

    if (state === "goal_hit") {
      return {
        target,
        completedCount,
        scheduledCount,
        remainingScheduledCount,
        state,
        headline: "Goal hit this week",
        supportingCopy:
          completedCount > target
            ? `You already cleared your ${target}-workout target and still have room to keep going.`
            : `You matched your ${target}-workout target for the week.`,
      };
    }

    if (state === "behind") {
      return {
        target,
        completedCount,
        scheduledCount,
        remainingScheduledCount,
        state,
        headline: "Resetting this week",
        supportingCopy:
          remainingScheduledCount > 0
            ? `You still have ${remainingScheduledCount} scheduled workout${
                remainingScheduledCount === 1 ? "" : "s"
              } left. Treat the next one like a fresh anchor and adjust the rest of the week around what is realistic now.`
            : `No scheduled sessions are left this week, so this is a good moment to reset the target or add one realistic anchor session.`,
      };
    }

    return {
      target,
      completedCount,
      scheduledCount,
      remainingScheduledCount,
      state,
      headline: "Still in reach this week",
      supportingCopy:
        remainingScheduledCount > 0
          ? `${completedCount} are already logged, ${remainingScheduledCount} are still scheduled, and your ${target}-workout target is still in reach.`
          : `You are still pointed toward ${target} workouts this week. Add another session if you want the plan to reflect the extra momentum.`,
    };
  }, [
    currentDate,
    currentMonthKey,
    monthSummaryCache,
    nextMonthKey,
    previousMonthKey,
    userProfile?.workoutDaysPerWeek,
  ]);

  const mergedStatusMap = useMemo(
    () =>
      [monthSummaryCache[previousMonthKey], monthSummaryCache[currentMonthKey], monthSummaryCache[nextMonthKey]]
        .filter(Boolean)
        .reduce<CalendarStatusMap>(
          (nextMap, summary) => ({
            ...nextMap,
            ...(summary as MonthSummaryCacheEntry).statusMap,
          }),
          {}
        ),
    [currentMonthKey, monthSummaryCache, nextMonthKey, previousMonthKey]
  );

  const weeklyReviewPreview = useMemo<WeeklyReviewPreviewState | null>(() => {
    const today = new Date(currentDate);
    today.setHours(0, 0, 0, 0);

    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - today.getDay());
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(currentWeekStart.getDate() - 7);
    const nextWeekStart = new Date(currentWeekStart);
    nextWeekStart.setDate(currentWeekStart.getDate() + 7);

    const countLoggedDays = (startDate: Date) => {
      let count = 0;
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
      for (const cursor = new Date(startDate); cursor < endDate; cursor.setDate(cursor.getDate() + 1)) {
        const dayStatus = mergedStatusMap[toLocalDateKey(cursor)];
        if (isLoggedDay(dayStatus)) {
          count += 1;
        }
      }
      return count;
    };

    const countScheduledDays = (startDate: Date) => {
      let count = 0;
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
      for (const cursor = new Date(startDate); cursor < endDate; cursor.setDate(cursor.getDate() + 1)) {
        const dayStatus = mergedStatusMap[toLocalDateKey(cursor)];
        if (isScheduledDay(dayStatus)) {
          count += 1;
        }
      }
      return count;
    };

    const thisWeekCompleted = countLoggedDays(currentWeekStart);
    const lastWeekCompleted = countLoggedDays(previousWeekStart);
    const nextWeekScheduledCount = countScheduledDays(nextWeekStart);

    let nextWeekFirstDayLabel: string | null = null;
    const nextWeekEnd = new Date(nextWeekStart);
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);
    for (const cursor = new Date(nextWeekStart); cursor < nextWeekEnd; cursor.setDate(cursor.getDate() + 1)) {
      const dayStatus = mergedStatusMap[toLocalDateKey(cursor)];
      if (isScheduledDay(dayStatus)) {
        nextWeekFirstDayLabel = cursor.toLocaleDateString(undefined, {
          weekday: "long",
        });
        break;
      }
    }

    if (thisWeekCompleted === 0 && lastWeekCompleted === 0 && nextWeekScheduledCount === 0) {
      return null;
    }

    const reviewHeadline =
      thisWeekCompleted > lastWeekCompleted
        ? "You built momentum this week"
        : thisWeekCompleted === 0
        ? "This week stayed quiet"
        : "Your week has a real training signal";
    const reviewCopy =
      thisWeekCompleted > lastWeekCompleted
        ? `You logged ${thisWeekCompleted} workout${thisWeekCompleted === 1 ? "" : "s"} this week, up from ${lastWeekCompleted} last week. That is exactly the kind of progress worth carrying forward.`
        : thisWeekCompleted === 0
        ? "No workouts were logged yet this week, so next week works best if it starts with one easy win instead of a perfect reset."
        : `You logged ${thisWeekCompleted} workout${thisWeekCompleted === 1 ? "" : "s"} this week. Review what felt good, what felt rushed, and what you want to repeat.`;
    const previewHeadline =
      nextWeekScheduledCount > 0
        ? "Next week already has a foothold"
        : "Next week needs a clearer first step";
    const previewCopy =
      nextWeekScheduledCount > 0
        ? `${nextWeekScheduledCount} day${nextWeekScheduledCount === 1 ? "" : "s"} are already lined up next week${nextWeekFirstDayLabel ? `, starting ${nextWeekFirstDayLabel}` : ""}. Pick the day most likely to happen and protect it now.`
        : "No next-week sessions are scheduled yet. Set one realistic anchor workout so the week starts with intent instead of guesswork.";
    const recommendedFocus =
      thisWeekCompleted === 0
        ? "Protect one easy first session next week and let it restart momentum."
        : nextWeekScheduledCount > 0
        ? `Keep the first scheduled session${nextWeekFirstDayLabel ? ` on ${nextWeekFirstDayLabel}` : ""} simple enough that it definitely happens.`
        : "Add one realistic anchor workout next week so the plan starts with a clear win.";
    const recentBriefs = [
      {
        id: "this_week",
        label: "This week",
        headline: reviewHeadline,
        summary: reviewCopy,
      },
      {
        id: "next_week",
        label: "Next week",
        headline: previewHeadline,
        summary: previewCopy,
      },
    ];

    return {
      reviewHeadline,
      reviewCopy,
      previewHeadline,
      previewCopy,
      thisWeekCompleted,
      lastWeekCompleted,
      nextWeekScheduledCount,
      nextWeekFirstDayLabel,
      recommendedFocus,
      recentBriefs,
    };
  }, [currentDate, mergedStatusMap]);

  const comebackGuide = useMemo(
    () =>
      buildComebackGuide({
        statusMap: mergedStatusMap,
        currentDate,
        historyEntries,
      }),
    [currentDate, historyEntries, mergedStatusMap]
  );

  const milestoneSummary = useMemo(
    () =>
      buildMilestoneSummary({
        entries: historyEntries,
        currentDate,
        weeklyTarget: Number(userProfile?.workoutDaysPerWeek || 0) || null,
      }),
    [currentDate, historyEntries, userProfile?.workoutDaysPerWeek]
  );

  const trainingAnalytics = useMemo(
    () => ({
      week: buildTrainingAnalyticsSummary({
        entries: historyEntries,
        statusMap: mergedStatusMap,
        currentDate,
        period: "week",
        preferredUnits: userProfile?.preferredUnits,
      }),
      month: buildTrainingAnalyticsSummary({
        entries: historyEntries,
        statusMap: mergedStatusMap,
        currentDate,
        period: "month",
        preferredUnits: userProfile?.preferredUnits,
      }),
    }),
    [currentDate, historyEntries, mergedStatusMap, userProfile?.preferredUnits]
  );

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
    lastQuickAddedExerciseIdentity,
    setLastQuickAddedExerciseIdentity,
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
    weeklyConsistency,
    weeklyReviewPreview,
    comebackGuide,
    milestoneSummary,
    trainingAnalytics,
  };
};

export default WorkoutsManager;
