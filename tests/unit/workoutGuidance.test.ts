import { describe, expect, it } from "vitest";
import {
  getLowEnergyWorkoutGuide,
  getExerciseExecutionGuidance,
  parseLimitations,
  starterPlanLibrary,
} from "../../utils/workoutGuidance";

describe("workout guidance utilities", () => {
  it("parses free-text limitations into structured guardrails", () => {
    const insights = parseLimitations(
      "Shoulder-friendly pressing, avoid deep knee flexion, and low-back caution."
    );

    expect(insights.map((insight) => insight.id)).toEqual(
      expect.arrayContaining([
        "shoulder_friendly",
        "knee_friendly",
        "low_back_friendly",
      ])
    );
  });

  it("provides execution cues and a regression path for common lifts", () => {
    const guidance = getExerciseExecutionGuidance("Back Squat");

    expect(guidance?.title).toBe("Squat setup");
    expect(guidance?.cues.length).toBeGreaterThanOrEqual(3);
    expect(guidance?.warmup?.steps.length).toBeGreaterThanOrEqual(2);
    expect(guidance?.warmup?.rampSets.length).toBeGreaterThanOrEqual(3);
    expect(guidance?.regression?.name).toBe("Goblet Squat");
  });

  it("builds a minimum-win guide for low-energy workout days", () => {
    const guide = getLowEnergyWorkoutGuide(4);

    expect(guide.headline).toBe("Minimum win mode is on");
    expect(guide.focusLabel).toBe("2 priority lifts");
    expect(guide.completionCopy).toContain("intentional lighter day");
  });

  it("offers mainstream-friendly starter plans instead of requiring a blank setup", () => {
    expect(starterPlanLibrary).toHaveLength(3);
    expect(starterPlanLibrary.map((preset) => preset.id)).toContain(
      "home_dumbbell_consistency"
    );
  });
});
