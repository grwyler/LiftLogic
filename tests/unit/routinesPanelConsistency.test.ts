import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("routines panel consistency", () => {
  it("uses a shared flatter panel system for workout summary sections", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "WorkoutDisplay.tsx"),
      "utf8"
    );

    expect(source).toContain("const routinesPanelRadius =");
    expect(source).toContain("borderRadius: routinesPanelRadius.shell");
    expect(source).toContain("borderRadius: routinesPanelRadius.section");
    expect(source).not.toContain("borderRadius: 4,");
  });

  it("keeps the muscle groups panel flattened instead of nesting paper cards", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "MuscleRecoveryMap.tsx"),
      "utf8"
    );

    expect(source).toContain("const musclePanelRadius =");
    expect(source).toContain("borderRadius: musclePanelRadius.shell");
    expect(source).toContain("borderRadius: musclePanelRadius.section");
  });
});
