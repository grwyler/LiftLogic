import { useEffect, useRef, useState } from "react";
import { ensureExerciseSetIds } from "../../utils/exerciseSetIds";
import { toLocalDateKey } from "../../utils/helpers";

export const parseExerciseFormattedDate = (value: string): Date | null => {
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

export const normalizeExerciseRepeatEndDate = (value: unknown) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsed = new Date(value as string | number | Date);
  return Number.isNaN(parsed.getTime()) ? "" : toLocalDateKey(parsed);
};

export const useExerciseItemState = ({
  exercise,
  exerciseIdentity,
  formattedDate,
  isOpen,
}: {
  exercise: any;
  exerciseIdentity: string;
  formattedDate: string;
  isOpen: boolean;
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

  const syncRepeatScheduleState = (sourceExercise: any) => {
    const parsedDate = parseExerciseFormattedDate(formattedDate);
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
    setRepeatEndDate(normalizeExerciseRepeatEndDate(sourceExercise?.endDate));
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
      (currentExercise?.sets ?? []).findIndex((set: any) => !set.complete) ?? -1;
    setCurrentSetIndex(nextSetIndex >= 0 ? nextSetIndex : 0);
  }, [currentExercise?.sets, isOpen]);

  return {
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
  };
};
