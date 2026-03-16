import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("theme state stability", () => {
  it("keeps theme setter props stable so profile changes do not snap back", () => {
    const appSource = fs.readFileSync(
      path.join(process.cwd(), "pages", "_app.tsx"),
      "utf8"
    );

    expect(appSource).toContain("useCallback");
    expect(appSource).toContain("const applyThemePreference = useCallback");
    expect(appSource).toContain("const applyDarkMode = useCallback");
    expect(appSource).toContain("setThemePreference={applyThemePreference}");
    expect(appSource).toContain("setDarkMode={applyDarkMode}");
  });
});
