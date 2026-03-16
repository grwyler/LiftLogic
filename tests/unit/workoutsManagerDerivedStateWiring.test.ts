import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("workouts manager derived state wiring", () => {
  it("keeps comeback and milestone state threaded from the hook into WorkoutDisplay", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "WorkoutsManager.tsx"),
      "utf8"
    );

    expect(source).toContain("const comebackGuide = useMemo(");
    expect(source).toContain("const milestoneSummary = useMemo(");
    expect(source).toContain("comebackGuide,");
    expect(source).toContain("milestoneSummary,");
    expect(source).toContain("comebackGuide={comebackGuide}");
    expect(source).toContain("milestoneSummary={milestoneSummary}");
  });
});
