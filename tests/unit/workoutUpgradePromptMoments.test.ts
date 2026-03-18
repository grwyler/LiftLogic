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
      "Your logs are ready for a next-session suggestion. Free still shows the progress you earned first."
    );
    expect(feedbackPanelsSource).toContain("See the coaching recommendation");
    expect(feedbackPanelsSource).toContain("See deeper coaching insights");
    expect(feedbackPanelsSource).toContain("Explore the coaching follow-up");
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
    expect(routinesSource).toContain("upgrade_prompt_declined_");
    expect(routinesSource).toContain("upgrade_prompt_snoozed_");
    expect(routinesSource).toContain("Keep the workout moving");
  });
});
