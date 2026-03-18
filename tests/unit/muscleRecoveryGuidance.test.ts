import { describe, expect, it } from "vitest";
import { buildRecoveryGuidance } from "../../utils/muscleRecovery";

describe("muscle recovery guidance", () => {
  it("gives permission to rest or lighten the day when most targets were trained recently", () => {
    const guidance = buildRecoveryGuidance([
      { label: "Chest", hoursAgo: 8 },
      { label: "Shoulders", hoursAgo: 10 },
      { label: "Triceps", hoursAgo: 12 },
    ]);

    expect(guidance?.tone).toBe("rest");
    expect(guidance?.headline).toContain("lighter version");
  });

  it("encourages a normal push when the workout muscles are fresh", () => {
    const guidance = buildRecoveryGuidance([
      { label: "Quads", hoursAgo: null },
      { label: "Glutes", hoursAgo: 48 },
    ]);

    expect(guidance?.tone).toBe("push");
    expect(guidance?.headline).toContain("Good day to push");
  });
});
