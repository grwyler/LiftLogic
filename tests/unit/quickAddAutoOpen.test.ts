import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("quick add auto-open flow", () => {
  it("opens the newly added exercise after quick add completes", () => {
    const managerSource = fs.readFileSync(
      path.join(process.cwd(), "components", "ExerciseManager.tsx"),
      "utf8"
    );
    const workoutsManagerSource = fs.readFileSync(
      path.join(process.cwd(), "components", "WorkoutsManager.tsx"),
      "utf8"
    );
    const workoutDisplaySource = fs.readFileSync(
      path.join(process.cwd(), "components", "WorkoutDisplay.tsx"),
      "utf8"
    );

    expect(managerSource).toContain("onQuickAddComplete?.(nextExerciseIdentity)");
    expect(managerSource).toContain("setIsAddingExercise(false);");
    expect(workoutsManagerSource).toContain("lastQuickAddedExerciseIdentity");
    expect(workoutsManagerSource).toContain("onQuickAddComplete={(exerciseIdentity) => {");
    expect(workoutDisplaySource).toContain("setCurrentExerciseIndex(reopenedExerciseIndex);");
  });

  it("focuses the first incomplete set when the exercise opens", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "ExerciseItem.tsx"),
      "utf8"
    );

    expect(source).toContain("if (!isOpen) {");
    expect(source).toContain("const nextSetIndex = exercise.sets.findIndex((s) => !s.complete);");
    expect(source).toContain("setCurrentSetIndex(nextSetIndex !== -1 ? nextSetIndex : 0);");
  });
});
