import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("font loading strategy", () => {
  it("loads app fonts through next/font instead of a Google Fonts CSS import", () => {
    const appSource = fs.readFileSync(
      path.join(process.cwd(), "pages", "_app.tsx"),
      "utf8"
    );
    const globalSource = fs.readFileSync(
      path.join(process.cwd(), "styles", "global.css"),
      "utf8"
    );

    expect(appSource).toContain('from "next/font/google"');
    expect(appSource).toContain("Instrument_Sans");
    expect(appSource).toContain("Manrope");
    expect(appSource).toContain('variable: "--font-body"');
    expect(appSource).toContain('variable: "--font-display"');
    expect(globalSource).not.toContain("fonts.googleapis.com");
    expect(globalSource).toContain('font-family: var(--font-body), "Instrument Sans", sans-serif;');
    expect(globalSource).toContain('font-family: var(--font-display), "Manrope", sans-serif;');
  });
});
