import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("workout celebration recap", () => {
  it("renders a distinct completion recap with multiple outcome highlights and a next-step CTA", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "WorkoutDisplay.tsx"),
      "utf8"
    );

    expect(source).toContain("Session Recap");
    expect(source).toContain("Strong finish. Today&apos;s work is in the bank.");
    expect(source).toContain("Exercises done");
    expect(source).toContain("Sets logged");
    expect(source).toContain("Total volume");
    expect(source).toContain("PR moments");
    expect(source).toContain("Schedule next session");
  });

  it("lets the recap be dismissed and revisited later", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "WorkoutDisplay.tsx"),
      "utf8"
    );

    expect(source).toContain("const [completionRecapDismissed, setCompletionRecapDismissed]");
    expect(source).toContain("View session recap");
    expect(source).toContain("Dismiss");
    expect(source).toContain("setCompletionRecapDismissed(false)");
  });
});
