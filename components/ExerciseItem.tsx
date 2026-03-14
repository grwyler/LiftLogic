import React, { useEffect, useRef, useState } from "react";
import {
  Paper,
  Box,
  Button,
  Typography,
  IconButton,
  Chip,
  Dialog,
  AppBar,
  Toolbar,
  TextField,
} from "@mui/material";
import RepeatIcon from "@mui/icons-material/Repeat";
import CheckIcon from "@mui/icons-material/Check";
import AddIcon from "@mui/icons-material/Add";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import CloseIcon from "@mui/icons-material/Close";
import SelectedSetItem from "./SelectedSetItem";
import CompletedSetItem from "./CompletedSetItem";
import SetItem from "./SetItem";
import ExerciseEditItem from "./ExerciseEditItem";
import RepeatScheduleDialog from "./RepeatScheduleDialog";
import CRUDMenuButton from "./CRUDMenuButton";
import {
  deleteWorkoutEntry,
  fetchExerciseProgress,
  formatTime,
  saveRecurringRule,
  saveWorkoutEntry,
  toTitleCase,
} from "../utils/helpers";
import { useSession } from "next-auth/react";
import { Session } from "next-auth";
import DeleteDialog from "./DeleteDialog";
import { toast } from "react-toastify";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import RemoveIcon from "@mui/icons-material/Remove";
import {
  clearPendingLogAttempt,
  emitDevBugInteraction,
  markPendingLogAttemptPersisted,
  setPendingLogAttempt,
} from "../utils/devBugRecorder";

