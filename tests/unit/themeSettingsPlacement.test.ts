import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("theme settings placement", () => {
  it("keeps theme selection in profile settings instead of the routines header", () => {
    const headerSource = fs.readFileSync(
      path.join(process.cwd(), "components", "Header.tsx"),
      "utf8"
    );
    const userPageSource = fs.readFileSync(
      path.join(process.cwd(), "pages", "user.tsx"),
      "utf8"
    );
    const appSource = fs.readFileSync(
      path.join(process.cwd(), "pages", "_app.tsx"),
      "utf8"
    );

    expect(headerSource).not.toContain("Use dark mode");
    expect(headerSource).not.toContain(">Dark<");
    expect(userPageSource).toContain("Theme");
    expect(userPageSource).toContain("THEME_OPTIONS.map");
    expect(userPageSource).toContain("APPEARANCE_DENSITY_OPTIONS.map");
    expect(userPageSource).toContain("INTERFACE_SCALE_OPTIONS.map");
    expect(userPageSource).toContain("getThemePreferenceDescription");
    expect(userPageSource).toContain("getAppearanceDensityDescription");
    expect(userPageSource).toContain("getInterfaceScaleDescription");
    expect(appSource).toContain("setThemePreference");
    expect(appSource).toContain("setAppearanceDensity");
    expect(appSource).toContain("setInterfaceScale");
  });
});
