import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("workout upgrade prompt moments", () => {
  it("wires schedule and progression upgrade prompts into the workout flow", () => {
    const workoutDisplaySource = fs.readFileSync(
      path.join(process.cwd(), "components", "WorkoutDisplay.tsx"),
      "utf8"
    );
    const exerciseItemSource = fs.readFileSync(
      path.join(process.cwd(), "components", "ExerciseItem.tsx"),
      "utf8"
    );
    const coachPanelSource = fs.readFileSync(
      path.join(process.cwd(), "components", "CoachChatPanel.tsx"),
      "utf8"
    );

    expect(workoutDisplaySource).toContain("onRequestRecurringUpgradePrompt?.();");
    expect(workoutDisplaySource).toContain(
      "onRequestProgressionUpgradePrompt={"
    );
    expect(workoutDisplaySource).toContain("if (!currentUserId) {");

    expect(exerciseItemSource).toContain(
      "You unlocked a next-session recommendation from your recent logs."
    );
    expect(exerciseItemSource).toContain("See Pro Beta recommendation");
    expect(exerciseItemSource).toContain("See Pro Beta insights");
    expect(exerciseItemSource).toContain("const handleOpenRepeatFlow");

    expect(coachPanelSource).toContain("patchResult && patchResult.applied === false");
    expect(coachPanelSource).toContain("coach-upgrade-");
  });
});
