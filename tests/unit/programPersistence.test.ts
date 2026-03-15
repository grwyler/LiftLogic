import { describe, expect, it, vi } from "vitest";
import {
  clearUpcomingProgramData,
  getProgramResetStartDate,
} from "../../utils/programPersistence";

describe("programPersistence", () => {
  it("normalizes the reset cutoff to the local start of day", () => {
    const start = getProgramResetStartDate(new Date("2026-03-15T19:06:09.103Z"));

    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(start.getMilliseconds()).toBe(0);
  });

  it("deactivates active rules and deletes only upcoming uncompleted entries", async () => {
    const updateMany = vi.fn().mockResolvedValue({ modifiedCount: 4 });
    const deleteMany = vi.fn().mockResolvedValue({ deletedCount: 9 });
    const db = {
      collection: vi.fn((name: string) => {
        if (name === "recurringRules") {
          return { updateMany };
        }

        if (name === "workoutEntries") {
          return { deleteMany };
        }

        throw new Error(`Unexpected collection: ${name}`);
      }),
    } as any;

    const now = new Date("2026-03-15T19:06:09.103Z");
    const result = await clearUpcomingProgramData({
      db,
      userId: "user-123",
      now,
    });
    const expectedStartDate = new Date(now);
    expectedStartDate.setHours(0, 0, 0, 0);

    expect(updateMany).toHaveBeenCalledWith(
      { userId: "user-123", active: true },
      { $set: { active: false, updatedAt: expect.any(Date) } }
    );
    expect(deleteMany).toHaveBeenCalledWith({
      userId: "user-123",
      date: { $gte: expectedStartDate },
      complete: { $ne: true },
      "sets.complete": { $ne: true },
    });
    expect(result).toMatchObject({
      deactivatedRuleCount: 4,
      deletedEntryCount: 9,
      startDate: expectedStartDate,
    });
  });
});
