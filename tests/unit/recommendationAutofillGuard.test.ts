import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("recommendation autofill guard", () => {
  it("does not auto-rewrite planned sets when a recommendation loads", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "ExerciseItem.tsx"),
      "utf8"
    );

    expect(source).not.toContain("appliedRecommendationRef.current = recommendationKey;");
    expect(source).not.toContain("sets: [...completedSets, ...recommendedIncompleteSets],");
    expect(source).not.toContain("useEffect(() => {\n    const completedSets = (currentExercise?.sets ?? []).filter((set) => set.complete);");
  });

  it("shows recommendation targets separately until the user explicitly applies them", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "ExerciseItem.tsx"),
      "utf8"
    );

    expect(source).toContain("const handleApplyRecommendation = async () => {");
    expect(source).toContain("<ExerciseRecommendationPanel");
    expect(source).toContain("handleApplyRecommendation={handleApplyRecommendation}");
    expect(source).toContain("buildRecommendedIncompleteSets");
    expect(source).toContain("await saveWorkoutEntry({");
    expect(source).toContain("Recommendation applied to this session");
  });
});
