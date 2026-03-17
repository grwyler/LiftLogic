import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("routines semantic color system", () => {
  it("defines distinct tones for success, warning, danger, info, premium, and active workout states", () => {
    const semanticSource = fs.readFileSync(
      path.join(process.cwd(), "utils", "routinesSemanticStyles.ts"),
      "utf8"
    );

    expect(semanticSource).toContain("success:");
    expect(semanticSource).toContain("warning:");
    expect(semanticSource).toContain("danger:");
    expect(semanticSource).toContain("info:");
    expect(semanticSource).toContain("premium:");
    expect(semanticSource).toContain("activeWorkout:");
    expect(semanticSource).toContain("primaryAction:");
    expect(semanticSource).toContain('solid: "#b7791f"');
    expect(semanticSource).toContain('solid: "#2563eb"');
  });

  it("applies semantic helpers across the routines surfaces", () => {
    const pageSource = fs.readFileSync(
      path.join(process.cwd(), "pages", "routines.tsx"),
      "utf8"
    );
    const displaySource = fs.readFileSync(
      path.join(process.cwd(), "components", "WorkoutDisplay.tsx"),
      "utf8"
    );
    const daySwitcherSource = fs.readFileSync(
      path.join(process.cwd(), "components", "DaySwitcher.tsx"),
      "utf8"
    );
    const exerciseSource = fs.readFileSync(
      path.join(process.cwd(), "components", "ExerciseItem.tsx"),
      "utf8"
    );

    expect(pageSource).toContain("buildRoutineSemanticSelectableChipSx(");
    expect(pageSource).toContain('buildRoutineSemanticPanelSx("premium", darkMode)');
    expect(pageSource).toContain(
      'plannerGenerationEnabled ? "primaryAction" : "premium"'
    );
    expect(displaySource).toContain(
      'buildRoutineSemanticPanelSx("activeWorkout", darkMode)'
    );
    expect(daySwitcherSource).toContain(
      'buildRoutineSemanticDotSx("activeWorkout")'
    );
    expect(exerciseSource).toContain(
      'buildRoutineSemanticIconButtonSx("premium", isRepeating, darkMode)'
    );
  });
});
