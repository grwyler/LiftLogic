import React from "react";
import {
  Paper,
  Box,
  Button,
  Typography,
  Chip,
} from "@mui/material";
import RepeatIcon from "@mui/icons-material/Repeat";
import CheckIcon from "@mui/icons-material/Check";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import CompletedSetItem from "./CompletedSetItem";
import ExerciseEditItem from "./ExerciseEditItem";
import CRUDMenuButton from "./CRUDMenuButton";
import {
  getWorkoutEntryIdentity,
  saveWorkoutEntry,
  toTitleCase,
} from "../utils/helpers";
import { useSession } from "next-auth/react";
import { Session } from "next-auth";
import { toast } from "react-toastify";
import {
  clearPendingLogAttempt,
  emitDevBugInteraction,
  markPendingLogAttemptPersisted,
  setPendingLogAttempt,
} from "../utils/devBugRecorder";
import { createExerciseSetId } from "../utils/exerciseSetIds";
import {
  formatWeightValue,
  getDisplayWeightFromSet,
  normalizeWeightUnit,
} from "../utils/weightUnits";
import {
  buildRoutineSemanticButtonSx,
  buildRoutineSemanticIconButtonSx,
} from "../utils/routinesSemanticStyles";
import { useExerciseItemState } from "./exercise-item/useExerciseItemState";
import ExerciseDialogs from "./exercise-item/ExerciseDialogs";
import ExerciseLoggingDialog from "./exercise-item/ExerciseLoggingDialog";
import {
  CompletedExercisePerformancePanel,
  ExerciseRecommendationPanel,
} from "./exercise-item/ExerciseFeedbackPanels";
import {
  deleteExerciseWithScheduleScope,
  removeExerciseRepeatSchedule,
  saveExerciseRepeatSchedule,
} from "../utils/exerciseScheduleActions";
import { radiusTokens } from "../styles/radiusTokens";
import { Exercise, UserDoc, WorkoutEntryDoc, WorkoutExerciseView } from "../utils/types";

type SessionWithUserId = Session & {
  token?: {
    user?: {
      _id?: string;
    };
  };
  user?: Session["user"] & {
    _id?: string;
  };
};

type ExerciseItemView = WorkoutExerciseView & {
  userId?: string;
  recommendationPending?: boolean;
  clientDraftId?: string;
};

type ExerciseItemProps = {
  exercise: ExerciseItemView;
  exerciseIndex: number;
  exercises: ExerciseItemView[];
  workout: unknown;
  setCurrentExerciseIndex: React.Dispatch<React.SetStateAction<number>>;
  isOpen: boolean;
  formattedDate: string;
  routineName: string;
  setExercises: React.Dispatch<React.SetStateAction<ExerciseItemView[]>>;
  shownMenuIndex: number;
  setShownMenuIndex: React.Dispatch<React.SetStateAction<number>>;
  darkMode: boolean;
  setRefetchExercises: React.Dispatch<React.SetStateAction<boolean>>;
  refreshCalendarStatuses?: () => void;
  userProfile?: Partial<UserDoc> | null;
  recommendation?: {
    recommendedWeight?: number;
    recommendedReps?: number;
    recommendedSets?: number;
    weightUnit?: "lb" | "kg";
  } | null;
  progressSummary?: {
    bestRepPerformance?: unknown;
    latestEstimated1RM?: number;
  } | null;
  loadingRecommendation?: boolean;
  progressionRecommendationsEnabled?: boolean;
  recurringSchedulingEnabled?: boolean;
  onRequestRecurringUpgradePrompt?: () => void;
  onRequestProgressionUpgradePrompt?: () => void;
  isRestTimerBlocking?: boolean;
  openRestTimer?: (value: {
    exerciseKey: string;
    exerciseName: string;
    seconds: number;
    restSeconds: number;
  }) => void;
};

const toWorkoutEntryPayload = (value: Record<string, unknown>) =>
  value as unknown as WorkoutEntryDoc;

const completedExerciseRadius = {
  panel: radiusTokens.panel,
  section: radiusTokens.card,
  pill: radiusTokens.pill,
} as const;

