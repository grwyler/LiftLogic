import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("strength metric clarity surface", () => {
  it("explains estimated strength, volume load, and PR meaning in workout surfaces", () => {
    const feedbackPanelsSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "components",
        "exercise-item",
        "ExerciseFeedbackPanels.tsx"
      ),
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
    const insightsSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "components",
        "workout-display",
        "WorkoutSecondaryInsights.tsx"
      ),
      "utf8"
    );

    expect(feedbackPanelsSource).toContain("Metric guide");
    expect(feedbackPanelsSource).toContain("A calculated max from your best logged weight and reps");
    expect(feedbackPanelsSource).toContain("Weight times reps across completed sets");
    expect(feedbackPanelsSource).toContain("A PR can mean estimated 1RM");
    expect(historyDialogSource).toContain("What the metrics mean");
    expect(insightsSource).toContain("Volume here means weight times reps across completed sets");
  });
});
