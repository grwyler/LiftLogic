import { describe, expect, it } from "vitest";
import { buildNextExerciseRecommendation } from "../../utils/progression";
import { WorkoutEntryDoc } from "../../utils/types";

const createEntry = ({
  date,
  sets,
  complete = true,
}: {
  date: string;
  sets: Array<{
    weight: number;
    reps: number;
    actualWeight?: number;
    actualReps?: number;
    complete?: boolean;
  }>;
  complete?: boolean;
}): WorkoutEntryDoc => ({
  userId: "user-1",
  exerciseId: "bench-press",
  routineName: "Push Day",
  date: new Date(date),
  type: "weight",
  complete,
  sets: sets.map((set, index) => ({
    name: `Working Set ${index + 1}`,
    weight: set.weight,
    reps: set.reps,
    actualWeight: set.actualWeight ?? set.weight,
    actualReps: set.actualReps ?? set.reps,
    complete: set.complete ?? true,
  })),
});

describe("progression noise resistance", () => {
  it("caps the next load to one increment after a single outlier high set", () => {
    const recommendation = buildNextExerciseRecommendation([
      createEntry({
        date: "2026-03-01T12:00:00.000Z",
        sets: [
          { weight: 100, reps: 8 },
          { weight: 100, reps: 8 },
          { weight: 100, reps: 8 },
        ],
      }),
      createEntry({
        date: "2026-03-08T12:00:00.000Z",
        sets: [
          { weight: 100, reps: 8 },
          { weight: 100, reps: 8 },
          { weight: 100, reps: 8 },
        ],
      }),
      createEntry({
        date: "2026-03-15T12:00:00.000Z",
        sets: [
          { weight: 100, reps: 8 },
          { weight: 100, reps: 8 },
          { weight: 100, reps: 8, actualWeight: 140, actualReps: 8 },
        ],
      }),
    ]);

    expect(recommendation.recommendedWeight).toBe(105);
    expect(recommendation.reason).toContain("Outlier rejection ignored 1 noisy set");
  });

  it("does not reduce both load and reps after a single underperformance day", () => {
    const recommendation = buildNextExerciseRecommendation([
      createEntry({
        date: "2026-03-01T12:00:00.000Z",
        sets: [
          { weight: 100, reps: 8 },
          { weight: 100, reps: 8 },
          { weight: 100, reps: 8 },
        ],
      }),
      createEntry({
        date: "2026-03-08T12:00:00.000Z",
        sets: [
          { weight: 100, reps: 8 },
          { weight: 100, reps: 8 },
          { weight: 100, reps: 8 },
        ],
      }),
      createEntry({
        date: "2026-03-15T12:00:00.000Z",
        sets: [
          { weight: 100, reps: 8, actualWeight: 90, actualReps: 6 },
          { weight: 100, reps: 8, actualWeight: 90, actualReps: 6 },
          { weight: 100, reps: 8, actualWeight: 90, actualReps: 6 },
        ],
      }),
    ]);

    expect(recommendation.recommendedWeight).toBe(95);
    expect(recommendation.recommendedReps).toBe(8);
    expect(recommendation.reason).toContain("reps stay steady");
  });

  it("rejects a single typo set before changing the next recommendation", () => {
    const recommendation = buildNextExerciseRecommendation([
      createEntry({
        date: "2026-03-01T12:00:00.000Z",
        sets: [
          { weight: 100, reps: 8 },
          { weight: 100, reps: 8 },
          { weight: 100, reps: 8 },
        ],
      }),
      createEntry({
        date: "2026-03-08T12:00:00.000Z",
        sets: [
          { weight: 100, reps: 8 },
          { weight: 100, reps: 8 },
          { weight: 100, reps: 8 },
        ],
      }),
      createEntry({
        date: "2026-03-15T12:00:00.000Z",
        sets: [
          { weight: 100, reps: 8 },
          { weight: 100, reps: 8 },
          { weight: 100, reps: 8, actualWeight: 1000, actualReps: 8 },
        ],
      }),
    ]);

    expect(recommendation.recommendedWeight).toBe(105);
    expect(recommendation.basedOn?.topSetWeight).toBe(100);
    expect(recommendation.reason).toContain("Outlier rejection ignored 1 noisy set");
  });
});
