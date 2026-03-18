import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("pricing page positioning", () => {
  it("defines the intended Free vs Pro split", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "pricing.tsx"),
      "utf8"
    );

    expect(source).toContain(
      "Tracking stays free. Adaptive planning becomes Pro."
    );
    expect(source).toContain("Starter Kickoff");
    expect(source).toContain("$29 one-time kickoff offer");
    expect(source).toContain("pricing_starter_kickoff_cta");
    expect(source).toContain("Workout logging and quick add");
    expect(source).toContain("Adaptive plan generation");
    expect(source).toContain("Assistant-driven plan edits and schedule changes");
    expect(source).toContain("Recurring workout schedules");
    expect(source).toContain("Progress-based recommendations");
    expect(source).toContain("Billing is now wired for self-serve upgrades.");
    expect(source).toContain("Manage billing");
    expect(source).toContain("Before you leave Pro");
    expect(source).toContain("Pause for 30 days");
    expect(source).toContain("Switch billing cadence");
    expect(source).toContain("Continue to cancel");
    expect(source).toContain("cancel_save_");
    expect(source).toContain("Start with a real {trialDays}-day Pro trial");
    expect(source).toContain("What happens after the trial?");
    expect(source).toContain("pricing_trial_${option.interval}");
    expect(source).toContain("Premium Proof");
    expect(source).toContain("Show me the coaching layer, not just the feature list.");
    expect(source).toContain("pricing_proof_sample_plan");
    expect(source).toContain("pricing_proof_recommendation_preview");
    expect(source).toContain("pricing_proof_schedule_adjustment");
    expect(source).toContain("Buyer FAQ");
    expect(source).toContain("Trust signals before checkout");
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
    expect(signupSource).toContain("See Free vs Pro");
    expect(routinesSource).toContain('router.push("/pricing")');
    expect(routinesSource).toContain("View pricing");
    expect(userSource).toContain('router.push("/pricing")');
    expect(userSource).toContain("Plans and pricing");
  });
});
