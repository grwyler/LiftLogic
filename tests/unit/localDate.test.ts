import { describe, expect, it } from "vitest";
import {
  endOfLocalDay,
  parseLocalDateInput,
  parseLocalDateKey,
  startOfLocalDay,
  toLocalDateKey,
} from "../../utils/localDate";

describe("localDate", () => {
  it("formats the local calendar day without UTC drift", () => {
    const lateNight = new Date(2026, 2, 15, 23, 30, 0);

    expect(toLocalDateKey(lateNight)).toBe("2026-03-15");
  });

  it("parses yyyy-mm-dd values as local dates", () => {
    const parsed = parseLocalDateKey("2026-03-15");

    expect(parsed).not.toBeNull();
    expect(parsed && toLocalDateKey(parsed)).toBe("2026-03-15");
  });

  it("normalizes day boundaries for recurring-safe queries", () => {
    const parsed = parseLocalDateInput("2026-03-15T14:45:00Z");
    expect(parsed).not.toBeNull();

    const start = startOfLocalDay(parsed as Date);
    const end = endOfLocalDay(parsed as Date);

    expect(start.getHours()).toBe(0);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
  });
});
