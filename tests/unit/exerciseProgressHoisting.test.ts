import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("exercise progress hoisting", () => {
  it("loads progress data at the workout level with a cache keyed by exercise id", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "WorkoutDisplay.tsx"),
      "utf8"
    );

    expect(source).toContain("fetchExerciseProgress");
    expect(source).toContain("const [exerciseProgressById, setExerciseProgressById] = useState<");
    expect(source).toContain("const [loadingProgressById, setLoadingProgressById] = useState<Record<string, boolean>>");
    expect(source).toContain("const uncachedExerciseIds = nextExerciseIds.filter(");
    expect(source).toContain("!exerciseProgressById[exerciseId] && !loadingProgressById[exerciseId]");
  });

  it("stops fetching progress inside each exercise row and memoizes the row component", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "ExerciseItem.tsx"),
      "utf8"
    );

    expect(source).not.toContain("fetchExerciseProgress");
    expect(source).toContain("export default React.memo(ExerciseItem, areExerciseItemPropsEqual);");
    expect(source).toContain("prevProps.isOpen === nextProps.isOpen");
    expect(source).toContain("prevProps.recommendation === nextProps.recommendation");
  });
});
