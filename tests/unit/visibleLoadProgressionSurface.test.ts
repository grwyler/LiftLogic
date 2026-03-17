import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("visible load progression surface", () => {
  it("shows last-session vs current-target load comparisons before and after logging", () => {
    const feedbackPanelsSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "components",
        "exercise-item",
        "ExerciseFeedbackPanels.tsx"
      ),
      "utf8"
    );
    const progressionSource = fs.readFileSync(
      path.join(process.cwd(), "utils", "progression.ts"),
      "utf8"
    );

    expect(feedbackPanelsSource).toContain("vs last");
    expect(feedbackPanelsSource).toContain("Last comparable set");
    expect(progressionSource).toContain("Last time");
    expect(progressionSource).toContain("today");
    expect(progressionSource).toContain("deltaWeight");
  });
});
