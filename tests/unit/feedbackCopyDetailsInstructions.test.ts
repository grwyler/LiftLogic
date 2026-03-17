import { describe, expect, it } from "vitest";
import {
  buildCodexCopyText,
  buildTopFiveCopyFooter,
} from "../../utils/feedbackDetails";

describe("feedback copy details instructions", () => {
  it("tells auditors to prefer production behavior for frontend and e2e validation", () => {
    const text = buildCodexCopyText({
      workItem: {
        _id: "work-123",
        type: "bug",
        title: "Sample",
        triageStatus: "new",
        fingerprint: "fp",
        occurrenceCount: 1,
        latestDescription: "Example description",
      } as any,
      evidence: [],
    });

    expect(text).toContain("Implementation brief");
    expect(text).toContain("## Verification plan");
    expect(text).toContain(
      "prefer observing real production behavior over a local run unless this is specifically a code audit"
    );
    expect(text).toContain(
      "Front-end audits and end-to-end workflow checks should be evaluated against production functionality whenever possible"
    );
    expect(text).toContain(
      "Keep this work item's ticket status updated in the database while you are working on it and when the work is done."
    );
    expect(text).toContain("## Implementation context");
    expect(text).toContain("## Verification plan");
    expect(text).not.toContain("increment version, commit, push, redeploy to prod");
  });

  it("adds the release checklist only for the top-five export footer", () => {
    expect(buildTopFiveCopyFooter()).toContain("Release completion checklist:");
    expect(buildTopFiveCopyFooter()).toContain("Increment version.");
    expect(buildTopFiveCopyFooter()).toContain("Redeploy to prod.");
  });

  it("shows TODO markers for missing closure metadata inside the implementation brief", () => {
    const text = buildCodexCopyText({
      workItem: {
        _id: "work-234",
        type: "bug",
        title: "Sample",
        triageStatus: "new",
        fingerprint: "fp",
        occurrenceCount: 1,
        latestDescription: "Description: Example description",
      } as any,
      evidence: [],
    });

    expect(text).toContain("Verification owner: TODO: missing from the current work item.");
    expect(text).toContain("Resolved app version: TODO: missing from the current work item.");
    expect(text).toContain("Resolved deploy: TODO: missing from the current work item.");
    expect(text).toContain("Automated verification: TODO: missing from the current work item.");
    expect(text).toContain("Manual verification: TODO: missing from the current work item.");
    expect(text).toContain("Regression checklist: Reported flow re-checked = pending");
  });
});
