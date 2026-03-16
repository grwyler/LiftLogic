import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("quick add performance path", () => {
  it("inserts the exercise before waiting on progression history", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "ExerciseManager.tsx"),
      "utf8"
    );

    const insertIndex = source.indexOf("setExercises([...currentExercises, baseExercise]);");
    const progressIndex = source.indexOf("void hydrateQuickAddRecommendation({");

    expect(insertIndex).toBeGreaterThan(-1);
    expect(progressIndex).toBeGreaterThan(insertIndex);
    expect(source).toContain("recommendationPending: exerciseType === \"weight\",");
    expect(source).toContain("const progress = await fetchExerciseProgress(");
    expect(source).toContain("if (!canHydrateRecommendation(currentExercise, baseExercise)) {");
  });

  it("shows a lightweight pending state on the exercise row", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "ExerciseItem.tsx"),
      "utf8"
    );

    expect(source).toContain("currentExercise.recommendationPending");
    expect(source).toContain('label="Personalizing..."');
  });
});
