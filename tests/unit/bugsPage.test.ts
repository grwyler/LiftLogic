import { describe, expect, it } from "vitest";
import {
  getWorkItemClosureWarnings,
  getWorkflowDraftResolution,
} from "../../utils/bugsWorkflow";

describe("bugs inbox workflow helpers", () => {
  it("turns draft verification inputs into structured resolution metadata", () => {
    const resolution = getWorkflowDraftResolution({
      title: "Workout log failed",
      latestDescription: "Latest description",
      fixThreadId: "thread-42",
      fixCommitSha: "abc123def",
      verificationOwner: "qa@liftlogic",
      resolvedAppVersion: "1.2.3",
      resolvedDeployId: "",
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
      title: "Workout log failed",
      latestDescription: "Latest description",
      fixThreadId: "",
      fixCommitSha: "",
      verificationOwner: "",
      resolvedAppVersion: "",
      resolvedDeployId: "",
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
});
