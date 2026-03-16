import { describe, expect, it } from "vitest";
import { buildNextExerciseRecommendation } from "../../utils/progression";
import { normalizeWorkoutEntryWeights, getDisplayWeightFromSet } from "../../utils/weightUnits";
import { WorkoutEntryDoc } from "../../utils/types";

describe("weight unit consistency", () => {
  it("stores source units alongside canonical pound values for weight sets", () => {
    const normalized = normalizeWorkoutEntryWeights(
      {
        userId: "user-1",
        exerciseId: "front-squat",
        routineName: "Leg Day",
        date: new Date("2026-03-16T12:00:00.000Z"),
        type: "weight",
        weightUnit: "kg",
        sets: [
          {
            name: "Working Set 1",
            weight: 100,
            actualWeight: 102.5,
            reps: 5,
            actualReps: 5,
            complete: true,
          },
        ],
      } as WorkoutEntryDoc,
      "kg"
    );

    const set = normalized.sets?.[0];
    expect(set?.weightUnit).toBe("kg");
    expect(set?.actualWeightUnit).toBe("kg");
    expect(set?.weightInLb).toBeCloseTo(220.5, 1);
    expect(set?.actualWeightInLb).toBeCloseTo(226, 1);
  });

  it("converts legacy pound history safely when the user switches to kilograms", () => {
    const legacySet = {
      name: "Working Set 1",
      weight: 100,
      actualWeight: 105,
      reps: 8,
      actualReps: 8,
      complete: true,
    };

    expect(getDisplayWeightFromSet(legacySet, "planned", "kg")).toBeCloseTo(45.4, 1);
    expect(getDisplayWeightFromSet(legacySet, "actual", "kg")).toBeCloseTo(47.6, 1);
  });

  it("returns recommendations in the active preferred unit without changing the baseline math", () => {
    const recommendation = buildNextExerciseRecommendation(
      [
        {
          userId: "user-1",
          exerciseId: "bench-press",
          routineName: "Push Day",
          date: new Date("2026-03-08T12:00:00.000Z"),
          type: "weight",
          complete: true,
          sets: Array.from({ length: 3 }, (_, index) => ({
            name: `Working Set ${index + 1}`,
            weight: 100,
            actualWeight: 100,
            reps: 8,
            actualReps: 8,
            complete: true,
          })),
        },
      ] as WorkoutEntryDoc[],
      "hypertrophy",
      "kg"
    );

    expect(recommendation.weightUnit).toBe("kg");
    expect(recommendation.recommendedWeight).toBe(47.5);
    expect(recommendation.basedOn?.topSetWeight).toBeCloseTo(45.4, 1);
  });
});
