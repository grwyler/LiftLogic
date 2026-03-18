import { describe, expect, it } from "vitest";
import { defaultSetupForm, workoutFrequencyOptions } from "../../utils/profileSetup";
import { buildFallbackWorkoutPlan } from "../../utils/workoutGeneration";

describe("one-day plan support", () => {
  it("offers a one-day weekly frequency in setup surfaces", () => {
    expect(workoutFrequencyOptions[0]).toBe("1");
    expect(workoutFrequencyOptions).toContain("1");
  });

  it("builds a coherent one-day anchor workout instead of forcing a two-day minimum", () => {
    const plan = buildFallbackWorkoutPlan({
      ...defaultSetupForm,
      trainingGoal: "consistency",
      workoutDaysPerWeek: "1",
      equipmentAccess: ["Full gym"],
    });

    expect(plan.days).toHaveLength(1);
    expect(plan.days[0]?.title).toBe("Full Body Consistency Anchor");
    expect(plan.days[0]?.exercises.length).toBeGreaterThan(0);
    expect(plan.summary).toContain("one-day version is a full-body anchor session");
  });
});
