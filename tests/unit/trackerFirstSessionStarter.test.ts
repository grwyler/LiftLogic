import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("tracker-first session starter", () => {
  it("offers a guided first-session path from the empty workout state", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "WorkoutDisplay.tsx"),
      "utf8"
    );

    expect(source).toContain("Guided first-session options");
    expect(source).toContain("Simple strength starter");
    expect(source).toContain("Home dumbbell start");
    expect(source).toContain("Start this workout");
    expect(source).toContain("Build manually instead");
    expect(source).toContain("starter_flow_shown");
    expect(source).toContain("starter_flow_started");
    expect(source).toContain("starter_flow_completed");
    expect(source).toContain("starter_flow_dismissed");
  });
});
