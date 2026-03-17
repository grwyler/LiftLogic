import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("exercise instruction guidance surface", () => {
  it("renders execution cues and beginner regressions in the workout logging flow", () => {
    const panelSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "components",
        "exercise-item",
        "ExerciseFeedbackPanels.tsx"
      ),
      "utf8"
    );
    const itemSource = fs.readFileSync(
      path.join(process.cwd(), "components", "ExerciseItem.tsx"),
      "utf8"
    );

    expect(panelSource).toContain("ExerciseExecutionPanel");
    expect(panelSource).toContain("Beginner regression");
    expect(itemSource).toContain("renderExecutionPanel");
    expect(itemSource).toContain("ExerciseExecutionPanel");
  });
});
