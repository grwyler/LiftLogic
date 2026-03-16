import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("completed exercise styling", () => {
  it("uses explicit completed-state radius tokens instead of theme-multiplied numeric radii", () => {
    const exerciseItemSource = fs.readFileSync(
      path.join(process.cwd(), "components", "ExerciseItem.tsx"),
      "utf8"
    );
    const completedSetSource = fs.readFileSync(
      path.join(process.cwd(), "components", "CompletedSetItem.tsx"),
      "utf8"
    );

    expect(exerciseItemSource).toContain('panel: "28px"');
    expect(exerciseItemSource).toContain('section: "22px"');
    expect(exerciseItemSource).toContain("borderRadius: completedExerciseRadius.panel");
    expect(exerciseItemSource).toContain("borderRadius: completedExerciseRadius.section");
    expect(completedSetSource).toContain('card: "20px"');
    expect(completedSetSource).toContain("borderRadius: completedSetRadius.card");
  });
});
