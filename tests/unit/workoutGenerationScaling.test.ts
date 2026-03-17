import { describe, expect, it } from "vitest";
import { defaultSetupForm } from "../../utils/profileSetup";
import { buildFallbackWorkoutPlan } from "../../utils/workoutGeneration";

describe("fallback workout generation scaling", () => {
  it("separates beginner and advanced profiles for the same strength goal", () => {
    const beginnerPlan = buildFallbackWorkoutPlan({
      ...defaultSetupForm,
      trainingGoal: "strength",
      workoutDaysPerWeek: "3",
      workoutLength: "25",
      experienceLevel: "beginner",
      currentFitnessLevel: "starting_out",
      equipmentAccess: ["Full gym"],
    });
    const advancedPlan = buildFallbackWorkoutPlan({
      ...defaultSetupForm,
      trainingGoal: "strength",
      workoutDaysPerWeek: "3",
      workoutLength: "70",
      experienceLevel: "advanced",
      currentFitnessLevel: "highly_trained",
      equipmentAccess: ["Full gym"],
    });

    const beginnerDay = beginnerPlan.days[0];
    const advancedDay = advancedPlan.days[0];

    expect(beginnerDay.exercises.length).toBeLessThan(advancedDay.exercises.length);
    expect(beginnerDay.exercises[0]?.name).toBe("Goblet Squat");
    expect(advancedDay.exercises[0]?.name).toBe("Back Squat");
    expect(beginnerDay.exercises[0]?.sets.length ?? 0).toBeLessThan(
      advancedDay.exercises[0]?.sets.length ?? 0
    );
    expect(
      Number(beginnerDay.exercises[0]?.sets[0]?.reps ?? 0)
    ).toBeGreaterThan(Number(advancedDay.exercises[0]?.sets[0]?.reps ?? 0));
  });

  it("tightens exercise count and density for short sessions", () => {
    const shortSessionPlan = buildFallbackWorkoutPlan({
      ...defaultSetupForm,
      trainingGoal: "muscle",
      workoutDaysPerWeek: "4",
      workoutLength: "25",
      experienceLevel: "intermediate",
      currentFitnessLevel: "training_consistently",
      equipmentAccess: ["Full gym"],
    });
    const longSessionPlan = buildFallbackWorkoutPlan({
      ...defaultSetupForm,
      trainingGoal: "muscle",
      workoutDaysPerWeek: "4",
      workoutLength: "70",
      experienceLevel: "intermediate",
      currentFitnessLevel: "training_consistently",
      equipmentAccess: ["Full gym"],
    });

    const shortDay = shortSessionPlan.days[0];
    const longDay = longSessionPlan.days[0];

    expect(shortDay.exercises.length).toBeLessThan(longDay.exercises.length);
    expect(shortDay.exercises[0]?.sets.length ?? 0).toBeLessThanOrEqual(
      longDay.exercises[0]?.sets.length ?? 0
    );
    expect(Number(shortDay.exercises[0]?.rest ?? 0)).toBeLessThanOrEqual(
      Number(longDay.exercises[0]?.rest ?? 0)
    );
  });
});
