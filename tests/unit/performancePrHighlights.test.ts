import { describe, expect, it } from "vitest";
import {
  buildExerciseProgressSummary,
  getPersonalRecordHighlights,
} from "../../utils/performance";

describe("performance PR highlights", () => {
  it("categorizes distinct PR types for the latest workout", () => {
    const summary = buildExerciseProgressSummary([
      {
        userId: "user-1",
        exerciseId: "squat",
        routineName: "Leg Day",
        date: new Date("2026-03-15T10:00:00.000Z"),
        sets: [
          {
            name: "Working Set 1",
            complete: true,
            actualWeight: 205,
            actualReps: 8,
          },
        ],
      } as any,
      {
        userId: "user-1",
        exerciseId: "squat",
        routineName: "Leg Day",
        date: new Date("2026-03-08T10:00:00.000Z"),
        sets: [
          {
            name: "Working Set 1",
            complete: true,
            actualWeight: 185,
            actualReps: 6,
          },
        ],
      } as any,
    ]);

    expect(summary.latestWorkoutBrokePR).toBe(true);
    expect(summary.latestWorkoutPRCategories).toContain("estimated_1rm");
    expect(summary.latestWorkoutPRCategories).toContain("heaviest_weight");
    expect(summary.latestWorkoutPRCategories).toContain("rep_performance");

    const highlights = getPersonalRecordHighlights(summary, "lb");
    expect(highlights).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Estimated 1RM PR", detail: "259.7 lb" }),
        expect.objectContaining({ label: "Load PR", detail: "205 lb" }),
        expect.objectContaining({ label: "Rep PR", detail: "205 lb x 8" }),
      ])
    );
  });
});
