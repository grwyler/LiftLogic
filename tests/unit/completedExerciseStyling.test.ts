import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("completed exercise styling", () => {
  it("uses explicit completed-state radius tokens instead of theme-multiplied numeric radii", () => {
    const exerciseItemSource = fs.readFileSync(
      path.join(process.cwd(), "components", "ExerciseItem.tsx"),
      "utf8"
    );
    const feedbackPanelsSource = fs.readFileSync(
      path.join(process.cwd(), "components", "exercise-item", "ExerciseFeedbackPanels.tsx"),
      "utf8"
    );
    const completedSetSource = fs.readFileSync(
      path.join(process.cwd(), "components", "CompletedSetItem.tsx"),
      "utf8"
    );
    const radiusTokensSource = fs.readFileSync(
      path.join(process.cwd(), "styles", "radiusTokens.ts"),
      "utf8"
    );

    expect(radiusTokensSource).toContain('panel: "28px"');
    expect(radiusTokensSource).toContain('card: "20px"');
    expect(exerciseItemSource).toContain("borderRadius: completedExerciseRadius.panel");
    expect(feedbackPanelsSource).toContain("borderRadius: completedExerciseRadius.section");
    expect(completedSetSource).toContain("card: radiusTokens.card");
    expect(completedSetSource).toContain("borderRadius: completedSetRadius.card");
  });
});
