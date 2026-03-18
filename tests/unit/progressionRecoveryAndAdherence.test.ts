import { describe, expect, it } from "vitest";
import { buildNextExerciseRecommendation } from "../../utils/progression";
import { WorkoutEntryDoc } from "../../utils/types";

const createCompletedEntry = ({
  date,
  plannedWeight,
  plannedReps,
  actualWeight = plannedWeight,
  actualReps = plannedReps,
}: {
  date: string;
  plannedWeight: number;
  plannedReps: number;
  actualWeight?: number;
  actualReps?: number;
}): WorkoutEntryDoc => ({
  userId: "user-1",
  exerciseId: "bench-press",
  routineName: "Push Day",
  name: "Bench Press",
  type: "weight",
  complete: true,
  skipped: false,
  date: new Date(date),
  sets: Array.from({ length: 3 }, (_, index) => ({
    name: `Working Set ${index + 1}`,
    weight: plannedWeight,
    reps: plannedReps,
    actualWeight,
    actualReps,
    complete: true,
  })),
});

const createSkippedEntry = (date: string): WorkoutEntryDoc => ({
  userId: "user-1",
  exerciseId: "bench-press",
  routineName: "Push Day",
  name: "Bench Press",
  type: "weight",
  complete: false,
  skipped: true,
  date: new Date(date),
  sets: [],
});

describe("progression recovery and adherence handling", () => {
  it("keeps recommendations conservative after missed planned exposures", () => {
    const repeatedSkipRecommendation = buildNextExerciseRecommendation(
      [
        createSkippedEntry("2026-03-18T12:00:00.000Z"),
        createSkippedEntry("2026-03-16T12:00:00.000Z"),
        createCompletedEntry({
          date: "2026-03-14T12:00:00.000Z",
          plannedWeight: 100,
          plannedReps: 8,
        }),
        createCompletedEntry({
          date: "2026-03-10T12:00:00.000Z",
          plannedWeight: 100,
          plannedReps: 8,
        }),
      ],
      "hypertrophy",
      "lb"
    );

    const singleSkipRecommendation = buildNextExerciseRecommendation(
      [
        createSkippedEntry("2026-03-16T12:00:00.000Z"),
        createCompletedEntry({
          date: "2026-03-14T12:00:00.000Z",
          plannedWeight: 100,
          plannedReps: 8,
        }),
        createCompletedEntry({
          date: "2026-03-10T12:00:00.000Z",
          plannedWeight: 100,
          plannedReps: 8,
        }),
      ],
      "hypertrophy",
      "lb"
    );

    expect(repeatedSkipRecommendation.reason).toContain("missed planned exposures");
    expect(repeatedSkipRecommendation.recommendedSets).toBeLessThan(
      singleSkipRecommendation.recommendedSets ?? Number.POSITIVE_INFINITY
    );
    expect(repeatedSkipRecommendation.recommendedWeight).toBeLessThanOrEqual(
      singleSkipRecommendation.recommendedWeight ?? Number.POSITIVE_INFINITY
    );
  });

  it("uses a staged return ramp after two-week, four-week, and six-week layoffs", () => {
    const twoWeekRamp = buildNextExerciseRecommendation(
      [
        createCompletedEntry({
          date: "2026-03-15T12:00:00.000Z",
          plannedWeight: 100,
          plannedReps: 8,
        }),
        createCompletedEntry({
          date: "2026-03-01T12:00:00.000Z",
          plannedWeight: 100,
          plannedReps: 8,
        }),
      ],
      "hypertrophy",
      "lb"
    );
    const fourWeekRamp = buildNextExerciseRecommendation(
      [
        createCompletedEntry({
          date: "2026-03-15T12:00:00.000Z",
          plannedWeight: 100,
          plannedReps: 8,
        }),
        createCompletedEntry({
          date: "2026-02-15T12:00:00.000Z",
          plannedWeight: 100,
          plannedReps: 8,
        }),
      ],
      "hypertrophy",
      "lb"
    );
    const sixWeekRamp = buildNextExerciseRecommendation(
      [
        createCompletedEntry({
          date: "2026-03-15T12:00:00.000Z",
          plannedWeight: 100,
          plannedReps: 8,
        }),
        createCompletedEntry({
          date: "2026-01-25T12:00:00.000Z",
          plannedWeight: 100,
          plannedReps: 8,
        }),
      ],
      "hypertrophy",
      "lb"
    );

    expect(twoWeekRamp.reason).toContain("return ramp");
    expect(fourWeekRamp.reason).toContain("return ramp");
    expect(sixWeekRamp.reason).toContain("return ramp");
    expect(twoWeekRamp.recommendedSets).toBeGreaterThanOrEqual(
      fourWeekRamp.recommendedSets ?? 0
    );
    expect(fourWeekRamp.recommendedSets).toBeGreaterThanOrEqual(
      sixWeekRamp.recommendedSets ?? 0
    );
    expect(twoWeekRamp.recommendedWeight).toBeGreaterThanOrEqual(
      fourWeekRamp.recommendedWeight ?? 0
    );
    expect(fourWeekRamp.recommendedWeight).toBeGreaterThanOrEqual(
      sixWeekRamp.recommendedWeight ?? 0
    );
  });

  it("accelerates or extends the return ramp based on the quality of the comeback session", () => {
    const strongReturn = buildNextExerciseRecommendation(
      [
        createCompletedEntry({
          date: "2026-03-15T12:00:00.000Z",
          plannedWeight: 100,
          plannedReps: 8,
          actualWeight: 105,
          actualReps: 10,
        }),
        createCompletedEntry({
          date: "2026-02-15T12:00:00.000Z",
          plannedWeight: 100,
          plannedReps: 8,
        }),
      ],
      "hypertrophy",
      "lb"
    );

    const roughReturn = buildNextExerciseRecommendation(
      [
        createCompletedEntry({
          date: "2026-03-15T12:00:00.000Z",
          plannedWeight: 100,
          plannedReps: 8,
          actualWeight: 95,
          actualReps: 6,
        }),
        createCompletedEntry({
          date: "2026-02-15T12:00:00.000Z",
          plannedWeight: 100,
          plannedReps: 8,
        }),
      ],
      "hypertrophy",
      "lb"
    );

    expect(strongReturn.recommendedWeight).toBeGreaterThan(
      roughReturn.recommendedWeight ?? 0
    );
    expect(strongReturn.recommendedSets).toBeGreaterThanOrEqual(
      roughReturn.recommendedSets ?? 0
    );
  });
});
