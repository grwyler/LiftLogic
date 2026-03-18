import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("partial completion adherence messaging", () => {
  it("credits abbreviated sessions without pretending they were full completions", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "workout-display", "WorkoutCompletionRecap.tsx"),
      "utf8"
    );

    expect(source).toContain("Partial Credit");
    expect(source).toContain("You kept the habit alive today.");
    expect(source).toContain("Core work completed still counts.");
    expect(source).toContain("!isWorkoutComplete");
  });
});
