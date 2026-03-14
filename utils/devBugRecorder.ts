type DevBugInteractionType =
  | "click"
  | "change"
  | "submit"
  | "navigation"
  | "lifecycle";

type DevBugInteractionPayload = {
  type: DevBugInteractionType;
  page?: string;
  kind?: "raw" | "semantic";
  target?: string;
  value?: string;
  detail?: string;
  label?: string;
  expected?: string;
  actual?: string;
  status?: "info" | "success" | "failure";
};

type DevBugErrorPayload = {
  source: "window-error" | "unhandled-rejection" | "console-error";
  page?: string;
  message: string;
  detail?: string;
};

type PendingLogAttempt = {
  exerciseId?: string;
  ruleId?: string;
  routineName?: string;
  exerciseName: string;
  setName: string;
  expectedCompletedCount: number;
  expectedTotalCount: number;
  persistedAt?: string;
};

const interactionEventName = "liftlogic:dev-bug-interaction";
const errorEventName = "liftlogic:dev-bug-error";
const pendingLogAttemptKey = "liftlogic-dev-bug-pending-log-attempt";

const dispatchRecorderEvent = (eventName: string, detail: unknown) => {
  if (typeof window === "undefined" || process.env.NODE_ENV === "production") {
    return;
  }

  window.dispatchEvent(new CustomEvent(eventName, { detail }));
};

export const emitDevBugInteraction = (payload: DevBugInteractionPayload) => {
  dispatchRecorderEvent(interactionEventName, payload);
};

export const emitDevBugError = (payload: DevBugErrorPayload) => {
  dispatchRecorderEvent(errorEventName, payload);
};

export const DEV_BUG_INTERACTION_EVENT = interactionEventName;
export const DEV_BUG_ERROR_EVENT = errorEventName;

const readPendingLogAttempt = (): PendingLogAttempt | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(pendingLogAttemptKey);
    return raw ? (JSON.parse(raw) as PendingLogAttempt) : null;
  } catch {
    return null;
  }
};

export const setPendingLogAttempt = (attempt: PendingLogAttempt) => {
  if (typeof window === "undefined" || process.env.NODE_ENV === "production") {
    return;
  }

  window.sessionStorage.setItem(pendingLogAttemptKey, JSON.stringify(attempt));
};

export const markPendingLogAttemptPersisted = () => {
  const pending = readPendingLogAttempt();
  if (!pending || typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    pendingLogAttemptKey,
    JSON.stringify({
      ...pending,
      persistedAt: new Date().toISOString(),
    })
  );
};

export const clearPendingLogAttempt = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(pendingLogAttemptKey);
};

export const reconcilePendingLogAttempt = (exercises: any[]) => {
  const pending = readPendingLogAttempt();
  if (!pending?.persistedAt) {
    return;
  }

  const matchedExercise = (exercises ?? []).find((exercise) => {
    const exerciseId = String(exercise?.exerciseId ?? exercise?._id ?? "").trim();
    const ruleId = String(exercise?.ruleId ?? "").trim();

    return (
      (pending.ruleId && ruleId === pending.ruleId) ||
      (pending.exerciseId && exerciseId === pending.exerciseId) ||
      exercise?.name === pending.exerciseName
    );
  });

  if (!matchedExercise) {
    emitDevBugInteraction({
      type: "lifecycle",
      kind: "semantic",
      label: `Set did not stay logged for ${pending.exerciseName}`,
      expected: `Completed set count reaches ${pending.expectedCompletedCount}/${pending.expectedTotalCount}.`,
      actual: "The refreshed workout data did not include the expected exercise.",
      status: "failure",
    });
    clearPendingLogAttempt();
    return;
  }

  const completedCount =
    matchedExercise?.sets?.filter((set: any) => set.complete).length ?? 0;
  const totalCount = matchedExercise?.sets?.length ?? 0;
  const isSuccess = completedCount >= pending.expectedCompletedCount;

  emitDevBugInteraction({
    type: "lifecycle",
    kind: "semantic",
    label: isSuccess
      ? `Set remained logged for ${pending.exerciseName}`
      : `Set did not stay logged for ${pending.exerciseName}`,
    expected: `Completed set count reaches ${pending.expectedCompletedCount}/${pending.expectedTotalCount}.`,
    actual: `After syncing, completed set count is ${completedCount}/${totalCount}.`,
    status: isSuccess ? "success" : "failure",
  });
  clearPendingLogAttempt();
};

export const emitDevBugRequest = ({
  label,
  expected,
  actual,
  status = "info",
  page,
}: {
  label: string;
  expected?: string;
  actual?: string;
  status?: "info" | "success" | "failure";
  page?: string;
}) => {
  emitDevBugInteraction({
    type: "lifecycle",
    kind: "semantic",
    label,
    expected,
    actual,
    status,
    page,
  });
};
