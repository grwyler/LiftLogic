import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("bugs queue semantics", () => {
  it("renders one open work-item list across bugs and features with separate totals", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "bugs.tsx"),
      "utf8"
    );

    expect(source).toContain("const activeWorkItems = useMemo(");
    expect(source).toContain("const activeBugCount = useMemo(");
    expect(source).toContain("const activeFeatureCount = useMemo(");
    expect(source).toContain("const initiativeSummaries = useMemo(");
    expect(source).toContain("Initiative backlog structure");
    expect(source).toContain("Suggested execution-sized slices");
    expect(source).toContain("Open work items");
  });

  it("tracks copied work items as their own workflow status", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "bugs.tsx"),
      "utf8"
    );

    expect(source).toContain('"details copied": "Details Copied"');
    expect(source).toContain('triageStatus: "details copied"');
    expect(source).toContain('label="Status"');
    expect(source).toContain("<MenuItem value=\"all\">All statuses</MenuItem>");
    expect(source).toContain("const currentPrimaryListItems = useMemo(");
    expect(source).toContain("Merge candidate");
    expect(source).toContain("Child slice");
  });
});
