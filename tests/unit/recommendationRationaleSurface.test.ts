import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("recommendation rationale and history surfaces", () => {
  it("keeps recommendation rationale, feedback, and history controls visible in the exercise flow", () => {
    const feedbackPanelsSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "components",
        "exercise-item",
        "ExerciseFeedbackPanels.tsx"
      ),
      "utf8"
    );
    const exerciseItemSource = fs.readFileSync(
      path.join(process.cwd(), "components", "ExerciseItem.tsx"),
      "utf8"
    );
    const historyDialogSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "components",
        "exercise-item",
        "ExerciseHistoryDialog.tsx"
      ),
      "utf8"
    );

    expect(feedbackPanelsSource).toContain("Why the app picked this");
    expect(feedbackPanelsSource).toContain("How did this recommendation feel?");
    expect(feedbackPanelsSource).toContain("Too easy");
    expect(feedbackPanelsSource).toContain("About right");
    expect(feedbackPanelsSource).toContain("Too hard");
    expect(feedbackPanelsSource).toContain("View history");

    expect(exerciseItemSource).toContain("saveExerciseRecommendationFeedback");
    expect(exerciseItemSource).toContain("ExerciseHistoryDialog");

    expect(historyDialogSource).toContain("history");
    expect(historyDialogSource).toContain("Recent sessions");
    expect(historyDialogSource).toContain("Estimated strength");
  });
});
