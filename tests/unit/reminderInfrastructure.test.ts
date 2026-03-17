import { describe, expect, it } from "vitest";
import {
  buildReminderLocalDateKey,
  hasRecentWorkoutCompletion,
  isWithinQuietHours,
  normalizeReminderPreferences,
  shouldDeliverComebackNudge,
  shouldDeliverScheduledWorkoutReminder,
} from "../../utils/reminders";
import { WorkoutEntryDoc } from "../../utils/types";

const buildCompletedEntry = (date: string): WorkoutEntryDoc => ({
  userId: "user-1",
  exerciseId: "exercise-1",
  routineName: "Monday Workout",
  date: new Date(date),
  complete: true,
  sets: [],
});

describe("reminder infrastructure", () => {
  it("normalizes reminder preferences with safe defaults", () => {
    expect(
      normalizeReminderPreferences(
        {
          enabled: true,
          scheduledWorkoutReminderDays: ["Mon", "Wed", "nope"],
          comebackThresholdDays: "5",
        },
        "America/New_York"
      )
    ).toMatchObject({
      enabled: true,
      scheduledWorkoutReminderTime: "18:00",
      scheduledWorkoutReminderDays: ["Mon", "Wed"],
      comebackThresholdDays: 5,
      timezone: "America/New_York",
      deliveryChannel: "in_app",
    });
  });

  it("detects overnight quiet hours correctly", () => {
    const preferences = normalizeReminderPreferences(
      {
        enabled: true,
        quietHoursStart: "21:30",
        quietHoursEnd: "07:00",
        timezone: "UTC",
      },
      "UTC"
    );

    expect(
      isWithinQuietHours({
        now: new Date("2026-03-17T22:15:00.000Z"),
        preferences,
      })
    ).toBe(true);
    expect(
      isWithinQuietHours({
        now: new Date("2026-03-17T12:15:00.000Z"),
        preferences,
      })
    ).toBe(false);
  });

  it("suppresses scheduled reminders when a recent workout was completed", () => {
    const preferences = normalizeReminderPreferences(
      {
        enabled: true,
        scheduledWorkoutRemindersEnabled: true,
        scheduledWorkoutReminderTime: "18:00",
        scheduledWorkoutReminderDays: ["Tue"],
        timezone: "UTC",
      },
      "UTC"
    );

    const now = new Date("2026-03-17T18:00:00.000Z");
    expect(
      hasRecentWorkoutCompletion({
        entries: [buildCompletedEntry("2026-03-17T09:30:00.000Z")],
        now,
      })
    ).toBe(true);
    expect(
      shouldDeliverScheduledWorkoutReminder({
        preferences,
        entries: [buildCompletedEntry("2026-03-17T09:30:00.000Z")],
        now,
      })
    ).toBe(false);
  });

  it("delivers scheduled reminders and comeback nudges from explicit trigger rules", () => {
    const preferences = normalizeReminderPreferences(
      {
        enabled: true,
        scheduledWorkoutRemindersEnabled: true,
        scheduledWorkoutReminderTime: "18:00",
        scheduledWorkoutReminderDays: ["Tue"],
        comebackNudgesEnabled: true,
        comebackThresholdDays: 4,
        timezone: "UTC",
      },
      "UTC"
    );

    const now = new Date("2026-03-17T18:00:00.000Z");
    expect(
      shouldDeliverScheduledWorkoutReminder({
        preferences,
        entries: [],
        now,
      })
    ).toBe(true);
    expect(
      shouldDeliverComebackNudge({
        preferences,
        entries: [buildCompletedEntry("2026-03-10T18:00:00.000Z")],
        now,
      })
    ).toBe(true);
    expect(buildReminderLocalDateKey(now, "UTC")).toBe("2026-03-17");
  });
});
