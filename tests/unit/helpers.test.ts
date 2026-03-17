import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import {
  buildDayWorkoutsFromEntriesAndRules,
  ruleToExercise,
  toLocalDateKey,
} from "../../utils/helpers";

describe("helper date formatting", () => {
  it("formats a Date using the local calendar day instead of UTC slicing", () => {
    const localLateNight = new Date(2026, 2, 15, 23, 30, 0);

    expect(toLocalDateKey(localLateNight)).toBe("2026-03-15");
  });

  it("maps recurring rule contract fields into workout exercises without casts", () => {
    const ruleId = new ObjectId();
    const exercise = ruleToExercise(
      {
        _id: ruleId,
        userId: "user-1",
        exerciseId: "squat",
        exerciseName: "Back Squat",
        exerciseType: "weight",
        defaultMax: 225,
        defaultRest: 150,
        routineName: "Leg Day",
        dayOfWeek: 2,
        intervalWeeks: 1,
        startDate: new Date("2026-03-10T00:00:00.000Z"),
        active: true,
        templateSets: [
          {
            name: "Working Set 1",
            reps: 5,
            weight: 185,
          },
        ],
      },
      "2026-03-17"
    );

    expect(exercise).toMatchObject({
      ruleId: ruleId.toString(),
      exerciseId: "squat",
      name: "Back Squat",
      type: "weight",
      max: 225,
      rest: 150,
      routineName: "Leg Day",
      isRepeating: true,
    });
    expect(exercise.entryInstanceId).toContain(ruleId.toString());
    expect(exercise.sets[0].id).toBeTruthy();
  });

  it("keeps materialized recurring entries from duplicating a matching rule", () => {
    const ruleId = new ObjectId().toString();
    const day = buildDayWorkoutsFromEntriesAndRules(
      [
        {
          userId: "user-1",
          exerciseId: "squat",
          routineName: "Leg Day",
          date: new Date("2026-03-17T00:00:00.000Z"),
          ruleId,
          name: "Back Squat",
          type: "weight",
          sets: [],
        },
      ],
      [
        {
          _id: new ObjectId(ruleId),
          userId: "user-1",
          exerciseId: "squat",
          exerciseName: "Back Squat",
          exerciseType: "weight",
          routineName: "Leg Day",
          dayOfWeek: 2,
          intervalWeeks: 1,
          startDate: new Date("2026-03-10T00:00:00.000Z"),
          active: true,
          templateSets: [],
        },
      ],
      "2026-03-17"
    );

    expect(day).toHaveLength(1);
    expect(day[0].exercises).toHaveLength(1);
    expect(day[0].exercises[0].name).toBe("Back Squat");
  });
});
