import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("routines starter plan library", () => {
  it("threads starter plan presets into the assistant setup dialog", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "routines.tsx"),
      "utf8"
    );

    expect(source).toContain("starterPlanLibrary");
    expect(source).toContain("Starter plan library");
    expect(source).toContain("Use this starter");
    expect(source).toContain("applyStarterPlanPreset");
  });
});
