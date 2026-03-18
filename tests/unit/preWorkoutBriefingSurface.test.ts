import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("pre-workout briefing surface", () => {
  it("adds week-fit, change-summary, and minimum-success guidance to the workout header", () => {
    const headerSource = fs.readFileSync(
      path.join(process.cwd(), "components", "workout-display", "WorkoutHeaderSummary.tsx"),
      "utf8"
    );
    const displaySource = fs.readFileSync(
      path.join(process.cwd(), "components", "WorkoutDisplay.tsx"),
      "utf8"
    );

    expect(headerSource).toContain("This Week&apos;s Fit");
    expect(headerSource).toContain("What changed");
    expect(headerSource).toContain("Today&apos;s win");
    expect(headerSource).toContain("Expected time");
    expect(headerSource).toContain("Main focus");
    expect(displaySource).toContain("const preWorkoutTimeLabel = useMemo(() => {");
    expect(displaySource).toContain("const planFitHeadline = useMemo(() => {");
    expect(displaySource).toContain("const planChangeSummary = useMemo(() => {");
    expect(displaySource).toContain("preWorkoutMinimumSuccess");
  });
});
