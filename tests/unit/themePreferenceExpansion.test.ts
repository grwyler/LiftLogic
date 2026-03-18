import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("theme preference expansion", () => {
  it("keeps the expanded preset list and appearance helpers in shared theme preferences", () => {
    const themeSource = fs.readFileSync(
      path.join(process.cwd(), "utils", "themePreferences.ts"),
      "utf8"
    );
    const brandSource = fs.readFileSync(
      path.join(process.cwd(), "utils", "brandSystem.ts"),
      "utf8"
    );

    expect(themeSource).toContain('"graphite"');
    expect(themeSource).toContain('"ember"');
    expect(themeSource).toContain('"citrus"');
    expect(themeSource).toContain("APPEARANCE_DENSITY_OPTIONS");
    expect(themeSource).toContain("INTERFACE_SCALE_OPTIONS");
    expect(themeSource).toContain("getAppearanceDensityLabel");
    expect(themeSource).toContain("getInterfaceScaleLabel");
    expect(themeSource).toContain("brandBackgrounds.accentButton");
    expect(themeSource).toContain("brandPalette.signatureStrong");
    expect(themeSource).toContain("shared Lift Logic accent");
    expect(brandSource).toContain("brandAccentUsage");
    expect(brandSource).toContain("primaryActions");
  });

  it("keeps documented spacing and typography rhythm tokens in the app shell", () => {
    const appSource = fs.readFileSync(
      path.join(process.cwd(), "pages", "_app.tsx"),
      "utf8"
    );
    const globalSource = fs.readFileSync(
      path.join(process.cwd(), "styles", "global.css"),
      "utf8"
    );

    expect(appSource).toContain("spacing: 4 * densityScale");
    expect(appSource).toContain("subtitle1:");
    expect(appSource).toContain("body1:");
    expect(appSource).toContain("MuiTypography");
    expect(globalSource).toContain("--type-display-xl");
    expect(globalSource).toContain("--space-rhythm-5");
    expect(globalSource).toContain("--measure-copy");
  });
});
