import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Session } from "next-auth";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import MuscleRecoveryMap from "./MuscleRecoveryMap";
import RepeatScheduleDialog from "./RepeatScheduleDialog";
import RestTimerOverlay from "./RestTimerOverlay";
import ExerciseListSection from "./workout-display/ExerciseListSection";
import { routinesPanelRadius } from "./workout-display/panelStyles";
import { useRestTimerActions } from "./workout-display/useRestTimerActions";
import {
  useWorkoutProgressData,
} from "./workout-display/useWorkoutProgressData";
import { useWorkoutScheduleActions } from "./workout-display/useWorkoutScheduleActions";
import { useWeeklyTargetActions } from "./workout-display/useWeeklyTargetActions";
import { useWorkoutExerciseOrder } from "./workout-display/useWorkoutExerciseOrder";
import WorkoutCompletionRecap from "./workout-display/WorkoutCompletionRecap";
import WorkoutHeaderSummary from "./workout-display/WorkoutHeaderSummary";
import WorkoutSecondaryInsights from "./workout-display/WorkoutSecondaryInsights";
import { toast } from "react-toastify";
import { hasEntitlement } from "../utils/entitlements";
import {
  buildRoutineSemanticButtonSx,
  buildRoutineSemanticPanelSx,
} from "../utils/routinesSemanticStyles";
import { UserDoc, WorkoutExerciseView } from "../utils/types";
import {
  WorkoutComebackGuide,
  WorkoutDisplayExercise,
  WorkoutWeeklyConsistency,
} from "./workout-display/workoutDisplayTypes";

type WorkoutDisplayProps = {
  exercises: WorkoutDisplayExercise[];
  currentWorkout: unknown;
  currentExerciseIndex: number;
  setCurrentExerciseIndex: React.Dispatch<React.SetStateAction<number>>;
  currentDate: Date;
  formattedDate: string;
  routineName: string;
  setIsAddingExercise: React.Dispatch<React.SetStateAction<boolean>>;
  setExercises: React.Dispatch<React.SetStateAction<WorkoutDisplayExercise[]>>;
  darkMode: boolean;
  setRefetchExercises: React.Dispatch<React.SetStateAction<boolean>>;
  refreshCalendarStatuses?: () => void;
  userProfile?: Partial<UserDoc> | null;
  weeklyConsistency?: WorkoutWeeklyConsistency | null;
  comebackGuide?: WorkoutComebackGuide | null;
  milestoneSummary?: {
    recentlyUnlocked?: unknown[];
    unlocked?: unknown[];
  } | null;
  onWeeklyTargetChange?: (...args: unknown[]) => void;
  lastQuickAddedExerciseIdentity?: string | null;
  clearLastQuickAddedExerciseIdentity?: () => void;
  onRequestRecurringUpgradePrompt?: () => void;
  onRequestProgressionUpgradePrompt?: () => void;
  onRequestPersonalRecordUpgradePrompt?: () => void;
};

