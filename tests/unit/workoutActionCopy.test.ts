import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("workout action copy", () => {
  it("uses specific action labels for exercise cards, rest edits, and bug reporting", () => {
    const exerciseItemSource = fs.readFileSync(
      path.join(process.cwd(), "components", "ExerciseItem.tsx"),
      "utf8"
    );
    const bugRecorderSource = fs.readFileSync(
      path.join(process.cwd(), "components", "DevBugRecorder.tsx"),
      "utf8"
    );

    expect(exerciseItemSource).toContain("Start Lift");
    expect(exerciseItemSource).toContain("Save Rest Time");
    expect(exerciseItemSource).not.toContain(">Open<");
    expect(exerciseItemSource).not.toContain(">Apply<");
    expect(bugRecorderSource).toContain('submitting ? "Saving..." : "Save Bug Report"');
    expect(bugRecorderSource).not.toContain('submitting ? "Saving..." : "Complete"');
  });
});
