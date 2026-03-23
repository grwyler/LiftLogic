import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import ExerciseSelector from "./ExerciseSelector";
import ExerciseEditItem from "./ExerciseEditItem";
import {
  createWorkoutEntryInstanceId,
  fetchExerciseProgress,
  getWorkoutEntryIdentity,
  saveWorkoutEntry,
} from "../utils/helpers";
import {
  normalizeRecurringSchedule,
  saveRecurringRule,
} from "../utils/recurringRuleService";
import { emitDevBugInteraction } from "../utils/devBugRecorder";
import {
  DEFAULT_MAX_WEIGHT,
  getExerciseProfile,
  resolveExerciseStartingWeight,
} from "../utils/exerciseDrafts";
import { toast } from "react-toastify";
import { createExerciseSetId } from "../utils/exerciseSetIds";
import { parseLocalDateInput } from "../utils/localDate";
import { normalizeWeightUnit } from "../utils/weightUnits";
import { hasEntitlement } from "../utils/entitlements";
import { ExerciseCatalogDoc, UserDoc, WorkoutEntryDoc, WorkoutExerciseView } from "../utils/types";

interface ExerciseManagerProps {
  index: number;
  darkMode: boolean;
  currentWorkoutTitle: string;
  currentExercises?: unknown[];
  setIsAddingExercise: (value: boolean) => void;
  setExercises: React.Dispatch<React.SetStateAction<unknown[]>>;
  userId: string;
  date: string;
  onQuickAddComplete?: (exerciseIdentity: string) => void;
  refreshCalendarStatuses?: () => void;
  userProfile?: {
    preferredUnits?: "lb" | "kg";
  } | null;
}

type ExerciseCatalogSelection = Partial<ExerciseCatalogDoc> & {
  _id?: string;
  id?: string;
  entryInstanceId?: string;
  name: string;
  type?: "timed" | "weight";
  exerciseId?: string;
  equipment?: string[] | string;
  rest?: number;
  max?: number;
  defaultRest?: number;
  defaultMax?: number;
};

type ExerciseDraft = WorkoutExerciseView & {
  id?: string;
  userId: string;
  date: string;
  isRecurring?: boolean;
  clientDraftId?: string;
  recommendationPending?: boolean;
};

const toWorkoutEntryPayload = (value: Record<string, unknown>) =>
  value as unknown as WorkoutEntryDoc;

const asExerciseDraftList = (value: unknown[]): ExerciseDraft[] =>
  value as ExerciseDraft[];

const DEFAULT_TIMED_SECONDS = 60;

const getTimedExerciseProfile = (exercise: ExerciseCatalogSelection) => {
  const name = String(exercise?.name ?? "").toLowerCase();
  const equipment = Array.isArray(exercise?.equipment)
    ? exercise.equipment.join(" ").toLowerCase()
    : String(exercise?.equipment ?? "").toLowerCase();

  if (/cycling|bike|bicycle|spin/.test(name + " " + equipment)) {
    return { sets: 1, hours: 0, minutes: 30, seconds: 0 };
  }

  if (/running|run|jog|treadmill/.test(name + " " + equipment)) {
    return { sets: 1, hours: 0, minutes: 20, seconds: 0 };
  }

  if (/walk|walking/.test(name)) {
    return { sets: 1, hours: 0, minutes: 20, seconds: 0 };
  }

  if (/jump rope/.test(name)) {
    return { sets: 1, hours: 0, minutes: 10, seconds: 0 };
  }

  if (/plank/.test(name)) {
    return { sets: 3, hours: 0, minutes: 1, seconds: 0 };
  }

  if (/stretch|mobility|warmup|warm-up/.test(name)) {
    return { sets: 1, hours: 0, minutes: 10, seconds: 0 };
  }

  if (/yoga/.test(name)) {
    return { sets: 1, hours: 0, minutes: 30, seconds: 0 };
  }

  return { sets: 1, hours: 0, minutes: 5, seconds: 0 };
};

const getDefaultRestSeconds = (exercise: ExerciseCatalogSelection) => {
  const name = String(exercise?.name ?? "").toLowerCase();
  const equipment = Array.isArray(exercise?.equipment)
    ? exercise.equipment.join(" ").toLowerCase()
    : String(exercise?.equipment ?? "").toLowerCase();

  if (exercise?.type === "timed") {
    return 0;
  }

  if (/deadlift|squat|leg press/.test(name)) {
    return 150;
  }

  if (/bench|row|pull down|pulldown|overhead press|shoulder press|press|dip/.test(name)) {
    return 120;
  }

  if (/curl|raise|tricep|fly|extension/.test(name)) {
    return 60;
  }

  if (/bodyweight/.test(equipment) || /pull-up|push-up|dip|plank|lunge|bulgarian/.test(name)) {
    return 90;
  }

  return 90;
};

