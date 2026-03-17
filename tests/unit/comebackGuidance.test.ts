import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { buildComebackGuide } from "../../components/WorkoutsManager";

describe("comeback guidance", () => {
  it("detects missed scheduled sessions and extended lapses without shame framing", () => {
    const guide = buildComebackGuide({
      currentDate: new Date("2026-03-13T09:00:00.000Z"),
      statusMap: {
        "2026-03-04": {
          hasLogged: true,
          hasCompleted: true,
          hasRecurring: true,
          exerciseCount: 2,
        },
        "2026-03-09": {
          hasLogged: false,
          hasCompleted: false,
          hasRecurring: true,
          exerciseCount: 1,
        },
        "2026-03-11": {
          hasLogged: false,
          hasCompleted: false,
          hasRecurring: true,
          exerciseCount: 1,
        },
      },
    });

    expect(guide).toMatchObject({
      state: "missed_sessions_and_lapse",
      missedScheduledCount: 2,
      daysSinceLastLog: 9,
    });
    expect(guide?.headline).toContain("Fresh restart");
    expect(guide?.supportingCopy).toContain("do not need to make anything up");
  });

  it("shows supportive comeback actions in the workout flow", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "workout-display", "WorkoutHeaderSummary.tsx"),
      "utf8"
    );

    expect(source).toContain("Comeback Plan");
    expect(source).toContain("Fresh win opportunity");
    expect(source).toContain("Resume today");
    expect(source).toContain("Light restart session");
    expect(source).toContain("Reschedule this week");
    expect(source).toContain("No streak debt, no catch-up workout.");
  });
});
