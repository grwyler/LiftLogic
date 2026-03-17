import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  enqueuePendingWorkoutSave,
  flushPendingWorkoutSaveQueue,
  persistWorkoutEntryWithOfflineQueue,
  readPendingWorkoutSaveQueue,
  removePendingWorkoutSave,
} from "../../utils/workoutPendingSaveQueue";
import { WorkoutEntryDoc } from "../../utils/types";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.has(key) ? this.values.get(key)! : null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  clear() {
    this.values.clear();
  }
}

const buildEntry = (overrides: Partial<WorkoutEntryDoc> = {}): WorkoutEntryDoc =>
  ({
    _id: "entry-1",
    entryInstanceId: "entry-1",
    userId: "user-1",
    exerciseId: "exercise-1",
    name: "Bench Press",
    type: "weight",
    routineName: "Monday Workout",
    date: "2026-03-17",
    rest: 90,
    complete: false,
    sets: [],
    ...overrides,
  }) as WorkoutEntryDoc;

describe("workout pending save queue", () => {
  beforeEach(() => {
    const storage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { onLine: true },
    });
    storage.clear();
  });

  it("replaces older queued saves for the same workout entry identity", () => {
    enqueuePendingWorkoutSave(buildEntry({ sets: [{ name: "Working Set 1" }] as any[] }));
    enqueuePendingWorkoutSave(
      buildEntry({ sets: [{ name: "Working Set 1" }, { name: "Working Set 2" }] as any[] })
    );

    const queue = readPendingWorkoutSaveQueue();

    expect(queue).toHaveLength(1);
    expect(queue[0]?.entry.sets).toHaveLength(2);
    expect(queue[0]?.retryCount).toBe(1);
  });

  it("queues recoverable network failures instead of throwing them back to the workout flow", async () => {
    const response = await persistWorkoutEntryWithOfflineQueue({
      entry: buildEntry(),
      persistEntry: vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    });

    expect(response.queued).toBe(true);
    expect(readPendingWorkoutSaveQueue()).toHaveLength(1);
  });

  it("flushes queued saves and clears them once persistence succeeds", async () => {
    const entry = buildEntry();
    enqueuePendingWorkoutSave(entry);

    const result = await flushPendingWorkoutSaveQueue({
      persistEntry: vi.fn().mockResolvedValue({
        message: "saved",
        entryId: "entry-1",
      }),
    });

    expect(result.flushedCount).toBe(1);
    expect(result.remainingCount).toBe(0);
    expect(readPendingWorkoutSaveQueue()).toHaveLength(0);

    removePendingWorkoutSave(entry);
    expect(readPendingWorkoutSaveQueue()).toHaveLength(0);
  });
});
