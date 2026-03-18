import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  createWorkflowDraft,
  getWorkItemClosureWarnings,
  getWorkflowDraftResolution,
} from "../../utils/bugsWorkflow";

describe("bugs inbox workflow helpers", () => {
  it("turns draft verification inputs into structured resolution metadata", () => {
    const resolution = getWorkflowDraftResolution({
      ...createWorkflowDraft({
        title: "Workout log failed",
        latestDescription: "Latest description",
      }),
      fixThreadId: "thread-42",
      fixCommitSha: "abc123def",
      verificationOwner: "qa@liftlogic",
      resolvedAppVersion: "1.2.3",
      resolvedDeployId: "",
      shippedSummary: "",
      deferredFollowUpsText: "",
      validatedCommandsText: "npm run test:unit -- tests/unit/bugsPage.test.ts",
      manualChecksText: "Opened /bugs and reviewed the verification panel",
      regressionChecklist: [
        { label: "Reported flow re-checked", outcome: "passed" },
        { label: "Copy details output reviewed", outcome: "passed" },
        { label: "Closure workflow verified", outcome: "not_applicable" },
      ],
    });

    expect(resolution).toEqual({
      verificationOwner: "qa@liftlogic",
      resolvedAppVersion: "1.2.3",
      resolvedDeployId: undefined,
      shippedSummary: undefined,
      deferredFollowUps: [],
      validatedCommands: ["npm run test:unit -- tests/unit/bugsPage.test.ts"],
      manualChecks: ["Opened /bugs and reviewed the verification panel"],
      regressionChecklist: [
        { label: "Reported flow re-checked", outcome: "passed", notes: undefined },
        { label: "Copy details output reviewed", outcome: "passed", notes: undefined },
        { label: "Closure workflow verified", outcome: "not_applicable", notes: undefined },
      ],
    });
  });

  it("warns when a work item is missing required closure evidence", () => {
    const warnings = getWorkItemClosureWarnings({
      ...createWorkflowDraft({
        title: "Workout log failed",
        latestDescription: "Latest description",
      }),
      fixThreadId: "",
      fixCommitSha: "",
      verificationOwner: "",
      resolvedAppVersion: "",
      resolvedDeployId: "",
      shippedSummary: "",
      deferredFollowUpsText: "",
      validatedCommandsText: "",
      manualChecksText: "",
      regressionChecklist: [
        { label: "Reported flow re-checked", outcome: "passed" },
        { label: "Copy details output reviewed", outcome: "pending" },
        { label: "Closure workflow verified", outcome: "pending" },
      ],
    });

    expect(warnings).toEqual([
      "Add a verification owner.",
      "Record the resolved app version or deploy.",
      "List at least one validating command.",
      "List at least one completed manual check.",
      "Complete the regression checklist outcomes.",
    ]);
  });

  it("normalizes malformed stored regression checklist data instead of crashing draft creation", () => {
    const draft = createWorkflowDraft({
      title: "Legacy workflow item",
      latestDescription: "Older resolution payload",
      resolution: {
        regressionChecklist: {
          label: "Reported flow re-checked",
          outcome: "passed",
        } as any,
      } as any,
    });

    expect(draft.regressionChecklist).toEqual([
      { label: "Reported flow re-checked", outcome: "pending" },
      { label: "Copy details output reviewed", outcome: "pending" },
      { label: "Closure workflow verified", outcome: "pending" },
    ]);
  });

  it("keeps human tasks separate from the main bug queue and exposes a manual add flow", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "bugs.tsx"),
      "utf8"
    );

    expect(source).toContain("Human Tasks");
    expect(source).toContain("Add Human Task");
    expect(source).toContain("handleCreateHumanTask");
    expect(source).toContain("No open human tasks yet.");
    expect(source).toContain("Work queue");
  });

  it("surfaces inbox load failures instead of showing a fake empty queue", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "bugs.tsx"),
      "utf8"
    );

    expect(source).toContain("workflowLoadError");
    expect(source).toContain("Retry inbox load");
    expect(source).toContain(
      "The feedback inbox failed to load. Retry the inbox before trusting an empty queue."
    );
  });
});
