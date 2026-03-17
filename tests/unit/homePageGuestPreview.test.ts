import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("home page guest workout preview", () => {
  it("shows a real sample workout preview before signup", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "index.tsx"),
      "utf8"
    );

    expect(source).toContain("Preview The Workout");
    expect(source).toContain("Guest workout preview");
    expect(source).toContain("Foundation Dumbbell Day");
    expect(source).toContain("guest_preview_start_free_beta");
  });
});
