import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("tracker-first onboarding", () => {
  it("asks users to choose tracking versus planning before requesting sensitive profile details", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "routines.tsx"),
      "utf8"
    );

    expect(source).toContain(
      "First, choose whether you want planning help or just want to"
    );
    expect(source).toContain('Chip label="1. Choose your path"');
    expect(source).toContain("What do you want to do first?");
    expect(source).toContain(
      "You can start logging workouts right away without entering age"
    );
    expect(source).toContain('label="Age (optional)"');
    expect(source).toContain("Biological sex (optional)");

    const choicePromptIndex = source.indexOf("What do you want to do first?");
    const optionalAgeIndex = source.indexOf('label="Age (optional)"');
    expect(choicePromptIndex).toBeGreaterThan(-1);
    expect(optionalAgeIndex).toBeGreaterThan(choicePromptIndex);

    expect(source).not.toContain(
      "First I just need your name, age, and sex. Then I&apos;ll ask whether"
    );
  });
});
