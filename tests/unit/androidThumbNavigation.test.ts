import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("android thumb-first navigation", () => {
  it("keeps primary workout actions in a mobile bottom dock", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "WorkoutDisplay.tsx"),
      "utf8"
    );

    expect(source).toContain('const mobilePrimaryAction = !hasExercises');
    expect(source).toContain('display: { xs: "inline-flex", sm: "none" }');
    expect(source).toContain("Next Set");
    expect(source).toContain('display: { xs: "none", sm: "inline-flex" }');
  });

  it("adds thumb-reachable logging actions inside the full-screen exercise flow", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "exercise-item", "ExerciseLoggingDialog.tsx"),
      "utf8"
    );

    expect(source).toContain('display: { xs: "block", sm: "none" }');
    expect(source).toContain('position: "sticky"');
    expect(source).toContain("Back");
    expect(source).toContain("Add Set");
    expect(source).toContain("Repeat Lift");
  });

  it("stacks the routines program-management actions into mobile-friendly full-width controls", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "routines.tsx"),
      "utf8"
    );

    expect(source).toContain('direction={{ xs: "column", sm: "row" }}');
    expect(source.match(/fullWidth/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(source).toContain('width: { xs: "100%", md: "auto" }');
  });

  it("keeps the workout day picker in a compact header by default on mobile", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "DaySwitcher.tsx"),
      "utf8"
    );

    expect(source).toContain("Workout Schedule");
    expect(source).toContain("Pick a day");
    expect(source).toContain("Hide calendar");
  });
});
