import { describe, expect, it } from "vitest";
import {
  getExerciseProfile,
  resolveExerciseStartingWeight,
} from "../../utils/exerciseDrafts";

describe("exerciseDrafts", () => {
  it("keeps assisted pull-ups load-agnostic until the user logs real performance", () => {
    const profile = getExerciseProfile({
      name: "Assisted Pull-Up",
      equipment: ["Assisted Pull-Up Machine"],
    });

    expect(profile).toMatchObject({
      sets: 3,
      reps: 8,
      weight: null,
    });
  });

  it("keeps unassisted pull-ups at bodyweight", () => {
    const profile = getExerciseProfile({
      name: "Pull-Up",
      equipment: ["Pull-Up Bar"],
    });

    expect(profile).toMatchObject({
      sets: 3,
      reps: 10,
      weight: 0,
    });
  });

  it("resolves a valid quick-add starter weight for assisted pull-ups", () => {
    const starterWeight = resolveExerciseStartingWeight({
      exercise: {
        name: "Assisted Pull-Up",
        equipment: ["Assisted Pull-Up Machine"],
      },
      preferredUnits: "lb",
      candidateWeight: null,
    });

    expect(starterWeight).toBe(10);
  });

  it("resolves a unit-aware starter weight when a weight exercise has no saved max", () => {
    const starterWeight = resolveExerciseStartingWeight({
      exercise: {
        name: "Bench Press",
        equipment: ["Barbell", "Bench"],
      },
      preferredUnits: "kg",
      candidateWeight: null,
    });

    expect(starterWeight).toBe(20);
  });
});
