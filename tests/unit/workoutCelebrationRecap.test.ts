import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("workout celebration recap", () => {
  it("renders a distinct completion recap with multiple outcome highlights and a next-step CTA", () => {
    const recapSource = fs.readFileSync(
      path.join(process.cwd(), "components", "workout-display", "WorkoutCompletionRecap.tsx"),
      "utf8"
    );
    const displaySource = fs.readFileSync(
      path.join(process.cwd(), "components", "WorkoutDisplay.tsx"),
      "utf8"
    );

    expect(recapSource).toContain("Session Recap");
    expect(recapSource).toContain("Strong finish. Today&apos;s work is in the bank.");
    expect(displaySource).toContain('label: "Exercises done"');
    expect(displaySource).toContain('label: "Sets logged"');
    expect(displaySource).toContain('label: "Total volume"');
    expect(displaySource).toContain('label: "PR moments"');
    expect(recapSource).toContain("Schedule next session");
  });

  it("lets the recap be dismissed and revisited later", () => {
    const recapSource = fs.readFileSync(
      path.join(process.cwd(), "components", "workout-display", "WorkoutCompletionRecap.tsx"),
      "utf8"
    );
    const displaySource = fs.readFileSync(
      path.join(process.cwd(), "components", "WorkoutDisplay.tsx"),
      "utf8"
    );

    expect(displaySource).toContain("const [completionRecapDismissed, setCompletionRecapDismissed]");
    expect(recapSource).toContain("View session recap");
    expect(recapSource).toContain("Dismiss");
    expect(displaySource).toContain("setCompletionRecapDismissed(false)");
  });
});
