import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("loading indicator refresh", () => {
  it("replaces the dumbbell icon spinner with a custom motion loader", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "LoadingIndicator.tsx"),
      "utf8"
    );

    expect(source).not.toContain("FaDumbbell");
    expect(source).toContain("Building Today&apos;s Session");
    expect(source).toContain("Syncing your plan, progress, and next lift.");
    expect(source).toContain("laneSweep");
    expect(source).toContain("setRise");
  });
});
