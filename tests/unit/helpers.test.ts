import { describe, expect, it } from "vitest";
import { toLocalDateKey } from "../../utils/helpers";

describe("helper date formatting", () => {
  it("formats a Date using the local calendar day instead of UTC slicing", () => {
    const localLateNight = new Date(2026, 2, 15, 23, 30, 0);

    expect(toLocalDateKey(localLateNight)).toBe("2026-03-15");
  });
});
