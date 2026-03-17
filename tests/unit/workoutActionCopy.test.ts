import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("workout action copy", () => {
  it("uses specific action labels for exercise cards, rest edits, and bug reporting", () => {
    const exerciseItemSource = fs.readFileSync(
      path.join(process.cwd(), "components", "ExerciseItem.tsx"),
      "utf8"
    );
    const loggingDialogSource = fs.readFileSync(
      path.join(process.cwd(), "components", "exercise-item", "ExerciseLoggingDialog.tsx"),
      "utf8"
    );
    const restTimerOverlaySource = fs.readFileSync(
      path.join(process.cwd(), "components", "RestTimerOverlay.tsx"),
      "utf8"
    );
    const bugRecorderSource = fs.readFileSync(
      path.join(process.cwd(), "components", "DevBugRecorder.tsx"),
      "utf8"
    );

    expect(exerciseItemSource).toContain("Start Lift");
    expect(exerciseItemSource).toContain("Edit repeat");
    expect(loggingDialogSource).toContain("Repeat Lift");
    expect(restTimerOverlaySource).toContain("Save Rest Time");
    expect(restTimerOverlaySource).toContain("Pause timer");
    expect(restTimerOverlaySource).toContain("Resume timer");
    expect(restTimerOverlaySource).toContain("Continue to Next Set");
    expect(exerciseItemSource).not.toContain(">Open<");
    expect(exerciseItemSource).not.toContain(">Apply<");
    expect(bugRecorderSource).toContain('submitting ? "Saving..." : "Save Bug Report"');
    expect(bugRecorderSource).not.toContain('submitting ? "Saving..." : "Complete"');
  });
});
