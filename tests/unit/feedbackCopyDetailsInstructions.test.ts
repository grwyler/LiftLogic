import { describe, expect, it } from "vitest";
import { buildCodexCopyText } from "../../utils/feedbackDetails";

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
    expect(text).toContain("increment version, commit, push, redeploy to prod");
  });
});
