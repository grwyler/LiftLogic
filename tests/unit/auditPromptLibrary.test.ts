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
    expect(runner).toContain("Cross-audit dedupe protocol");
    expect(runner).toContain("Umbrella-ticket rules");
    expect(runner).toContain("Final output requirements");
  });

  it("requires every audit to capture evidence, confidence, affected scope, and duplicate handling", () => {
    const auditFiles = [
      "regression-workflow-audit.md",
      "performance-responsiveness-audit.md",
      "ux-clarity-visual-polish-audit.md",
      "retention-behavior-product-coherence-audit.md",
      "code-quality-maintainability-audit.md",
      "backlog-audit.md",
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
  });

  it("adds a final runner note that forces cross-audit dedupe before ticket generation", () => {
    const notes = readAudit("runner-notes.md");

    expect(notes).toContain("Final dedupe checkpoint");
    expect(notes).toContain("Merge duplicate root-cause findings into an umbrella ticket");
    expect(notes).toContain("Do not finish the audit run until this checkpoint is complete.");
  });
});