const ExerciseItem = ({
  exercise,
  exerciseIndex,
  exercises,
  workout,
  currentExerciseIndex,
  setCurrentExerciseIndex,
  formattedDate,
  routineName,
  setExercises,
  shownMenuIndex,
  setShownMenuIndex,
  darkMode,
  setRefetchExercises,
  refreshCalendarStatuses,
  userProfile,
}) => {
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [currentExercise, setCurrentExercise] = useState(exercise);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRepeatDialog, setShowRepeatDialog] = useState(false);
  const [isRepeating, setIsRepeating] = useState(exercise.isRepeating);
  const [recurrenceType, setRecurrenceType] = useState<
    "daily" | "weekly" | "custom" | "monthly"
  >("weekly");
  const [repeatInterval, setRepeatInterval] = useState(1);
  const [repeatDayOfWeek, setRepeatDayOfWeek] = useState(0);
  const [repeatDaysOfWeek, setRepeatDaysOfWeek] = useState<number[]>([0]);
  const [repeatDayOfMonth, setRepeatDayOfMonth] = useState(1);
  const [repeatEndDate, setRepeatEndDate] = useState("");
  const [recommendation, setRecommendation] = useState<any>(null);
  const [progressSummary, setProgressSummary] = useState<any>(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const [restSecondsRemaining, setRestSecondsRemaining] = useState(0);
  const [isRestTimerActive, setIsRestTimerActive] = useState(false);
  const [restEditorValue, setRestEditorValue] = useState(
    String(exercise.rest ?? 0)
  );
  const appliedRecommendationRef = useRef<string | null>(null);
  const exerciseIdentityRef = useRef<string | null>(null);
  const { data: session } = useSession() as {
    data: (Session & { token: { user } }) | null;
  };

  const currentUserId =
    (session as any)?.token?.user?._id ??
    (session as any)?.user?._id ??
    currentExercise?.userId ??
    exercise?.userId;
  const isOpen = exerciseIndex === currentExerciseIndex;
  const exerciseIdentity = String(
    exercise?.ruleId ?? exercise?.exerciseId ?? exercise?._id ?? exercise?.name ?? exerciseIndex
  );

  const parseFormattedDate = (value: string): Date | null => {
    const trimmed = value.trim();
    const direct = new Date(trimmed);
    if (!Number.isNaN(+direct)) {
      return direct;
    }

    const needsYear = !/\b\d{4}\b/.test(trimmed);
    if (needsYear) {
      const withYear = `${trimmed} ${new Date().getFullYear()}`;
      const fallback = new Date(withYear);
      if (!Number.isNaN(+fallback)) {
        return fallback;
      }
    }

    return null;
  };

  useEffect(() => {
    setCurrentExercise(exercise);
    setIsRepeating(exercise.isRepeating);
    setRestEditorValue(String(exercise.rest ?? 0));
    const parsedDate = parseFormattedDate(formattedDate);
    const defaultDay = parsedDate?.getDay() ?? 0;
    const defaultDayOfMonth = parsedDate?.getDate() ?? 1;
    const nextRecurrenceType =
      (exercise as any).recurrenceType ??
      (Array.isArray((exercise as any).daysOfWeek) &&
      (exercise as any).daysOfWeek.length > 1
        ? "custom"
        : "weekly");

    setRecurrenceType(nextRecurrenceType);
    setRepeatDayOfWeek((exercise as any).dayOfWeek ?? defaultDay);
    setRepeatDaysOfWeek(
      Array.isArray((exercise as any).daysOfWeek) &&
        (exercise as any).daysOfWeek.length > 0
        ? (exercise as any).daysOfWeek
        : [((exercise as any).dayOfWeek ?? defaultDay)]
    );
    setRepeatDayOfMonth((exercise as any).dayOfMonth ?? defaultDayOfMonth);
    setRepeatInterval(
      Math.max(
        1,
        Number((exercise as any).interval ?? (exercise as any).intervalWeeks) || 1
      )
    );
    setRepeatEndDate(
      (exercise as any).endDate
        ? new Date((exercise as any).endDate).toISOString().slice(0, 10)
        : ""
    );

    if (exerciseIdentityRef.current !== exerciseIdentity) {
      exerciseIdentityRef.current = exerciseIdentity;
      appliedRecommendationRef.current = null;
      setRestSecondsRemaining(0);
      setIsRestTimerActive(false);
    }
  }, [exercise, exerciseIdentity]);

  useEffect(() => {
    if (!isOpen) {
      setRestSecondsRemaining(0);
      setIsRestTimerActive(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isRestTimerActive || restSecondsRemaining <= 0) {
      if (restSecondsRemaining === 0) {
        setIsRestTimerActive(false);
      }
      return;
    }

    const interval = window.setInterval(() => {
      setRestSecondsRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          setIsRestTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRestTimerActive, restSecondsRemaining]);

  useEffect(() => {
    const exerciseId = currentExercise?.exerciseId ?? currentExercise?._id;

    if (!currentUserId || !exerciseId || currentExercise?.type !== "weight") {
      setRecommendation(null);
      setProgressSummary(null);
      setLoadingRecommendation(false);
      return;
    }

    let active = true;
    setLoadingRecommendation(true);

    const timeout = setTimeout(async () => {
      try {
        const result = await fetchExerciseProgress(currentUserId, exerciseId);
        if (!active) {
          return;
        }

        setProgressSummary(result?.summary ?? null);
        setRecommendation(result?.recommendation ?? null);
      } catch (error) {
        console.error("Failed to load exercise recommendation", error);
        if (active) {
          setProgressSummary(null);
          setRecommendation(null);
        }
      } finally {
        if (active) {
          setLoadingRecommendation(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [
    currentUserId,
    currentExercise?._id,
    currentExercise?.exerciseId,
    currentExercise?.type,
    currentExercise?.complete,
  ]);

  useEffect(() => {
    const completedSets = (currentExercise?.sets ?? []).filter((set) => set.complete);

    if (
      currentExercise?.type !== "weight" ||
      currentExercise?.complete ||
      completedSets.length > 0 ||
      !recommendation?.recommendedWeight ||
      !recommendation?.recommendedReps ||
      !recommendation?.recommendedSets
    ) {
      return;
    }

    const recommendationKey = [
      currentExercise?.exerciseId ?? currentExercise?._id,
      formattedDate,
      recommendation.recommendedWeight,
      recommendation.recommendedReps,
      recommendation.recommendedSets,
    ].join("::");

    if (appliedRecommendationRef.current === recommendationKey) {
      return;
    }

    const incompleteTemplate =
      (currentExercise?.sets ?? []).find((set) => !set.complete) ??
      (currentExercise?.sets ?? [])[0] ?? {
        name: "Working Set 1",
        percentage: undefined,
      };

    const recommendedIncompleteSets = Array.from(
      { length: recommendation.recommendedSets },
      (_, index) => ({
        ...incompleteTemplate,
        name: `Working Set ${index + 1}`,
        reps: recommendation.recommendedReps,
        weight: recommendation.recommendedWeight,
        actualWeight: "",
        actualReps: "",
        complete: false,
      })
    );

    appliedRecommendationRef.current = recommendationKey;
    setCurrentExercise((prev) => ({
      ...prev,
      sets: [...completedSets, ...recommendedIncompleteSets],
    }));
  }, [currentExercise, formattedDate, recommendation]);

  const renderCompletedPerformancePanel = () => {
    if (currentExercise.type !== "weight" || !currentExercise.complete) {
      return null;
    }

    const latestEstimated1RM = progressSummary?.latestEstimated1RM ?? null;
    const previousEstimated1RM = progressSummary?.previousEstimated1RM ?? null;
    const heaviestWeightEver = progressSummary?.heaviestWeightEver ?? null;
    const delta =
      latestEstimated1RM !== null && previousEstimated1RM !== null
        ? Math.round((latestEstimated1RM - previousEstimated1RM) * 10) / 10
        : null;
    const hasPriorBenchmark = previousEstimated1RM !== null;
    const trendLabel =
      progressSummary?.latestWorkoutBrokePR && hasPriorBenchmark
        ? "PR"
        : delta === null
        ? "Logged"
        : delta > 0
        ? "Trending Up"
        : delta < 0
        ? "Trending Down"
        : "Steady";
    const trendColor =
      (progressSummary?.latestWorkoutBrokePR && hasPriorBenchmark) ||
      (delta !== null && delta > 0)
        ? "success"
        : delta !== null && delta < 0
        ? "warning"
        : "default";
    return (
      <Paper
        elevation={0}
        sx={{
          mt: 1.5,
          p: 1.5,
          borderRadius: 3,
          border: "1px solid",
          borderColor: darkMode
            ? "rgba(148,163,184,0.12)"
            : "rgba(17,24,39,0.08)",
          backgroundColor: darkMode
            ? "rgba(17,24,39,0.72)"
            : "rgba(249,250,251,0.92)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Performance
          </Typography>
          <Chip size="small" label={trendLabel} color={trendColor as any} variant="outlined" />
        </Box>

        {loadingRecommendation ? (
          <Typography sx={{ mt: 1, color: "text.secondary" }}>
            Loading performance...
          </Typography>
        ) : latestEstimated1RM ? (
          <>
            <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Chip label={`Est. 1RM ${latestEstimated1RM}`} variant="outlined" />
              {delta !== null ? (
                <Chip
                  label={`${delta > 0 ? "+" : ""}${delta} vs last`}
                  variant="outlined"
                />
              ) : null}
              {heaviestWeightEver ? (
                <Chip label={`Best weight ${heaviestWeightEver}`} variant="outlined" />
              ) : null}
            </Box>

            {progressSummary?.bestRepPerformance ? (
              <Typography sx={{ mt: 1, color: "text.secondary" }}>
                Best logged set: {progressSummary.bestRepPerformance.weight} x{" "}
                {progressSummary.bestRepPerformance.reps}.
              </Typography>
            ) : null}
          </>
        ) : (
          <Typography sx={{ mt: 1, color: "text.secondary" }}>
            No weight-performance trend yet.
          </Typography>
        )}
      </Paper>
    );
  };

  const startRestTimer = (seconds: number) => {
    if (!seconds || seconds <= 0) {
      setRestSecondsRemaining(0);
      setIsRestTimerActive(false);
      return;
    }

    setRestSecondsRemaining(seconds);
    setIsRestTimerActive(true);
  };

  const persistRestUpdate = async (nextRest: number) => {
    const normalizedRest = Math.max(0, nextRest || 0);

    setCurrentExercise((prev) => ({
      ...prev,
      rest: normalizedRest,
    }));
    setRestEditorValue(String(normalizedRest));
    setRestSecondsRemaining((prev) => {
      if (prev <= 0) {
        return normalizedRest;
      }

      return Math.min(prev, normalizedRest) || normalizedRest;
    });

    await saveWorkoutEntry({
      userId: currentUserId,
      exerciseId: currentExercise.exerciseId ?? currentExercise._id,
      name: currentExercise.name,
      type: currentExercise.type,
      max: currentExercise.max,
      routineName,
      date: formattedDate,
      rest: normalizedRest,
      complete: currentExercise.complete ?? false,
      sets: currentExercise.sets,
      ruleId: currentExercise.ruleId,
    } as any);
  };

  const pauseRestTimer = () => {
    setIsRestTimerActive(false);
  };

  const resumeRestTimer = () => {
    if (restSecondsRemaining > 0) {
      setIsRestTimerActive(true);
    }
  };

  const skipRestTimer = () => {
    setRestSecondsRemaining(0);
    setIsRestTimerActive(false);
  };

  const adjustRestTimer = (delta: number) => {
    setRestSecondsRemaining((prev) => Math.max(0, prev + delta));
  };

  const handleApplyRestEdit = async () => {
    const nextRest = Math.max(0, Number(restEditorValue) || 0);

    try {
      await persistRestUpdate(nextRest);
      if (nextRest > 0) {
        setRestSecondsRemaining(nextRest);
        setIsRestTimerActive(true);
      } else {
        setRestSecondsRemaining(0);
        setIsRestTimerActive(false);
      }
      toast.success("Rest updated");
    } catch (error) {
      console.error(error);
      toast.error("Couldn't update rest");
    }
  };

  const handleWorkoutButtonClick = (index) => {
    setCurrentExerciseIndex((prevIndex) => (prevIndex === index ? -1 : index));
    setShownMenuIndex(-1);
    const nextSetIndex = exercise.sets.findIndex((s) => !s.complete);
    setCurrentSetIndex(nextSetIndex !== -1 ? nextSetIndex : 0);

    if (index !== currentExerciseIndex) {
      emitDevBugInteraction({
        type: "click",
        kind: "semantic",
        label: `Open scheduled exercise "${toTitleCase(exercise.name)}"`,
        expected: "Exercise details open and the next set is ready to log.",
        actual: `${toTitleCase(exercise.name)} opened from ${routineName}.`,
        status: "info",
      });
    }
  };

  const handleLogSetAttempt = ({
    setName,
    expectedCompletedCount,
  }: {
    setName: string;
    expectedCompletedCount: number;
  }) => {
    setPendingLogAttempt({
      exerciseId: String(currentExercise.exerciseId ?? currentExercise._id ?? "").trim(),
      ruleId: String(currentExercise.ruleId ?? "").trim() || undefined,
      routineName,
      exerciseName: toTitleCase(currentExercise.name) || "exercise",
      setName,
      expectedCompletedCount,
      expectedTotalCount: totalCount,
    });

    emitDevBugInteraction({
      type: "click",
      kind: "semantic",
      label: `Click Log Set for ${toTitleCase(currentExercise.name)} (${setName})`,
      expected: `Completed set count changes to ${expectedCompletedCount}/${totalCount}.`,
      actual: "Log set was requested.",
      status: "info",
    });
  };

  const handleLogSetPersisted = () => {
    emitDevBugInteraction({
      type: "lifecycle",
      kind: "semantic",
      label: `Saved set for ${toTitleCase(currentExercise.name) || "exercise"}`,
      expected: "Synced completed set count reaches the next expected value.",
      actual: "Workout entry save succeeded and the local workout state was updated.",
      status: "info",
    });
    markPendingLogAttemptPersisted();
  };

  const handleLogSetFailed = (message: string) => {
    emitDevBugInteraction({
      type: "lifecycle",
      kind: "semantic",
      label: `Log set failed for ${toTitleCase(currentExercise.name)}`,
      expected: "The set logs successfully.",
      actual: message,
      status: "failure",
    });
    clearPendingLogAttempt();
  };

  const handleAddSet = () => {
    const sets = [...currentExercise.sets];
    if (sets.length === 0) return;
    const lastSet = sets[sets.length - 1];
    const newSetNumber = sets.length + 1;
    const newSet = {
      ...lastSet,
      weight: lastSet.weight + lastSet.weight * 0.05,
      actualWeight: "",
      actualReps: "",
      complete: false,
      name: `Working Set ${newSetNumber}`,
    };
    setCurrentExercise({ ...currentExercise, sets: [...sets, newSet] });
  };

  const handleDeleteSet = (setName) => {
    const sets = [...currentExercise.sets];
    setCurrentExercise({
      ...currentExercise,
      sets: sets.filter((s) => s.name !== setName),
    });
  };

  const handleDelete = async (scope: "today" | "all") => {
    try {
      const recurringRuleId = String(
        currentExercise.ruleId ?? currentExercise._id ?? ""
      ).trim();

      if (scope === "today" && currentExercise.ruleId) {
        await saveWorkoutEntry({
          userId: currentUserId,
          exerciseId: currentExercise.exerciseId,
          routineName,
          date: formattedDate,
          rest: currentExercise.rest ?? 0,
          complete: false,
          sets: [],
          ruleId: currentExercise.ruleId,
          skipped: true,
        });
      }

      if (scope === "all" && isRepeating) {
        if (!recurringRuleId) {
          throw new Error("Recurring rule id missing");
        }

        const response = await fetch("/api/recurringRule", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ruleId: recurringRuleId }),
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(
            `deleteRecurringRule ${response.status}: ${message}`
          );
        }

        const materializedEntryId = String(currentExercise._id ?? "").trim();
        if (materializedEntryId && materializedEntryId !== recurringRuleId) {
          await deleteWorkoutEntry(materializedEntryId);
        }
      }

      if (currentExercise._id && !isRepeating) {
        await deleteWorkoutEntry(currentExercise._id);
      }

      setRefetchExercises((prev) => !prev);
      refreshCalendarStatuses?.();
      toast.success(
        scope === "all"
          ? "Removed from all recurring days"
          : "Removed from this day"
      );
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    }
  };

  const handleUpdate = () => {
    setShownMenuIndex(-1);
    setIsEditing(true);
  };

  const handleExerciseSave = (updatedExercise) => {
    setIsEditing(false);
    saveWorkoutEntry({
      ...updatedExercise,
      name: updatedExercise.name ?? currentExercise.name,
      type: updatedExercise.type ?? currentExercise.type,
      max: updatedExercise.max ?? currentExercise.max,
      userId: updatedExercise.userId ?? currentUserId,
      exerciseId: updatedExercise.exerciseId ?? updatedExercise._id,
      routineName: updatedExercise.routineName ?? routineName,
      date: updatedExercise.date ?? formattedDate,
    });
    setRefetchExercises((prev) => !prev);
    refreshCalendarStatuses?.();
  };

  if (isEditing) {
    return (
      <ExerciseEditItem
        index={exerciseIndex}
        exercise={currentExercise}
        onSave={handleExerciseSave}
        onCancel={() => setIsEditing(false)}
        darkMode={darkMode}
        isValid={true}
      />
    );
  }

  const openRepeatDialog = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowRepeatDialog(true);
  };

  const handleDisableRepeat = async () => {
    const parsedDate = parseFormattedDate(formattedDate);
    if (!parsedDate || !currentUserId) {
      toast.error("Couldn't update the schedule");
      return;
    }

    try {
      if (currentExercise.ruleId) {
        const response = await fetch("/api/recurringRule", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ruleId: String(currentExercise.ruleId) }),
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(`deleteRecurringRule ${response.status}: ${message}`);
        }
      }

      setCurrentExercise((prev) => ({
        ...prev,
        isRepeating: false,
        ruleId: undefined,
        recurrenceType: undefined,
        interval: undefined,
        daysOfWeek: undefined,
        dayOfMonth: undefined,
        endDate: undefined,
      }));
      setIsRepeating(false);

      await saveWorkoutEntry({
        name: currentExercise.name,
        type: currentExercise.type,
        max: currentExercise.max,
        userId: currentUserId,
        exerciseId: currentExercise.exerciseId ?? currentExercise._id,
        routineName,
        date: parsedDate.toISOString().slice(0, 10),
        rest: currentExercise.rest ?? 0,
        complete: currentExercise.complete ?? false,
        sets: currentExercise.sets,
        isRepeating: false,
        ruleId: null,
        recurrenceType: null,
        interval: null,
        daysOfWeek: null,
        dayOfMonth: null,
        endDate: null,
      } as any);

      setShowRepeatDialog(false);
      setRefetchExercises((prev) => !prev);
      refreshCalendarStatuses?.();
      toast.success("Schedule removed");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't update the schedule");
    }
  };

  const handleSaveRepeatSchedule = async () => {
    const parsedDate = parseFormattedDate(formattedDate);
    if (!parsedDate) {
      console.error("Bad date:", formattedDate);
      toast.error("Couldn't save the schedule");
      return;
    }

    if (!currentUserId) {
      console.error("Missing userId for repeat toggle");
      toast.error("Couldn't save the schedule");
      return;
    }

    try {
      if (currentExercise.ruleId) {
        const response = await fetch("/api/recurringRule", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ruleId: String(currentExercise.ruleId) }),
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(`deleteRecurringRule ${response.status}: ${message}`);
        }
      }

      const savedRule = await saveRecurringRule({
        userId: currentUserId,
        exerciseId: currentExercise.exerciseId ?? currentExercise._id,
        exerciseName: currentExercise.name,
        exerciseType: currentExercise.type,
        routineName,
        recurrenceType,
        interval: repeatInterval,
        dayOfWeek: repeatDayOfWeek,
        daysOfWeek:
          recurrenceType === "custom"
            ? repeatDaysOfWeek
            : [repeatDayOfWeek],
        dayOfMonth: repeatDayOfMonth,
        intervalWeeks: repeatInterval,
        startDate: parsedDate,
        endDate: repeatEndDate || undefined,
        templateSets: currentExercise.sets,
        defaultMax: currentExercise.max,
        defaultRest: currentExercise.rest,
        active: true,
      } as any);

      setCurrentExercise((prev) => ({
        ...prev,
        isRepeating: true,
        ruleId: savedRule._id,
        recurrenceType,
        interval: repeatInterval,
        intervalWeeks: repeatInterval,
        dayOfWeek: repeatDayOfWeek,
        daysOfWeek:
          recurrenceType === "custom"
            ? repeatDaysOfWeek
            : [repeatDayOfWeek],
        dayOfMonth: repeatDayOfMonth,
        endDate: repeatEndDate || undefined,
      }));
      setIsRepeating(true);

      await saveWorkoutEntry({
        ...currentExercise,
        name: currentExercise.name,
        type: currentExercise.type,
        max: currentExercise.max,
        userId: currentExercise.userId ?? currentUserId,
        exerciseId: currentExercise.exerciseId ?? currentExercise._id,
        routineName,
        isRepeating: true,
        ruleId: savedRule._id.toString(),
        recurrenceType,
        interval: repeatInterval,
        intervalWeeks: repeatInterval,
        dayOfWeek: repeatDayOfWeek,
        daysOfWeek:
          recurrenceType === "custom"
            ? repeatDaysOfWeek
            : [repeatDayOfWeek],
        dayOfMonth: repeatDayOfMonth,
        endDate: repeatEndDate || undefined,
        date: parsedDate.toISOString().slice(0, 10),
      } as any);

      setShowRepeatDialog(false);
      setRefetchExercises((prev) => !prev);
      refreshCalendarStatuses?.();
      toast.success("Schedule updated");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't save the schedule");
    }
  };

  if (currentExercise.complete) {
    const completedSetCount =
      currentExercise.sets?.filter((s) => s.complete).length ?? 0;
    const completedExerciseName =
      toTitleCase(currentExercise.name) ||
      toTitleCase(exercise.name) ||
      "Completed Exercise";
    const completedExerciseType = currentExercise.type ?? exercise.type;

    return (
      <Paper
        key={`exercise-log-${currentExercise.name}-${exerciseIndex}`}
        elevation={0}
        sx={{
          p: 1.75,
          my: 1.25,
          borderRadius: 3,
          border: "1px solid",
          borderColor: darkMode
            ? "rgba(148,163,184,0.12)"
            : "rgba(17,24,39,0.08)",
          backgroundColor: darkMode
            ? "rgba(17,24,39,0.88)"
            : "rgba(255,255,255,0.94)",
          boxShadow: darkMode
            ? "0 12px 28px rgba(0,0,0,0.16)"
            : "0 10px 24px rgba(17,24,39,0.06)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CRUDMenuButton
              darkMode={darkMode}
              handleDelete={() => {
                if (isRepeating) {
                  setShowDeleteDialog(true);
                } else {
                  handleDelete("today");
                }
              }}
              handleUpdate={handleUpdate}
              onClickMenuButton={() =>
                setShownMenuIndex(
                  shownMenuIndex === exerciseIndex ? -1 : exerciseIndex
                )
              }
              show={shownMenuIndex === exerciseIndex}
            />
            <IconButton
              onClick={openRepeatDialog}
              title={isRepeating ? "Edit repeating schedule" : "Repeat this exercise"}
              size="small"
            >
              <RepeatIcon
                color={isRepeating ? "primary" : "disabled"}
                fontSize="small"
              />
            </IconButton>
          </Box>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h6">{completedExerciseName}</Typography>
            <Typography sx={{ color: "text.secondary", mt: 0.5 }}>
              Logged on {formattedDate}
            </Typography>
          </Box>

          <Chip
            label="Logged"
            color="success"
            variant="outlined"
            size="small"
            sx={{ fontWeight: 700 }}
          />
        </Box>

        <Box
          sx={{
            mt: 1.75,
            mb: 0.25,
            px: 0.25,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Typography sx={{ color: "text.secondary" }}>
            {completedSetCount} completed set{completedSetCount === 1 ? "" : "s"}
          </Typography>
          <Typography sx={{ color: "text.secondary" }}>
            {completedExerciseType === "weight"
              ? "Performance log"
              : "Completed timer log"}
          </Typography>
        </Box>

        {currentExercise.sets?.filter((s) => s.complete).map((s, i) => (
          <CompletedSetItem
            key={`completed-log-set-${i}`}
            set={s}
            setIndex={i}
            setCurrentSetIndex={setCurrentSetIndex}
            type={completedExerciseType}
            darkMode={darkMode}
            interactive={false}
          />
        ))}

        {renderCompletedPerformancePanel()}

        <DeleteDialog
          open={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onDeleteToday={() => {
            handleDelete("today");
            setShowDeleteDialog(false);
          }}
          onDeleteAll={() => {
            handleDelete("all");
            setShowDeleteDialog(false);
          }}
          targetDate={formattedDate}
        />
        <RepeatScheduleDialog
          open={showRepeatDialog}
          onClose={() => setShowRepeatDialog(false)}
          onSave={handleSaveRepeatSchedule}
          onDisable={isRepeating ? handleDisableRepeat : undefined}
          isRepeating={isRepeating}
          recurrenceType={recurrenceType}
          setRecurrenceType={setRecurrenceType}
          interval={repeatInterval}
          setInterval={setRepeatInterval}
          dayOfWeek={repeatDayOfWeek}
          setDayOfWeek={setRepeatDayOfWeek}
          daysOfWeek={repeatDaysOfWeek}
          setDaysOfWeek={setRepeatDaysOfWeek}
          dayOfMonth={repeatDayOfMonth}
          setDayOfMonth={setRepeatDayOfMonth}
          endDate={repeatEndDate}
          setEndDate={setRepeatEndDate}
        />
      </Paper>
    );
  }

  const completedCount =
    currentExercise.sets?.filter((s) => s.complete).length ?? 0;
  const totalCount = currentExercise.sets?.length ?? 0;
  const nextOpenSet =
    currentExercise.sets?.find((s) => !s.complete) ?? currentExercise.sets?.[0];
  const upcomingWeight =
    currentExercise.type === "weight" && nextOpenSet?.weight
      ? Math.round((Number(nextOpenSet.weight) || 0) / 5) * 5
      : null;
  const upcomingReps =
    currentExercise.type === "weight" ? nextOpenSet?.reps ?? null : null;

  return (
    <>
      <Paper
        key={`exercise-${exercise.name}-${exerciseIndex}`}
        elevation={0}
        sx={{
          p: 1.5,
          my: 1.5,
          borderRadius: 3,
          backgroundColor: darkMode
            ? "rgba(17,24,39,0.72)"
            : "rgba(249,250,251,0.96)",
          border: "1px solid",
          borderColor: darkMode
            ? "rgba(148,163,184,0.1)"
            : "rgba(17,24,39,0.08)",
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            boxShadow: darkMode
              ? "0 14px 28px rgba(0,0,0,0.16)"
              : "0 14px 24px rgba(17,24,39,0.06)",
          },
        }}
      >
        <Box
          onClick={() => handleWorkoutButtonClick(exerciseIndex)}
          sx={{
            display: "grid",
            gridTemplateColumns: "auto minmax(0,1fr) auto",
            alignItems: "center",
            gap: 1.25,
            cursor: "pointer",
          }}
        >
          <Box
            onClick={(e) => e.stopPropagation()}
            sx={{ display: "flex", alignItems: "center", gap: 0.25 }}
          >
            <CRUDMenuButton
              darkMode={darkMode}
              handleDelete={() => {
                if (isRepeating) {
                  setShowDeleteDialog(true);
                } else {
                  handleDelete("today");
                }
              }}
              handleUpdate={handleUpdate}
              onClickMenuButton={() =>
                setShownMenuIndex(
                  shownMenuIndex === exerciseIndex ? -1 : exerciseIndex
                )
              }
              show={shownMenuIndex === exerciseIndex}
            />
            <IconButton
              onClick={openRepeatDialog}
              title={isRepeating ? "Edit repeating schedule" : "Repeat this exercise"}
              size="small"
            >
              <RepeatIcon
                color={isRepeating ? "primary" : "disabled"}
                fontSize="small"
              />
            </IconButton>
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ lineHeight: 1.1 }}>
              {toTitleCase(currentExercise.name)}
            </Typography>
            <Box
              sx={{
                mt: 0.65,
                display: "flex",
                gap: 0.75,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <Chip
                size="small"
                icon={
                  completedCount === totalCount && totalCount > 0 ? (
                    <CheckIcon fontSize="small" />
                  ) : (
                    <RadioButtonUncheckedIcon fontSize="small" />
                  )
                }
                label={`${completedCount}/${totalCount} sets`}
                variant="outlined"
                sx={{
                  backgroundColor: darkMode
                    ? "rgba(255,255,255,0.03)"
                    : "rgba(255,255,255,0.8)",
                  borderColor: darkMode
                    ? "rgba(148,163,184,0.14)"
                    : "rgba(17,24,39,0.08)",
                }}
              />
              {currentExercise.type === "weight" && upcomingWeight && upcomingReps ? (
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Next up: {upcomingWeight} x {upcomingReps}
                </Typography>
              ) : null}
            </Box>
          </Box>

          <Typography
            variant="body2"
            sx={{ color: "text.secondary", fontWeight: 600 }}
          >
            Open
          </Typography>
        </Box>
      </Paper>

      <Dialog
        fullScreen
        open={isOpen}
        onClose={() => setCurrentExerciseIndex(-1)}
        PaperProps={{
          sx: {
            backgroundColor: darkMode ? "#0f1720" : "#f8fafc",
            backgroundImage: "none",
          },
        }}
      >
        <Dialog
          fullScreen
          open={
            isOpen &&
            currentExercise.type === "weight" &&
            (restSecondsRemaining > 0 || isRestTimerActive)
          }
          onClose={() => {}}
          PaperProps={{
            sx: {
              backgroundColor: darkMode ? "#020617" : "#f8fafc",
              color: darkMode ? "#f8fafc" : "#111827",
              backgroundImage: darkMode
                ? "radial-gradient(circle at top, rgba(59,130,246,0.18), transparent 38%)"
                : "radial-gradient(circle at top, rgba(37,99,235,0.1), transparent 34%)",
            },
          }}
        >
          <Box
            sx={{
              minHeight: "100vh",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              px: 2.5,
              py: 4,
              textAlign: "center",
            }}
          >
            <Typography
              variant="overline"
              sx={{ color: "text.secondary", letterSpacing: "0.16em" }}
            >
              Rest Between Sets
            </Typography>
            <Typography
              variant="h2"
              sx={{
                mt: 1,
                fontWeight: 800,
                letterSpacing: "-0.06em",
                fontSize: { xs: "4rem", sm: "5.5rem" },
              }}
            >
              {formatTime(restSecondsRemaining)}
            </Typography>
            <Typography
              sx={{
                mt: 1.25,
                maxWidth: 420,
                color: "text.secondary",
                fontSize: { xs: "1rem", sm: "1.05rem" },
              }}
            >
              Catch your breath before the next set. You can adjust the rest
              target for this exercise right here.
            </Typography>

            <Box
              sx={{
                mt: 3.5,
                width: "100%",
                maxWidth: 420,
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
              }}
            >
              <Box sx={{ display: "flex", gap: 1, justifyContent: "center", flexWrap: "wrap" }}>
                <Button
                  variant="outlined"
                  startIcon={<RemoveIcon />}
                  onClick={() => adjustRestTimer(-15)}
                  disabled={restSecondsRemaining <= 15}
                >
                  15s
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => adjustRestTimer(15)}
                >
                  15s
                </Button>
                {isRestTimerActive ? (
                  <Button
                    variant="outlined"
                    startIcon={<PauseIcon />}
                    onClick={pauseRestTimer}
                  >
                    Pause
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    startIcon={<PlayArrowIcon />}
                    onClick={resumeRestTimer}
                    disabled={restSecondsRemaining <= 0}
                  >
                    Resume
                  </Button>
                )}
              </Box>

              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 4,
                  border: "1px solid",
                  borderColor: darkMode
                    ? "rgba(148,163,184,0.14)"
                    : "rgba(17,24,39,0.08)",
                  backgroundColor: darkMode
                    ? "rgba(15,23,42,0.78)"
                    : "rgba(255,255,255,0.88)",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ mb: 1, color: "text.secondary", fontWeight: 700 }}
                >
                  Rest setting for this exercise
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr auto" },
                    gap: 1,
                    alignItems: "center",
                  }}
                >
                  <TextField
                    type="number"
                    label="Rest seconds"
                    value={restEditorValue}
                    onChange={(event) =>
                      setRestEditorValue(
                        String(Math.max(0, Number(event.target.value) || 0))
                      )
                    }
                    inputProps={{ min: 0, step: 5 }}
                  />
                  <Button variant="contained" onClick={handleApplyRestEdit}>
                    Apply
                  </Button>
                </Box>
              </Paper>

              <Box sx={{ display: "flex", gap: 1, justifyContent: "center", flexWrap: "wrap" }}>
                <Button variant="text" startIcon={<SkipNextIcon />} onClick={skipRestTimer}>
                  Skip Rest
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  onClick={skipRestTimer}
                >
                  Continue to Next Set
                </Button>
              </Box>
            </Box>
          </Box>
        </Dialog>

        <AppBar
          position="sticky"
          elevation={0}
          color="transparent"
          sx={{
            borderBottom: "1px solid",
            borderColor: darkMode
              ? "rgba(148,163,184,0.12)"
              : "rgba(17,24,39,0.08)",
            backdropFilter: "blur(18px)",
            backgroundColor: darkMode
              ? "rgba(15,23,32,0.82)"
              : "rgba(248,250,252,0.88)",
          }}
        >
          <Toolbar sx={{ gap: 1, minHeight: { xs: 72, sm: 80 } }}>
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => setCurrentExerciseIndex(-1)}
            >
              <CloseIcon />
            </IconButton>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography
                variant="overline"
                sx={{ color: "text.secondary", letterSpacing: "0.12em" }}
              >
                Exercise
              </Typography>
              <Typography variant="h5" sx={{ lineHeight: 1.1 }}>
                {toTitleCase(currentExercise.name)}
              </Typography>
              <Typography sx={{ color: "text.secondary", mt: 0.25 }}>
                {completedCount}/{totalCount} sets logged
                {currentExercise.type === "weight" && upcomingWeight && upcomingReps
                  ? ` | Next target ${upcomingWeight} x ${upcomingReps}`
                  : ""}
              </Typography>
            </Box>
            <IconButton
              onClick={openRepeatDialog}
              title={isRepeating ? "Edit repeating schedule" : "Repeat this exercise"}
              color="inherit"
            >
              <RepeatIcon color={isRepeating ? "primary" : "disabled"} />
            </IconButton>
          </Toolbar>
        </AppBar>

        <Box
          sx={{
            px: { xs: 1, sm: 2 },
            py: { xs: 1.5, sm: 2 },
            maxWidth: 820,
            width: "100%",
            mx: "auto",
          }}
        >
          {currentExercise.sets &&
            currentExercise.sets.map((s, i) => {
              if (i === currentSetIndex) {
                return (
                  <SelectedSetItem
                    key={`selectedSetItem-${i}`}
                    routineName={routineName}
                    set={s}
                    currentExercise={currentExercise}
                    progressionStyle={recommendation?.progressionStyle}
                    setIndex={i}
                    currentExerciseIndex={currentExerciseIndex}
                    setCurrentSetIndex={setCurrentSetIndex}
                    setCurrentExercise={setCurrentExercise}
                    formattedDate={formattedDate}
                    setCurrentExerciseIndex={setCurrentExerciseIndex}
                    workout={workout}
                  exercises={exercises}
                  setExercises={setExercises}
                  darkMode={darkMode}
                  onStartRestTimer={startRestTimer}
                  setRefetchExercises={setRefetchExercises}
                  refreshCalendarStatuses={refreshCalendarStatuses}
                  isRestTimerBlocking={
                    currentExercise.type === "weight" &&
                    restSecondsRemaining > 0
                  }
                  onLogSetAttempt={handleLogSetAttempt}
                  onLogSetPersisted={handleLogSetPersisted}
                  onLogSetFailed={handleLogSetFailed}
                />
              );
              }

              if (s.complete) {
                return (
                  <CompletedSetItem
                    key={`completedSetItem-${i}`}
                    set={s}
                    setIndex={i}
                    setCurrentSetIndex={setCurrentSetIndex}
                    type={currentExercise.type}
                    darkMode={darkMode}
                  />
                );
              }

              return (
                <SetItem
                  key={`setItem-${i}`}
                  set={s}
                  handleDeleteSet={(setName) => handleDeleteSet(setName)}
                  type={currentExercise.type}
                  darkMode={darkMode}
                />
              );
            })}

          <Button
            variant="outlined"
            size="small"
            title="Adds an exercise only to the currently selected day"
            onClick={handleAddSet}
            startIcon={<AddIcon />}
            sx={{
              mt: 3,
              mb: 2,
              width: "100%",
              borderRadius: 10,
              borderColor: darkMode
                ? "rgba(148,163,184,0.14)"
                : "rgba(17,24,39,0.1)",
              color: "text.primary",
              backgroundColor: darkMode
                ? "rgba(255,255,255,0.02)"
                : "rgba(249,250,251,0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              "&:hover": {
                borderColor: darkMode
                  ? "rgba(148,163,184,0.2)"
                  : "rgba(17,24,39,0.14)",
                backgroundColor: darkMode
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(243,244,246,0.96)",
              },
            }}
          >
            Add Set
          </Button>
        </Box>
      </Dialog>

      <DeleteDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onDeleteToday={() => {
          handleDelete("today");
          setShowDeleteDialog(false);
        }}
        onDeleteAll={() => {
          handleDelete("all");
          setShowDeleteDialog(false);
        }}
        targetDate={formattedDate}
      />
      <RepeatScheduleDialog
        open={showRepeatDialog}
        onClose={() => setShowRepeatDialog(false)}
        onSave={handleSaveRepeatSchedule}
        onDisable={isRepeating ? handleDisableRepeat : undefined}
        isRepeating={isRepeating}
        recurrenceType={recurrenceType}
        setRecurrenceType={setRecurrenceType}
        interval={repeatInterval}
        setInterval={setRepeatInterval}
        dayOfWeek={repeatDayOfWeek}
        setDayOfWeek={setRepeatDayOfWeek}
        daysOfWeek={repeatDaysOfWeek}
        setDaysOfWeek={setRepeatDaysOfWeek}
        dayOfMonth={repeatDayOfMonth}
        setDayOfMonth={setRepeatDayOfMonth}
        endDate={repeatEndDate}
        setEndDate={setRepeatEndDate}
      />
    </>
  );
};

export default ExerciseItem;
