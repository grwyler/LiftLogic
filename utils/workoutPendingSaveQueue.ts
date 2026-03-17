import {
  WorkoutEntryApiRequest,
  WorkoutEntryApiResponse,
  WorkoutEntryDoc,
} from "./types";

const PENDING_WORKOUT_SAVE_QUEUE_KEY = "lift-logic:pending-workout-save-queue";

export type PendingWorkoutSaveRecord = {
  identity: string;
  entry: WorkoutEntryDoc;
  queuedAt: string;
  retryCount: number;
  lastError?: string;
};

export type PendingWorkoutSaveFlushResult = {
  flushedCount: number;
  failedCount: number;
  remainingCount: number;
};

const getStorage = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
};

const parsePendingQueue = (value: string | null): PendingWorkoutSaveRecord[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writePendingQueue = (queue: PendingWorkoutSaveRecord[]) => {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  if (queue.length === 0) {
    storage.removeItem(PENDING_WORKOUT_SAVE_QUEUE_KEY);
    return;
  }

  storage.setItem(PENDING_WORKOUT_SAVE_QUEUE_KEY, JSON.stringify(queue));
};

export const buildPendingWorkoutSaveIdentity = (entry: WorkoutEntryDoc) =>
  [
    String(entry.entryInstanceId ?? entry._id ?? "").trim(),
    String(entry.exerciseId ?? "").trim(),
    String(entry.routineName ?? "").trim(),
    String(entry.date ?? "").trim(),
  ].join("::");

export const readPendingWorkoutSaveQueue = (): PendingWorkoutSaveRecord[] => {
  const storage = getStorage();
  if (!storage) {
    return [];
  }

  return parsePendingQueue(storage.getItem(PENDING_WORKOUT_SAVE_QUEUE_KEY));
};

export const removePendingWorkoutSave = (entry: WorkoutEntryDoc) => {
  const identity = buildPendingWorkoutSaveIdentity(entry);
  const nextQueue = readPendingWorkoutSaveQueue().filter(
    (record) => record.identity !== identity
  );
  writePendingQueue(nextQueue);
};

export const enqueuePendingWorkoutSave = (entry: WorkoutEntryDoc) => {
  const identity = buildPendingWorkoutSaveIdentity(entry);
  const queue = readPendingWorkoutSaveQueue();
  const existingRecord = queue.find((record) => record.identity === identity);
  const nextRecord: PendingWorkoutSaveRecord = {
    identity,
    entry,
    queuedAt: existingRecord?.queuedAt ?? new Date().toISOString(),
    retryCount: existingRecord ? existingRecord.retryCount + 1 : 0,
    lastError: existingRecord?.lastError,
  };
  const nextQueue = [
    ...queue.filter((record) => record.identity !== identity),
    nextRecord,
  ];
  writePendingQueue(nextQueue);
  return { queueLength: nextQueue.length };
};

export const isOfflineWorkoutSaveError = (error: unknown) => {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return true;
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : "";

  if (!message) {
    return false;
  }

  const normalized = message.toLowerCase();
  return (
    normalized.includes("failed to fetch") ||
    normalized.includes("networkerror") ||
    normalized.includes("network request failed") ||
    normalized.includes("load failed") ||
    normalized.includes("offline")
  );
};

const persistPendingWorkoutEntry = async (
  entry: WorkoutEntryDoc
): Promise<WorkoutEntryApiResponse> => {
  const response = await fetch("/api/workoutEntry", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ entry } satisfies WorkoutEntryApiRequest),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`saveWorkoutEntry ${response.status}: ${message}`);
  }

  return response.json() as Promise<WorkoutEntryApiResponse>;
};

export const persistWorkoutEntryWithOfflineQueue = async ({
  entry,
  persistEntry,
}: {
  entry: WorkoutEntryDoc;
  persistEntry: (entry: WorkoutEntryDoc) => Promise<WorkoutEntryApiResponse>;
}): Promise<WorkoutEntryApiResponse> => {
  try {
    const response = await persistEntry(entry);
    removePendingWorkoutSave(entry);
    return response;
  } catch (error) {
    if (!isOfflineWorkoutSaveError(error)) {
      throw error;
    }

    const { queueLength } = enqueuePendingWorkoutSave(entry);
    return {
      message: "Queued workout entry save for retry.",
      entryId: String(entry._id ?? entry.entryInstanceId ?? entry.exerciseId ?? "queued"),
      entryInstanceId: String(entry.entryInstanceId ?? entry._id ?? ""),
      updatedAt: entry.updatedAt,
      queued: true,
      queueLength,
    };
  }
};

export const flushPendingWorkoutSaveQueue = async ({
  persistEntry = persistPendingWorkoutEntry,
}: {
  persistEntry?: (entry: WorkoutEntryDoc) => Promise<WorkoutEntryApiResponse>;
} = {}): Promise<PendingWorkoutSaveFlushResult> => {
  const queue = readPendingWorkoutSaveQueue();
  if (queue.length === 0) {
    return {
      flushedCount: 0,
      failedCount: 0,
      remainingCount: 0,
    };
  }

  let flushedCount = 0;
  let failedCount = 0;
  const remaining: PendingWorkoutSaveRecord[] = [];

  for (const record of queue) {
    try {
      await persistEntry(record.entry);
      flushedCount += 1;
    } catch (error) {
      failedCount += 1;
      remaining.push({
        ...record,
        retryCount: record.retryCount + 1,
        lastError: error instanceof Error ? error.message : "Unknown queue sync failure.",
      });
    }
  }

  writePendingQueue(remaining);

  return {
    flushedCount,
    failedCount,
    remainingCount: remaining.length,
  };
};
