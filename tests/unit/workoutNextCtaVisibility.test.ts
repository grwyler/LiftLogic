import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("workout next-step CTA visibility", () => {
  it("keeps the primary next-step summary visible whenever any incomplete exercise remains", () => {
    const displaySource = fs.readFileSync(
      path.join(process.cwd(), "components", "WorkoutDisplay.tsx"),
      "utf8"
    );
    const headerSource = fs.readFileSync(
      path.join(process.cwd(), "components", "workout-display", "WorkoutHeaderSummary.tsx"),
      "utf8"
    );

    expect(displaySource).toContain("const shouldShowNextSummary = Boolean(nextExercise);");
    expect(headerSource).toContain("{shouldShowNextSummary ? (");
    expect(headerSource).toContain("Open Next Set");
    expect(displaySource).not.toContain("plannedExercises.length > 1");
  });

  it("routes the CTA into the next incomplete set for the selected exercise", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "ExerciseItem.tsx"),
      "utf8"
    );

    expect(source).toContain("const nextSetIndex = exercise.sets.findIndex((s) => !s.complete);");
    expect(source).toContain("setCurrentSetIndex(nextSetIndex !== -1 ? nextSetIndex : 0);");
    expect(source).toContain('expected: "Exercise details open and the next set is ready to log."');
  });
});
