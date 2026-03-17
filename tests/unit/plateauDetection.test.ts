import { describe, expect, it } from "vitest";
import { buildNextExerciseRecommendation } from "../../utils/progression";
import { WorkoutEntryDoc } from "../../utils/types";

const createEntry = ({
  date,
  name = "Bench Press",
  weight,
  reps,
  actualWeight = weight,
  actualReps = reps,
}: {
  date: string;
  name?: string;
  weight: number;
  reps: number;
  actualWeight?: number;
  actualReps?: number;
}): WorkoutEntryDoc => ({
  userId: "user-1",
  exerciseId: "bench-press",
  routineName: "Push Day",
  date: new Date(date),
  name,
  type: "weight",
  complete: true,
  sets: Array.from({ length: 3 }, (_, index) => ({
    name: `Working Set ${index + 1}`,
    weight,
    reps,
    actualWeight,
    actualReps,
    complete: true,
  })),
});

describe("plateau detection", () => {
  it("triggers a plateau intervention after three consecutive stalled exposures", () => {
    const recommendation = buildNextExerciseRecommendation(
      [
        createEntry({
          date: "2026-03-15T12:00:00.000Z",
          weight: 135,
          reps: 8,
          actualWeight: 130,
          actualReps: 6,
        }),
        createEntry({
          date: "2026-03-08T12:00:00.000Z",
          weight: 135,
          reps: 8,
          actualWeight: 130,
          actualReps: 6,
        }),
        createEntry({
          date: "2026-03-01T12:00:00.000Z",
          weight: 135,
          reps: 8,
          actualWeight: 130,
          actualReps: 6,
        }),
      ],
      "hypertrophy",
      "lb"
    );

    expect(recommendation.plateau?.triggered).toBe(true);
    expect(recommendation.plateau?.consecutiveStalls).toBe(3);
    expect(recommendation.plateau?.intervention).toBe("rep_reset");
    expect(recommendation.recommendedWeight).toBeLessThan(135);
    expect(recommendation.recommendedReps).toBeGreaterThan(6);
    expect(recommendation.reason).toContain("Plateau detection tripped after 3 stalled exposures");
    expect(recommendation.reason).toContain("starts a reramp");
  });

  it("clears the plateau state after a successful reset session", () => {
    const recommendation = buildNextExerciseRecommendation(
      [
        createEntry({
          date: "2026-03-22T12:00:00.000Z",
          weight: 125,
          reps: 9,
          actualWeight: 125,
          actualReps: 9,
        }),
        createEntry({
          date: "2026-03-15T12:00:00.000Z",
          weight: 135,
          reps: 8,
          actualWeight: 130,
          actualReps: 6,
        }),
        createEntry({
          date: "2026-03-08T12:00:00.000Z",
          weight: 135,
          reps: 8,
          actualWeight: 130,
          actualReps: 6,
        }),
        createEntry({
          date: "2026-03-01T12:00:00.000Z",
          weight: 135,
          reps: 8,
          actualWeight: 130,
          actualReps: 6,
        }),
      ],
      "hypertrophy",
      "lb"
    );

    expect(recommendation.plateau?.triggered).toBe(false);
    expect(recommendation.plateau?.consecutiveStalls).toBe(0);
    expect(recommendation.recommendedWeight).toBeGreaterThanOrEqual(125);
    expect(recommendation.reason).not.toContain("Plateau detection tripped");
  });
});
