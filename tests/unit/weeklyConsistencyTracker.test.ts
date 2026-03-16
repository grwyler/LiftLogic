import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("weekly consistency tracker", () => {
  it("shows the weekly target, completion progress, and supportive status states in the workout flow", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "WorkoutDisplay.tsx"),
      "utf8"
    );

    expect(source).toContain("Weekly Consistency");
    expect(source).toContain('label="Weekly target"');
    expect(source).toContain("Goal hit");
    expect(source).toContain("Behind");
    expect(source).toContain("On track");
    expect(source).toContain("workouts this week");
    expect(source).toContain("scheduled");
    expect(source).toContain("remaining");
  });

  it("persists weekly target changes through the routines page without resetting history", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "routines.tsx"),
      "utf8"
    );

    expect(source).toContain("const handleWeeklyTargetChange = async");
    expect(source).toContain("workoutDaysPerWeek: nextTarget");
    expect(source).toContain("setUser((previous: any)");
    expect(source).toContain("setSetupForm((previous) => ({");
    expect(source).toContain("onWeeklyTargetChange={handleWeeklyTargetChange}");
  });
});
