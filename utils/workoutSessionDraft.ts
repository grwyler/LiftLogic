const STORAGE_KEY = "lift-logic:workout-session-drafts";

export type WorkoutSessionDraft = {
  version: 1;
  userId: string;
  dateISO: string;
  routineName: string;
  currentExerciseIndex: number;
  isAddingExercise: boolean;
  exercises: any[];
  savedAt: string;
};

const canUseStorage = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const getDraftKey = (draft: Pick<WorkoutSessionDraft, "userId" | "dateISO" | "routineName">) =>
  `${draft.userId}::${draft.dateISO}::${draft.routineName}`;

const readDraftMap = (): Record<string, WorkoutSessionDraft> => {
  if (!canUseStorage()) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, WorkoutSessionDraft>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeDraftMap = (drafts: Record<string, WorkoutSessionDraft>) => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
};

const hasLoggedSetData = (exercise: any) =>
  (exercise?.sets || []).some((set: any) => {
    if (set?.complete) {
      return true;
    }

    return [
      set?.actualReps,
      set?.actualWeight,
      set?.actualSeconds,
      set?.actualMinutes,
      set?.actualHours,
    ].some((value) => value !== undefined && value !== null && value !== "");
  });

export const shouldPersistWorkoutSessionDraft = ({
  exercises,
  currentExerciseIndex,
  isAddingExercise,
}: {
  exercises: any[];
  currentExerciseIndex: number;
  isAddingExercise: boolean;
}) =>
  Boolean(
    isAddingExercise ||
      currentExerciseIndex >= 0 ||
      (Array.isArray(exercises) && exercises.some((exercise) => hasLoggedSetData(exercise)))
  );

export const saveWorkoutSessionDraft = (draft: WorkoutSessionDraft) => {
  const drafts = readDraftMap();
  drafts[getDraftKey(draft)] = draft;
  writeDraftMap(drafts);
};

export const readWorkoutSessionDraft = ({
  userId,
  dateISO,
  routineName,
}: {
  userId: string;
  dateISO: string;
  routineName: string;
}) => readDraftMap()[getDraftKey({ userId, dateISO, routineName })] || null;

export const readLatestWorkoutSessionDraftForUser = (userId: string) => {
  const drafts = Object.values(readDraftMap()).filter((draft) => draft.userId === userId);

  return drafts.sort((left, right) => right.savedAt.localeCompare(left.savedAt))[0] || null;
};

export const discardWorkoutSessionDraft = ({
  userId,
  dateISO,
  routineName,
}: {
  userId: string;
  dateISO: string;
  routineName: string;
}) => {
  const drafts = readDraftMap();
  delete drafts[getDraftKey({ userId, dateISO, routineName })];
  writeDraftMap(drafts);
};
