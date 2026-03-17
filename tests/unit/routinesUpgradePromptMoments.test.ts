import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("routines upgrade prompt moments", () => {
  it("opens in-flow upgrade prompts for the assistant, coach, schedules, and progression moments", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "routines.tsx"),
      "utf8"
    );

    expect(source).toContain('openUpgradePrompt("assistant_generation")');
    expect(source).toContain('openUpgradePrompt("coach_regeneration")');
    expect(source).toContain('openUpgradePrompt("recurring_schedule")');
    expect(source).toContain('openUpgradePrompt("progression_recommendation")');
    expect(source).toContain('openUpgradePrompt("personal_record_celebration")');
    expect(source).toContain("<UpgradePromptDialog");
    expect(source).toContain("Keep tracking free");
    expect(source).toContain("Build on this personal record while it is fresh");
  });
});
