import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("user limitations guardrails", () => {
  it("shows a structured guardrail preview beside free-text limitations", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "user.tsx"),
      "utf8"
    );

    expect(source).toContain("parseLimitations");
    expect(source).toContain("Structured guardrails preview");
    expect(source).toContain("These guardrails will shape substitutions");
  });
});
