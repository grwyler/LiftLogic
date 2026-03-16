import { describe, expect, it } from "vitest";
import { buildNextExerciseRecommendation } from "../../utils/progression";
import { WorkoutEntryDoc } from "../../utils/types";

const createWeightEntry = ({
  date,
  complete = true,
  plannedSets = 3,
  completedSets = plannedSets,
  intentionalLowVolume = false,
}: {
  date: string;
  complete?: boolean;
  plannedSets?: number;
  completedSets?: number;
  intentionalLowVolume?: boolean;
}): WorkoutEntryDoc => ({
  userId: "user-1",
  exerciseId: "bench-press",
  routineName: "Push Day",
  date: new Date(date),
  type: "weight",
  complete,
  intentionalLowVolume,
  sets: Array.from({ length: plannedSets }, (_, index) => ({
    name: `Working Set ${index + 1}`,
    weight: 100,
    reps: 8,
    actualWeight: index < completedSets ? 100 : "",
    actualReps: index < completedSets ? 8 : "",
    complete: index < completedSets,
  })),
});

describe("progression set-count recommendations", () => {
  it("keeps the planned set count when the latest completed entry only has one logged set out of many", () => {
    const recommendation = buildNextExerciseRecommendation([
      createWeightEntry({
        date: "2026-03-08T12:00:00.000Z",
        plannedSets: 3,
        completedSets: 3,
      }),
      createWeightEntry({
        date: "2026-03-15T12:00:00.000Z",
        plannedSets: 3,
        completedSets: 1,
      }),
    ]);

    expect(recommendation.recommendedSets).toBe(3);
    expect(recommendation.reason).toContain("partially logged");
  });

  it("falls back to the recent median set count when the latest completed entry is suspiciously sparse", () => {
    const recommendation = buildNextExerciseRecommendation([
      createWeightEntry({
        date: "2026-02-22T12:00:00.000Z",
        plannedSets: 3,
        completedSets: 3,
      }),
      createWeightEntry({
        date: "2026-03-01T12:00:00.000Z",
        plannedSets: 3,
        completedSets: 3,
      }),
      createWeightEntry({
        date: "2026-03-08T12:00:00.000Z",
        plannedSets: 4,
        completedSets: 4,
      }),
      createWeightEntry({
        date: "2026-03-15T12:00:00.000Z",
        plannedSets: 1,
        completedSets: 1,
      }),
    ]);

    expect(recommendation.recommendedSets).toBe(3);
    expect(recommendation.reason).toContain("recent median volume");
  });

  it("allows intentionally reduced-volume sessions to lower the next set count", () => {
    const recommendation = buildNextExerciseRecommendation([
      createWeightEntry({
        date: "2026-03-08T12:00:00.000Z",
        plannedSets: 3,
        completedSets: 3,
      }),
      createWeightEntry({
        date: "2026-03-15T12:00:00.000Z",
        plannedSets: 1,
        completedSets: 1,
        intentionalLowVolume: true,
      }),
    ]);

    expect(recommendation.recommendedSets).toBe(1);
    expect(recommendation.reason).toContain("intentionally reduced volume");
  });
});
