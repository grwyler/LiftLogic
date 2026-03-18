import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("completed set editing flow", () => {
  it("lets completed workout summaries reopen logged sets in the workout flow", () => {
    const exerciseItemSource = fs.readFileSync(
      path.join(process.cwd(), "components", "ExerciseItem.tsx"),
      "utf8"
    );
    const completedSetSource = fs.readFileSync(
      path.join(process.cwd(), "components", "CompletedSetItem.tsx"),
      "utf8"
    );

    expect(exerciseItemSource).toContain(
      "Tap a logged set to reopen it and correct any weight, reps, timing, or notes."
    );
    expect(exerciseItemSource).toContain("onActivate={() => {");
    expect(exerciseItemSource).toContain("setCurrentExerciseIndex(exerciseIndex);");
    expect(exerciseItemSource).toContain("<ExerciseLoggingDialog");
    expect(completedSetSource).toContain("onActivate?.();");
  });
});
