import { describe, expect, it } from "vitest";
import { buildNextExerciseRecommendation } from "../../utils/progression";
import { WorkoutEntryDoc } from "../../utils/types";

const createEntry = ({
  name,
  exerciseId,
  weight,
  unit = "lb",
  date = "2026-03-15T12:00:00.000Z",
}: {
  name: string;
  exerciseId: string;
  weight: number;
  unit?: "lb" | "kg";
  date?: string;
}): WorkoutEntryDoc => ({
  userId: "user-1",
  exerciseId,
  routineName: "Day 1",
  date: new Date(date),
  name,
  type: "weight",
  weightUnit: unit,
  complete: true,
  sets: Array.from({ length: 3 }, (_, index) => ({
    name: `Set ${index + 1}`,
    weight,
    actualWeight: weight,
    reps: 10,
    actualReps: 10,
    complete: true,
    weightUnit: unit,
    actualWeightUnit: unit,
  })),
});

describe("exercise-aware progression increments", () => {
  it("uses microloading for smaller isolation lifts", () => {
    const recommendation = buildNextExerciseRecommendation(
      [createEntry({ name: "Lateral Raise", exerciseId: "lateral-raise", weight: 20 })],
      "hypertrophy",
      "lb"
    );

    expect(recommendation.recommendedWeight).toBe(22.5);
  });

  it("keeps larger jumps for compound barbell lifts", () => {
    const recommendation = buildNextExerciseRecommendation(
      [createEntry({ name: "Back Squat", exerciseId: "back-squat", weight: 225 })],
      "strength",
      "lb"
    );

    expect(recommendation.recommendedWeight).toBe(230);
  });

  it("rounds recommendations in kilogram increments for metric users", () => {
    const recommendation = buildNextExerciseRecommendation(
      [createEntry({ name: "Bench Press", exerciseId: "bench-press", weight: 60, unit: "kg" })],
      "hypertrophy",
      "kg"
    );

    expect(recommendation.weightUnit).toBe("kg");
    expect(recommendation.recommendedWeight).toBe(62.5);
  });
});