const mobileTouchTarget = 44;

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
}: ExerciseItemProps) => {
  const { data: session } = useSession() as {
    data: SessionWithUserId | null;
  };

  const exerciseIdentity = String(
    getWorkoutEntryIdentity(exercise, exerciseIndex)
  );
  const {
    currentSetIndex,
    setCurrentSetIndex,
    currentExercise,
    setCurrentExercise,
    isEditing,
    setIsEditing,
    showDeleteDialog,
    setShowDeleteDialog,
    showSkipTodayDialog,
    setShowSkipTodayDialog,
    showRepeatDialog,
    setShowRepeatDialog,
    isRepeating,
    setIsRepeating,
    applyingRecommendation,
    setApplyingRecommendation,
    recurrenceType,
    setRecurrenceType,
    repeatInterval,
    setRepeatInterval,
    repeatDayOfWeek,
    setRepeatDayOfWeek,
    repeatDaysOfWeek,
    setRepeatDaysOfWeek,
    repeatDayOfMonth,
    setRepeatDayOfMonth,
    repeatEndDate,
    setRepeatEndDate,
    syncRepeatScheduleState,
  } = useExerciseItemState({
    exercise,
    exerciseIdentity,
    formattedDate,
    isOpen,
  });
  const currentUserId =
    session?.token?.user?._id ??
    session?.user?._id ??
    currentExercise?.userId ??
    exercise?.userId;
  const preferredUnits = normalizeWeightUnit(
    userProfile?.preferredUnits ?? currentExercise?.weightUnit ?? exercise?.weightUnit
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

  const renderCompletedPerformancePanel = () => {
    return (
      <CompletedExercisePerformancePanel
        currentExercise={currentExercise}
        darkMode={darkMode}
        completedExerciseRadius={completedExerciseRadius}
        progressionRecommendationsEnabled={progressionRecommendationsEnabled}
        hasUnlockedProgressionRecommendation={hasUnlockedProgressionRecommendation}
        onRequestProgressionUpgradePrompt={onRequestProgressionUpgradePrompt}
        progressSummary={progressSummary}
        loadingRecommendation={loadingRecommendation}
        preferredUnits={preferredUnits}
      />
    );
  };

  const buildRecommendedIncompleteSets = () => {
    const safeRecommendation = recommendation;
    if (!safeRecommendation) {
      return currentExercise?.sets ?? [];
    }
    const completedSets = (currentExercise?.sets ?? []).filter((set) => set.complete);
    const incompleteTemplate =
      (currentExercise?.sets ?? []).find((set) => !set.complete) ??
      (currentExercise?.sets ?? [])[0] ?? {
        name: "Working Set 1",
        percentage: undefined,
      };

    const recommendedIncompleteSets = Array.from(
      { length: safeRecommendation.recommendedSets ?? 0 },
      (_, index) => ({
        ...incompleteTemplate,
        id: createExerciseSetId(),
        name: `Working Set ${index + 1}`,
        reps: safeRecommendation.recommendedReps,
        weight: safeRecommendation.recommendedWeight,
        weightUnit: safeRecommendation.weightUnit ?? preferredUnits,
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
      await saveWorkoutEntry(toWorkoutEntryPayload({
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
      }));
      setExercises((prev) =>
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
    return (
      <ExerciseRecommendationPanel
        progressionRecommendationsEnabled={progressionRecommendationsEnabled}
        currentExercise={currentExercise}
        darkMode={darkMode}
        completedExerciseRadius={completedExerciseRadius}
        hasUnlockedProgressionRecommendation={hasUnlockedProgressionRecommendation}
        onRequestProgressionUpgradePrompt={onRequestProgressionUpgradePrompt}
        recommendation={recommendation}
        preferredUnits={preferredUnits}
        handleApplyRecommendation={handleApplyRecommendation}
        applyingRecommendation={applyingRecommendation}
      />
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

  const handleWorkoutButtonClick = (index: number) => {
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
    if (!lastSet) {
      return;
    }
    const newSetNumber = sets.length + 1;
    const newSet = {
      ...lastSet,
      id: createExerciseSetId(),
      weight: Number(lastSet.weight ?? 0) * 1.05,
      actualWeight: "",
      actualReps: "",
      complete: false,
      name: `Working Set ${newSetNumber}`,
    };
    setCurrentExercise({ ...currentExercise, sets: [...sets, newSet] });
  };

  const handleDeleteSet = (setId: string) => {
    const sets = [...currentExercise.sets];
    setCurrentExercise({
      ...currentExercise,
      sets: sets.filter((s) => s.id !== setId),
    });
  };

  const handleSkipToday = async () => {
    try {
      await saveWorkoutEntry(toWorkoutEntryPayload({
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
      }));

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
      await deleteExerciseWithScheduleScope({
        currentExercise,
        isRepeating,
        scope,
      });

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

  const handleExerciseSave = (updatedExercise: ExerciseItemView) => {
    setIsEditing(false);
    saveWorkoutEntry(toWorkoutEntryPayload({
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
    }));
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
    syncRepeatScheduleState(currentExercise);
    setShowRepeatDialog(true);
  };

  const handleDisableRepeat = async () => {
    const parsedDate = parseFormattedDate(formattedDate);
    if (!parsedDate || !currentUserId) {
      toast.error("Couldn't update the schedule");
      return;
    }

    try {
      const updatedExercise = await removeExerciseRepeatSchedule({
        currentExercise,
        currentUserId,
        formattedDate,
        parsedDate,
        routineName,
      });

      setCurrentExercise(updatedExercise);
      setIsRepeating(false);

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
      const updatedExercise = await saveExerciseRepeatSchedule({
        currentExercise,
        currentUserId,
        formattedDate,
        parsedDate,
        routineName,
        scheduleInput: {
          recurrenceType,
          interval: repeatInterval,
          dayOfWeek: repeatDayOfWeek,
          daysOfWeek:
            recurrenceType === "custom"
              ? repeatDaysOfWeek
              : [repeatDayOfWeek],
          dayOfMonth: repeatDayOfMonth,
          endDate: repeatEndDate || undefined,
        },
      });

      setCurrentExercise(updatedExercise);
      setIsRepeating(true);

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
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
            }}
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
            <Button
              onClick={handleOpenRepeatFlow}
              title={isRepeating ? "Edit repeating schedule" : "Repeat this exercise"}
              variant="outlined"
              startIcon={<RepeatIcon color={isRepeating ? "primary" : "disabled"} />}
              sx={{
                ...buildRoutineSemanticIconButtonSx("premium", isRepeating, darkMode),
                minHeight: mobileTouchTarget,
                borderRadius: "14px",
                px: 1.5,
                flexShrink: 0,
              }}
            >
              {isRepeating ? "Edit repeat" : "Repeat"}
            </Button>
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

        <ExerciseDialogs
          showDeleteDialog={showDeleteDialog}
          setShowDeleteDialog={setShowDeleteDialog}
          handleDelete={handleDelete}
          formattedDate={formattedDate}
          showSkipTodayDialog={showSkipTodayDialog}
          setShowSkipTodayDialog={setShowSkipTodayDialog}
          handleSkipToday={handleSkipToday}
          isRepeating={isRepeating}
          showRepeatDialog={showRepeatDialog}
          setShowRepeatDialog={setShowRepeatDialog}
          handleSaveRepeatSchedule={handleSaveRepeatSchedule}
          handleDisableRepeat={handleDisableRepeat}
          recurrenceType={recurrenceType}
          setRecurrenceType={setRecurrenceType}
          repeatInterval={repeatInterval}
          setRepeatInterval={setRepeatInterval}
          repeatDayOfWeek={repeatDayOfWeek}
          setRepeatDayOfWeek={setRepeatDayOfWeek}
          repeatDaysOfWeek={repeatDaysOfWeek}
          setRepeatDaysOfWeek={setRepeatDaysOfWeek}
          repeatDayOfMonth={repeatDayOfMonth}
          setRepeatDayOfMonth={setRepeatDayOfMonth}
          repeatEndDate={repeatEndDate}
          setRepeatEndDate={setRepeatEndDate}
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
            gridTemplateColumns: { xs: "minmax(0,1fr)", sm: "auto minmax(0,1fr) auto" },
            alignItems: { xs: "stretch", sm: "center" },
            gap: { xs: 1.1, sm: 1.25 },
            cursor: "pointer",
          }}
        >
          <Box
            onClick={(e) => e.stopPropagation()}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              justifyContent: { xs: "flex-end", sm: "flex-start" },
              order: { xs: 3, sm: 1 },
            }}
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
            <Button
              onClick={handleOpenRepeatFlow}
              title={isRepeating ? "Edit repeating schedule" : "Repeat this exercise"}
              variant="outlined"
              startIcon={<RepeatIcon color={isRepeating ? "primary" : "disabled"} />}
              sx={{
                ...buildRoutineSemanticIconButtonSx("premium", isRepeating, darkMode),
                minHeight: mobileTouchTarget,
                minWidth: mobileTouchTarget,
                borderRadius: 999,
                px: { xs: 1.35, sm: 1.5 },
                whiteSpace: "nowrap",
              }}
            >
              {isRepeating ? "Edit repeat" : "Repeat"}
            </Button>
          </Box>

          <Box sx={{ minWidth: 0, order: { xs: 1, sm: 2 } }}>
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
            size="large"
            variant="contained"
            onClick={(event) => {
              event.stopPropagation();
              handleWorkoutButtonClick(exerciseIndex);
            }}
            sx={{
              order: { xs: 2, sm: 3 },
              justifySelf: { xs: "stretch", sm: "end" },
              minWidth: { xs: "100%", sm: 176 },
              minHeight: 52,
              px: 2.5,
              borderRadius: 999,
              fontWeight: 800,
              ...buildRoutineSemanticButtonSx("activeWorkout", "contained", darkMode),
              boxShadow: darkMode
                ? "0 16px 34px rgba(37,99,235,0.26)"
                : "0 16px 30px rgba(37,99,235,0.22)",
            }}
          >
            Start Lift
          </Button>
        </Box>
      </Paper>

      <ExerciseLoggingDialog
        isOpen={isOpen}
        setCurrentExerciseIndex={setCurrentExerciseIndex}
        darkMode={darkMode}
        currentExercise={currentExercise}
        completedCount={completedCount}
        totalCount={totalCount}
        upcomingWeight={
          upcomingWeight !== null ? formatWeightValue(upcomingWeight) : null
        }
        upcomingReps={upcomingReps}
        preferredUnits={preferredUnits}
        handleOpenRepeatFlow={handleOpenRepeatFlow}
        isRepeating={isRepeating}
        currentSetIndex={currentSetIndex}
        exerciseIndex={exerciseIndex}
        setCurrentSetIndex={setCurrentSetIndex}
        setCurrentExercise={setCurrentExercise}
        formattedDate={formattedDate}
        workout={workout}
        exercises={exercises}
        setExercises={setExercises}
        openRestTimer={openRestTimer}
        exerciseIdentity={exerciseIdentity}
        setRefetchExercises={setRefetchExercises}
        refreshCalendarStatuses={refreshCalendarStatuses}
        isRestTimerBlocking={isRestTimerBlocking}
        handleLogSetAttempt={handleLogSetAttempt}
        handleLogSetPersisted={handleLogSetPersisted}
        handleLogSetFailed={handleLogSetFailed}
        handleDeleteSet={handleDeleteSet}
        handleAddSet={handleAddSet}
        renderRecommendationPanel={renderRecommendationPanel}
        mobileTouchTarget={mobileTouchTarget}
        routineName={routineName}
        recommendation={recommendation}
      />

      <ExerciseDialogs
        showDeleteDialog={showDeleteDialog}
        setShowDeleteDialog={setShowDeleteDialog}
        handleDelete={handleDelete}
        formattedDate={formattedDate}
        showSkipTodayDialog={showSkipTodayDialog}
        setShowSkipTodayDialog={setShowSkipTodayDialog}
        handleSkipToday={handleSkipToday}
        isRepeating={isRepeating}
        showRepeatDialog={showRepeatDialog}
        setShowRepeatDialog={setShowRepeatDialog}
        handleSaveRepeatSchedule={handleSaveRepeatSchedule}
        handleDisableRepeat={handleDisableRepeat}
        recurrenceType={recurrenceType}
        setRecurrenceType={setRecurrenceType}
        repeatInterval={repeatInterval}
        setRepeatInterval={setRepeatInterval}
        repeatDayOfWeek={repeatDayOfWeek}
        setRepeatDayOfWeek={setRepeatDayOfWeek}
        repeatDaysOfWeek={repeatDaysOfWeek}
        setRepeatDaysOfWeek={setRepeatDaysOfWeek}
        repeatDayOfMonth={repeatDayOfMonth}
        setRepeatDayOfMonth={setRepeatDayOfMonth}
        repeatEndDate={repeatEndDate}
        setRepeatEndDate={setRepeatEndDate}
      />
    </>
  );
};

export default ExerciseItem;
