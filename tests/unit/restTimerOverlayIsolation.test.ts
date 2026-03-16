import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("rest timer overlay isolation", () => {
  it("moves the ticking rest timer into a dedicated top-level overlay", () => {
    const workoutDisplaySource = fs.readFileSync(
      path.join(process.cwd(), "components", "WorkoutDisplay.tsx"),
      "utf8"
    );
    const overlaySource = fs.readFileSync(
      path.join(process.cwd(), "components", "RestTimerOverlay.tsx"),
      "utf8"
    );

    expect(workoutDisplaySource).toContain("import RestTimerOverlay from \"./RestTimerOverlay\";");
    expect(workoutDisplaySource).toContain("const [activeRestTimer, setActiveRestTimer] = useState<");
    expect(workoutDisplaySource).toContain("<RestTimerOverlay");
    expect(overlaySource).toContain("const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);");
    expect(overlaySource).toContain("const interval = window.setInterval(() => {");
  });

  it("removes the nested full-screen rest dialog from each exercise row", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "ExerciseItem.tsx"),
      "utf8"
    );

    expect(source).not.toContain("Rest Between Sets");
    expect(source).not.toContain("Continue to Next Set");
    expect(source).toContain("openRestTimer({");
    expect(source).toContain("isRestTimerBlocking={isRestTimerBlocking}");
  });
});
