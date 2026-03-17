import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("workout upgrade prompt moments", () => {
  it("wires schedule and progression upgrade prompts into the workout flow", () => {
    const workoutDisplaySource = fs.readFileSync(
      path.join(process.cwd(), "components", "WorkoutDisplay.tsx"),
      "utf8"
    );
    const scheduleHookSource = fs.readFileSync(
      path.join(process.cwd(), "components", "workout-display", "useWorkoutScheduleActions.ts"),
      "utf8"
    );
    const feedbackPanelsSource = fs.readFileSync(
      path.join(process.cwd(), "components", "exercise-item", "ExerciseFeedbackPanels.tsx"),
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
    expect(scheduleHookSource).toContain("if (!currentUserId) {");

    expect(feedbackPanelsSource).toContain(
      "You unlocked a next-session recommendation from your recent logs."
    );
    expect(feedbackPanelsSource).toContain("See Pro Beta recommendation");
    expect(feedbackPanelsSource).toContain("See Pro Beta insights");
    expect(feedbackPanelsSource).toContain("Extend this PR with Pro Beta");
    expect(workoutDisplaySource).toContain("Turn this into a minimum win");
    expect(workoutDisplaySource).toContain("weekly_pro_brief_viewed");

    expect(coachPanelSource).toContain("patchResult && patchResult.applied === false");
    expect(coachPanelSource).toContain("coach-upgrade-");
  });

  it("mentions the trial path inside workout upgrade prompts", () => {
    const routinesSource = fs.readFileSync(
      path.join(process.cwd(), "pages", "routines.tsx"),
      "utf8"
    );

    expect(routinesSource).toContain("Eligible first-time upgrades can start with a 7-day trial");
    expect(routinesSource).toContain('upgradeLabel: "View trial and pricing"');
    expect(routinesSource).toContain("Extend this with a trial");
  });
});
