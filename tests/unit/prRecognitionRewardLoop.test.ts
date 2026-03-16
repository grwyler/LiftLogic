import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("PR recognition reward loop", () => {
  it("surfaces recent PR history in the workout flow and recap", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "WorkoutDisplay.tsx"),
      "utf8"
    );

    expect(source).toContain("Recent PRs");
    expect(source).toContain("Progress worth remembering");
    expect(source).toContain("Your latest records stay visible here");
    expect(source).toContain("this workout");
  });

  it("announces new personal records inside the completed exercise view", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "ExerciseItem.tsx"),
      "utf8"
    );

    expect(source).toContain("New personal record");
    expect(source).toContain("You beat a prior benchmark on this lift");
    expect(source).toContain("personalRecordHighlights.map");
  });

  it("defines distinct PR category labels in the shared performance helper", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "utils", "performance.ts"),
      "utf8"
    );

    expect(source).toContain("Estimated 1RM PR");
    expect(source).toContain("Load PR");
    expect(source).toContain("Rep PR");
    expect(source).toContain("latestWorkoutPRCategories");
  });
});
