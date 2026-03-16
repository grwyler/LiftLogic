import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("set logging persistence failure handling", () => {
  it("persists before committing completed exercise state and next-set navigation", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "SelectedSetItem.tsx"),
      "utf8"
    );

    const saveIndex = source.indexOf("await saveWorkoutEntry({");
    const setCurrentExerciseIndex = source.indexOf("setCurrentExercise(updatedExercise);");
    const setCurrentSetIndex = source.lastIndexOf(
      "setCurrentSetIndex(nextSetIndex === -1 ? adjustedSets.length : nextSetIndex);"
    );

    expect(saveIndex).toBeGreaterThan(-1);
    expect(setCurrentExerciseIndex).toBeGreaterThan(saveIndex);
    expect(setCurrentSetIndex).toBeGreaterThan(saveIndex);
  });

  it("keeps an inline retry state when a logged set does not persist", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "SelectedSetItem.tsx"),
      "utf8"
    );

    expect(source).toContain("const [loggingSet, setLoggingSet] = useState(false);");
    expect(source).toContain("const [logSetError, setLogSetError] = useState<string | null>(null);");
    expect(source).toContain(
      'setLogSetError("This set was not saved. Check your connection and try again.");'
    );
    expect(source).toContain('toast.error("This set was not saved. Check your connection and try again.");');
    expect(source).toContain('? \"Retry Log Set\"');
  });
});
