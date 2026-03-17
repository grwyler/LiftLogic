import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("setup success copy", () => {
  it("uses next-step coaching language for setup, tracker mode, and plan generation", () => {
    const routinesSource = fs.readFileSync(
      path.join(process.cwd(), "pages", "routines.tsx"),
      "utf8"
    );
    const userSource = fs.readFileSync(
      path.join(process.cwd(), "pages", "user.tsx"),
      "utf8"
    );

    expect(routinesSource).toContain(
      "Your preferences are saved. You can build a plan anytime from setup."
    );
    expect(routinesSource).toContain(
      "Tracker mode is ready. Start logging workouts whenever you're ready."
    );
    expect(routinesSource).toContain(
      "Your first workout plan is ready. Open today's session to review or adjust it."
    );
    expect(userSource).toContain(
      "Your first workout plan is ready. Open today's session to review or adjust it."
    );

    expect(routinesSource).not.toContain('toast.success("Profile setup saved")');
    expect(routinesSource).not.toContain('toast.success("Tracker mode is ready")');
    expect(routinesSource).not.toContain('toast.success("Workout plan generated")');
    expect(userSource).not.toContain('toast.success("Workout plan generated")');
  });
});
