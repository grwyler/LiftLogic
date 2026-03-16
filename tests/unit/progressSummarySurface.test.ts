import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { getProgressTrendHighlight } from "../../utils/performance";

describe("progress summary surface", () => {
  it("classifies recent progress against the last workout with neutral trend copy", () => {
    const upTrend = getProgressTrendHighlight(
      {
        latestEstimated1RM: 255,
        previousEstimated1RM: 245,
        bestEstimated1RMEver: 255,
        heaviestWeightEver: 225,
        bestRepPerformance: { weight: 225, reps: 5 },
        latestWorkoutBrokePR: true,
        latestWorkoutPRCategories: ["estimated_1rm"],
        previousHeaviestWeight: 215,
        previousBestRepPerformance: { weight: 215, reps: 5 },
      },
      "lb"
    );

    const downTrend = getProgressTrendHighlight(
      {
        latestEstimated1RM: 235,
        previousEstimated1RM: 245,
        bestEstimated1RMEver: 255,
        heaviestWeightEver: 225,
        bestRepPerformance: { weight: 225, reps: 5 },
        latestWorkoutBrokePR: false,
        latestWorkoutPRCategories: [],
        previousHeaviestWeight: 225,
        previousBestRepPerformance: { weight: 225, reps: 5 },
      },
      "lb"
    );

    expect(upTrend).toMatchObject({
      status: "up",
      label: "Trending up",
    });
    expect(upTrend?.benchmark).toContain("vs last workout");
    expect(downTrend).toMatchObject({
      status: "down",
      label: "Lighter than last time",
    });
    expect(downTrend?.detail).toContain("not failure");
  });

  it("renders a routines-level progress summary that answers what improved recently", () => {
    const workoutSource = fs.readFileSync(
      path.join(process.cwd(), "components", "WorkoutDisplay.tsx"),
      "utf8"
    );
    const performanceSource = fs.readFileSync(
      path.join(process.cwd(), "utils", "performance.ts"),
      "utf8"
    );

    expect(workoutSource).toContain("Progress Summary");
    expect(workoutSource).toContain("What improved recently?");
    expect(workoutSource).toContain("steady");
    expect(workoutSource).toContain("reset");
    expect(performanceSource).toContain("vs last workout");
  });
});
