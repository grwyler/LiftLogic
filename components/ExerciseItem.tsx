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
  Stack,
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
    getWorkoutEntryIdentity,
    deleteWorkoutEntry,
    saveRecurringRule,
    saveWorkoutEntry,
    toLocalDateKey,
    toTitleCase,
  } from "../utils/helpers";
import { useSession } from "next-auth/react";
import { Session } from "next-auth";
import DeleteDialog from "./DeleteDialog";
import SkipTodayDialog from "./SkipTodayDialog";
import { toast } from "react-toastify";
import {
  clearPendingLogAttempt,
  emitDevBugInteraction,
  markPendingLogAttemptPersisted,
  setPendingLogAttempt,
} from "../utils/devBugRecorder";
import { createExerciseSetId, ensureExerciseSetIds } from "../utils/exerciseSetIds";
import {
  formatWeight,
  formatWeightValue,
  fromCanonicalWeightLb,
  getDisplayWeightFromSet,
  normalizeWeightUnit,
} from "../utils/weightUnits";
import { getPersonalRecordHighlights } from "../utils/performance";

const completedExerciseRadius = {
  panel: "28px",
  section: "22px",
  pill: "999px",
} as const;

const ExerciseItem = ({
  exercise,
  exerciseIndex,
  exercises,
  workout,
  setCurrentExerciseIndex,
  isOpen,
  formattedDate,
  routineName,
  setExercises,
  shownMenuIndex,
  setShownMenuIndex,
  darkMode,
  setRefetchExercises,
  refreshCalendarStatuses,
  userProfile,
  recommendation,
  progressSummary,
  loadingRecommendation,
  progressionRecommendationsEnabled = true,
  recurringSchedulingEnabled = true,
  onRequestRecurringUpgradePrompt,
  onRequestProgressionUpgradePrompt,
  isRestTimerBlocking,
  openRestTimer,
}) => {
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [currentExercise, setCurrentExercise] = useState(exercise);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSkipTodayDialog, setShowSkipTodayDialog] = useState(false);
  const [showRepeatDialog, setShowRepeatDialog] = useState(false);
  const [isRepeating, setIsRepeating] = useState(exercise.isRepeating);
  const [applyingRecommendation, setApplyingRecommendation] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<
    "daily" | "weekly" | "custom" | "monthly"
  >("weekly");
  const [repeatInterval, setRepeatInterval] = useState(1);
  const [repeatDayOfWeek, setRepeatDayOfWeek] = useState(0);
  const [repeatDaysOfWeek, setRepeatDaysOfWeek] = useState<number[]>([0]);
  const [repeatDayOfMonth, setRepeatDayOfMonth] = useState(1);
  const [repeatEndDate, setRepeatEndDate] = useState("");
  const exerciseIdentityRef = useRef<string | null>(null);
  const { data: session } = useSession() as {
    data: (Session & { token: { user } }) | null;
  };

  const currentUserId =
    (session as any)?.token?.user?._id ??
    (session as any)?.user?._id ??
    currentExercise?.userId ??
    exercise?.userId;
  const preferredUnits = normalizeWeightUnit(
    userProfile?.preferredUnits ?? currentExercise?.weightUnit ?? exercise?.weightUnit
  );
  const exerciseIdentity = String(
    getWorkoutEntryIdentity(exercise, exerciseIndex)
  );
  const hasUnlockedProgressionRecommendation = Boolean(
    recommendation?.recommendedWeight ||
      recommendation?.recommendedReps ||
      recommendation?.recommendedSets ||
      progressSummary?.bestRepPerformance ||
      typeof progressSummary?.latestEstimated1RM === "number"
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

  const normalizeRepeatEndDate = (value: unknown) => {
    if (!value) {
      return "";
    }

    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    const parsed = new Date(value as string | number | Date);
    return Number.isNaN(parsed.getTime()) ? "" : toLocalDateKey(parsed);
  };

  const syncRepeatScheduleState = (sourceExercise: any) => {
    const parsedDate = parseFormattedDate(formattedDate);
    const defaultDay = parsedDate?.getDay() ?? 0;
    const defaultDayOfMonth = parsedDate?.getDate() ?? 1;
    const nextRecurrenceType =
      sourceExercise?.recurrenceType ??
      (Array.isArray(sourceExercise?.daysOfWeek) &&
      sourceExercise?.daysOfWeek.length > 1
        ? "custom"
        : "weekly");

    setRecurrenceType(nextRecurrenceType);
    setRepeatDayOfWeek(sourceExercise?.dayOfWeek ?? defaultDay);
    setRepeatDaysOfWeek(
      Array.isArray(sourceExercise?.daysOfWeek) &&
        sourceExercise?.daysOfWeek.length > 0
        ? sourceExercise.daysOfWeek
        : [sourceExercise?.dayOfWeek ?? defaultDay]
    );
    setRepeatDayOfMonth(sourceExercise?.dayOfMonth ?? defaultDayOfMonth);
    setRepeatInterval(
      Math.max(
        1,
        Number(sourceExercise?.interval ?? sourceExercise?.intervalWeeks) || 1
      )
    );
    setRepeatEndDate(normalizeRepeatEndDate(sourceExercise?.endDate));
  };

  useEffect(() => {
    setCurrentExercise({
      ...exercise,
      sets: ensureExerciseSetIds(exercise?.sets),
    });
    setIsRepeating(exercise.isRepeating);
    syncRepeatScheduleState(exercise as any);

    if (exerciseIdentityRef.current !== exerciseIdentity) {
      exerciseIdentityRef.current = exerciseIdentity;
    }
  }, [exercise, exerciseIdentity]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const nextSetIndex =
      (currentExercise?.sets ?? []).findIndex((set) => !set.complete) ?? -1;
    setCurrentSetIndex(nextSetIndex >= 0 ? nextSetIndex : 0);
  }, [currentExercise?.sets, isOpen]);

  const renderCompletedPerformancePanel = () => {
    if (currentExercise.type !== "weight" || !currentExercise.complete) {
      return null;
    }

    if (!progressionRecommendationsEnabled) {
      return (
        <Paper
          elevation={0}
          sx={{
            mt: 1.5,
            p: 1.5,
            borderRadius: completedExerciseRadius.section,
            border: "1px solid",
            borderColor: darkMode
              ? "rgba(148,163,184,0.12)"
              : "rgba(17,24,39,0.08)",
            backgroundColor: darkMode
              ? "rgba(17,24,39,0.72)"
              : "rgba(249,250,251,0.92)",
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Performance
          </Typography>
          <Typography sx={{ mt: 1, color: "text.secondary" }}>
            {hasUnlockedProgressionRecommendation
              ? "You unlocked performance trends and next-step recommendations from your recent logs."
              : "Keep logging clean weight sessions and Pro Beta will unlock performance trends and next-step recommendations here."}
          </Typography>
          {hasUnlockedProgressionRecommendation ? (
            <Button
              variant="outlined"
              size="small"
              sx={{ mt: 1.25 }}
              onClick={() => onRequestProgressionUpgradePrompt?.()}
            >
              See Pro Beta insights
            </Button>
          ) : null}
        </Paper>
      );
    }

    const latestEstimated1RM = progressSummary?.latestEstimated1RM ?? null;
    const previousEstimated1RM = progressSummary?.previousEstimated1RM ?? null;
    const heaviestWeightEver = progressSummary?.heaviestWeightEver ?? null;
    const delta =
      latestEstimated1RM !== null && previousEstimated1RM !== null
        ? Math.round(
            (fromCanonicalWeightLb(latestEstimated1RM, preferredUnits) -
              fromCanonicalWeightLb(previousEstimated1RM, preferredUnits)) *
              10
          ) / 10
        : null;
    const hasPriorBenchmark = previousEstimated1RM !== null;
    const personalRecordHighlights = getPersonalRecordHighlights(
      progressSummary,
      preferredUnits
    );
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
          borderRadius: completedExerciseRadius.section,
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
          <Chip
            size="small"
            label={trendLabel}
            color={trendColor as any}
            variant="outlined"
            sx={{ borderRadius: completedExerciseRadius.pill, fontWeight: 700 }}
          />
        </Box>

        {personalRecordHighlights.length > 0 ? (
          <Paper
            elevation={0}
            sx={{
              mt: 1,
              p: 1.25,
              borderRadius: completedExerciseRadius.section,
              border: "1px solid",
              borderColor: darkMode
                ? "rgba(74,222,128,0.25)"
                : "rgba(22,163,74,0.18)",
              backgroundColor: darkMode
                ? "rgba(20,83,45,0.3)"
                : "rgba(240,253,244,0.9)",
            }}
          >
            <Stack spacing={0.85}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  New personal record
                </Typography>
                <Chip
                  size="small"
                  color="success"
                  variant="filled"
                  label={`+${personalRecordHighlights.length} PR${
                    personalRecordHighlights.length === 1 ? "" : "s"
                  }`}
                  sx={{ borderRadius: completedExerciseRadius.pill, fontWeight: 700 }}
                />
              </Box>
              <Typography sx={{ color: "text.secondary" }}>
                You beat a prior benchmark on this lift. Lock it in while the effort is still
                fresh.
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {personalRecordHighlights.map((highlight) => (
                  <Chip
                    key={`${highlight.category}-${highlight.detail}`}
                    label={`${highlight.label}: ${highlight.detail}`}
                    color="success"
                    variant="outlined"
                    sx={{ borderRadius: completedExerciseRadius.pill, fontWeight: 700 }}
                  />
                ))}
              </Box>
            </Stack>
          </Paper>
        ) : null}

        {loadingRecommendation ? (
          <Typography sx={{ mt: 1, color: "text.secondary" }}>
            Loading performance...
          </Typography>
        ) : latestEstimated1RM ? (
          <>
            <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Chip
                label={`Est. 1RM ${formatWeight(fromCanonicalWeightLb(latestEstimated1RM, preferredUnits), preferredUnits)}`}
                variant="outlined"
                sx={{ borderRadius: completedExerciseRadius.pill, fontWeight: 700 }}
              />
              {delta !== null ? (
                <Chip
                  label={`${delta > 0 ? "+" : ""}${delta} vs last`}
                  variant="outlined"
                  sx={{ borderRadius: completedExerciseRadius.pill, fontWeight: 700 }}
                />
              ) : null}
              {heaviestWeightEver ? (
                <Chip
                  label={`Best weight ${formatWeight(fromCanonicalWeightLb(heaviestWeightEver, preferredUnits), preferredUnits)}`}
                  variant="outlined"
                  sx={{ borderRadius: completedExerciseRadius.pill, fontWeight: 700 }}
                />
              ) : null}
            </Box>

            {progressSummary?.bestRepPerformance ? (
              <Typography sx={{ mt: 1, color: "text.secondary" }}>
                Best logged set: {formatWeight(fromCanonicalWeightLb(progressSummary.bestRepPerformance.weight, preferredUnits), preferredUnits)} x{" "}
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

  const buildRecommendedIncompleteSets = () => {
    const completedSets = (currentExercise?.sets ?? []).filter((set) => set.complete);
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
        id: createExerciseSetId(),
        name: `Working Set ${index + 1}`,
        reps: recommendation.recommendedReps,
        weight: recommendation.recommendedWeight,
        weightUnit: recommendation.weightUnit ?? preferredUnits,
        actualWeight: "",
        actualReps: "",
        complete: false,
      })
    );

    return [...completedSets, ...recommendedIncompleteSets];
  };

  const handleApplyRecommendation = async () => {
    if (
      !recommendation?.recommendedWeight ||
      !recommendation?.recommendedReps ||
      !recommendation?.recommendedSets
    ) {
      return;
    }

    const nextSets = buildRecommendedIncompleteSets();
    const nextExercise = {
      ...currentExercise,
      sets: nextSets,
    };

    try {
      setApplyingRecommendation(true);
      setCurrentExercise(nextExercise);
      await saveWorkoutEntry({
        _id: nextExercise._id,
        entryInstanceId:
          nextExercise.entryInstanceId ??
          nextExercise._id?.toString?.() ??
          nextExercise._id,
        userId: currentUserId,
        exerciseId: nextExercise.exerciseId ?? nextExercise._id,
        name: nextExercise.name,
        type: nextExercise.type,
        max: nextExercise.max,
        weightUnit: recommendation.weightUnit ?? preferredUnits,
        routineName,
        date: formattedDate,
        rest: nextExercise.rest,
        complete: nextExercise.complete ?? false,
        sets: nextSets,
        ruleId: nextExercise.ruleId,
      } as any);
      setExercises((prev: any[]) =>
        (Array.isArray(prev) ? prev : []).map((exerciseItem, index) =>
          index === exerciseIndex
            ? {
                ...exerciseItem,
                weightUnit: recommendation.weightUnit ?? preferredUnits,
                sets: nextSets,
              }
            : exerciseItem
        )
      );
      toast.success("Recommendation applied to this session");
    } catch (error) {
      console.error("Failed to apply recommendation", error);
      toast.error("The recommendation was not applied. Try again.");
    } finally {
      setApplyingRecommendation(false);
    }
  };

  const renderRecommendationPanel = () => {
    if (!progressionRecommendationsEnabled && currentExercise.type === "weight") {
      return (
        <Paper
          elevation={0}
          sx={{
            mb: 1.5,
            p: 1.5,
            borderRadius: completedExerciseRadius.section,
            border: "1px solid",
            borderColor: darkMode
              ? "rgba(148,163,184,0.12)"
              : "rgba(17,24,39,0.08)",
            backgroundColor: darkMode
              ? "rgba(30,41,59,0.66)"
              : "rgba(248,250,252,0.92)",
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Recommended targets
          </Typography>
          <Typography sx={{ mt: 0.75, color: "text.secondary" }}>
            {hasUnlockedProgressionRecommendation
              ? "You unlocked a next-session recommendation from your recent logs."
              : "Finish a fully logged weight session for this lift to unlock a data-driven recommendation."}
          </Typography>
          {hasUnlockedProgressionRecommendation ? (
            <Button
              variant="outlined"
              size="small"
              sx={{ mt: 1.25 }}
              onClick={() => onRequestProgressionUpgradePrompt?.()}
            >
              See Pro Beta recommendation
            </Button>
          ) : null}
        </Paper>
      );
    }

    if (
      currentExercise.type !== "weight" ||
      currentExercise.complete ||
      !recommendation?.recommendedWeight ||
      !recommendation?.recommendedReps ||
      !recommendation?.recommendedSets
    ) {
      return null;
    }

    return (
      <Paper
        elevation={0}
        sx={{
          mb: 1.5,
          p: 1.5,
          borderRadius: completedExerciseRadius.section,
          border: "1px solid",
          borderColor: darkMode
            ? "rgba(148,163,184,0.12)"
            : "rgba(17,24,39,0.08)",
          backgroundColor: darkMode
            ? "rgba(30,41,59,0.66)"
            : "rgba(248,250,252,0.92)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            gap: 1,
            flexDirection: { xs: "column", sm: "row" },
          }}
        >
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Recommended targets
            </Typography>
            <Typography sx={{ mt: 0.4, color: "text.secondary" }}>
              Your planned sets stay unchanged until you apply this recommendation.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            onClick={handleApplyRecommendation}
            disabled={applyingRecommendation}
          >
            {applyingRecommendation ? "Applying..." : "Apply recommendation"}
          </Button>
        </Box>
        <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Chip
            label={`${recommendation.recommendedSets} set${
              recommendation.recommendedSets === 1 ? "" : "s"
            }`}
            variant="outlined"
          />
          <Chip
            label={formatWeight(recommendation.recommendedWeight, recommendation.weightUnit ?? preferredUnits)}
            variant="outlined"
          />
          <Chip
            label={`${recommendation.recommendedReps} reps`}
            variant="outlined"
          />
        </Box>
      </Paper>
    );
  };

  const handleOpenRepeatFlow = (event?: React.MouseEvent<HTMLElement>) => {
    event?.stopPropagation();

    if (!recurringSchedulingEnabled) {
      onRequestRecurringUpgradePrompt?.();
      return;
    }

    openRepeatDialog();
  };

  const handleWorkoutButtonClick = (index) => {
    setCurrentExerciseIndex((prevIndex) => (prevIndex === index ? -1 : index));
    setShownMenuIndex(-1);
    const nextSetIndex = exercise.sets.findIndex((s) => !s.complete);
    setCurrentSetIndex(nextSetIndex !== -1 ? nextSetIndex : 0);

    if (!isOpen) {
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
      id: createExerciseSetId(),
      weight: lastSet.weight + lastSet.weight * 0.05,
      actualWeight: "",
      actualReps: "",
      complete: false,
      name: `Working Set ${newSetNumber}`,
    };
    setCurrentExercise({ ...currentExercise, sets: [...sets, newSet] });
  };

  const handleDeleteSet = (setId) => {
    const sets = [...currentExercise.sets];
    setCurrentExercise({
      ...currentExercise,
      sets: sets.filter((s) => s.id !== setId),
    });
  };

  const handleSkipToday = async () => {
    try {
      await saveWorkoutEntry({
        _id: currentExercise._id,
        entryInstanceId:
          currentExercise.entryInstanceId ??
          currentExercise._id?.toString?.() ??
          currentExercise._id,
        userId: currentUserId,
        exerciseId: currentExercise.exerciseId ?? currentExercise._id,
        name: currentExercise.name,
        type: currentExercise.type,
        max: currentExercise.max,
        routineName,
        date: formattedDate,
        rest: currentExercise.rest ?? 0,
        complete: false,
        sets: [],
        ruleId: currentExercise.ruleId,
        skipped: true,
      });

      setShowSkipTodayDialog(false);
      setRefetchExercises((prev) => !prev);
      refreshCalendarStatuses?.();
      toast.success("Skipped for today");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't skip this exercise");
    }
  };

  const handleDelete = async (scope: "today" | "all") => {
    try {
      const recurringRuleId = String(
        currentExercise.ruleId ?? currentExercise._id ?? ""
      ).trim();

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
      _id: updatedExercise._id ?? currentExercise._id,
      entryInstanceId:
        updatedExercise.entryInstanceId ??
        currentExercise.entryInstanceId ??
        updatedExercise._id ??
        currentExercise._id,
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

  const openRepeatDialog = (event?: React.MouseEvent<HTMLElement>) => {
    event?.stopPropagation();
    if (!recurringSchedulingEnabled) {
      onRequestRecurringUpgradePrompt?.();
      return;
    }
    syncRepeatScheduleState(currentExercise as any);
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
        _id: currentExercise._id,
        entryInstanceId:
          currentExercise.entryInstanceId ??
          currentExercise._id?.toString?.() ??
          currentExercise._id,
        name: currentExercise.name,
        type: currentExercise.type,
        max: currentExercise.max,
        userId: currentUserId,
        exerciseId: currentExercise.exerciseId ?? currentExercise._id,
        routineName,
        date: toLocalDateKey(parsedDate),
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

    if (!recurringSchedulingEnabled) {
      toast.info("Pro Beta is required to schedule recurring workouts.");
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
        _id: currentExercise._id,
        entryInstanceId:
          currentExercise.entryInstanceId ??
          currentExercise._id?.toString?.() ??
          currentExercise._id,
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
        date: toLocalDateKey(parsedDate),
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
          p: 2,
          my: 1.25,
          borderRadius: completedExerciseRadius.panel,
          border: "1px solid",
          borderColor: darkMode
            ? "rgba(148,163,184,0.12)"
            : "rgba(17,24,39,0.08)",
          backgroundColor: darkMode
            ? "rgba(17,24,39,0.88)"
            : "rgba(255,255,255,0.94)",
          boxShadow: darkMode
            ? "0 12px 28px rgba(0,0,0,0.16)"
            : "0 18px 38px rgba(17,24,39,0.08)",
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
              handleSkipToday={currentExercise.complete ? undefined : () => setShowSkipTodayDialog(true)}
              handleUpdate={handleUpdate}
              deleteLabel={isRepeating ? "Delete recurring schedule" : "Delete exercise"}
              onClickMenuButton={() =>
                setShownMenuIndex(
                  shownMenuIndex === exerciseIndex ? -1 : exerciseIndex
                )
              }
              show={shownMenuIndex === exerciseIndex}
            />
            <IconButton
              onClick={handleOpenRepeatFlow}
              title={isRepeating ? "Edit repeating schedule" : "Repeat this exercise"}
              size="small"
              sx={{ borderRadius: "14px" }}
            >
              <RepeatIcon
                color={isRepeating ? "primary" : "disabled"}
                fontSize="small"
              />
            </IconButton>
          </Box>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              variant="overline"
              sx={{ color: "text.secondary", letterSpacing: "0.14em" }}
            >
              Completed Lift
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.2, lineHeight: 1.05 }}>
              {completedExerciseName}
            </Typography>
            <Typography sx={{ color: "text.secondary", mt: 0.45 }}>
              Logged on {formattedDate}
            </Typography>
          </Box>

          <Chip
            label="Logged"
            color="success"
            variant="filled"
            size="small"
            sx={{
              fontWeight: 800,
              borderRadius: completedExerciseRadius.pill,
              alignSelf: "flex-start",
            }}
          />
        </Box>

        <Box
          sx={{
            mt: 1.9,
            mb: 0.6,
            px: 0.1,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Typography sx={{ color: "text.secondary", fontWeight: 500 }}>
            {completedSetCount} completed set{completedSetCount === 1 ? "" : "s"}
          </Typography>
          <Typography sx={{ color: "text.secondary", fontWeight: 500 }}>
            {completedExerciseType === "weight"
              ? "Performance log"
              : "Completed timer log"}
          </Typography>
        </Box>

        {currentExercise.sets?.filter((s) => s.complete).map((s, i) => (
          <CompletedSetItem
            key={`completed-log-set-${s.id ?? i}`}
            set={s}
            setIndex={i}
            setCurrentSetIndex={setCurrentSetIndex}
            type={completedExerciseType}
            darkMode={darkMode}
            preferredUnits={preferredUnits}
            interactive={false}
          />
        ))}

        {renderCompletedPerformancePanel()}

        <DeleteDialog
          open={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onDeleteAll={() => {
            handleDelete("all");
            setShowDeleteDialog(false);
          }}
          targetDate={formattedDate}
        />
        <SkipTodayDialog
          open={showSkipTodayDialog}
          onClose={() => setShowSkipTodayDialog(false)}
          onSkipToday={handleSkipToday}
          targetDate={formattedDate}
          isRepeating={isRepeating}
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
    currentExercise.type === "weight"
      ? getDisplayWeightFromSet(nextOpenSet, "planned", preferredUnits)
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
              handleSkipToday={() => setShowSkipTodayDialog(true)}
              handleUpdate={handleUpdate}
              deleteLabel={isRepeating ? "Delete recurring schedule" : "Delete exercise"}
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
              disabled={!recurringSchedulingEnabled}
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
              {currentExercise.recommendationPending ? (
                <Chip
                  size="small"
                  label="Personalizing..."
                  color="warning"
                  variant="outlined"
                />
              ) : null}
              {currentExercise.type === "weight" && upcomingWeight && upcomingReps ? (
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Next up: {upcomingWeight} x {upcomingReps}
                </Typography>
              ) : null}
            </Box>
          </Box>

          <Button
            size="small"
            variant="text"
            onClick={(event) => {
              event.stopPropagation();
              handleWorkoutButtonClick(exerciseIndex);
            }}
            sx={{
              minWidth: "auto",
              px: 1,
              color: "text.secondary",
              fontWeight: 600,
            }}
          >
            Start Lift
          </Button>
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
                {currentExercise.type === "weight" && upcomingWeight !== null && upcomingReps
                  ? ` | Next target ${formatWeightValue(upcomingWeight)} ${preferredUnits} x ${upcomingReps}`
                  : ""}
              </Typography>
            </Box>
            <IconButton
              onClick={handleOpenRepeatFlow}
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
          {renderRecommendationPanel()}

          {currentExercise.sets &&
            currentExercise.sets.map((s, i) => {
              if (i === currentSetIndex) {
                return (
                  <SelectedSetItem
                    key={`selectedSetItem-${s.id ?? i}`}
                    routineName={routineName}
                    set={s}
                    currentExercise={currentExercise}
                    progressionStyle={recommendation?.progressionStyle}
                    setIndex={i}
                    currentExerciseIndex={exerciseIndex}
                    setCurrentSetIndex={setCurrentSetIndex}
                    setCurrentExercise={setCurrentExercise}
                    formattedDate={formattedDate}
                    setCurrentExerciseIndex={setCurrentExerciseIndex}
                    workout={workout}
                  exercises={exercises}
                  setExercises={setExercises}
                  darkMode={darkMode}
                  preferredUnits={preferredUnits}
                  onStartRestTimer={(seconds: number) =>
                    openRestTimer({
                      exerciseKey: exerciseIdentity,
                      exerciseName: toTitleCase(currentExercise.name),
                      seconds,
                      restSeconds: currentExercise.rest ?? 0,
                    })
                  }
                  setRefetchExercises={setRefetchExercises}
                  refreshCalendarStatuses={refreshCalendarStatuses}
                  isRestTimerBlocking={isRestTimerBlocking}
                  onLogSetAttempt={handleLogSetAttempt}
                  onLogSetPersisted={handleLogSetPersisted}
                  onLogSetFailed={handleLogSetFailed}
                />
              );
              }

              if (s.complete) {
                return (
                  <CompletedSetItem
                    key={`completedSetItem-${s.id ?? i}`}
                    set={s}
                    setIndex={i}
                    setCurrentSetIndex={setCurrentSetIndex}
                    type={currentExercise.type}
                    darkMode={darkMode}
                    preferredUnits={preferredUnits}
                  />
                );
              }

              return (
                <SetItem
                  key={`setItem-${s.id ?? i}`}
                  set={s}
                  handleDeleteSet={(setId) => handleDeleteSet(setId)}
                  type={currentExercise.type}
                  darkMode={darkMode}
                  preferredUnits={preferredUnits}
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
          <Box sx={{ height: { xs: 88, sm: 0 } }} />
        </Box>

        <Box
          sx={{
            display: { xs: "block", sm: "none" },
            position: "sticky",
            bottom: 0,
            px: 1,
            pb: "calc(12px + env(safe-area-inset-bottom, 0px))",
            pt: 1,
            borderTop: "1px solid",
            borderColor: darkMode
              ? "rgba(148,163,184,0.12)"
              : "rgba(17,24,39,0.08)",
            backdropFilter: "blur(18px)",
            backgroundColor: darkMode
              ? "rgba(15,23,32,0.9)"
              : "rgba(248,250,252,0.94)",
          }}
        >
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              onClick={() => setCurrentExerciseIndex(-1)}
              startIcon={<CloseIcon />}
              sx={{
                flex: 1,
                minHeight: 52,
                borderRadius: 10,
              }}
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleAddSet}
              startIcon={<AddIcon />}
              sx={{
                flex: 1.2,
                minHeight: 52,
                borderRadius: 10,
              }}
            >
              Add Set
            </Button>
          </Stack>
        </Box>
      </Dialog>

      <DeleteDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onDeleteAll={() => {
          handleDelete("all");
          setShowDeleteDialog(false);
        }}
        targetDate={formattedDate}
      />
      <SkipTodayDialog
        open={showSkipTodayDialog}
        onClose={() => setShowSkipTodayDialog(false)}
        onSkipToday={handleSkipToday}
        targetDate={formattedDate}
        isRepeating={isRepeating}
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

const areExerciseItemPropsEqual = (prevProps: any, nextProps: any) => {
  const prevExerciseId = getWorkoutEntryIdentity(prevProps.exercise);
  const nextExerciseId = getWorkoutEntryIdentity(nextProps.exercise);

  return (
    prevProps.exercise === nextProps.exercise &&
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.shownMenuIndex === nextProps.shownMenuIndex &&
    prevProps.darkMode === nextProps.darkMode &&
    prevProps.formattedDate === nextProps.formattedDate &&
    prevProps.routineName === nextProps.routineName &&
    prevExerciseId === nextExerciseId &&
    prevProps.recommendation === nextProps.recommendation &&
    prevProps.progressSummary === nextProps.progressSummary &&
    prevProps.loadingRecommendation === nextProps.loadingRecommendation &&
    prevProps.isRestTimerBlocking === nextProps.isRestTimerBlocking
  );
};

export default React.memo(ExerciseItem, areExerciseItemPropsEqual);
