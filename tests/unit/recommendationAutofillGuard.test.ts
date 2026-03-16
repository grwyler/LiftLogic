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

    expect(source).toContain("Recommended targets");
    expect(source).toContain("Your planned sets stay unchanged until you apply this recommendation.");
    expect(source).toContain("Apply recommendation");
    expect(source).toContain("Recommendation applied to this session");
    expect(source).toContain("await saveWorkoutEntry({");
  });
});
