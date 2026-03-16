import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("pricing page positioning", () => {
  it("defines the intended Free vs Pro Beta split", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "pricing.tsx"),
      "utf8"
    );

    expect(source).toContain(
      "Tracking stays free. Adaptive planning becomes Pro Beta."
    );
    expect(source).toContain("Workout logging and quick add");
    expect(source).toContain("Adaptive plan generation");
    expect(source).toContain("Assistant-driven plan edits and schedule changes");
    expect(source).toContain("Recurring workout schedules");
    expect(source).toContain("Progress-based recommendations");
    expect(source).toContain("Billing is now wired for self-serve upgrades.");
    expect(source).toContain("Manage billing");
  });

  it("links pricing from landing, signup, routines, and settings", () => {
    const homeSource = fs.readFileSync(
      path.join(process.cwd(), "pages", "index.tsx"),
      "utf8"
    );
    const signupSource = fs.readFileSync(
      path.join(process.cwd(), "pages", "signup.tsx"),
      "utf8"
    );
    const routinesSource = fs.readFileSync(
      path.join(process.cwd(), "pages", "routines.tsx"),
      "utf8"
    );
    const userSource = fs.readFileSync(
      path.join(process.cwd(), "pages", "user.tsx"),
      "utf8"
    );

    expect(homeSource).toContain('href="/pricing"');
    expect(homeSource).toContain("Compare plans");
    expect(signupSource).toContain('href="/pricing"');
    expect(signupSource).toContain("See Free vs Pro Beta");
    expect(routinesSource).toContain('router.push("/pricing")');
    expect(routinesSource).toContain("View pricing");
    expect(userSource).toContain('router.push("/pricing")');
    expect(userSource).toContain("Plans and pricing");
  });
});
