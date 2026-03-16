import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("setup coach copy", () => {
  it("keeps the opening assistant copy free of mojibake apostrophes", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "utils", "workoutGeneration.ts"),
      "utf8"
    );

    expect(source).toContain("I saved your setup and I'm ready");
    expect(source).toContain(
      "You can tell me your main goal any time and I'll adapt around it."
    );
    expect(source).toContain("I'll keep your equipment in mind:");
    expect(source).not.toContain("Iâ€™m");
    expect(source).not.toContain("Iâ€™ll");
    expect(source).not.toContain("â€™");
  });
});
