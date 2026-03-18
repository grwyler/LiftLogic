import { describe, expect, it } from "vitest";
import {
  ASSISTANT_SETUP_DEFER_WINDOW_MS,
  getUpgradePromptCooldownState,
  recordUpgradePromptDismissal,
  shouldShowAssistantSetupPromptCard,
} from "../../utils/routinesPromptState";

describe("routines prompt state", () => {
  it("blocks repeated upgrade prompts during their cooldown window", () => {
    const dismissed = recordUpgradePromptDismissal({
      existing: {},
      key: "assistant_generation",
      reason: "declined",
      now: new Date("2026-03-18T12:00:00.000Z"),
    });

    const cooldown = getUpgradePromptCooldownState({
      existing: dismissed,
      key: "assistant_generation",
      now: new Date("2026-03-19T12:00:00.000Z"),
    });

    expect(cooldown.blocked).toBe(true);
    expect(cooldown.reminderMode).toBe("inline");
    expect(cooldown.reason).toBe("declined");
  });

  it("suppresses the assistant setup card after an explicit defer decision", () => {
    const hidden = shouldShowAssistantSetupPromptCard({
      setupCompleted: false,
      assistantSetupDeferredAt: "2026-03-18T12:00:00.000Z",
      now: new Date("2026-03-20T12:00:00.000Z"),
    });

    const visibleAgain = shouldShowAssistantSetupPromptCard({
      setupCompleted: false,
      assistantSetupDeferredAt: "2026-03-18T12:00:00.000Z",
      now: new Date(Date.parse("2026-03-18T12:00:00.000Z") + ASSISTANT_SETUP_DEFER_WINDOW_MS + 1),
    });

    expect(hidden).toBe(false);
    expect(visibleAgain).toBe(true);
  });
});
