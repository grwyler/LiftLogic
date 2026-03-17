import { describe, expect, it } from "vitest";
import { defaultSetupForm } from "../../utils/profileSetup";
import {
  buildFallbackWorkoutPlan,
  buildWorkoutCoachResponse,
} from "../../utils/workoutGeneration";

describe("fallback plan personalization copy", () => {
  it("labels fallback output as a baseline draft and avoids unsupported fitness-baseline claims", () => {
    const profile = {
      ...defaultSetupForm,
      trainingGoal: "strength" as const,
      workoutDaysPerWeek: "4",
      currentFitnessLevel: "starting_out" as const,
      experienceLevel: "beginner" as const,
      equipmentAccess: ["Full gym"],
    };

    const plan = buildFallbackWorkoutPlan(profile);
    const response = buildWorkoutCoachResponse(profile, plan);

    expect(plan.summary).toContain("baseline weekly draft");
    expect(response.openingMessage).toContain("baseline draft");
    expect(response.openingMessage).toContain(
      "shaped mainly by your goal, schedule, and equipment"
    );
    expect(response.why.join(" ")).not.toContain(
      "starting difficulty was shaped around your current fitness baseline"
    );
    expect(response.why.join(" ")).not.toContain("current fitness baseline");
  });
});