const WorkoutDisplay = ({
  exercises,
  currentWorkout,
  currentExerciseIndex,
  setCurrentExerciseIndex,
  currentDate,
  formattedDate,
  routineName,
  setIsAddingExercise,
  setExercises,
  darkMode,
  setRefetchExercises,
  refreshCalendarStatuses,
  userProfile,
  weeklyConsistency,
  comebackGuide,
  milestoneSummary,
  onWeeklyTargetChange,
  lastQuickAddedExerciseIdentity,
  clearLastQuickAddedExerciseIdentity,
  onRequestRecurringUpgradePrompt,
  onRequestProgressionUpgradePrompt,
  onRequestPersonalRecordUpgradePrompt,
}: WorkoutDisplayProps) => {
  const [shownMenuIndex, setShownMenuIndex] = useState(-1);
  const [completionRecapDismissed, setCompletionRecapDismissed] = useState(false);
  const completionStateRef = useRef(false);
  const { data: session } = useSession() as {
    data: (Session & { token?: { user?: { _id?: string } } }) | null;
  };

  const currentUserId =
    session?.token?.user?._id ?? (session?.user as { _id?: string } | undefined)?._id ?? "";
  const progressionRecommendationsEnabled = hasEntitlement(
    userProfile,
    "progressionRecommendations"
  );
  const recurringSchedulingEnabled = hasEntitlement(
    userProfile,
    "recurringWorkoutScheduling"
  );

  const {
    exerciseProgressById,
    loadingProgressById,
    getExerciseCacheKey,
    getExerciseIdentity,
    completedExercises,
    plannedExercises,
    nextExercise,
    nextExerciseIndex,
    prHighlights,
    recentPersonalRecords,
    progressTrendCards,
    progressTrendSummary,
  } = useWorkoutProgressData({
    currentUserId,
    currentExerciseIndex,
    exercises,
    userProfile,
  });

  const {
    showWorkoutRepeatDialog,
    setShowWorkoutRepeatDialog,
    savingWorkoutSchedule,
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
    isWholeWorkoutRepeating,
    openWorkoutRepeatDialog,
    handleSaveWorkoutSchedule,
    handleRemoveWorkoutSchedule,
  } = useWorkoutScheduleActions({
    currentDate,
    currentUserId,
    exercises: exercises as WorkoutExerciseView[],
    recurringSchedulingEnabled,
    refreshCalendarStatuses,
    routineName,
    setExercises,
    setRefetchExercises,
    onRequestRecurringUpgradePrompt,
  });

  const { weeklyTargetDraft, savingWeeklyTarget, handleWeeklyTargetChange } =
    useWeeklyTargetActions({
      onWeeklyTargetChange,
      weeklyConsistency,
    });

  const { activeRestTimer, handleOpenRestTimer, handleCloseRestTimer, handleSaveRestTimerValue } =
    useRestTimerActions({
      currentDate,
      currentUserId,
      exercises,
      routineName,
      setExercises,
    });

  const { handleExerciseDragEnd } = useWorkoutExerciseOrder({
    completedExercises,
    currentDate,
    currentUserId,
    plannedExercises,
    refreshCalendarStatuses,
    routineName,
    setExercises,
    setRefetchExercises,
  });

  useEffect(() => {
    if (!lastQuickAddedExerciseIdentity) {
      return;
    }

    const reopenedExerciseIndex = exercises.findIndex(
      (exercise, index) =>
        String(getExerciseIdentity(exercise, index)) === lastQuickAddedExerciseIdentity
    );

    if (reopenedExerciseIndex === -1) {
      return;
    }

    setCurrentExerciseIndex(reopenedExerciseIndex);
    clearLastQuickAddedExerciseIdentity?.();
  }, [
    clearLastQuickAddedExerciseIdentity,
    exercises,
    getExerciseIdentity,
    lastQuickAddedExerciseIdentity,
    setCurrentExerciseIndex,
  ]);

  const loggedSetCount = useMemo(
    () =>
      exercises.reduce(
        (total, exercise) =>
          total + (exercise.sets?.filter((set) => set.complete).length ?? 0),
        0
      ),
    [exercises]
  );

  const hasExercises = exercises.length > 0;
  const isWorkoutComplete = hasExercises && !nextExercise;
  const shouldShowCompletionRecap = isWorkoutComplete && !completionRecapDismissed;
  const shouldShowNextSummary = Boolean(nextExercise);
  const remainingExerciseCount = plannedExercises.length;
  const primaryActionLabel = !hasExercises
    ? "Add First Exercise"
    : shouldShowNextSummary
    ? loggedSetCount > 0
      ? "Open Next Set"
      : "Start Lift"
    : "Add Exercise";
  const mobilePrimaryAction = !hasExercises
    ? "add_first_exercise"
    : shouldShowNextSummary
    ? "open_next_set"
    : "add_exercise";

  const mobilePrimaryButtonSx = {
    minHeight: 52,
    borderRadius: 10,
    backgroundColor: darkMode ? "#f8fafc" : "#111827",
    backgroundImage: "none",
    color: darkMode ? "#0f172a" : "#f8fafc",
    "&:hover": {
      backgroundColor: darkMode ? "#ffffff" : "#000000",
      backgroundImage: "none",
    },
    "&.Mui-disabled": {
      backgroundColor: darkMode
        ? "rgba(248,250,252,0.5)"
        : "rgba(17,24,39,0.45)",
      color: darkMode ? "rgba(15,23,42,0.82)" : "rgba(248,250,252,0.88)",
    },
  } as const;

  const statusChip = !hasExercises
    ? { label: "No exercises scheduled", color: "default" as const }
    : isWorkoutComplete
    ? { label: "Workout complete", color: "success" as const }
    : loggedSetCount > 0
    ? {
        label: `In progress · ${loggedSetCount} set${
          loggedSetCount === 1 ? "" : "s"
        } logged`,
        color: "primary" as const,
      }
    : {
        label: `${remainingExerciseCount} exercise${
          remainingExerciseCount === 1 ? "" : "s"
        } scheduled`,
        color: "default" as const,
      };

  const workoutVolume = useMemo(
    () =>
      exercises.reduce((total, exercise) => {
        const exerciseVolume =
          exercise.sets?.reduce((setTotal: number, set) => {
            const reps = Number(set.actualReps ?? set.reps ?? 0);
            const weight = Number(set.actualWeight ?? set.weight ?? 0);
            if (!set.complete || !reps || !weight) {
              return setTotal;
            }
            return setTotal + reps * weight;
          }, 0) ?? 0;

        return total + exerciseVolume;
      }, 0),
    [exercises]
  );

  const completionHighlights = useMemo(() => {
    const highlights = [
      { label: "Exercises done", value: completedExercises.length },
      { label: "Sets logged", value: loggedSetCount },
      {
        label: "Total volume",
        value: workoutVolume > 0 ? workoutVolume.toLocaleString() : "Bodyweight / timed",
      },
    ];

    if (prHighlights > 0) {
      highlights.push({ label: "PR moments", value: prHighlights });
    }

    return highlights;
  }, [completedExercises.length, loggedSetCount, prHighlights, workoutVolume]);

  const recentMilestones = milestoneSummary?.recentlyUnlocked ?? [];
  const milestoneHistory = useMemo(
    () => (milestoneSummary?.unlocked ?? []).slice(-6).reverse(),
    [milestoneSummary?.unlocked]
  );

  useEffect(() => {
    if (isWorkoutComplete && !completionStateRef.current) {
      setCompletionRecapDismissed(false);
    }

    if (!isWorkoutComplete) {
      setCompletionRecapDismissed(false);
    }

    completionStateRef.current = isWorkoutComplete;
  }, [isWorkoutComplete]);

  const handleCompletionNextStep = () => {
    if (recurringSchedulingEnabled && hasExercises) {
      openWorkoutRepeatDialog();
      return;
    }

    if (!recurringSchedulingEnabled && hasExercises) {
      onRequestRecurringUpgradePrompt?.();
      return;
    }

    setIsAddingExercise(true);
  };

  const handleResumeToday = () => {
    if (nextExerciseIndex >= 0) {
      setCurrentExerciseIndex(nextExerciseIndex);
      return;
    }

    setIsAddingExercise(true);
  };

  const handleLightRestart = () => {
    toast.info("Start with one clean exercise and let the rest of the week rebuild from there.");
    handleResumeToday();
  };

  const handleRescheduleThisWeek = () => {
    if (hasExercises) {
      handleCompletionNextStep();
      return;
    }

    setIsAddingExercise(true);
  };

  const handleSaveRestTimer = async (nextRest: number) => {
    await handleSaveRestTimerValue(nextRest, getExerciseIdentity);
  };

  const handleOpenNextSet = () => {
    if (nextExerciseIndex >= 0) {
      setCurrentExerciseIndex(nextExerciseIndex);
    }
  };

  return (
    <Box>
      <WorkoutHeaderSummary
        darkMode={darkMode}
        hasExercises={hasExercises}
        isWholeWorkoutRepeating={isWholeWorkoutRepeating}
        isWorkoutComplete={isWorkoutComplete}
        nextExercise={nextExercise}
        onOpenNextSet={handleOpenNextSet}
        onOpenWorkoutRepeatDialog={openWorkoutRepeatDialog}
        shouldShowNextSummary={shouldShowNextSummary}
        statusChip={statusChip}
      />

      <Stack spacing={2.25} sx={{ mt: 2.25 }}>
        <WorkoutCompletionRecap
          completedExercises={completedExercises}
          completionHighlights={completionHighlights}
          completionRecapDismissed={completionRecapDismissed}
          darkMode={darkMode}
          isWorkoutComplete={isWorkoutComplete}
          milestoneHistory={milestoneHistory}
          milestoneSummary={milestoneSummary}
          onCompletionNextStep={handleCompletionNextStep}
          onDismissRecap={() => setCompletionRecapDismissed(true)}
          onRestoreRecap={() => setCompletionRecapDismissed(false)}
          recentMilestones={recentMilestones}
          recentPersonalRecords={recentPersonalRecords}
          recurringSchedulingEnabled={recurringSchedulingEnabled}
          shouldShowCompletionRecap={shouldShowCompletionRecap}
          workoutVolume={workoutVolume}
        />

        <MuscleRecoveryMap
          exercises={exercises}
          userId={currentUserId}
          sex={userProfile?.sex}
          currentDate={currentDate}
          darkMode={darkMode}
        />

        {plannedExercises.length > 0 ? (
          <ExerciseListSection
            activeRestTimer={activeRestTimer}
            currentExerciseIndex={currentExerciseIndex}
            currentWorkout={currentWorkout}
            darkMode={darkMode}
            description="Exercises you still have left to complete today."
            exerciseProgressById={exerciseProgressById}
            exercises={exercises}
            formattedDate={formattedDate}
            getExerciseCacheKey={getExerciseCacheKey}
            getExerciseIdentity={getExerciseIdentity}
            handleExerciseDragEnd={handleExerciseDragEnd}
            items={plannedExercises}
            loadingProgressById={loadingProgressById}
            onRequestPersonalRecordUpgradePrompt={onRequestPersonalRecordUpgradePrompt}
            onRequestProgressionUpgradePrompt={onRequestProgressionUpgradePrompt}
            onRequestRecurringUpgradePrompt={onRequestRecurringUpgradePrompt}
            openRestTimer={handleOpenRestTimer}
            progressionRecommendationsEnabled={progressionRecommendationsEnabled}
            recurringSchedulingEnabled={recurringSchedulingEnabled}
            refreshCalendarStatuses={refreshCalendarStatuses}
            routineName={routineName}
            setCurrentExerciseIndex={setCurrentExerciseIndex}
            setExercises={setExercises}
            setRefetchExercises={setRefetchExercises}
            setShownMenuIndex={setShownMenuIndex}
            shownMenuIndex={shownMenuIndex}
            title="Scheduled"
            userProfile={userProfile}
          />
        ) : null}

        {completedExercises.length > 0 ? (
          <ExerciseListSection
            activeRestTimer={activeRestTimer}
            currentExerciseIndex={currentExerciseIndex}
            currentWorkout={currentWorkout}
            darkMode={darkMode}
            description="Finished exercises move here so the active workout stays cleaner."
            exerciseProgressById={exerciseProgressById}
            exercises={exercises}
            formattedDate={formattedDate}
            getExerciseCacheKey={getExerciseCacheKey}
            getExerciseIdentity={getExerciseIdentity}
            handleExerciseDragEnd={handleExerciseDragEnd}
            items={completedExercises}
            loadingProgressById={loadingProgressById}
            onRequestPersonalRecordUpgradePrompt={onRequestPersonalRecordUpgradePrompt}
            onRequestProgressionUpgradePrompt={onRequestProgressionUpgradePrompt}
            onRequestRecurringUpgradePrompt={onRequestRecurringUpgradePrompt}
            openRestTimer={handleOpenRestTimer}
            progressionRecommendationsEnabled={progressionRecommendationsEnabled}
            recurringSchedulingEnabled={recurringSchedulingEnabled}
            refreshCalendarStatuses={refreshCalendarStatuses}
            routineName={routineName}
            setCurrentExerciseIndex={setCurrentExerciseIndex}
            setExercises={setExercises}
            setRefetchExercises={setRefetchExercises}
            setShownMenuIndex={setShownMenuIndex}
            shownMenuIndex={shownMenuIndex}
            title="Completed Today"
            userProfile={userProfile}
          />
        ) : null}

        {!hasExercises ? (
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: routinesPanelRadius.shell,
              border: "1px solid",
              borderColor: "divider",
              textAlign: "center",
              backgroundColor: darkMode
                ? "rgba(17,24,39,0.72)"
                : "rgba(255,255,255,0.86)",
            }}
          >
            <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.12em" }}>
              Get Started
            </Typography>
            <Typography variant="h6" sx={{ mt: 0.5 }}>
              Add your first exercise
            </Typography>
            <Typography sx={{ mt: 0.75, color: "text.secondary" }}>
              Start with a lift, movement, or timed activity. You can always add more after that.
            </Typography>
          </Paper>
        ) : null}

        <WorkoutSecondaryInsights
          comebackGuide={comebackGuide}
          darkMode={darkMode}
          progressTrendCards={progressTrendCards}
          progressTrendSummary={progressTrendSummary}
          weeklyConsistency={weeklyConsistency}
          weeklyTargetDraft={weeklyTargetDraft}
          savingWeeklyTarget={savingWeeklyTarget}
          onWeeklyTargetChange={handleWeeklyTargetChange}
        />
      </Stack>

      <Box sx={{ height: { xs: 136, sm: 96 } }} />
      <Box
        sx={{
          position: { xs: "fixed", sm: "sticky" },
          bottom: { xs: "calc(12px + env(safe-area-inset-bottom, 0px))", sm: 16 },
          left: { xs: 12, sm: "auto" },
          right: { xs: 12, sm: "auto" },
          zIndex: 20,
          display: "flex",
          justifyContent: "center",
          mt: { xs: 0, sm: 2.5 },
          pointerEvents: "none",
        }}
      >
        <Paper
          elevation={0}
          sx={{
            ...buildRoutineSemanticPanelSx("activeWorkout", darkMode),
            pointerEvents: "auto",
            width: { xs: "100%", sm: "auto" },
            maxWidth: { xs: 420, sm: "none" },
            p: { xs: 1, sm: 0 },
            borderRadius: { xs: 3, sm: 0 },
            border: { xs: "1px solid", sm: "none" },
            borderColor: "divider",
            backgroundColor: {
              xs: darkMode ? "rgba(15,23,42,0.92)" : "rgba(255,255,255,0.96)",
              sm: "transparent",
            },
            backdropFilter: { xs: "blur(16px)", sm: "none" },
            boxShadow: {
              xs: darkMode
                ? "0 18px 40px rgba(2,6,23,0.42)"
                : "0 16px 34px rgba(15,23,42,0.18)",
              sm: "none",
            },
          }}
        >
          <Stack
            direction={{ xs: "row", sm: "row" }}
            spacing={1}
            sx={{
              width: "100%",
              alignItems: "stretch",
            }}
          >
            <Button
              variant="outlined"
              onClick={() => {
                setIsAddingExercise(true);
              }}
              startIcon={<AddIcon />}
              sx={{
                display: { xs: mobilePrimaryAction === "add_first_exercise" ? "none" : "inline-flex", sm: "none" },
                flex: 1,
                minHeight: 52,
                borderRadius: 10,
              }}
            >
              Add
            </Button>
            {shouldShowNextSummary ? (
              <Button
                variant="contained"
                startIcon={<PlayArrowIcon />}
                onClick={handleOpenNextSet}
                sx={{
                  display: { xs: "inline-flex", sm: "none" },
                  flex: 1.35,
                  ...mobilePrimaryButtonSx,
                }}
              >
                {loggedSetCount > 0 ? "Next Set" : "Start Lift"}
              </Button>
            ) : null}
            {!shouldShowNextSummary ? (
              <Button
                variant="contained"
                onClick={() => {
                  setIsAddingExercise(true);
                }}
                startIcon={<AddIcon />}
                sx={{
                  display: { xs: "inline-flex", sm: "none" },
                  flex: 1,
                  ...mobilePrimaryButtonSx,
                }}
              >
                {hasExercises ? "Add Exercise" : "Add First Exercise"}
              </Button>
            ) : null}
              <Button
              variant="outlined"
              onClick={() => {
                setIsAddingExercise(true);
              }}
              startIcon={<AddIcon />}
              sx={{
                display: { xs: "none", sm: hasExercises ? "inline-flex" : "none" },
                px: 2.5,
                py: 1.1,
                minHeight: 58,
                borderRadius: 999,
              }}
            >
              Add Exercise
            </Button>
            <Button
              variant="contained"
              onClick={
                shouldShowNextSummary
                  ? handleOpenNextSet
                  : () => {
                      setIsAddingExercise(true);
                    }
              }
              startIcon={shouldShowNextSummary ? <PlayArrowIcon /> : <AddIcon />}
              sx={{
                display: { xs: "none", sm: "inline-flex" },
                ...buildRoutineSemanticButtonSx("activeWorkout", "contained", darkMode),
                px: 3.25,
                py: 1.2,
                minHeight: 58,
                borderRadius: 999,
                fontWeight: 800,
                boxShadow: darkMode
                  ? "0 18px 40px rgba(37,99,235,0.3)"
                  : "0 18px 36px rgba(37,99,235,0.24)",
              }}
            >
              {primaryActionLabel}
            </Button>
          </Stack>
        </Paper>
      </Box>

      <RepeatScheduleDialog
        open={showWorkoutRepeatDialog}
        onClose={() => setShowWorkoutRepeatDialog(false)}
        isSaving={savingWorkoutSchedule}
        isRepeating={isWholeWorkoutRepeating}
        title={isWholeWorkoutRepeating ? "Edit workout schedule" : "Repeat this whole workout"}
        description="Apply one repeating schedule to every exercise currently on this day."
        disableLabel="Remove workout schedule"
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
        onSave={handleSaveWorkoutSchedule}
        onDisable={isWholeWorkoutRepeating ? handleRemoveWorkoutSchedule : undefined}
      />
      <RestTimerOverlay
        open={Boolean(activeRestTimer)}
        darkMode={darkMode}
        exerciseName={activeRestTimer?.exerciseName ?? "Rest"}
        initialSeconds={activeRestTimer?.seconds ?? 0}
        defaultRestSeconds={activeRestTimer?.restSeconds ?? 0}
        onClose={handleCloseRestTimer}
        onSaveRest={handleSaveRestTimer}
      />
    </Box>
  );
};

export default WorkoutDisplay;
