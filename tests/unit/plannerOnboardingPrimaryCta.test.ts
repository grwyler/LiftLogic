import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("planner onboarding primary CTA", () => {
  it("makes workout generation the prominent planner action and keeps save-only secondary", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "routines.tsx"),
      "utf8"
    );

    expect(source).toContain("plannerGenerationEnabled");
    expect(source).toContain("? handleGenerateWorkoutFromSetup");
    expect(source).toContain(': () => openUpgradePrompt("assistant_generation")');
    expect(source).toContain('? "Generate and replace plan"');
    expect(source).toContain(': "Generate first workout"');
    expect(source).toContain('variant="outlined"\n                  onClick={handleSaveSetup}');
    expect(source).toContain('{savingSetup ? "Saving..." : "Save preferences only"}');
    expect(source).not.toContain(': "Generate with assistant"}');
    expect(source).not.toContain('{savingSetup ? "Saving..." : "Save assistant setup"}');
  });
});
