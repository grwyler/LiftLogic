import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const readAudit = (name: string) =>
  fs.readFileSync(path.join(process.cwd(), "audits", name), "utf8");

describe("audit prompt library", () => {
  it("defines a scope-based orchestrator with applicability rules and dedupe checkpoints", () => {
    const runner = readAudit("run-audit.md");

    expect(runner).toContain("Sprint Closeout Audit Orchestrator");
    expect(runner).toContain("Applicability matrix");
    expect(runner).toContain("Backlog");
    expect(runner).toContain("Data Integrity");
    expect(runner).toContain("Release Readiness");
    expect(runner).toContain("Subscription");
    expect(runner).toContain("Accessibility");
    expect(runner).toContain("Analytics");
    expect(runner).toContain("Product Coherence");
    expect(runner).toContain("Test Coverage");
    expect(runner).toContain("Mandatory trigger rules");
    expect(runner).toContain("Cross-audit dedupe protocol");
    expect(runner).toContain("Umbrella-ticket rules");
    expect(runner).toContain("Backlog Access Fallback");
    expect(runner).toContain("live authenticated `/bugs` admin surface");
    expect(runner).toContain("Final output requirements");
    expect(runner).toContain("Ship, ship with conditions, or no-ship recommendation");
  });

  it("requires every audit to capture evidence, confidence, affected scope, and duplicate handling", () => {
    const auditFiles = [
      "regression-workflow-audit.md",
      "performance-responsiveness-audit.md",
      "ux-clarity-visual-polish-audit.md",
      "retention-habit-loop-audit.md",
      "product-coherence-feature-creep-audit.md",
      "code-quality-maintainability-audit.md",
      "backlog-audit.md",
      "data-integrity-state-recovery-audit.md",
      "release-readiness-audit.md",
      "subscription-paywall-conversion-audit.md",
      "accessibility-mobile-ergonomics-audit.md",
      "analytics-instrumentation-quality-audit.md",
      "test-coverage-regression-defense-audit.md",
    ];

    auditFiles.forEach((fileName) => {
      const prompt = readAudit(fileName);
      expect(prompt).toContain("Cadence");
      expect(prompt).toContain("Trigger conditions");
      expect(prompt).toContain("Required inputs");
      expect(prompt).toContain("Duplicate or related work check");
    });

    expect(readAudit("regression-workflow-audit.md")).toContain("Confidence");
    expect(readAudit("code-quality-maintainability-audit.md")).toContain(
      "implementation-ready or explicitly `needs-investigation`"
    );
    expect(readAudit("data-integrity-state-recovery-audit.md")).toContain(
      "visual lag, actual persistence corruption, or both"
    );
    expect(readAudit("release-readiness-audit.md")).toContain("ship with conditions");
    expect(readAudit("release-readiness-audit.md")).toContain("Blocking issues before");
    expect(readAudit("subscription-paywall-conversion-audit.md")).toContain(
      "manipulative or beginner-hostile upgrade patterns"
    );
    expect(readAudit("accessibility-mobile-ergonomics-audit.md")).toContain(
      "legal or compliance risk"
    );
    expect(readAudit("analytics-instrumentation-quality-audit.md")).toContain(
      "concrete observability gaps"
    );
    expect(readAudit("product-coherence-feature-creep-audit.md")).toContain(
      "core promise"
    );
    expect(readAudit("retention-habit-loop-audit.md")).toContain("comeback");
    expect(readAudit("test-coverage-regression-defense-audit.md")).toContain(
      "Distinguish meaningful behavioral coverage from brittle implementation-detail tests"
    );
  });

  it("adds a final runner note that forces cross-audit dedupe before ticket generation", () => {
    const notes = readAudit("runner-notes.md");

    expect(notes).toContain("Admin and `/bugs` Access");
    expect(notes).toContain("authenticated browser-backed `/bugs` admin workflow");
    expect(notes).toContain("Final dedupe checkpoint");
    expect(notes).toContain("Merge duplicate root-cause findings into an umbrella ticket");
    expect(notes).toContain("Confirm backlog mutations were actually applied to `/bugs`");
    expect(notes).toContain("ship with conditions");
    expect(notes).toContain("release-readiness audit consumed upstream findings");
    expect(notes).toContain("Do not finish the audit run until this checkpoint is complete.");
  });
});
