import { describe, expect, it } from "vitest";
import { getExerciseProfile } from "../../utils/exerciseDrafts";

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
});
