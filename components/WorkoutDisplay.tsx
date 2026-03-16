import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Session } from "next-auth";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { Box, Button, Chip, Collapse, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import AddIcon from "@mui/icons-material/Add";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import RepeatIcon from "@mui/icons-material/Repeat";
import ExerciseItem from "./ExerciseItem";
import MuscleRecoveryMap from "./MuscleRecoveryMap";
import RepeatScheduleDialog from "./RepeatScheduleDialog";
import RestTimerOverlay from "./RestTimerOverlay";
import {
  fetchExerciseProgress,
  getWorkoutEntryIdentity,
  saveRecurringRule,
  saveWorkoutEntry,
  toLocalDateKey,
} from "../utils/helpers";
import { toast } from "react-toastify";
import { hasEntitlement } from "../utils/entitlements";
import { workoutFrequencyOptions } from "../utils/profileSetup";
import {
  getPersonalRecordHighlights,
  getProgressTrendHighlight,
} from "../utils/performance";

const routinesPanelRadius = {
  shell: 2.25,
  section: 1.5,
  pill: 999,
} as const;

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
}) => {
  const [shownMenuIndex, setShownMenuIndex] = useState(-1);
  const [showWorkoutRepeatDialog, setShowWorkoutRepeatDialog] = useState(false);
  const [activeRestTimer, setActiveRestTimer] = useState<{
    exerciseKey: string;
    exerciseName: string;
    seconds: number;
    restSeconds: number;
  } | null>(null);
  const [exerciseProgressById, setExerciseProgressById] = useState<
    Record<
      string,
      {
        summary: any;
        recommendation: any;
      }
    >
  >({});
  const [loadingProgressById, setLoadingProgressById] = useState<Record<string, boolean>>(
    {}
  );
  const [completionRecapDismissed, setCompletionRecapDismissed] = useState(false);
  const [weeklyTargetDraft, setWeeklyTargetDraft] = useState(
    weeklyConsistency?.target ? String(weeklyConsistency.target) : ""
  );
  const [savingWeeklyTarget, setSavingWeeklyTarget] = useState(false);
  const completionStateRef = useRef(false);
  const { data: session } = useSession() as {
    data: (Session & { token?: { user?: { _id?: string } } }) | null;
  };

  const currentUserId =
    session?.token?.user?._id ?? (session?.user as { _id?: string } | undefined)?._id ?? "";
  const progressionRecommendationsEnabled = hasEntitlement(
    userProfile as any,
    "progressionRecommendations"
  );
  const recurringSchedulingEnabled = hasEntitlement(
    userProfile as any,
    "recurringWorkoutScheduling"
  );
  const getExerciseCacheKey = (exercise: any): string =>
    String(exercise?.exerciseId ?? exercise?._id ?? "");
  const getExerciseIdentity = (exercise: any, fallbackIndex = 0): string =>
    getWorkoutEntryIdentity(exercise, fallbackIndex);

  useEffect(() => {
    setWeeklyTargetDraft(weeklyConsistency?.target ? String(weeklyConsistency.target) : "");
  }, [weeklyConsistency?.target]);

  useEffect(() => {
    if (!lastQuickAddedExerciseIdentity) {
      return;
    }

    const nextExerciseIndex = exercises.findIndex(
      (exercise, index) =>
        String(getExerciseIdentity(exercise, index)) === lastQuickAddedExerciseIdentity
    );

    if (nextExerciseIndex === -1) {
      return;
    }

    setCurrentExerciseIndex(nextExerciseIndex);
    clearLastQuickAddedExerciseIdentity?.();
  }, [
    clearLastQuickAddedExerciseIdentity,
    exercises,
    lastQuickAddedExerciseIdentity,
    setCurrentExerciseIndex,
  ]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    const nextExerciseIds: string[] = Array.from(
      new Set(
        exercises
          .filter((exercise) => exercise?.type === "weight")
          .map((exercise) => getExerciseCacheKey(exercise).trim())
          .filter(Boolean)
      )
    );

    const uncachedExerciseIds = nextExerciseIds.filter(
      (exerciseId) =>
        !exerciseProgressById[exerciseId] && !loadingProgressById[exerciseId]
    );

    if (uncachedExerciseIds.length === 0) {
      return;
    }

    let cancelled = false;

    setLoadingProgressById((prev) => {
      const next = { ...prev };
      uncachedExerciseIds.forEach((exerciseId) => {
        next[exerciseId] = true;
      });
      return next;
    });

    void Promise.all(
      uncachedExerciseIds.map(async (exerciseId) => {
        try {
          const result = await fetchExerciseProgress(currentUserId, exerciseId);
          if (cancelled) {
            return;
          }

          setExerciseProgressById((prev) => ({
            ...prev,
            [exerciseId]: {
              summary: result?.summary ?? null,
              recommendation: result?.recommendation ?? null,
            },
          }));
        } catch (error) {
          console.error("Failed to load exercise recommendation", error);
          if (!cancelled) {
            setExerciseProgressById((prev) => ({
              ...prev,
              [exerciseId]: {
                summary: null,
                recommendation: null,
              },
            }));
          }
        } finally {
          if (!cancelled) {
            setLoadingProgressById((prev) => ({
              ...prev,
              [exerciseId]: false,
            }));
          }
        }
      })
    );

    return () => {
      cancelled = true;
    };
  }, [
    currentUserId,
    exercises,
    exerciseProgressById,
    loadingProgressById,
    progressionRecommendationsEnabled,
  ]);

  const repeatingExercises = useMemo(
    () => exercises.filter((exercise) => Boolean(exercise?.isRepeating || exercise?.ruleId)),
    [exercises]
  );

  const sharedWorkoutSchedule = useMemo(() => {
    if (repeatingExercises.length === 0 || repeatingExercises.length !== exercises.length) {
      return null;
    }

    const [firstExercise, ...restExercises] = repeatingExercises;
    const baseSchedule = {
      recurrenceType: firstExercise?.recurrenceType ?? "weekly",
      interval: Number(firstExercise?.interval ?? firstExercise?.intervalWeeks ?? 1) || 1,
      dayOfWeek: Number(
        firstExercise?.dayOfWeek ??
          (Array.isArray(firstExercise?.daysOfWeek) ? firstExercise.daysOfWeek[0] : currentDate.getDay())
      ),
      daysOfWeek: Array.isArray(firstExercise?.daysOfWeek)
        ? firstExercise.daysOfWeek.map(Number)
        : [
            Number(
              firstExercise?.dayOfWeek ??
                (Array.isArray(firstExercise?.daysOfWeek) ? firstExercise.daysOfWeek[0] : currentDate.getDay())
            ),
          ],
      dayOfMonth: Number(firstExercise?.dayOfMonth ?? currentDate.getDate()) || currentDate.getDate(),
      endDate: firstExercise?.endDate ? String(firstExercise.endDate).slice(0, 10) : "",
    };

    const allMatch = restExercises.every((exercise) => {
      const exerciseDays = Array.isArray(exercise?.daysOfWeek)
        ? exercise.daysOfWeek.map(Number).sort().join(",")
        : "";
      const baseDays = [...baseSchedule.daysOfWeek].sort().join(",");

      return (
        (exercise?.recurrenceType ?? "weekly") === baseSchedule.recurrenceType &&
        (Number(exercise?.interval ?? exercise?.intervalWeeks ?? 1) || 1) === baseSchedule.interval &&
        Number(
          exercise?.dayOfWeek ??
            (Array.isArray(exercise?.daysOfWeek) ? exercise.daysOfWeek[0] : baseSchedule.dayOfWeek)
        ) === baseSchedule.dayOfWeek &&
        exerciseDays === baseDays &&
        Number(exercise?.dayOfMonth ?? baseSchedule.dayOfMonth) === baseSchedule.dayOfMonth &&
        String(exercise?.endDate ? String(exercise.endDate).slice(0, 10) : "") === baseSchedule.endDate
      );
    });

    return allMatch ? baseSchedule : null;
  }, [currentDate, exercises.length, repeatingExercises]);

  const [recurrenceType, setRecurrenceType] = useState<
    "daily" | "weekly" | "custom" | "monthly"
  >(sharedWorkoutSchedule?.recurrenceType ?? "weekly");
  const [repeatInterval, setRepeatInterval] = useState(sharedWorkoutSchedule?.interval ?? 1);
  const [repeatDayOfWeek, setRepeatDayOfWeek] = useState(
    sharedWorkoutSchedule?.dayOfWeek ?? currentDate.getDay()
  );
  const [repeatDaysOfWeek, setRepeatDaysOfWeek] = useState<number[]>(
    sharedWorkoutSchedule?.daysOfWeek ?? [currentDate.getDay()]
  );
  const [repeatDayOfMonth, setRepeatDayOfMonth] = useState(
    sharedWorkoutSchedule?.dayOfMonth ?? currentDate.getDate()
  );
  const [repeatEndDate, setRepeatEndDate] = useState(sharedWorkoutSchedule?.endDate ?? "");

  const isExerciseComplete = (exercise: any) => {
    const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
    return Boolean(
      exercise?.complete || (sets.length > 0 && sets.every((set) => set.complete))
    );
  };

  const isWholeWorkoutRepeating =
    exercises.length > 0 && repeatingExercises.length === exercises.length;

  const openWorkoutRepeatDialog = () => {
    if (!recurringSchedulingEnabled) {
      onRequestRecurringUpgradePrompt?.();
      return;
    }

    const schedule = sharedWorkoutSchedule;
    setRecurrenceType(schedule?.recurrenceType ?? "weekly");
    setRepeatInterval(schedule?.interval ?? 1);
    setRepeatDayOfWeek(schedule?.dayOfWeek ?? currentDate.getDay());
    setRepeatDaysOfWeek(schedule?.daysOfWeek ?? [currentDate.getDay()]);
    setRepeatDayOfMonth(schedule?.dayOfMonth ?? currentDate.getDate());
    setRepeatEndDate(schedule?.endDate ?? "");
    setShowWorkoutRepeatDialog(true);
  };

  const handleSaveWorkoutSchedule = async () => {
    if (!currentUserId) {
      toast.error("Couldn't save the workout schedule");
      return;
    }

    if (!recurringSchedulingEnabled) {
      onRequestRecurringUpgradePrompt?.();
      return;
    }

    try {
      const nextExercises = await Promise.all(
        exercises.map(async (exercise) => {
          if (exercise?.ruleId) {
            const deleteResponse = await fetch("/api/recurringRule", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ruleId: String(exercise.ruleId) }),
            });

            if (!deleteResponse.ok) {
              const message = await deleteResponse.text();
              throw new Error(`deleteRecurringRule ${deleteResponse.status}: ${message}`);
            }
          }

          const exerciseId = exercise.exerciseId ?? exercise._id ?? exercise.name;
          const savedRule = await saveRecurringRule({
            userId: currentUserId,
            exerciseId,
            exerciseName: exercise.name,
            exerciseType: exercise.type,
            routineName,
            recurrenceType,
            interval: repeatInterval,
            dayOfWeek: repeatDayOfWeek,
            daysOfWeek:
              recurrenceType === "custom" ? repeatDaysOfWeek : [repeatDayOfWeek],
            dayOfMonth: repeatDayOfMonth,
            intervalWeeks: repeatInterval,
            startDate: currentDate,
            endDate: repeatEndDate || undefined,
            templateSets: exercise.sets,
            defaultMax: exercise.max,
            defaultRest: exercise.rest,
            active: true,
          } as any);

          const updatedExercise = {
            ...exercise,
            userId: exercise.userId ?? currentUserId,
            exerciseId,
            routineName,
            isRepeating: true,
            ruleId: String(savedRule._id),
            recurrenceType,
            interval: repeatInterval,
            intervalWeeks: repeatInterval,
            dayOfWeek: repeatDayOfWeek,
            daysOfWeek:
              recurrenceType === "custom" ? repeatDaysOfWeek : [repeatDayOfWeek],
            dayOfMonth: repeatDayOfMonth,
            endDate: repeatEndDate || undefined,
            date: toLocalDateKey(currentDate),
          };

          await saveWorkoutEntry(updatedExercise as any);
          return updatedExercise;
        })
      );

      setExercises(nextExercises as any);
      setShowWorkoutRepeatDialog(false);
      setRefetchExercises((prev) => !prev);
      refreshCalendarStatuses?.();
      toast.success("Workout schedule updated");
    } catch (error) {
      console.error(error);
      toast.error("Couldn't save the workout schedule");
    }
  };

  const handleRemoveWorkoutSchedule = async () => {
    if (!currentUserId) {
      toast.error("Couldn't remove the workout schedule");
      return;
    }

    try {
      const nextExercises = await Promise.all(
        exercises.map(async (exercise) => {
          if (exercise?.ruleId) {
            const deleteResponse = await fetch("/api/recurringRule", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ruleId: String(exercise.ruleId) }),
            });

            if (!deleteResponse.ok) {
              const message = await deleteResponse.text();
              throw new Error(`deleteRecurringRule ${deleteResponse.status}: ${message}`);
            }
          }

          const updatedExercise = {
            ...exercise,
            userId: exercise.userId ?? currentUserId,
            exerciseId: exercise.exerciseId ?? exercise._id ?? exercise.name,
            routineName,
            isRepeating: false,
            ruleId: null,
            recurrenceType: null,
            interval: null,
            intervalWeeks: null,
            dayOfWeek: null,
            daysOfWeek: null,
            dayOfMonth: null,
            endDate: null,
            date: toLocalDateKey(currentDate),
          };

          await saveWorkoutEntry(updatedExercise as any);
          return updatedExercise;
        })
      );

      setExercises(nextExercises as any);
      setShowWorkoutRepeatDialog(false);
      setRefetchExercises((prev) => !prev);
      refreshCalendarStatuses?.();
      toast.success("Workout schedule removed");
    } catch (error) {
      console.error(error);
      toast.error("Couldn't remove the workout schedule");
    }
  };

  const loggedSetCount = useMemo(
    () =>
      exercises.reduce(
        (total, exercise) =>
          total + (exercise.sets?.filter((set) => set.complete).length ?? 0),
        0
      ),
    [exercises]
  );

  const completedExercises = useMemo(
    () => exercises.filter((exercise) => isExerciseComplete(exercise)),
    [exercises]
  );
  const prHighlights = useMemo(
    () =>
      completedExercises.filter((exercise) => {
        const summary =
          exerciseProgressById[getExerciseCacheKey(exercise)]?.summary ?? null;
        return Boolean(summary?.latestWorkoutBrokePR);
      }).length,
    [completedExercises, exerciseProgressById]
  );

  const plannedExercises = useMemo(
    () => exercises.filter((exercise) => !isExerciseComplete(exercise)),
    [exercises]
  );

  const nextExercise = useMemo(
    () => exercises.find((exercise) => !isExerciseComplete(exercise)) ?? null,
    [exercises]
  );

  const nextExerciseIndex = useMemo(
    () => exercises.findIndex((exercise) => !isExerciseComplete(exercise)),
    [exercises]
  );

  const hasExercises = exercises.length > 0;
  const isWorkoutComplete = hasExercises && !nextExercise;
  const shouldShowCompletionRecap = isWorkoutComplete && !completionRecapDismissed;
  const shouldShowNextSummary = Boolean(nextExercise);
  const remainingExerciseCount = plannedExercises.length;
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
          exercise.sets?.reduce((setTotal, set) => {
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
      {
        label: "Exercises done",
        value: completedExercises.length,
      },
      {
        label: "Sets logged",
        value: loggedSetCount,
      },
      {
        label: "Total volume",
        value: workoutVolume > 0 ? workoutVolume.toLocaleString() : "Bodyweight / timed",
      },
    ];

    if (prHighlights > 0) {
      highlights.push({
        label: "PR moments",
        value: prHighlights,
      });
    }

    return highlights;
  }, [completedExercises.length, loggedSetCount, prHighlights, workoutVolume]);

  const recentPersonalRecords = useMemo(
    () =>
      completedExercises.flatMap((exercise) => {
        const summary =
          exerciseProgressById[getExerciseCacheKey(exercise)]?.summary ?? null;
        return getPersonalRecordHighlights(
          summary,
          userProfile?.preferredUnits ?? exercise?.weightUnit
        ).map((highlight) => ({
          ...highlight,
          exerciseName: exercise?.name ?? "Exercise",
        }));
      }),
    [completedExercises, exerciseProgressById, userProfile?.preferredUnits]
  );
  const recentMilestones = milestoneSummary?.recentlyUnlocked ?? [];
  const milestoneHistory = useMemo(
    () => (milestoneSummary?.unlocked ?? []).slice(-6).reverse(),
    [milestoneSummary?.unlocked]
  );
  const progressTrendCards = useMemo(
    () =>
      exercises
        .map((exercise, index) => {
          const summary =
            exerciseProgressById[getExerciseCacheKey(exercise)]?.summary ?? null;
          const highlight = getProgressTrendHighlight(
            summary,
            userProfile?.preferredUnits ?? exercise?.weightUnit
          );

          if (!highlight) {
            return null;
          }

          return {
            id: `${getExerciseIdentity(exercise, index)}::${highlight.status}`,
            exerciseName: exercise?.name ?? "Exercise",
            ...highlight,
          };
        })
        .filter((value): value is NonNullable<typeof value> => Boolean(value)),
    [exerciseProgressById, exercises, userProfile?.preferredUnits]
  );
  const progressTrendSummary = useMemo(() => {
    const counts = progressTrendCards.reduce(
      (totals, card) => {
        totals[card.status] += 1;
        return totals;
      },
      {
        new: 0,
        up: 0,
        steady: 0,
        down: 0,
      }
    );

    const headline =
      counts.up > 0
        ? `${counts.up} lift${counts.up === 1 ? "" : "s"} improved recently`
        : counts.steady > 0
        ? "Recent work is holding steady"
        : counts.down > 0
        ? "Recent logs show a temporary dip"
        : "Progress will show up here once you log comparable sessions";

    const supportingCopy =
      counts.up > 0
        ? "You have visible momentum versus the last workout. Keep the next session boring and repeatable."
        : counts.steady > 0
        ? "No major swing yet. That usually means the base is stable and the next clean jump is still in play."
        : counts.down > 0
        ? "A lower day is still useful information. Treat it like signal, recover, and compare again next time."
        : "Once a lift has a prior benchmark, this section will call out what is improving, holding, or backing off.";

    return {
      counts,
      headline,
      supportingCopy,
    };
  }, [progressTrendCards]);

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

  const handleWeeklyTargetChange = async (nextTarget: string) => {
    setWeeklyTargetDraft(nextTarget);
    if (!nextTarget || nextTarget === String(weeklyConsistency?.target || "")) {
      return;
    }

    try {
      setSavingWeeklyTarget(true);
      await onWeeklyTargetChange?.(nextTarget);
      toast.success("Weekly target updated");
    } catch (error) {
      console.error("Failed to save weekly target", error);
      setWeeklyTargetDraft(weeklyConsistency?.target ? String(weeklyConsistency.target) : "");
      toast.error("Couldn't update your weekly target");
    } finally {
      setSavingWeeklyTarget(false);
    }
  };

  const persistExerciseOrder = async (orderedExercises: any[]) => {
    await Promise.all(
      orderedExercises.map(async (exercise, index) => {
        const nextSortOrder = index;
        const updatedExercise = {
          ...exercise,
          sortOrder: nextSortOrder,
          userId: exercise.userId ?? currentUserId,
          exerciseId: exercise.exerciseId ?? exercise._id ?? exercise.name,
          routineName,
          date: toLocalDateKey(currentDate),
        };

        if (exercise?.ruleId) {
          await saveRecurringRule({
            userId: updatedExercise.userId,
            exerciseId: updatedExercise.exerciseId,
            exerciseName: updatedExercise.name,
            exerciseType: updatedExercise.type,
            routineName,
            sortOrder: nextSortOrder,
            recurrenceType: updatedExercise.recurrenceType ?? "weekly",
            interval:
              updatedExercise.interval ?? updatedExercise.intervalWeeks ?? 1,
            dayOfWeek:
              updatedExercise.dayOfWeek ??
              (Array.isArray(updatedExercise.daysOfWeek)
                ? updatedExercise.daysOfWeek[0]
                : currentDate.getDay()),
            daysOfWeek:
              Array.isArray(updatedExercise.daysOfWeek) &&
              updatedExercise.daysOfWeek.length > 0
                ? updatedExercise.daysOfWeek
                : [
                    updatedExercise.dayOfWeek ?? currentDate.getDay(),
                  ],
            dayOfMonth: updatedExercise.dayOfMonth ?? currentDate.getDate(),
            intervalWeeks:
              updatedExercise.intervalWeeks ?? updatedExercise.interval ?? 1,
            startDate: currentDate,
            endDate: updatedExercise.endDate || undefined,
            templateSets: updatedExercise.sets,
            defaultMax: updatedExercise.max,
            defaultRest: updatedExercise.rest,
            active: true,
            _id: updatedExercise.ruleId,
          } as any);
        }

        await saveWorkoutEntry(updatedExercise as any);
        return updatedExercise;
      })
    );
  };

  const handleExerciseDragEnd = async (result: any) => {
    if (!result.destination) {
      return;
    }

    if (result.source.index === result.destination.index) {
      return;
    }

    const reorderedPlanned = [...plannedExercises];
    const [movedExercise] = reorderedPlanned.splice(result.source.index, 1);
    reorderedPlanned.splice(result.destination.index, 0, movedExercise);

    const reorderedAllExercises = [...reorderedPlanned, ...completedExercises].map(
      (exercise, index) => ({
        ...exercise,
        sortOrder: index,
      })
    );

    setExercises(reorderedAllExercises as any);

    try {
      await persistExerciseOrder(reorderedAllExercises);
      setRefetchExercises((prev) => !prev);
      refreshCalendarStatuses?.();
      toast.success("Exercise order updated");
    } catch (error) {
      console.error(error);
      toast.error("Couldn't save the new exercise order");
      setRefetchExercises((prev) => !prev);
    }
  };

  const handleOpenRestTimer = ({
    exerciseKey,
    exerciseName,
    seconds,
    restSeconds,
  }: {
    exerciseKey: string;
    exerciseName: string;
    seconds: number;
    restSeconds: number;
  }) => {
    if (!seconds || seconds <= 0) {
      setActiveRestTimer(null);
      return;
    }

    setActiveRestTimer({
      exerciseKey,
      exerciseName,
      seconds,
      restSeconds,
    });
  };

  const handleCloseRestTimer = () => {
    setActiveRestTimer(null);
  };

  const handleSaveRestTimerValue = async (nextRest: number) => {
    if (!activeRestTimer || !currentUserId) {
      return;
    }

    const exerciseIndex = exercises.findIndex(
      (exercise, index) =>
        getExerciseIdentity(exercise, index) === activeRestTimer.exerciseKey
    );

    if (exerciseIndex === -1) {
      return;
    }

    const exercise = exercises[exerciseIndex];
    const updatedExercise = {
      ...exercise,
      userId: exercise.userId ?? currentUserId,
      exerciseId: exercise.exerciseId ?? exercise._id ?? exercise.name,
      routineName,
      date: toLocalDateKey(currentDate),
      rest: nextRest,
    };

    setExercises((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((currentExercise, index) =>
        index === exerciseIndex
          ? {
              ...currentExercise,
              rest: nextRest,
            }
          : currentExercise
      )
    );

    await saveWorkoutEntry(updatedExercise as any);
    setActiveRestTimer((prev) =>
      prev
        ? {
            ...prev,
            seconds: nextRest,
            restSeconds: nextRest,
          }
        : prev
    );
    toast.success("Rest updated");
  };

  const renderSection = (title: string, description: string, items: any[]) => {
    if (items.length === 0) {
      return null;
    }

    const itemCountLabel = `${items.length} item${items.length === 1 ? "" : "s"}`;
    const showSectionDescription = items.length > 1;

    return (
      <Box sx={{ mt: 2.25 }}>
        <Paper
          elevation={0}
          sx={{
            p: 1.75,
            borderRadius: routinesPanelRadius.shell,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: darkMode
              ? "rgba(17,24,39,0.78)"
              : "rgba(255,255,255,0.88)",
          }}
        >
          <Box
            sx={{
              mb: 1.25,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <Box>
              <Typography
                variant="overline"
                sx={{ color: "text.secondary", letterSpacing: "0.12em" }}
              >
                {title}
              </Typography>
              {showSectionDescription ? (
                <Typography sx={{ color: "text.secondary" }}>{description}</Typography>
              ) : null}
            </Box>
            <Chip size="small" label={itemCountLabel} variant="outlined" />
          </Box>

          {title === "Scheduled" ? (
            <DragDropContext onDragEnd={handleExerciseDragEnd}>
              <Droppable droppableId="scheduled-exercises">
                {(provided) => (
                  <Box ref={provided.innerRef} {...provided.droppableProps}>
                    {items.map((exercise, index) => {
                      const exerciseIndex = exercises.findIndex((item) => item === exercise);
                      const draggableId = String(
                        getWorkoutEntryIdentity(
                          exercise,
                          `${exercise?.name ?? "exercise"}-${exerciseIndex}`
                        )
                      );

                      return (
                        <Draggable
                          key={`exercise-item-${draggableId}`}
                          draggableId={`exercise-${draggableId}`}
                          index={index}
                        >
                          {(dragProvided) => (
                            <Box
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                            >
                              <ExerciseItem
                                setRefetchExercises={setRefetchExercises}
                                refreshCalendarStatuses={refreshCalendarStatuses}
                                key={`exercise-item-${exerciseIndex}`}
                                exercise={exercise}
                                exerciseIndex={exerciseIndex}
                                exercises={exercises}
                                workout={currentWorkout}
                                isOpen={exerciseIndex === currentExerciseIndex}
                                setCurrentExerciseIndex={setCurrentExerciseIndex}
                                formattedDate={formattedDate}
                                routineName={routineName}
                                setExercises={setExercises}
                                shownMenuIndex={shownMenuIndex}
                                setShownMenuIndex={setShownMenuIndex}
                                darkMode={darkMode}
                                userProfile={userProfile}
                                recommendation={
                                  exerciseProgressById[getExerciseCacheKey(exercise)]
                                    ?.recommendation ?? null
                                }
                                progressSummary={
                                  exerciseProgressById[getExerciseCacheKey(exercise)]?.summary ??
                                  null
                                }
                                loadingRecommendation={
                                  Boolean(loadingProgressById[getExerciseCacheKey(exercise)])
                                }
                                progressionRecommendationsEnabled={
                                  progressionRecommendationsEnabled
                                }
                                recurringSchedulingEnabled={recurringSchedulingEnabled}
                                onRequestRecurringUpgradePrompt={
                                  onRequestRecurringUpgradePrompt
                                }
                                onRequestProgressionUpgradePrompt={
                                  onRequestProgressionUpgradePrompt
                                }
                                isRestTimerBlocking={
                                  activeRestTimer?.exerciseKey ===
                                  getExerciseIdentity(exercise, exerciseIndex)
                                }
                                openRestTimer={handleOpenRestTimer}
                              />
                            </Box>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </Box>
                )}
              </Droppable>
            </DragDropContext>
          ) : (
            items.map((exercise) => {
              const exerciseIndex = exercises.findIndex((item) => item === exercise);
              return (
                <ExerciseItem
                  setRefetchExercises={setRefetchExercises}
                  refreshCalendarStatuses={refreshCalendarStatuses}
                  key={`exercise-item-${exerciseIndex}`}
                  exercise={exercise}
                  exerciseIndex={exerciseIndex}
                  exercises={exercises}
                  workout={currentWorkout}
                  isOpen={exerciseIndex === currentExerciseIndex}
                  setCurrentExerciseIndex={setCurrentExerciseIndex}
                  formattedDate={formattedDate}
                  routineName={routineName}
                  setExercises={setExercises}
                  shownMenuIndex={shownMenuIndex}
                  setShownMenuIndex={setShownMenuIndex}
                  darkMode={darkMode}
                  userProfile={userProfile}
                  recommendation={
                    exerciseProgressById[getExerciseCacheKey(exercise)]?.recommendation ??
                    null
                  }
                  progressSummary={
                    exerciseProgressById[getExerciseCacheKey(exercise)]?.summary ?? null
                  }
                  loadingRecommendation={
                    Boolean(loadingProgressById[getExerciseCacheKey(exercise)])
                  }
                  progressionRecommendationsEnabled={
                    progressionRecommendationsEnabled
                  }
                  recurringSchedulingEnabled={recurringSchedulingEnabled}
                  onRequestRecurringUpgradePrompt={onRequestRecurringUpgradePrompt}
                  onRequestProgressionUpgradePrompt={onRequestProgressionUpgradePrompt}
                  isRestTimerBlocking={
                    activeRestTimer?.exerciseKey ===
                    getExerciseIdentity(exercise, exerciseIndex)
                  }
                  openRestTimer={handleOpenRestTimer}
                />
              );
            })
          )}
        </Paper>
      </Box>

    );
  };

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          p: 1.75,
          borderRadius: routinesPanelRadius.shell,
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: darkMode
            ? "rgba(17,24,39,0.78)"
            : "rgba(255,255,255,0.88)",
        }}
      >
        <Stack spacing={1.5}>
          {weeklyConsistency ? (
            <Paper
              elevation={0}
              sx={{
                p: 1.4,
                borderRadius: routinesPanelRadius.section,
                border: "1px solid",
                borderColor:
                  weeklyConsistency.state === "goal_hit"
                    ? "success.light"
                    : weeklyConsistency.state === "behind"
                    ? "warning.light"
                    : "divider",
                backgroundColor: darkMode
                  ? "rgba(15,23,42,0.52)"
                  : "rgba(248,250,252,0.9)",
              }}
            >
              <Stack spacing={1.15}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.2}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", sm: "center" }}
                >
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography
                        variant="overline"
                        sx={{ color: "text.secondary", letterSpacing: "0.12em" }}
                      >
                        Weekly Consistency
                      </Typography>
                      <Chip
                        size="small"
                        color={
                          weeklyConsistency.state === "goal_hit"
                            ? "success"
                            : weeklyConsistency.state === "behind"
                            ? "warning"
                            : "primary"
                        }
                        label={
                          weeklyConsistency.state === "goal_hit"
                            ? "Goal hit"
                            : weeklyConsistency.state === "behind"
                            ? "Behind"
                            : "On track"
                        }
                        variant="outlined"
                      />
                    </Stack>
                    <Typography variant="h6" sx={{ mt: 0.25 }}>
                      {weeklyConsistency.completedCount} / {weeklyConsistency.target} workouts this week
                    </Typography>
                    <Typography sx={{ mt: 0.35, color: "text.secondary" }}>
                      {weeklyConsistency.supportingCopy}
                    </Typography>
                  </Box>

                  <TextField
                    select
                    size="small"
                    label="Weekly target"
                    value={weeklyTargetDraft}
                    onChange={(event) => void handleWeeklyTargetChange(event.target.value)}
                    disabled={savingWeeklyTarget}
                    sx={{ minWidth: { xs: "100%", sm: 148 } }}
                  >
                    {workoutFrequencyOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option} / week
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    size="small"
                    label={`${weeklyConsistency.scheduledCount} scheduled`}
                    variant="outlined"
                  />
                  <Chip
                    size="small"
                    label={`${weeklyConsistency.remainingScheduledCount} remaining`}
                    variant="outlined"
                  />
                  <Chip
                    size="small"
                    label={weeklyConsistency.headline}
                    variant="outlined"
                  />
                </Stack>
              </Stack>
            </Paper>
          ) : null}

          {comebackGuide ? (
            <Paper
              elevation={0}
              sx={{
                p: 1.4,
                borderRadius: routinesPanelRadius.section,
                border: "1px solid",
                borderColor: darkMode
                  ? "rgba(96,165,250,0.26)"
                  : "rgba(59,130,246,0.18)",
                background: darkMode
                  ? "linear-gradient(145deg, rgba(30,41,59,0.82), rgba(15,23,42,0.74))"
                  : "linear-gradient(145deg, rgba(239,246,255,0.94), rgba(255,255,255,0.96))",
              }}
            >
              <Stack spacing={1.15}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", sm: "center" }}
                >
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography
                        variant="overline"
                        sx={{ color: "text.secondary", letterSpacing: "0.12em" }}
                      >
                        Comeback Plan
                      </Typography>
                      <Chip
                        size="small"
                        color="primary"
                        label="Fresh win opportunity"
                        variant="outlined"
                      />
                    </Stack>
                    <Typography variant="h6" sx={{ mt: 0.25 }}>
                      {comebackGuide.headline}
                    </Typography>
                    <Typography sx={{ mt: 0.35, color: "text.secondary" }}>
                      {comebackGuide.supportingCopy}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {comebackGuide.missedScheduledCount > 0 ? (
                      <Chip
                        size="small"
                        label={`${comebackGuide.missedScheduledCount} session${
                          comebackGuide.missedScheduledCount === 1 ? "" : "s"
                        } slipped`}
                        variant="outlined"
                      />
                    ) : null}
                    {comebackGuide.daysSinceLastLog !== null ? (
                      <Chip
                        size="small"
                        label={`${comebackGuide.daysSinceLastLog} day gap`}
                        variant="outlined"
                      />
                    ) : null}
                  </Stack>
                </Stack>

                <Typography sx={{ color: "text.secondary" }}>
                  No streak debt, no catch-up workout. Pick the easiest next step and let today
                  count.
                </Typography>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <Button variant="contained" onClick={handleResumeToday}>
                    Resume today
                  </Button>
                  <Button variant="outlined" onClick={handleLightRestart}>
                    Light restart session
                  </Button>
                  <Button variant="text" onClick={handleRescheduleThisWeek}>
                    Reschedule this week
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          ) : null}

          {progressTrendCards.length > 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 1.4,
                borderRadius: routinesPanelRadius.section,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: darkMode
                  ? "rgba(15,23,42,0.58)"
                  : "rgba(248,250,252,0.92)",
              }}
            >
              <Stack spacing={1.15}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", sm: "center" }}
                >
                  <Box>
                    <Typography
                      variant="overline"
                      sx={{ color: "text.secondary", letterSpacing: "0.12em" }}
                    >
                      Progress Summary
                    </Typography>
                    <Typography variant="h6" sx={{ mt: 0.25 }}>
                      What improved recently?
                    </Typography>
                    <Typography sx={{ mt: 0.35, color: "text.secondary" }}>
                      {progressTrendSummary.supportingCopy}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    variant="outlined"
                    color={progressTrendSummary.counts.up > 0 ? "success" : "default"}
                    label={progressTrendSummary.headline}
                  />
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    size="small"
                    label={`${progressTrendSummary.counts.up} up`}
                    color="success"
                    variant="outlined"
                  />
                  <Chip
                    size="small"
                    label={`${progressTrendSummary.counts.steady} steady`}
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    size="small"
                    label={`${progressTrendSummary.counts.down} reset`}
                    color="warning"
                    variant="outlined"
                  />
                </Stack>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, minmax(0, 1fr))",
                    },
                    gap: 1,
                  }}
                >
                  {progressTrendCards.slice(0, 4).map((card) => (
                    <Paper
                      key={card.id}
                      variant="outlined"
                      sx={{
                        p: 1.15,
                        borderRadius: routinesPanelRadius.section,
                        backgroundColor: darkMode
                          ? "rgba(30,41,59,0.6)"
                          : "rgba(255,255,255,0.88)",
                      }}
                    >
                      <Stack spacing={0.45}>
                        <Typography variant="caption" color="text.secondary">
                          {card.exerciseName}
                        </Typography>
                        <Typography sx={{ fontWeight: 700 }}>{card.label}</Typography>
                        <Typography sx={{ color: "text.secondary" }}>{card.benchmark}</Typography>
                        <Typography sx={{ color: "text.secondary" }}>{card.detail}</Typography>
                      </Stack>
                    </Paper>
                  ))}
                </Box>
              </Stack>
            </Paper>
          ) : null}

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", sm: "center" },
              flexDirection: { xs: "column", sm: "row" },
              gap: 1,
            }}
          >
            <Chip
              size="small"
              label={statusChip.label}
              color={statusChip.color}
              variant="outlined"
            />
            {hasExercises ? (
              <Button
                variant="outlined"
                size="small"
                startIcon={<RepeatIcon />}
                onClick={openWorkoutRepeatDialog}
              >
                {isWholeWorkoutRepeating ? "Edit workout schedule" : "Repeat this workout"}
              </Button>
            ) : null}
          </Box>

          {shouldShowNextSummary ? (
            <Box
              sx={{
                py: 1.1,
                px: 0.1,
                borderTop: "1px solid",
                borderBottom: "1px solid",
                borderColor: "divider",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: { xs: "flex-start", sm: "center" },
                  flexDirection: { xs: "column", sm: "row" },
                  gap: 1.25,
                }}
              >
                <Box>
                  <Typography
                    variant="overline"
                    sx={{ color: "text.secondary", letterSpacing: "0.12em" }}
                  >
                    Up Next
                  </Typography>
                  <Typography variant="h6">{nextExercise.name}</Typography>
                  <Typography sx={{ mt: 0.35, color: "text.secondary" }}>
                    Open this exercise to keep moving through today's plan.
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  startIcon={<PlayArrowIcon />}
                  onClick={() => setCurrentExerciseIndex(nextExerciseIndex)}
                >
                  Open Next Set
                </Button>
              </Box>
            </Box>
          ) : isWorkoutComplete ? (
            <Box
              sx={{
                py: 1.1,
                px: 0.1,
                borderTop: "1px solid",
                borderBottom: "1px solid",
                borderColor: "divider",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: { xs: "flex-start", sm: "center" },
                  flexDirection: { xs: "column", sm: "row" },
                  gap: 1.25,
                }}
              >
                <Box>
                  <Typography
                    variant="overline"
                    sx={{ color: "text.secondary", letterSpacing: "0.12em" }}
                  >
                    Workout Complete
                  </Typography>
                  <Typography variant="h6">
                    Everything for today is logged
                  </Typography>
                  <Typography sx={{ mt: 0.35, color: "text.secondary" }}>
                    Lock in the finish, take the win, and choose the next move while the session
                    still feels fresh.
                  </Typography>
                </Box>
                <CheckCircleOutlineIcon color="success" />
              </Box>
            </Box>
          ) : null}

          {isWorkoutComplete ? (
            <Collapse in={shouldShowCompletionRecap} appear={false}>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 1.6, sm: 1.9 },
                  borderRadius: routinesPanelRadius.shell,
                  border: "1px solid",
                  borderColor: darkMode
                    ? "rgba(96,165,250,0.26)"
                    : "rgba(59,130,246,0.18)",
                  background: darkMode
                    ? "linear-gradient(145deg, rgba(30,41,59,0.98), rgba(15,23,42,0.92))"
                    : "linear-gradient(145deg, rgba(239,246,255,0.98), rgba(255,255,255,0.95))",
                  boxShadow: darkMode
                    ? "0 18px 36px rgba(2,6,23,0.28)"
                    : "0 18px 34px rgba(59,130,246,0.1)",
                }}
              >
                <Stack spacing={1.5}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.25}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", sm: "center" }}
                  >
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <AutoAwesomeIcon fontSize="small" color="primary" />
                        <Typography
                          variant="overline"
                          sx={{ color: "text.secondary", letterSpacing: "0.12em" }}
                        >
                          Session Recap
                        </Typography>
                      </Stack>
                      <Typography variant="h6" sx={{ mt: 0.4 }}>
                        Strong finish. Today&apos;s work is in the bank.
                      </Typography>
                      <Typography sx={{ mt: 0.55, color: "text.secondary", maxWidth: 620 }}>
                        You closed the loop on this workout. Capture the progress now, then tee up
                        the next session while momentum is still high.
                      </Typography>
                    </Box>
                    <Chip
                      icon={<CheckCircleOutlineIcon fontSize="small" />}
                      label="Workout saved"
                      color="success"
                      variant="outlined"
                    />
                  </Stack>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "repeat(2, minmax(0, 1fr))",
                        sm: "repeat(4, minmax(0, 1fr))",
                      },
                      gap: 1,
                    }}
                  >
                    {completionHighlights.map((highlight) => (
                      <Paper
                        key={highlight.label}
                        variant="outlined"
                        sx={{
                          p: 1.25,
                          borderRadius: routinesPanelRadius.section,
                          backgroundColor: darkMode
                            ? "rgba(15,23,42,0.55)"
                            : "rgba(255,255,255,0.86)",
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          {highlight.label}
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 0.2 }}>
                          {String(highlight.value)}
                        </Typography>
                      </Paper>
                    ))}
                  </Box>

                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    justifyContent="space-between"
                    alignItems={{ xs: "stretch", sm: "center" }}
                  >
                    <Typography sx={{ color: "text.secondary" }}>
                      {recentPersonalRecords.length > 0
                        ? `You set ${recentPersonalRecords.length} new PR${
                            recentPersonalRecords.length === 1 ? "" : "s"
                          } in this session.`
                        : "Consistent logged sessions are what unlock better recommendations and better weeks."}
                    </Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                      <Button
                        variant="text"
                        onClick={() => setCompletionRecapDismissed(true)}
                      >
                        Dismiss
                      </Button>
                      <Button
                        variant="contained"
                        endIcon={<PlayArrowIcon />}
                        onClick={handleCompletionNextStep}
                      >
                        {recurringSchedulingEnabled ? "Schedule next session" : "Plan next move"}
                      </Button>
                    </Stack>
                  </Stack>
                </Stack>
              </Paper>
            </Collapse>
          ) : null}

          {recentMilestones.length > 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: { xs: 1.5, sm: 1.7 },
                borderRadius: routinesPanelRadius.shell,
                border: "1px solid",
                borderColor: darkMode
                  ? "rgba(245,158,11,0.22)"
                  : "rgba(217,119,6,0.16)",
                background: darkMode
                  ? "linear-gradient(145deg, rgba(69,26,3,0.42), rgba(15,23,42,0.82))"
                  : "linear-gradient(145deg, rgba(255,247,237,0.98), rgba(255,255,255,0.96))",
              }}
            >
              <Stack spacing={1.15}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", sm: "center" }}
                >
                  <Box>
                    <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.12em" }}>
                      Milestone Unlocked
                    </Typography>
                    <Typography variant="h6" sx={{ mt: 0.3 }}>
                      Progress earned a marker today
                    </Typography>
                    <Typography sx={{ mt: 0.35, color: "text.secondary", maxWidth: 620 }}>
                      These are quiet proof points that the work is compounding, whether you are
                      early in the habit or deep into a long training block.
                    </Typography>
                  </Box>
                  <Chip
                    color="warning"
                    variant="outlined"
                    label={`${recentMilestones.length} new milestone${
                      recentMilestones.length === 1 ? "" : "s"
                    }`}
                    sx={{ fontWeight: 700 }}
                  />
                </Stack>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, minmax(0, 1fr))",
                    },
                    gap: 1,
                  }}
                >
                  {recentMilestones.map((milestone) => (
                    <Paper
                      key={milestone.id}
                      variant="outlined"
                      sx={{
                        p: 1.2,
                        borderRadius: routinesPanelRadius.section,
                        backgroundColor: darkMode
                          ? "rgba(120,53,15,0.22)"
                          : "rgba(255,251,235,0.9)",
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {milestone.category === "workout_count"
                          ? "Workout count"
                          : milestone.category === "consistency"
                          ? "Consistency"
                          : milestone.category === "training_volume"
                          ? "Training volume"
                          : "Comeback win"}
                      </Typography>
                      <Typography sx={{ mt: 0.35, fontWeight: 700 }}>{milestone.title}</Typography>
                      <Typography sx={{ mt: 0.35, color: "text.secondary" }}>
                        {milestone.detail}
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              </Stack>
            </Paper>
          ) : null}

          {recentPersonalRecords.length > 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: { xs: 1.4, sm: 1.6 },
                borderRadius: routinesPanelRadius.shell,
                border: "1px solid",
                borderColor: darkMode
                  ? "rgba(74,222,128,0.22)"
                  : "rgba(22,163,74,0.14)",
                backgroundColor: darkMode
                  ? "rgba(15,23,42,0.74)"
                  : "rgba(248,250,252,0.92)",
              }}
            >
              <Stack spacing={1.2}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", sm: "center" }}
                >
                  <Box>
                    <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.12em" }}>
                      Recent PRs
                    </Typography>
                    <Typography variant="h6" sx={{ mt: 0.3 }}>
                      Progress worth remembering
                    </Typography>
                    <Typography sx={{ mt: 0.35, color: "text.secondary", maxWidth: 620 }}>
                      Your latest records stay visible here, so the reward does not disappear the
                      moment you finish the set.
                    </Typography>
                  </Box>
                  <Chip
                    color="success"
                    variant="outlined"
                    label={`${recentPersonalRecords.length} PR${
                      recentPersonalRecords.length === 1 ? "" : "s"
                    } this workout`}
                    sx={{ fontWeight: 700 }}
                  />
                </Stack>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, minmax(0, 1fr))",
                    },
                    gap: 1,
                  }}
                >
                  {recentPersonalRecords.map((highlight) => (
                    <Paper
                      key={`${highlight.exerciseName}-${highlight.category}-${highlight.detail}`}
                      variant="outlined"
                      sx={{
                        p: 1.2,
                        borderRadius: routinesPanelRadius.section,
                        backgroundColor: darkMode
                          ? "rgba(20,83,45,0.2)"
                          : "rgba(240,253,244,0.86)",
                      }}
                    >
                      <Stack spacing={0.45}>
                        <Typography variant="caption" color="text.secondary">
                          {highlight.exerciseName}
                        </Typography>
                        <Typography sx={{ fontWeight: 700 }}>{highlight.label}</Typography>
                        <Typography sx={{ color: "text.secondary" }}>{highlight.detail}</Typography>
                      </Stack>
                    </Paper>
                  ))}
                </Box>
              </Stack>
            </Paper>
          ) : null}

          {milestoneHistory.length > 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: { xs: 1.4, sm: 1.6 },
                borderRadius: routinesPanelRadius.shell,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: darkMode
                  ? "rgba(15,23,42,0.7)"
                  : "rgba(248,250,252,0.92)",
              }}
            >
              <Stack spacing={1.15}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", sm: "center" }}
                >
                  <Box>
                    <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.12em" }}>
                      Milestones
                    </Typography>
                    <Typography variant="h6" sx={{ mt: 0.3 }}>
                      Long-term progress, kept visible
                    </Typography>
                    <Typography sx={{ mt: 0.35, color: "text.secondary", maxWidth: 620 }}>
                      Milestones are awarded once per threshold and stay here as a record of the
                      work you have already banked.
                    </Typography>
                  </Box>
                  <Chip
                    variant="outlined"
                    label={`${milestoneSummary?.unlocked?.length ?? 0} unlocked`}
                  />
                </Stack>

                <Stack spacing={1}>
                  {milestoneHistory.map((milestone) => (
                    <Paper
                      key={`${milestone.id}-${milestone.unlockedAt}`}
                      variant="outlined"
                      sx={{
                        p: 1.15,
                        borderRadius: routinesPanelRadius.section,
                        backgroundColor: darkMode
                          ? "rgba(30,41,59,0.6)"
                          : "rgba(255,255,255,0.86)",
                      }}
                    >
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", sm: "center" }}
                      >
                        <Box>
                          <Typography sx={{ fontWeight: 700 }}>{milestone.title}</Typography>
                          <Typography sx={{ mt: 0.35, color: "text.secondary" }}>
                            {milestone.detail}
                          </Typography>
                        </Box>
                        <Chip size="small" variant="outlined" label={milestone.unlockedAt} />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Stack>
            </Paper>
          ) : null}

          {(completedExercises.length > 0 || isWorkoutComplete) && (
            <Box
              sx={{
                display: "flex",
                gap: 1,
                flexWrap: "wrap",
              }}
            >
              {isWorkoutComplete && completionRecapDismissed ? (
                <Chip
                  label="View session recap"
                  color="primary"
                  variant="outlined"
                  onClick={() => setCompletionRecapDismissed(false)}
                  clickable
                />
              ) : null}
              <Chip
                label={`${completedExercises.length} exercise${
                  completedExercises.length === 1 ? "" : "s"
                } completed`}
                variant="outlined"
              />
              <Chip
                label={`Total volume ${workoutVolume.toLocaleString()}`}
                variant="outlined"
              />
            </Box>
          )}
        </Stack>
      </Paper>

      <MuscleRecoveryMap
        exercises={exercises}
        userId={currentUserId}
        sex={userProfile?.sex}
        currentDate={currentDate}
        darkMode={darkMode}
      />

      {plannedExercises.length > 0
        ? renderSection(
            "Scheduled",
            "Exercises you still have left to complete today.",
            plannedExercises
          )
        : null}

      {completedExercises.length > 0
        ? renderSection(
            "Completed Today",
            "Finished exercises move here so the active workout stays cleaner.",
            completedExercises
          )
        : null}

      {!hasExercises ? (
        <Paper
          elevation={0}
          sx={{
            mt: 2.25,
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
            Start with a lift, movement, or timed activity. You can always add
            more after that.
          </Typography>
        </Paper>
      ) : null}

      <Box sx={{ height: { xs: 136, sm: 0 } }} />
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
                onClick={() => setCurrentExerciseIndex(nextExerciseIndex)}
                sx={{
                  display: { xs: "inline-flex", sm: "none" },
                  flex: 1.35,
                  ...mobilePrimaryButtonSx,
                }}
              >
                Next set
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
              variant="contained"
              onClick={() => {
                setIsAddingExercise(true);
              }}
              startIcon={<AddIcon />}
              sx={{
                display: { xs: "none", sm: "inline-flex" },
                px: 3,
                py: 1.1,
                borderRadius: 10,
                backgroundColor: darkMode ? "rgba(255,255,255,0.08)" : "#111827",
                color: darkMode ? "#f3f4f6" : "#f8fafc",
                boxShadow: darkMode
                  ? "0 18px 40px rgba(2,6,23,0.42)"
                  : "0 16px 34px rgba(15,23,42,0.18)",
                "&:hover": {
                  backgroundColor: darkMode ? "rgba(255,255,255,0.14)" : "#000000",
                },
              }}
            >
              {hasExercises ? "Add Exercise" : "Add First Exercise"}
            </Button>
          </Stack>
        </Paper>
      </Box>

      <RepeatScheduleDialog
        open={showWorkoutRepeatDialog}
        onClose={() => setShowWorkoutRepeatDialog(false)}
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
        onSaveRest={handleSaveRestTimerValue}
      />
    </Box>
  );
};

export default WorkoutDisplay;
