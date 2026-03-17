import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("day switch stale workout visibility", () => {
  it("keeps WorkoutDisplay mounted while the next day is loading", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "WorkoutsManager.tsx"),
      "utf8"
    );

    expect(source).toContain("!currentWorkout ? (");
    expect(source).toContain("<WorkoutDisplay");
    expect(source).toContain("{isLoadingWorkout ? (");
    expect(source).toContain("Loading next day...");
    expect(source).not.toContain("{isLoadingWorkout || !currentWorkout ? (");
  });
});
