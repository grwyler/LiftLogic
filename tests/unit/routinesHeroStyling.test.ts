import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("routines hero styling", () => {
  it("keeps the routines screen aligned with the landing-style shell and cards", () => {
    const pageSource = fs.readFileSync(
      path.join(process.cwd(), "pages", "routines.tsx"),
      "utf8"
    );
    const headerSource = fs.readFileSync(
      path.join(process.cwd(), "components", "Header.tsx"),
      "utf8"
    );

    expect(pageSource).toContain('panel: "28px"');
    expect(pageSource).toContain("borderRadius: routinesRadius.panel");
    expect(pageSource).not.toContain("borderRadius: routinesRadius.hero");
    expect(headerSource).toContain('button: "18px"');
    expect(headerSource).not.toContain("borderRadius: routinesHeaderRadius.card");
  });
});
