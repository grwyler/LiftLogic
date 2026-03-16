import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { buildMilestoneSummary } from "../../utils/milestones";

describe("milestone celebrations", () => {
  it("awards workout-count, consistency, volume, and comeback milestones once per threshold", () => {
    const summary = buildMilestoneSummary({
      currentDate: new Date("2026-03-18T09:00:00.000Z"),
      weeklyTarget: 2,
      entries: [
        {
          userId: "user-1",
          exerciseId: "squat",
          routineName: "Strength",
          date: new Date("2026-03-01T09:00:00.000Z"),
          complete: true,
          sets: [{ name: "Set 1", complete: true, actualWeight: 225, actualReps: 3 }],
        },
        {
          userId: "user-1",
          exerciseId: "bench",
          routineName: "Strength",
          date: new Date("2026-03-03T09:00:00.000Z"),
          complete: true,
          sets: [{ name: "Set 1", complete: true, actualWeight: 185, actualReps: 5 }],
        },
        {
          userId: "user-1",
          exerciseId: "row",
          routineName: "Strength",
          date: new Date("2026-03-10T09:00:00.000Z"),
          complete: true,
          sets: [{ name: "Set 1", complete: true, actualWeight: 135, actualReps: 8 }],
        },
        {
          userId: "user-1",
          exerciseId: "deadlift",
          routineName: "Strength",
          date: new Date("2026-03-18T09:00:00.000Z"),
          complete: true,
          sets: [{ name: "Set 1", complete: true, actualWeight: 275, actualReps: 4 }],
        },
      ] as any,
    });

    const categories = summary.unlocked.map((milestone) => milestone.category);
    expect(categories).toContain("workout_count");
    expect(categories).toContain("consistency");
    expect(categories).toContain("training_volume");
    expect(categories).toContain("comeback");
    expect(summary.unlocked.filter((milestone) => milestone.id === "workout_count:1")).toHaveLength(1);
    expect(summary.recentlyUnlocked.length).toBeGreaterThan(0);
  });

  it("renders both milestone celebrations and milestone history in the workout flow", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "WorkoutDisplay.tsx"),
      "utf8"
    );

    expect(source).toContain("Milestone Unlocked");
    expect(source).toContain("Progress earned a marker today");
    expect(source).toContain("Long-term progress, kept visible");
    expect(source).toContain("Milestones are awarded once per threshold");
    expect(source).toContain("Workout count");
    expect(source).toContain("Consistency");
    expect(source).toContain("Training volume");
    expect(source).toContain("Comeback win");
  });
});
