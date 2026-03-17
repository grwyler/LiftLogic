import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  discardWorkoutSessionDraft,
  readLatestWorkoutSessionDraftForUser,
  readWorkoutSessionDraft,
  saveWorkoutSessionDraft,
  shouldPersistWorkoutSessionDraft,
} from "../../utils/workoutSessionDraft";

describe("workout session draft helpers", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists and reloads a workout draft by user, date, and routine name", () => {
    saveWorkoutSessionDraft({
      version: 1,
      userId: "user-1",
      dateISO: "2026-03-17",
      routineName: "Monday Workout",
      currentExerciseIndex: 2,
      isAddingExercise: false,
      exercises: [{ name: "Bench Press", sets: [{ complete: true }] }],
      savedAt: "2026-03-17T12:00:00.000Z",
    });

    expect(
      readWorkoutSessionDraft({
        userId: "user-1",
        dateISO: "2026-03-17",
        routineName: "Monday Workout",
      })
    ).toMatchObject({
      currentExerciseIndex: 2,
      routineName: "Monday Workout",
    });
  });

  it("discards only the targeted draft", () => {
    saveWorkoutSessionDraft({
      version: 1,
      userId: "user-1",
      dateISO: "2026-03-17",
      routineName: "Monday Workout",
      currentExerciseIndex: 0,
      isAddingExercise: false,
      exercises: [{ name: "Bench Press", sets: [{ complete: true }] }],
      savedAt: "2026-03-17T12:00:00.000Z",
    });
    saveWorkoutSessionDraft({
      version: 1,
      userId: "user-1",
      dateISO: "2026-03-18",
      routineName: "Tuesday Workout",
      currentExerciseIndex: 0,
      isAddingExercise: false,
      exercises: [{ name: "Squat", sets: [{ complete: true }] }],
      savedAt: "2026-03-18T12:00:00.000Z",
    });

    discardWorkoutSessionDraft({
      userId: "user-1",
      dateISO: "2026-03-17",
      routineName: "Monday Workout",
    });

    expect(
      readWorkoutSessionDraft({
        userId: "user-1",
        dateISO: "2026-03-17",
        routineName: "Monday Workout",
      })
    ).toBeNull();
    expect(
      readWorkoutSessionDraft({
        userId: "user-1",
        dateISO: "2026-03-18",
        routineName: "Tuesday Workout",
      })
    ).not.toBeNull();
  });

  it("returns the most recent draft for a user across dates", () => {
    saveWorkoutSessionDraft({
      version: 1,
      userId: "user-1",
      dateISO: "2026-03-17",
      routineName: "Monday Workout",
      currentExerciseIndex: 0,
      isAddingExercise: false,
      exercises: [{ name: "Bench Press", sets: [{ complete: true }] }],
      savedAt: "2026-03-17T12:00:00.000Z",
    });
    saveWorkoutSessionDraft({
      version: 1,
      userId: "user-1",
      dateISO: "2026-03-18",
      routineName: "Tuesday Workout",
      currentExerciseIndex: 1,
      isAddingExercise: true,
      exercises: [{ name: "Squat", sets: [{ complete: true }] }],
      savedAt: "2026-03-18T12:00:00.000Z",
    });

    expect(readLatestWorkoutSessionDraftForUser("user-1")?.routineName).toBe(
      "Tuesday Workout"
    );
  });

  it("only persists when there is meaningful in-progress workout state", () => {
    expect(
      shouldPersistWorkoutSessionDraft({
        exercises: [{ name: "Bench Press", sets: [{ complete: false, actualWeight: "" }] }],
        currentExerciseIndex: -1,
        isAddingExercise: false,
      })
    ).toBe(false);

    expect(
      shouldPersistWorkoutSessionDraft({
        exercises: [{ name: "Bench Press", sets: [{ complete: true }] }],
        currentExerciseIndex: -1,
        isAddingExercise: false,
      })
    ).toBe(true);
  });
});
