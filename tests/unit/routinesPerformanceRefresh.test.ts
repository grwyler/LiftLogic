import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("routines performance refresh flow", () => {
  it("separates month-summary loading from day-entry loading in the workout manager", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "WorkoutsManager.tsx"),
      "utf8"
    );

    expect(source).toContain("fetchWorkoutCalendarSummary");
    expect(source).toContain("fetchWorkoutEntriesForDay");
    expect(source).toContain("buildDayWorkoutsFromEntriesAndRules");
    expect(source).toContain("const [dayRefreshTick, setDayRefreshTick] = useState(0);");
    expect(source).toContain("const [monthSummaryCache, setMonthSummaryCache] = useState<");
    expect(source).not.toContain("fetchRecurringRules,");
    expect(source).not.toContain("fetchWorkoutMonthEntries,");
  });

  it("updates the current day locally after quick add instead of forcing a blocking refetch", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "ExerciseManager.tsx"),
      "utf8"
    );

    expect(source).toContain("const persistedExercise = await persistExercise(newExercise);");
    expect(source).toContain("setExercises([...currentExercises, persistedExercise]);");
    expect(source).not.toContain("setRefetchExercises((prev) => !prev);");
  });

  it("uses a dedicated month-summary endpoint", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "api", "workoutCalendarSummary.ts"),
      "utf8"
    );

    expect(source).toContain('return res.status(200).json({ entries, rules });');
    expect(source).toContain('return res.status(405).json({ message: "Method Not Allowed" });');
  });
});
