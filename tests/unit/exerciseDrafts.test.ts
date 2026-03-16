import { describe, expect, it } from "vitest";
import { getExerciseProfile } from "../../utils/exerciseDrafts";

describe("exerciseDrafts", () => {
  it("treats assisted pull-ups like a loaded machine pull instead of bodyweight", () => {
    const profile = getExerciseProfile({
      name: "Assisted Pull-Up",
      equipment: ["Assisted Pull-Up Machine"],
    });

    expect(profile).toMatchObject({
      sets: 3,
      reps: 8,
      weight: 90,
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
