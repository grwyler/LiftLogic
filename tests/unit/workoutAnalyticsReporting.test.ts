import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { buildTrainingAnalyticsSummary } from "../../utils/workoutAnalytics";

describe("workout analytics reporting", () => {
  it("builds weekly and monthly rollups for completed work, planned work, and muscle balance", () => {
    const summary = buildTrainingAnalyticsSummary({
      currentDate: new Date("2026-03-17T12:00:00.000Z"),
      period: "week",
      preferredUnits: "lb",
      statusMap: {
        "2026-03-15": {
          hasLogged: true,
          hasCompleted: true,
          hasRecurring: true,
          exerciseCount: 3,
        },
        "2026-03-16": {
          hasLogged: true,
          hasCompleted: true,
          hasRecurring: true,
          exerciseCount: 2,
        },
        "2026-03-17": {
          hasLogged: false,
          hasCompleted: false,
          hasRecurring: true,
          exerciseCount: 3,
        },
      },
      entries: [
        {
          userId: "user-1",
          exerciseId: "bench-press",
          name: "Bench Press",
          routineName: "Monday Workout",
          date: new Date("2026-03-15T12:00:00.000Z"),
          sets: [
            {
              name: "Working Set 1",
              complete: true,
              reps: 5,
              actualReps: 5,
              weight: 185,
              actualWeight: 185,
            },
            {
              name: "Working Set 2",
              complete: true,
              reps: 5,
              actualReps: 5,
              weight: 185,
              actualWeight: 185,
            },
          ],
        },
        {
          userId: "user-1",
          exerciseId: "barbell-row",
          name: "Barbell Row",
          routineName: "Monday Workout",
          date: new Date("2026-03-16T12:00:00.000Z"),
          sets: [
            {
              name: "Working Set 1",
              complete: true,
              reps: 8,
              actualReps: 8,
              weight: 135,
              actualWeight: 135,
            },
          ],
        },
      ],
    });

    expect(summary.period).toBe("week");
    expect(summary.completedWorkouts).toBe(2);
    expect(summary.plannedWorkouts).toBe(3);
    expect(summary.totalSets).toBe(3);
    expect(summary.totalVolume).toBeGreaterThan(0);
    expect(summary.consistencyRate).toBeGreaterThan(0);
    expect(summary.muscleDistribution.length).toBeGreaterThan(0);
  });

  it("renders weekly and monthly analytics inside the workout insights surface", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "workout-display", "WorkoutSecondaryInsights.tsx"),
      "utf8"
    );

    expect(source).toContain("Training Analytics");
    expect(source).toContain("Weekly");
    expect(source).toContain("Monthly");
    expect(source).toContain("Muscle balance");
    expect(source).toContain("Lift trend watch");
  });
});
