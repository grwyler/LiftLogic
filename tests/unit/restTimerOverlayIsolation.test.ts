import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("rest timer overlay isolation", () => {
  it("moves the ticking rest timer into a dedicated top-level overlay", () => {
    const workoutDisplaySource = fs.readFileSync(
      path.join(process.cwd(), "components", "WorkoutDisplay.tsx"),
      "utf8"
    );
    const restTimerActionsSource = fs.readFileSync(
      path.join(process.cwd(), "components", "workout-display", "useRestTimerActions.ts"),
      "utf8"
    );
    const overlaySource = fs.readFileSync(
      path.join(process.cwd(), "components", "RestTimerOverlay.tsx"),
      "utf8"
    );

    expect(workoutDisplaySource).toContain("import RestTimerOverlay from \"./RestTimerOverlay\";");
    expect(workoutDisplaySource).toContain("useRestTimerActions({");
    expect(workoutDisplaySource).toContain("<RestTimerOverlay");
    expect(restTimerActionsSource).toContain("const [activeRestTimer, setActiveRestTimer] = useState<");
    expect(overlaySource).toContain("const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);");
    expect(overlaySource).toContain("const interval = window.setInterval(() => {");
    expect(overlaySource).toContain("position: \"fixed\"");
    expect(overlaySource).toContain("Keep moving through the workout while the countdown runs.");
    expect(overlaySource).toContain("{isExpanded ? \"Minimize\" : \"Expand\"}");
    expect(overlaySource).not.toContain("fullScreen");
    expect(overlaySource).not.toContain("Dialog");
  });

  it("removes the nested full-screen rest dialog from each exercise row", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "exercise-item", "ExerciseLoggingDialog.tsx"),
      "utf8"
    );

    expect(source).not.toContain("Rest Between Sets");
    expect(source).not.toContain("Continue to Next Set");
    expect(source).toContain("openRestTimer({");
    expect(source).toContain("isRestTimerBlocking={isRestTimerBlocking}");
  });
});
