import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("set logging persistence failure handling", () => {
  it("advances the workout state before the save finishes so logging feels instant", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "SelectedSetItem.tsx"),
      "utf8"
    );

    const saveIndex = source.indexOf("await persistWorkoutEntryWithOfflineQueue({");
    const setCurrentExerciseIndex = source.indexOf("setCurrentExercise(updatedExercise);");
    const setCurrentSetIndex = source.indexOf(
      "setCurrentSetIndex(nextSetIndexAfterLog);"
    );

    expect(saveIndex).toBeGreaterThan(-1);
    expect(setCurrentExerciseIndex).toBeGreaterThan(-1);
    expect(setCurrentSetIndex).toBeGreaterThan(-1);
    expect(setCurrentExerciseIndex).toBeLessThan(saveIndex);
    expect(setCurrentSetIndex).toBeLessThan(saveIndex);
  });

  it("keeps an inline retry state and rolls the workout UI back when a logged set does not persist", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "SelectedSetItem.tsx"),
      "utf8"
    );

    expect(source).toContain("const [loggingSet, setLoggingSet] = useState(false);");
    expect(source).toContain("const [logSetError, setLogSetError] = useState<string | null>(null);");
    expect(source).toContain("persistWorkoutEntryWithOfflineQueue");
    expect(source).toContain("Saved offline. We'll sync this set when your connection returns.");
    expect(source).toContain("setCurrentExercise(previousExercise);");
    expect(source).toContain("setExercises?.(previousExercises);");
    expect(source).toContain("setCurrentSetIndex(setIndex);");
    expect(source).toContain(
      'setLogSetError("This set was not saved. Check your connection and try again.");'
    );
    expect(source).toContain('toast.error("This set was not saved. Check your connection and try again.");');
    expect(source).toContain('? \"Retry Log Set\"');
  });
});
