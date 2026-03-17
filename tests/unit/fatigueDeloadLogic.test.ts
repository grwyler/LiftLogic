import { describe, expect, it } from "vitest";
import { buildNextExerciseRecommendation } from "../../utils/progression";

describe("fatigue and deload recommendation logic", () => {
  it("triggers a deload after repeated high-fatigue exposures", () => {
    const recommendation = buildNextExerciseRecommendation(
      [
        {
          userId: "user-1",
          exerciseId: "bench",
          routineName: "Workout",
          name: "Bench Press",
          type: "weight",
          complete: true,
          date: new Date("2026-03-17T12:00:00.000Z"),
          sets: [
            {
              name: "Working Set 1",
              complete: true,
              reps: 8,
              actualReps: 6,
              weight: 185,
              actualWeight: 175,
            },
          ],
        },
        {
          userId: "user-1",
          exerciseId: "bench",
          routineName: "Workout",
          name: "Bench Press",
          type: "weight",
          complete: true,
          date: new Date("2026-03-15T12:00:00.000Z"),
          sets: [
            {
              name: "Working Set 1",
              complete: true,
              reps: 8,
              actualReps: 6,
              weight: 185,
              actualWeight: 175,
            },
          ],
        },
        {
          userId: "user-1",
          exerciseId: "bench",
          routineName: "Workout",
          name: "Bench Press",
          type: "weight",
          complete: true,
          date: new Date("2026-03-11T12:00:00.000Z"),
          sets: [
            {
              name: "Working Set 1",
              complete: true,
              reps: 8,
              actualReps: 8,
              weight: 185,
              actualWeight: 185,
            },
          ],
        },
      ],
      "hypertrophy",
      "lb"
    );

    expect(recommendation.fatigue?.state).toBe("deload");
    expect(recommendation.fatigue?.deloadTriggered).toBe(true);
    expect(recommendation.recommendedSets).toBeLessThanOrEqual(1);
    expect(recommendation.reason).toContain("prescribes a deload");
  });

  it("returns to normal progression when fatigue signals clear", () => {
    const recommendation = buildNextExerciseRecommendation(
      [
        {
          userId: "user-1",
          exerciseId: "bench",
          routineName: "Workout",
          name: "Bench Press",
          type: "weight",
          complete: true,
          date: new Date("2026-03-17T12:00:00.000Z"),
          sets: [
            {
              name: "Working Set 1",
              complete: true,
              reps: 8,
              actualReps: 8,
              weight: 185,
              actualWeight: 185,
            },
          ],
        },
        {
          userId: "user-1",
          exerciseId: "bench",
          routineName: "Workout",
          name: "Bench Press",
          type: "weight",
          complete: true,
          date: new Date("2026-03-12T12:00:00.000Z"),
          sets: [
            {
              name: "Working Set 1",
              complete: true,
              reps: 8,
              actualReps: 8,
              weight: 180,
              actualWeight: 180,
            },
          ],
        },
      ],
      "hypertrophy",
      "lb"
    );

    expect(recommendation.fatigue?.state === "fresh" || recommendation.fatigue?.state === "building").toBe(true);
    expect(recommendation.fatigue?.deloadTriggered).toBe(false);
  });
});
