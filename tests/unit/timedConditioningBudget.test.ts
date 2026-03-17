import { describe, expect, it } from "vitest";
import { defaultSetupForm } from "../../utils/profileSetup";
import { buildFallbackWorkoutPlan } from "../../utils/workoutGeneration";

describe("timed conditioning budgeting", () => {
  it("keeps mixed-day cardio finishers short inside a 25-minute session budget", () => {
    const plan = buildFallbackWorkoutPlan({
      ...defaultSetupForm,
      trainingGoal: "consistency",
      workoutDaysPerWeek: "3",
      workoutLength: "25",
      equipmentAccess: ["Full gym"],
    });

    const mixedDay = plan.days.find((day) => day.title === "Full Body B");
    const cycling = mixedDay?.exercises.find((exercise) => exercise.name === "Cycling");

    expect(cycling?.type).toBe("timed");
    expect(cycling?.sets[0]).toMatchObject({
      minutes: 6,
      seconds: 0,
    });
  });

  it("lets dedicated conditioning cardio run longer when the session budget supports it", () => {
    const plan = buildFallbackWorkoutPlan({
      ...defaultSetupForm,
      trainingGoal: "conditioning",
      workoutDaysPerWeek: "3",
      workoutLength: "70",
      equipmentAccess: ["Full gym"],
    });

    const conditioningDay = plan.days.find(
      (day) => day.title === "Conditioning + Core"
    );
    const cycling = conditioningDay?.exercises.find(
      (exercise) => exercise.name === "Cycling"
    );

    expect(cycling?.type).toBe("timed");
    expect(cycling?.sets[0]).toMatchObject({
      minutes: 24,
      seconds: 0,
    });
  });

  it("keeps support-core timed work short even on conditioning days", () => {
    const plan = buildFallbackWorkoutPlan({
      ...defaultSetupForm,
      trainingGoal: "conditioning",
      workoutDaysPerWeek: "3",
      workoutLength: "70",
      equipmentAccess: ["Full gym"],
    });

    const conditioningDay = plan.days.find(
      (day) => day.title === "Conditioning + Core"
    );
    const plank = conditioningDay?.exercises.find(
      (exercise) => exercise.name === "Plank"
    );

    expect(plank?.type).toBe("timed");
    expect(plank?.sets).toHaveLength(3);
    expect(plank?.sets[0]).toMatchObject({
      minutes: 1,
      seconds: 0,
    });
  });
});