const createWeightSets = ({
  setCount,
  reps,
  weight,
  weightUnit,
}: {
  setCount: number;
  reps: number;
  weight: number | undefined;
  weightUnit: "lb" | "kg";
}) =>
  Array.from({ length: setCount }, (_, index) => ({
    id: createExerciseSetId(),
    name: `Working Set ${index + 1}`,
    weightUnit,
    reps,
    weight,
    actualWeight: "",
    actualReps: "",
    complete: false,
  }));

const createTimedSets = (timedProfile: {
  sets: number;
  hours: number;
  minutes: number;
  seconds: number;
}) =>
  Array.from({ length: timedProfile.sets }, (_, index) => ({
    id: createExerciseSetId(),
    name: `Timed Set ${index + 1}`,
    hours: timedProfile.hours,
    minutes: timedProfile.minutes,
    seconds: timedProfile.seconds,
    totalSeconds:
      timedProfile.hours * 3600 +
      timedProfile.minutes * 60 +
      timedProfile.seconds,
    actualHours: "",
    actualMinutes: "",
    actualSeconds: "",
    complete: false,
  }));

const ExerciseManager: React.FC<ExerciseManagerProps> = ({
  index,
  darkMode,
  currentWorkoutTitle,
  currentExercises = [],
  setIsAddingExercise,
  setExercises,
  userId,
  date,
  onQuickAddComplete,
  refreshCalendarStatuses,
  userProfile,
}) => {
  const preferredUnits = normalizeWeightUnit(userProfile?.preferredUnits);
  const progressionRecommendationsEnabled = hasEntitlement(
    userProfile,
    "progressionRecommendations"
  );
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDraft | null>(null);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const parsedBaseDate = parseLocalDateInput(date) ?? new Date(date);
  const [recurrenceType, setRecurrenceType] = useState<
    "daily" | "weekly" | "custom" | "monthly"
  >("weekly");
  const [repeatInterval, setRepeatInterval] = useState(1);
  const [repeatDayOfWeek, setRepeatDayOfWeek] = useState(
    Number.isNaN(parsedBaseDate.getTime()) ? 0 : parsedBaseDate.getDay()
  );
  const [repeatDaysOfWeek, setRepeatDaysOfWeek] = useState<number[]>([
    Number.isNaN(parsedBaseDate.getTime()) ? 0 : parsedBaseDate.getDay(),
  ]);
  const [repeatDayOfMonth, setRepeatDayOfMonth] = useState(
    Number.isNaN(parsedBaseDate.getTime()) ? 1 : parsedBaseDate.getDate()
  );
  const [repeatEndDate, setRepeatEndDate] = useState("");

  const normalizeExerciseId = (exercise: ExerciseCatalogSelection | ExerciseDraft) => {
    if (!exercise) {
      throw new Error("Exercise is required");
    }

    return String(
      exercise.exerciseId ??
        exercise.id ??
        exercise._id ??
        exercise.name?.toLowerCase().replace(/\s+/g, "-")
    );
  };

  const resolveExerciseType = (exercise: ExerciseCatalogSelection | ExerciseDraft) =>
    exercise.type === "timed" ? "timed" : "weight";

  const buildExerciseDraft = async (exercise: ExerciseCatalogSelection) => {
    const baseDraft = buildExerciseDraftFromDefaults(exercise);
    const exerciseType = resolveExerciseType(exercise);
    if (exerciseType !== "weight" || !progressionRecommendationsEnabled) {
      return {
        ...baseDraft,
        recommendationPending: false,
      };
    }

    const normalizedExerciseId = normalizeExerciseId(exercise);
    const progress = await fetchExerciseProgress(userId, normalizedExerciseId).catch(
      () => null
    );
    const recommendation = progress?.recommendation ?? null;
    if (exerciseType !== "weight" || !recommendation) {
      return {
        ...baseDraft,
        recommendationPending: false,
      };
    }

    return applyRecommendationToDraft(baseDraft, recommendation);
  };

  const buildExerciseDraftFromDefaults = (exercise: ExerciseCatalogSelection): ExerciseDraft => {
    const exerciseType = resolveExerciseType(exercise);
    const normalizedExerciseId = normalizeExerciseId(exercise);
    const profile = getExerciseProfile(exercise);
    const timedProfile = getTimedExerciseProfile(exercise);
    const baseWeight = resolveExerciseStartingWeight({
      exercise,
      preferredUnits,
      candidateWeight:
      profile.weight ??
      exercise.max ??
      exercise.defaultMax ??
      DEFAULT_MAX_WEIGHT,
    });

    return {
      ...exercise,
      entryInstanceId:
        exercise.entryInstanceId ??
        exercise._id?.toString?.() ??
        exercise._id ??
        createWorkoutEntryInstanceId(),
      type: exerciseType,
      exerciseId: normalizedExerciseId,
      sortOrder: currentExercises.length,
      routineName: currentWorkoutTitle,
      userId,
      date,
      complete: false,
      isRecurring,
      recurrenceType: isRecurring ? recurrenceType : undefined,
      interval: isRecurring ? repeatInterval : undefined,
      intervalWeeks: isRecurring ? repeatInterval : undefined,
      dayOfWeek: isRecurring ? repeatDayOfWeek : undefined,
      daysOfWeek: isRecurring
        ? recurrenceType === "custom"
          ? repeatDaysOfWeek
          : [repeatDayOfWeek]
        : undefined,
      dayOfMonth: isRecurring ? repeatDayOfMonth : undefined,
      endDate: isRecurring && repeatEndDate ? repeatEndDate : undefined,
      max: exercise.max ?? exercise.defaultMax ?? baseWeight ?? undefined,
      weightUnit: preferredUnits,
      rest:
        exercise.rest ??
        exercise.defaultRest ??
        getDefaultRestSeconds(exercise),
      sets:
        exerciseType === "timed"
          ? createTimedSets(timedProfile)
          : createWeightSets({
              setCount: profile.sets ?? 3,
              reps: profile.reps ?? 8,
              weight: baseWeight,
              weightUnit: preferredUnits,
            }),
      recommendationPending: exerciseType === "weight",
    };
  };

  const applyRecommendationToDraft = (
    draft: ExerciseDraft,
    recommendation: NonNullable<Awaited<ReturnType<typeof fetchExerciseProgress>>>["recommendation"]
  ): ExerciseDraft => {
    if (draft.type !== "weight") {
      return {
        ...draft,
        recommendationPending: false,
      };
    }

    const recommendedSetCount = recommendation?.recommendedSets ?? draft.sets?.length ?? 3;
    const recommendedReps =
      recommendation?.recommendedReps ?? draft.sets?.[0]?.reps ?? 8;
    const recommendedWeight =
      recommendation?.recommendedWeight ??
      draft.sets?.[0]?.weight ??
      draft.max ??
      DEFAULT_MAX_WEIGHT;

    return {
      ...draft,
      max: draft.max ?? recommendedWeight ?? undefined,
      weightUnit: recommendation?.weightUnit ?? preferredUnits,
      sets: createWeightSets({
        setCount: recommendedSetCount,
        reps: recommendedReps,
        weight: recommendedWeight,
        weightUnit: recommendation?.weightUnit ?? preferredUnits,
      }),
      recommendationPending: false,
    };
  };

  const canHydrateRecommendation = (
    currentExercise: ExerciseDraft,
    baseExercise: ExerciseDraft
  ) => {
    if (!currentExercise || currentExercise.type !== "weight") {
      return false;
    }

    if (!currentExercise.recommendationPending) {
      return false;
    }

    return JSON.stringify(currentExercise.sets ?? []) === JSON.stringify(baseExercise.sets ?? []);
  };

  const hydrateQuickAddRecommendation = async (baseExercise: ExerciseDraft) => {
    if (baseExercise.type !== "weight" || !progressionRecommendationsEnabled) {
      return;
    }

    const progress = await fetchExerciseProgress(
      userId,
      normalizeExerciseId(baseExercise)
    ).catch(() => null);
    const recommendation = progress?.recommendation ?? null;

    setExercises((prev) => {
      const nextExercises = Array.isArray(prev) ? [...asExerciseDraftList(prev)] : [];
      const exerciseIndex = nextExercises.findIndex(
        (exercise) =>
          String(exercise?.clientDraftId ?? "") === String(baseExercise.clientDraftId ?? "")
      );

      if (exerciseIndex === -1 || !recommendation) {
        return nextExercises.map((exercise, index) =>
          index === exerciseIndex
            ? { ...exercise, recommendationPending: false }
            : exercise
        );
      }

      const currentExercise = nextExercises[exerciseIndex];
      if (!currentExercise) {
        return nextExercises;
      }
      if (!canHydrateRecommendation(currentExercise, baseExercise)) {
        nextExercises[exerciseIndex] = {
          ...currentExercise,
          recommendationPending: false,
        };
        return nextExercises;
      }

      const hydratedExercise = applyRecommendationToDraft(currentExercise, recommendation);
      nextExercises[exerciseIndex] = hydratedExercise;
      void persistExercise(hydratedExercise).catch((error) => {
        console.error("Failed to persist hydrated recommendation", error);
      });
      return nextExercises;
    });
  };

  const persistExercise = async (updatedExercise: ExerciseDraft): Promise<ExerciseDraft> => {
    const {
      clientDraftId: _clientDraftId,
      recommendationPending: _recommendationPending,
      ...persistableExercise
    } = updatedExercise;

    if (updatedExercise.isRecurring) {
      const parsedDate =
        parseLocalDateInput(persistableExercise.date) ??
        new Date(persistableExercise.date);
      if (isNaN(parsedDate.getTime())) {
        throw new Error(`Invalid recurring date: ${persistableExercise.date}`);
      }

      const schedule = normalizeRecurringSchedule(
        {
          recurrenceType:
            persistableExercise.recurrenceType ?? recurrenceType,
          interval: persistableExercise.interval ?? repeatInterval,
          dayOfWeek: persistableExercise.dayOfWeek ?? repeatDayOfWeek,
          daysOfWeek:
            (persistableExercise.daysOfWeek as number[] | undefined) ??
            ((persistableExercise.recurrenceType ?? recurrenceType) === "custom"
              ? repeatDaysOfWeek
              : [persistableExercise.dayOfWeek ?? repeatDayOfWeek]),
          dayOfMonth: persistableExercise.dayOfMonth ?? repeatDayOfMonth,
          endDate: persistableExercise.endDate ?? (repeatEndDate || undefined),
        },
        parsedDate
      );

      const savedRule = await saveRecurringRule({
        userId: persistableExercise.userId,
        exerciseId: normalizeExerciseId(persistableExercise),
        exerciseName: persistableExercise.name,
        exerciseType: resolveExerciseType(persistableExercise),
        routineName: persistableExercise.routineName,
        recurrenceType: schedule.recurrenceType,
        interval: schedule.interval,
        dayOfWeek: schedule.dayOfWeek,
        daysOfWeek: schedule.daysOfWeek,
        dayOfMonth: schedule.dayOfMonth,
        intervalWeeks: schedule.interval,
        startDate: parsedDate,
        endDate: schedule.endDate,
        templateSets: persistableExercise.sets,
        defaultMax: persistableExercise.max,
        defaultRest: persistableExercise.rest,
        active: true,
      });

      return {
        ...persistableExercise,
        isRepeating: true,
        ruleId: String(savedRule?._id ?? persistableExercise.ruleId ?? ""),
      } as ExerciseDraft;
    } else {
      const savedEntry = await saveWorkoutEntry(toWorkoutEntryPayload({
        ...persistableExercise,
        exerciseId: normalizeExerciseId(persistableExercise),
      }));

      return {
        ...persistableExercise,
        _id: savedEntry?.entryId ?? persistableExercise._id,
        entryInstanceId:
          savedEntry?.entryInstanceId ??
          persistableExercise.entryInstanceId ??
          persistableExercise._id,
      } as ExerciseDraft;
    }
  };

  // When an exercise is added, default it to one set and open the modal for editing.
  const handleAddExercise = async (exercise: ExerciseCatalogSelection) => {
    emitDevBugInteraction({
      type: "click",
      kind: "semantic",
      label: `Start adding exercise "${exercise?.name || "exercise"}"`,
      expected: "Exercise draft opens in the editor.",
      actual: `Preparing draft for ${exercise?.name || "exercise"}.`,
      status: "info",
    });
    const newExercise = await buildExerciseDraft(exercise);
    setSelectedExercise(newExercise);
    setOpenEditModal(true);
  };

  const handleQuickAddExercise = async (exercise: ExerciseCatalogSelection) => {
    emitDevBugInteraction({
      type: "click",
      kind: "semantic",
      label: `Quick add exercise "${exercise?.name || "exercise"}"`,
      expected: "Exercise is added to today's workout.",
      actual: `Building and saving ${exercise?.name || "exercise"}.`,
      status: "info",
    });
    const clientDraftId = `${normalizeExerciseId(exercise)}-${Date.now()}`;
    const baseExercise = {
      ...buildExerciseDraftFromDefaults(exercise),
      clientDraftId,
    };

    setExercises([...currentExercises, baseExercise]);

    try {
      const persistedExercise = await persistExercise(baseExercise);
      let nextExerciseIdentity = "";
      setExercises((prev) =>
        (Array.isArray(prev) ? prev : []).map((currentExercise) => {
          if (
            String(currentExercise?.clientDraftId ?? "") === clientDraftId
          ) {
            const nextExercise = {
              ...persistedExercise,
              clientDraftId,
              recommendationPending: baseExercise.recommendationPending,
            };
            nextExerciseIdentity = String(getWorkoutEntryIdentity(nextExercise));
            return nextExercise;
          }

          return currentExercise;
        })
      );
      setIsAddingExercise(false);
      if (nextExerciseIdentity) {
        onQuickAddComplete?.(nextExerciseIdentity);
      }
      refreshCalendarStatuses?.();
      void hydrateQuickAddRecommendation({
        ...persistedExercise,
        clientDraftId,
      });
    } catch (error) {
      setExercises((prev) =>
        (Array.isArray(prev) ? prev : []).filter(
          (currentExercise) =>
            String(currentExercise?.clientDraftId ?? "") !== clientDraftId
        )
      );
      console.error("Quick add failed", error);
      toast.error("This exercise was not added. Try again.");
    }
  };

  // When saving, call updateExercise so the parent can update the existing exercise.
  const handleSaveEdit = async (updatedExercise: ExerciseDraft) => {
    emitDevBugInteraction({
      type: "submit",
      kind: "semantic",
      label: `Save exercise "${updatedExercise?.name || "exercise"}"`,
      expected: "Edited exercise persists and appears in the workout.",
      actual: `Saving ${updatedExercise?.name || "exercise"}.`,
      status: "info",
    });
    const persistedExercise = await persistExercise(updatedExercise);
    setExercises((prev) => {
      const nextExercises = Array.isArray(prev) ? [...prev] : [];
      const existingIndex = nextExercises.findIndex(
        (exercise) =>
          String(exercise?.clientDraftId ?? "") ===
            String(persistedExercise?.clientDraftId ?? "") ||
          getWorkoutEntryIdentity(exercise) === getWorkoutEntryIdentity(persistedExercise)
      );

      if (existingIndex >= 0) {
        nextExercises[existingIndex] = persistedExercise;
        return nextExercises;
      }

      return [...nextExercises, persistedExercise];
    });
    refreshCalendarStatuses?.();
    setOpenEditModal(false);
    setIsAddingExercise(false);
  };

  const handleCancelEdit = () => {
    emitDevBugInteraction({
      type: "click",
      kind: "semantic",
      label: "Cancel exercise edit",
      expected: "Exercise editor closes without saving.",
      actual: "Exercise editor was closed.",
      status: "info",
    });
    setOpenEditModal(false);
    setIsAddingExercise(false);
  };

  return (
    <>
      <ExerciseSelector
        darkMode={darkMode}
        isRecurring={isRecurring}
        setIsRecurring={setIsRecurring}
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
        userId={userId}
        currentWorkoutTitle={currentWorkoutTitle}
        currentExercises={currentExercises}
        addExerciseToWorkout={handleAddExercise} // delegate add handler
        quickAddExerciseToWorkout={handleQuickAddExercise}
        setIsAddingExercise={setIsAddingExercise}
      />

      <Dialog
        open={openEditModal}
        onClose={handleCancelEdit}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            maxHeight: "calc(100vh - 48px)",
            display: "flex",
          },
        }}
      >
        <DialogTitle>Edit Exercise</DialogTitle>
        <DialogContent
          sx={{
            p: 2,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {selectedExercise && (
            <ExerciseEditItem
              index={index}
              exercise={selectedExercise}
              onSave={handleSaveEdit}
              onCancel={handleCancelEdit}
              darkMode={darkMode}
              isValid={true}
              preferredUnits={preferredUnits}
              autoFocusWeight={true} // instruct child to autofocus on first weight input
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ExerciseManager;
