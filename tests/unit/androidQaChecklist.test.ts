import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("android QA checklist docs", () => {
  it("covers the critical Android smoke flows called out by the audit", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "docs", "android-qa-checklist.md"),
      "utf8"
    );

    expect(source).toContain("## 1. Sign-in and auth shell");
    expect(source).toContain("## 2. Setup dialog and first-run intent split");
    expect(source).toContain("## 3. Routines day flow and workout logging");
    expect(source).toContain("## 4. Dialogs, sheets, and date selection");
    expect(source).toContain("## 5. Recurring rules and drag interactions");
    expect(source).toContain("## 6. Coach and AI-assisted flows");
    expect(source).toContain("## 7. Feedback capture and bug reporting");
    expect(source).toContain("## 8. PWA and shell-specific checks");
    expect(source).toContain("Quick Add");
    expect(source).toContain("first incomplete set");
    expect(source).toContain("thumbs-up and thumbs-down feedback");
  });

  it("links the checklist from the Android shell docs and README", () => {
    const androidShellSource = fs.readFileSync(
      path.join(process.cwd(), "docs", "android-capacitor-shell.md"),
      "utf8"
    );
    const readmeSource = fs.readFileSync(
      path.join(process.cwd(), "README.md"),
      "utf8"
    );

    expect(androidShellSource).toContain("android-qa-checklist.md");
    expect(readmeSource).toContain("docs/android-qa-checklist.md");
    expect(readmeSource).toContain("repeatable Android smoke pass");
  });
});
