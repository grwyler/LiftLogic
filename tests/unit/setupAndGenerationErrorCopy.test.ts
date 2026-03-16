import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("setup and generation error copy", () => {
  it("uses action-specific recovery guidance in routines onboarding flows", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "routines.tsx"),
      "utf8"
    );

    expect(source).toContain(
      'toast.error("Your setup was not saved. Check your connection and try again.")'
    );
    expect(source).toContain(
      `toast.error("We couldn't save your setup changes just now. Try again in a moment.")`
    );
    expect(source).toContain(
      `toast.error(
        "Your workout plan could not be generated right now. Try again, or save your preferences first and generate later."
      )`
    );
    expect(source).toContain(
      'toast.error("Your current program was not cleared. Try again in a moment.")'
    );
    expect(source).not.toContain('toast.error("Failed to save setup")');
    expect(source).not.toContain(
      'toast.error("An error occurred while saving setup")'
    );
    expect(source).not.toContain('toast.error("Couldn\'t generate a workout plan")');
    expect(source).not.toContain(
      'toast.error("Couldn\'t clear the workout program")'
    );
  });

  it("keeps the same generation recovery guidance in the user setup flow", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "user.tsx"),
      "utf8"
    );

    expect(source).toContain(
      "Your workout plan could not be generated right now. Try again, or save your preferences first and generate later."
    );
    expect(source).not.toContain('toast.error("Couldn\'t generate a workout plan")');
  });
});
