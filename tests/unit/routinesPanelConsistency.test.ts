import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("routines panel consistency", () => {
  it("uses a shared flatter panel system for workout summary sections", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "workout-display", "panelStyles.ts"),
      "utf8"
    );
    const radiusTokensSource = fs.readFileSync(
      path.join(process.cwd(), "styles", "radiusTokens.ts"),
      "utf8"
    );

    expect(source).toContain("const routinesPanelRadius =");
    expect(radiusTokensSource).toContain("control: \"12px\"");
    expect(radiusTokensSource).toContain("card: \"20px\"");
    expect(radiusTokensSource).toContain("panel: \"28px\"");
    const headerSource = fs.readFileSync(
      path.join(process.cwd(), "components", "workout-display", "WorkoutHeaderSummary.tsx"),
      "utf8"
    );
    expect(headerSource).toContain("borderRadius: routinesPanelRadius.shell");
    expect(headerSource).toContain("borderRadius: routinesPanelRadius.section");
    expect(headerSource).not.toContain("borderRadius: 4,");
  });

  it("keeps the muscle groups panel flattened instead of nesting paper cards", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "MuscleRecoveryMap.tsx"),
      "utf8"
    );

    expect(source).toContain("const musclePanelRadius =");
    expect(source).toContain("borderRadius: musclePanelRadius.shell");
    expect(source).toContain("borderRadius: musclePanelRadius.row");
  });
});
