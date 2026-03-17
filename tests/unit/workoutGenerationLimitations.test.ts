import { describe, expect, it } from "vitest";
import { defaultSetupForm } from "../../utils/profileSetup";
import { buildFallbackWorkoutPlan } from "../../utils/workoutGeneration";

describe("fallback workout generation limitation guardrails", () => {
  it("replaces overhead pressing when shoulder-friendly limitations are present", () => {
    const plan = buildFallbackWorkoutPlan({
      ...defaultSetupForm,
      trainingGoal: "strength",
      workoutDaysPerWeek: "3",
      workoutLength: "55",
      currentFitnessLevel: "active_but_inconsistent",
      experienceLevel: "beginner",
      equipmentAccess: ["Full gym"],
      limitations: "Shoulder-friendly pressing only because overhead pain flares up.",
    });

    const exerciseNames = plan.days.flatMap((day) => day.exercises.map((exercise) => exercise.name));

    expect(exerciseNames).not.toContain("Overhead Press");
    expect(exerciseNames).toContain("Dumbbell Floor Press");
    expect(plan.summary).toContain("limitation-aware guardrail");
  });
});
