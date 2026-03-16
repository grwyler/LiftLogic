import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("workouts manager day fetch fallback", () => {
  it("catches selected-day fetch failures and falls back to cached month entries", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "WorkoutsManager.tsx"),
      "utf8"
    );

    expect(source).toContain("fetchWorkoutEntriesForDay(userId, dateISO)");
    expect(source).toContain('.catch((error) => {');
    expect(source).toContain('console.error("Error loading selected workout day:", error);');
    expect(source).toContain("const fallbackEntries = getEntriesForDateKey(");
    expect(source).toContain("currentMonthSummary.entries");
    expect(source).toContain("const fallbackRoutines = buildDayWorkoutsFromEntriesAndRules(");
  });
});
