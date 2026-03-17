import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("whole-workout repeat schedule batching", () => {
  it("uses a single batch request for workout schedule save and remove actions", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "workout-display", "useWorkoutScheduleActions.ts"),
      "utf8"
    );

    expect(source).toContain("updateWorkoutSchedule");
    expect(source).toContain("removeWorkoutSchedule");
    expect(source).toContain('action: "save_workout_schedule"');
    expect(source).toContain('action: "remove_workout_schedule"');
    expect(source).toContain("setSavingWorkoutSchedule(true);");
    expect(source).not.toContain("const savedRule = await saveRecurringRule(");
  });
});
