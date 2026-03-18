import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { defaultSetupForm } from "../../utils/profileSetup";
import {
  buildFallbackWorkoutPlan,
  buildWorkoutCoachResponse,
} from "../../utils/workoutGeneration";

describe("starter load guidance", () => {
  it("does not seed arbitrary fixed weights into fallback weight exercises", () => {
    const plan = buildFallbackWorkoutPlan({
      ...defaultSetupForm,
      trainingGoal: "strength",
      workoutDaysPerWeek: "3",
      equipmentAccess: ["Full gym"],
    });

    const weightedSets = plan.days
      .flatMap((day) => day.exercises)
      .filter(
        (exercise) =>
          exercise.type === "weight" &&
          !/push-up|pull-up|dip|plank|dead bug/i.test(exercise.name)
      )
      .flatMap((exercise) => exercise.sets);

    expect(weightedSets.length).toBeGreaterThan(0);
    expect(
      weightedSets.every((set: any) => set.weight == null || set.weight === 0)
    ).toBe(true);
  });

  it("adds first-session effort guidance when the plan has no personalized load history", () => {
    const profile = {
      ...defaultSetupForm,
      trainingGoal: "muscle" as const,
      workoutDaysPerWeek: "4",
      equipmentAccess: ["Full gym"],
    };

    const plan = buildFallbackWorkoutPlan(profile);
    const response = buildWorkoutCoachResponse(profile, plan);

    expect(response.tips).toContain(
      "For your first session, start with the empty bar or a light warm-up load and build up until the working sets feel like about 2-3 reps in reserve. Log what you actually use so later recommendations can anchor to your performance instead of a generic starter weight."
    );
  });

  it("explains whether the starting load comes from history or a baseline estimate in the active set flow", () => {
    const selectedSetSource = fs.readFileSync(
      path.join(process.cwd(), "components", "SelectedSetItem.tsx"),
      "utf8"
    );

    expect(selectedSetSource).toContain("Starting load is a baseline estimate for this lift");
    expect(selectedSetSource).toContain("Starting load is anchored to your recent logged history");
    expect(selectedSetSource).toContain("Keep suggestion");
    expect(selectedSetSource).toContain("Lower");
    expect(selectedSetSource).toContain("Raise");
  });
});
