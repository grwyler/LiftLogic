import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("bugs page workflow actions", () => {
  it("keeps bugs and features in one filtered work list with inline status and priority controls", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "bugs.tsx"),
      "utf8"
    );

    expect(source).not.toContain("getPrimaryAction(");
    expect(source).toContain("Work queue");
    expect(source).toContain('label="Search"');
    expect(source).toContain('label="Type"');
    expect(source).toContain('label="List"');
    expect(source).toContain('label="Priority"');
    expect(source).toContain('label="Label"');
    expect(source).toContain("Copy Details Of Top 5");
    expect(source).toContain("handleCopyTopFiveDetails");
    expect(source).toContain("currentPrimaryListItems.slice(0, 5)");
    expect(source).toContain("buildTopFiveCopyFooter()");
    expect(source).toContain("Open work items");
    expect(source).toContain('label="Status"');
    expect(source).toContain('label="Labels"');
    expect(source).toContain("VersionChangelogDialog");
    expect(source).toContain("setSelectedChangelogVersion");
    expect(source).toContain("handleWorkflowUpdate(item, {");
    expect(source).toContain('triageStatus: "details copied"');
    expect(source).toContain("Founding beta access");
    expect(source).toContain("Monetization summary");
    expect(source).toContain("fetchMonetizationSummary");
    expect(source).toContain("Refresh summary");
    expect(source).toContain("fetchFoundingBetaUsers");
    expect(source).toContain("saveFoundingBetaAccess");
    expect(source).toContain("Grant access");
    expect(source).toContain("Save expiration/note");
    expect(source).toContain("Revoke");
    expect(source).toContain("Structured repro");
    expect(source).toContain("Start here");
    expect(source).toContain("Verification pack");
    expect(source).toContain("Completed checks");
    expect(source).toContain("handleVerificationCompletionToggle");
    expect(source).toContain("implementationSummary");
    expect(source).toContain("verificationDoneCriteria");
  });
});
