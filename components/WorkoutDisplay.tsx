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
  createWorkoutEntryInstanceId,
  saveWorkoutEntry,
} from "../utils/helpers";
import { trackBetaFunnelMilestone } from "../utils/betaFunnelApi";
import {
  buildRoutineSemanticButtonSx,
  buildRoutineSemanticPanelSx,
} from "../utils/routinesSemanticStyles";
import { UserDoc, WorkoutExerciseView } from "../utils/types";
import { getLowEnergyWorkoutGuide } from "../utils/workoutGuidance";
import { createExerciseSetId } from "../utils/exerciseSetIds";
import {
  getExerciseProfile,
  resolveExerciseStartingWeight,
} from "../utils/exerciseDrafts";
import { normalizeWeightUnit } from "../utils/weightUnits";
import {
  WorkoutComebackGuide,
  WorkoutDisplayExercise,
  WorkoutTrainingAnalyticsSummary,
  WorkoutWeeklyReviewPreview,
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
  weeklyReviewPreview?: WorkoutWeeklyReviewPreview | null;
  comebackGuide?: WorkoutComebackGuide | null;
  trainingAnalytics?: {
    week: WorkoutTrainingAnalyticsSummary;
    month: WorkoutTrainingAnalyticsSummary;
  } | null;
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

const trackerStarterTemplates = [
  {
    id: "starter_strength",
    title: "Simple strength starter",
    description: "Three foundational lifts so you can start logging in one move.",
    exercises: ["Goblet Squat", "Bench Press", "Seated Cable Row"],
  },
  {
    id: "starter_home",
    title: "Home dumbbell start",
    description: "A quick full-body session for short windows and minimal setup.",
    exercises: ["Dumbbell Romanian Deadlift", "Dumbbell Floor Press", "Split Squat"],
  },
] as const;

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
  weeklyReviewPreview,
  comebackGuide,
  trainingAnalytics,
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
  const [minimumWinMode, setMinimumWinMode] = useState(false);
  const [starterFlowDismissed, setStarterFlowDismissed] = useState(false);
  const [startingTemplateId, setStartingTemplateId] = useState<string | null>(null);
  const completionStateRef = useRef(false);
  const proWeeklyBriefTrackedRef = useRef(false);
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
  const preferredUnits = normalizeWeightUnit(userProfile?.preferredUnits);

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
  const lowEnergyGuide = useMemo(
    () => getLowEnergyWorkoutGuide(remainingExerciseCount),
    [remainingExerciseCount]
  );
  const visiblePlannedExercises = useMemo(
    () =>
      minimumWinMode
        ? plannedExercises.slice(0, Math.min(2, plannedExercises.length))
        : plannedExercises,
    [minimumWinMode, plannedExercises]
  );
  const trimmedExerciseCount = Math.max(
    0,
    plannedExercises.length - visiblePlannedExercises.length
  );
  const preWorkoutEstimatedMinutes = useMemo(() => {
    const minutes = visiblePlannedExercises.reduce((total, exercise) => {
      const sets = Array.isArray(exercise.sets) ? exercise.sets : [];

      if (exercise.type === "timed") {
        const timedMinutes = sets.reduce((setTotal, set) => {
          const directTotalSeconds = Number(set.totalSeconds ?? 0);
          if (directTotalSeconds > 0) {
            return setTotal + directTotalSeconds / 60;
          }

          const derivedSeconds =
            Number(set.seconds ?? 0) +
            Number(set.minutes ?? 0) * 60 +
            Number(set.hours ?? 0) * 3600;
          return setTotal + derivedSeconds / 60;
        }, 0);

        return total + timedMinutes;
      }

      const setCount = sets.length || 1;
      const restMinutes =
        Math.max(0, Number(exercise.rest ?? 60)) * Math.max(0, setCount - 1) / 60;
      return total + setCount * 2.25 + restMinutes;
    }, 0);

    if (minutes <= 0) {
      return 20;
    }

    return Math.max(10, Math.round(minutes / 5) * 5);
  }, [visiblePlannedExercises]);
  const preWorkoutTimeLabel = useMemo(() => {
    if (preWorkoutEstimatedMinutes <= 20) {
      return "~20 min";
    }

    if (preWorkoutEstimatedMinutes >= 75) {
      return `~${preWorkoutEstimatedMinutes}+ min`;
    }

    return `~${preWorkoutEstimatedMinutes} min`;
  }, [preWorkoutEstimatedMinutes]);
  const preWorkoutFocus = useMemo(() => {
    const focusNames = visiblePlannedExercises
      .slice(0, Math.min(minimumWinMode ? 1 : 2, visiblePlannedExercises.length))
      .map((exercise) => exercise.name)
      .filter(Boolean);

    if (focusNames.length === 0) {
      return "Get the session moving";
    }

    if (focusNames.length === 1) {
      return focusNames[0];
    }

    return `${focusNames[0]} + ${focusNames[1]}`;
  }, [minimumWinMode, visiblePlannedExercises]);
  const preWorkoutMinimumSuccess = useMemo(() => {
    if (!visiblePlannedExercises.length) {
      return "Add one exercise and log a clean first set so the day has a real anchor.";
    }

    const firstExercise = visiblePlannedExercises[0]?.name ?? "the first lift";
    if (minimumWinMode) {
      return `Finish ${firstExercise} cleanly and the day still counts as a valid training win.`;
    }

    if (visiblePlannedExercises.length === 1) {
      return `Get through ${firstExercise} at a steady effort and let that be enough for today.`;
    }

    return `If time or energy fades, finish ${firstExercise} and one more key movement. That still counts as a successful session.`;
  }, [minimumWinMode, visiblePlannedExercises]);
  const planFitHeadline = useMemo(() => {
    if (comebackGuide) {
      return "This week is tuned for a realistic restart";
    }

    if (weeklyConsistency?.target === 1) {
      return "This week is built around one anchor session";
    }

    if (weeklyConsistency?.state === "behind") {
      return "This week is protecting momentum, not chasing perfection";
    }

    if (weeklyConsistency?.state === "goal_hit") {
      return "This week matches the rhythm you already built";
    }

    return "This week fits your current training rhythm";
  }, [comebackGuide, weeklyConsistency?.state, weeklyConsistency?.target]);
  const planFitCopy = useMemo(() => {
    if (comebackGuide) {
      return comebackGuide.supportingCopy;
    }

    if (weeklyConsistency?.target === 1) {
      return "Your plan is intentionally centered on one dependable full-body session so consistency can start from something realistic, not idealized.";
    }

    if (weeklyConsistency) {
      return weeklyConsistency.supportingCopy;
    }

    return "The plan is aiming for a repeatable week based on your schedule, recent logging rhythm, and the work still in front of you.";
  }, [comebackGuide, weeklyConsistency]);
  const planChangeSummary = useMemo(() => {
    if (comebackGuide?.adjustmentCopy) {
      return comebackGuide.adjustmentCopy;
    }

    if (progressTrendSummary.counts.down > 0) {
      return "Recent logs dipped a bit, so the next session should feel simpler and easier to repeat instead of aggressively pushing forward.";
    }

    if (progressTrendSummary.counts.up > 0) {
      return "Recent logs show real progress, so the plan can stay steady and let momentum keep compounding instead of forcing a big change.";
    }

    if (minimumWinMode) {
      return "You switched into a lighter mode, so the plan is now prioritizing the minimum useful work instead of the full original session.";
    }

    return "Nothing dramatic changed. The app is keeping the week practical and asking for the next repeatable step instead of a more complicated reset.";
  }, [
    comebackGuide?.adjustmentCopy,
    minimumWinMode,
    progressTrendSummary.counts.down,
    progressTrendSummary.counts.up,
  ]);
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

  useEffect(() => {
    if (!hasExercises || isWorkoutComplete) {
      setMinimumWinMode(false);
    }
  }, [hasExercises, isWorkoutComplete]);

  useEffect(() => {
    if (!progressionRecommendationsEnabled || !weeklyReviewPreview) {
      proWeeklyBriefTrackedRef.current = false;
      return;
    }

    if (proWeeklyBriefTrackedRef.current) {
      return;
    }

    proWeeklyBriefTrackedRef.current = true;
    void trackBetaFunnelMilestone("weekly_pro_brief_viewed", {
      source: "routines_pro_weekly_brief",
    }).catch((error) => {
      proWeeklyBriefTrackedRef.current = false;
      console.error("Error tracking Pro weekly brief view:", error);
    });
  }, [progressionRecommendationsEnabled, weeklyReviewPreview]);

  useEffect(() => {
    if (!currentUserId || typeof window === "undefined") {
      return;
    }

    const dismissalKey = `liftlogic:starter-flow-dismissed:${currentUserId}`;
    setStarterFlowDismissed(window.localStorage.getItem(dismissalKey) === "true");
  }, [currentUserId]);

  useEffect(() => {
    if (hasExercises || starterFlowDismissed) {
      return;
    }

    void trackBetaFunnelMilestone("starter_flow_shown", {
      source: "tracker_first_empty_state",
    }).catch((error) => {
      console.error("Error tracking starter flow impression:", error);
    });
  }, [hasExercises, starterFlowDismissed]);

  const handleCompletionNextStep = () => {
    if (hasExercises) {
      openWorkoutRepeatDialog();
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

  const handleDismissStarterFlow = () => {
    setStarterFlowDismissed(true);
    if (currentUserId && typeof window !== "undefined") {
      window.localStorage.setItem(
        `liftlogic:starter-flow-dismissed:${currentUserId}`,
        "true"
      );
    }
    void trackBetaFunnelMilestone("starter_flow_dismissed", {
      source: "tracker_first_empty_state",
    }).catch((error) => {
      console.error("Error tracking starter flow dismissal:", error);
    });
  };

  const handleStartStarterTemplate = async (
    template: (typeof trackerStarterTemplates)[number]
  ) => {
    if (!currentUserId) {
      toast.error("You need to be signed in to start a workout.");
      return;
    }

    try {
      setStartingTemplateId(template.id);
      void trackBetaFunnelMilestone("starter_flow_started", {
        source: template.id,
      }).catch((error) => {
        console.error("Error tracking starter flow start:", error);
      });

      const newExercises = await Promise.all(
        template.exercises.map(async (exerciseName, index) => {
          const profile = getExerciseProfile({ name: exerciseName });
          const starterWeight = resolveExerciseStartingWeight({
            exercise: { name: exerciseName },
            preferredUnits,
            candidateWeight: profile.weight ?? null,
          });
          const sets = Array.from({ length: profile.sets ?? 3 }, (_, setIndex) => ({
            id: createExerciseSetId(),
            name: `Working Set ${setIndex + 1}`,
            reps: profile.reps ?? 8,
            weight: starterWeight,
            actualWeight: "",
            actualReps: "",
            weightUnit: preferredUnits,
            complete: false,
          }));

          const entry = {
            entryInstanceId: createWorkoutEntryInstanceId(),
            userId: currentUserId,
            exerciseId: exerciseName.toLowerCase().replace(/\s+/g, "-"),
            name: exerciseName,
            type: "weight" as const,
            routineName,
            date: formattedDate,
            rest: 90,
            complete: false,
            sortOrder: index,
            weightUnit: preferredUnits,
            sets,
          };

          const saved = await saveWorkoutEntry(entry as any);
          return {
            ...entry,
            _id: saved?.entryId,
            entryInstanceId: saved?.entryInstanceId ?? entry.entryInstanceId,
          };
        })
      );

      setExercises(newExercises as WorkoutDisplayExercise[]);
      setCurrentExerciseIndex(0);
      setStarterFlowDismissed(true);
      refreshCalendarStatuses?.();
      void trackBetaFunnelMilestone("starter_flow_completed", {
        source: template.id,
      }).catch((error) => {
        console.error("Error tracking starter flow completion:", error);
      });
      toast.success(`${template.title} is ready to log`);
    } catch (error) {
      console.error("Failed to start starter workout", error);
      toast.error("The starter workout was not created. Try again.");
    } finally {
      setStartingTemplateId(null);
    }
  };

  return (
    <Box>
      <WorkoutHeaderSummary
        darkMode={darkMode}
        hasExercises={hasExercises}
        isWholeWorkoutRepeating={isWholeWorkoutRepeating}
        isWorkoutComplete={isWorkoutComplete}
        minimumWinMode={minimumWinMode}
        nextExercise={nextExercise}
        planChangeSummary={planChangeSummary}
        planFitCopy={planFitCopy}
        planFitHeadline={planFitHeadline}
        preWorkoutFocus={preWorkoutFocus}
        preWorkoutMinimumSuccess={preWorkoutMinimumSuccess}
        preWorkoutTimeLabel={preWorkoutTimeLabel}
        onToggleMinimumWinMode={() => setMinimumWinMode((previous) => !previous)}
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

        {hasExercises && !isWorkoutComplete ? (
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              borderRadius: routinesPanelRadius.section,
              border: "1px solid",
              borderColor: minimumWinMode
                ? darkMode
                  ? "rgba(250,204,21,0.24)"
                  : "rgba(202,138,4,0.18)"
                : "divider",
              backgroundColor: minimumWinMode
                ? darkMode
                  ? "rgba(69,26,3,0.34)"
                  : "rgba(255,251,235,0.92)"
                : darkMode
                ? "rgba(15,23,42,0.42)"
                : "rgba(248,250,252,0.9)",
            }}
          >
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1.25}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "center" }}
            >
              <Box>
                <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.12em" }}>
                  {minimumWinMode ? "Minimum Win" : "Low-energy option"}
                </Typography>
                <Typography variant="h6" sx={{ mt: 0.2 }}>
                  {minimumWinMode ? lowEnergyGuide.headline : "Need a lighter version of today?"}
                </Typography>
                <Typography sx={{ mt: 0.35, color: "text.secondary" }}>
                  {minimumWinMode
                    ? lowEnergyGuide.supportingCopy
                    : "Switch the session into a lighter path when time, energy, or focus is low. The day can still count."}
                </Typography>
                {minimumWinMode ? (
                  <Typography sx={{ mt: 0.65, color: "text.secondary" }}>
                    {lowEnergyGuide.completionCopy}
                  </Typography>
                ) : null}
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {minimumWinMode ? (
                  <>
                    <Button variant="contained" onClick={handleOpenNextSet}>
                      Focus the next lift
                    </Button>
                    <Button variant="outlined" onClick={() => setMinimumWinMode(false)}>
                      Return to full plan
                    </Button>
                  </>
                ) : (
                  <Button variant="outlined" onClick={() => setMinimumWinMode(true)}>
                    Turn this into a minimum win
                  </Button>
                )}
              </Stack>
            </Stack>
          </Paper>
        ) : null}

        {visiblePlannedExercises.length > 0 ? (
          <ExerciseListSection
            activeRestTimer={activeRestTimer}
            currentExerciseIndex={currentExerciseIndex}
            currentWorkout={currentWorkout}
            darkMode={darkMode}
            description={
              minimumWinMode
                ? "Only the highest-priority work stays visible so a lighter session is easier to finish."
                : "Exercises you still have left to complete today."
            }
            exerciseProgressById={exerciseProgressById}
            exercises={exercises}
            formattedDate={formattedDate}
            getExerciseCacheKey={getExerciseCacheKey}
            getExerciseIdentity={getExerciseIdentity}
            handleExerciseDragEnd={handleExerciseDragEnd}
            items={visiblePlannedExercises}
            lowEnergyModeActive={minimumWinMode}
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
            title={minimumWinMode ? "Minimum Win Focus" : "Scheduled"}
            userProfile={userProfile}
          />
        ) : null}

        {minimumWinMode && trimmedExerciseCount > 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 1.25,
              borderRadius: routinesPanelRadius.section,
              border: "1px dashed",
              borderColor: "divider",
              backgroundColor: darkMode ? "rgba(15,23,42,0.35)" : "rgba(248,250,252,0.82)",
            }}
          >
            <Typography sx={{ color: "text.secondary" }}>
              {trimmedExerciseCount} extra exercise{trimmedExerciseCount === 1 ? "" : "s"} moved out of the main flow for today. You can still come back to the full plan whenever energy returns.
            </Typography>
          </Paper>
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
            lowEnergyModeActive={minimumWinMode}
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
            {!starterFlowDismissed ? (
              <Stack spacing={1.1} sx={{ mt: 1.5, textAlign: "left" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Guided first-session options
                </Typography>
                {trackerStarterTemplates.map((template) => (
                  <Paper
                    key={template.id}
                    variant="outlined"
                    sx={{
                      p: 1.15,
                      borderRadius: routinesPanelRadius.section,
                      textAlign: "left",
                      backgroundColor: darkMode
                        ? "rgba(15,23,42,0.52)"
                        : "rgba(248,250,252,0.9)",
                    }}
                  >
                    <Typography sx={{ fontWeight: 700 }}>{template.title}</Typography>
                    <Typography sx={{ mt: 0.35, color: "text.secondary" }}>
                      {template.description}
                    </Typography>
                    <Typography sx={{ mt: 0.55, color: "text.secondary" }}>
                      {template.exercises.join(" • ")}
                    </Typography>
                    <Button
                      variant="contained"
                      sx={{ mt: 1 }}
                      onClick={() => void handleStartStarterTemplate(template)}
                      disabled={Boolean(startingTemplateId)}
                    >
                      {startingTemplateId === template.id ? "Creating..." : "Start this workout"}
                    </Button>
                  </Paper>
                ))}
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  justifyContent="center"
                >
                  <Button variant="outlined" onClick={() => setIsAddingExercise(true)}>
                    Build manually instead
                  </Button>
                  <Button variant="text" onClick={handleDismissStarterFlow}>
                    Dismiss starter flow
                  </Button>
                </Stack>
              </Stack>
            ) : null}
          </Paper>
        ) : null}

        <MuscleRecoveryMap
          exercises={exercises}
          userId={currentUserId}
          sex={userProfile?.sex}
          currentDate={currentDate}
          darkMode={darkMode}
        />

        <WorkoutSecondaryInsights
          comebackGuide={comebackGuide}
          darkMode={darkMode}
          progressTrendCards={progressTrendCards}
          progressTrendSummary={progressTrendSummary}
          showProWeeklyBrief={progressionRecommendationsEnabled}
          trainingAnalytics={trainingAnalytics}
          weeklyConsistency={weeklyConsistency}
          weeklyReviewPreview={weeklyReviewPreview}
          weeklyTargetDraft={weeklyTargetDraft}
          savingWeeklyTarget={savingWeeklyTarget}
          onResumeToday={handleResumeToday}
          onLightRestart={handleLightRestart}
          onRescheduleThisWeek={handleRescheduleThisWeek}
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
            {shouldShowNextSummary ? (
              <Button
                variant="contained"
                startIcon={<PlayArrowIcon />}
                onClick={handleOpenNextSet}
                sx={{
                  display: { xs: "inline-flex", sm: "none" },
                  flex: 1,
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
            {shouldShowNextSummary ? null : (
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
            )}
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
