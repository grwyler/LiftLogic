import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("theme preference expansion", () => {
  it("keeps the expanded preset list and appearance helpers in shared theme preferences", () => {
    const themeSource = fs.readFileSync(
      path.join(process.cwd(), "utils", "themePreferences.ts"),
      "utf8"
    );

    expect(themeSource).toContain('"graphite"');
    expect(themeSource).toContain('"ember"');
    expect(themeSource).toContain('"citrus"');
    expect(themeSource).toContain("APPEARANCE_DENSITY_OPTIONS");
    expect(themeSource).toContain("INTERFACE_SCALE_OPTIONS");
    expect(themeSource).toContain("getAppearanceDensityLabel");
    expect(themeSource).toContain("getInterfaceScaleLabel");
  });
});
