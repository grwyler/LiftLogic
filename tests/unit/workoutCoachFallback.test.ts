import { describe, expect, it, vi } from "vitest";
import { defaultSetupForm } from "../../utils/profileSetup";
import { WorkoutCoachResponse } from "../../utils/workoutGeneration";
import {
  extractFallbackAction,
  extractFallbackPatch,
  normalizeCoachAction,
} from "../../utils/workoutCoachFallback";

const baseCoachResponse: WorkoutCoachResponse = {
  headline: "Your weekly plan",
  summary: "A simple four-day split.",
  openingMessage: "I mapped out a four-day plan.",
  plannedDays: ["Mon", "Tue", "Thu", "Sat"],
  planSnapshot: [
    {
      dayKey: "monday",
      dayLabel: "Monday",
      title: "Workout A",
      exerciseCount: 2,
      exercises: [],
    },
    {
      dayKey: "tuesday",
      dayLabel: "Tuesday",
      title: "Workout B",
      exerciseCount: 2,
      exercises: [],
    },
    {
      dayKey: "thursday",
      dayLabel: "Thursday",
      title: "Workout C",
      exerciseCount: 2,
      exercises: [],
    },
    {
      dayKey: "saturday",
      dayLabel: "Saturday",
      title: "Workout D",
      exerciseCount: 2,
      exercises: [],
    },
  ],
  why: [],
  tips: [],
  suggestedReplies: [],
};

describe("workout coach fallback patch parsing", () => {
  it("captures Saturday to Wednesday swaps", () => {
    const result = extractFallbackPatch(
      "Saturday workouts don't work for me. Can we swap that to wed instead?",
      {
        ...defaultSetupForm,
        workoutDaysPerWeek: "4",
        preferredTrainingDays: ["Mon", "Tue", "Thu", "Sat"],
      },
      baseCoachResponse
    );

    expect(result.preferredDaySwap).toEqual({
      fromDay: "Sat",
      toDay: "Wed",
      preferredTrainingDays: ["Mon", "Tue", "Thu", "Wed"],
    });
    expect(result.patch.preferredTrainingDays).toEqual([
      "Mon",
      "Tue",
      "Thu",
      "Wed",
    ]);
    expect(result.shouldRegeneratePlan).toBe(true);
  });

  it("captures 'instead of Saturday' phrasing", () => {
    const result = extractFallbackPatch(
      "Instead of Saturday I'd like to workout on wed",
      {
        ...defaultSetupForm,
        workoutDaysPerWeek: "4",
        preferredTrainingDays: ["Mon", "Tue", "Thu", "Sat"],
      },
      baseCoachResponse
    );

    expect(result.preferredDaySwap?.fromDay).toBe("Sat");
    expect(result.preferredDaySwap?.toDay).toBe("Wed");
    expect(result.patch.preferredTrainingDays).toEqual([
      "Mon",
      "Tue",
      "Thu",
      "Wed",
    ]);
    expect(result.shouldRegeneratePlan).toBe(true);
  });
});

describe("workout coach fallback action parsing", () => {
  it("parses clear-all-schedules requests", () => {
    expect(
      extractFallbackAction("unschedule all exercises please")
    ).toEqual({ type: "clear_all_schedules" });
  });

  it("parses remove-one-day-schedule requests", () => {
    expect(
      extractFallbackAction("Please remove the monday workout")
    ).toEqual({
      type: "remove_day_schedule",
      dayKey: "monday",
    });
  });

  it("parses recurring exercise creation requests", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-14T12:00:00.000Z"));

    const parsed = extractFallbackAction(
      "Schedule plank on monday this month"
    );
    const normalized = normalizeCoachAction(parsed);

    expect(normalized).toEqual({
      type: "create_recurring_exercise",
      exerciseName: "Plank",
      exerciseType: "timed",
      dayKey: "monday",
      recurrenceType: "weekly",
      endDate: "2026-03-31",
    });

    vi.useRealTimers();
  });
});
