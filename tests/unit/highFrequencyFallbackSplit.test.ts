import { describe, expect, it } from "vitest";
import { defaultSetupForm } from "../../utils/profileSetup";
import {
  buildFallbackWorkoutPlan,
  buildWorkoutCoachResponse,
} from "../../utils/workoutGeneration";

describe("high-frequency fallback split generation", () => {
  it("uses a dedicated 5-day strength split instead of recycling three templates", () => {
    const plan = buildFallbackWorkoutPlan({
      ...defaultSetupForm,
      trainingGoal: "strength",
      workoutDaysPerWeek: "5",
      equipmentAccess: ["Full gym"],
    });

    expect(plan.days.map((day) => day.title)).toEqual([
      "Lower Strength",
      "Upper Strength",
      "Posterior Chain",
      "Upper Volume",
      "Recovery + Core",
    ]);
    expect(plan.summary).toContain("redistributes stress");
  });

  it("uses a dedicated 6-day dumbbell split with a lighter finishing day", () => {
    const plan = buildFallbackWorkoutPlan({
      ...defaultSetupForm,
      trainingGoal: "muscle",
      workoutDaysPerWeek: "6",
      equipmentAccess: ["Dumbbells"],
    });

    expect(plan.days.map((day) => day.title)).toEqual([
      "Push Heavy",
      "Pull Heavy",
      "Legs Heavy",
      "Push Pump",
      "Pull Pump",
      "Legs Pump + Core",
    ]);
    expect(plan.days[5]?.exercises).toHaveLength(4);
  });

  it("warns lower-readiness users that 4 days is a more recoverable baseline for 6-day plans", () => {
    const profile = {
      ...defaultSetupForm,
      trainingGoal: "consistency" as const,
      workoutDaysPerWeek: "6",
      currentFitnessLevel: "starting_out" as const,
      experienceLevel: "beginner" as const,
      equipmentAccess: ["Bodyweight only"],
    };
    const plan = buildFallbackWorkoutPlan(profile);
    const response = buildWorkoutCoachResponse(profile, plan);

    expect(plan.summary).toContain("4 days per week is probably the more recoverable baseline");
    expect(response.tips).toContain(
      "I kept the extra sessions lighter, but 4 days per week is probably the more recoverable baseline for your current training background if fatigue starts to stack up."
    );
  });
});
