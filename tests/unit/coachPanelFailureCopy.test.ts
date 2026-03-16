import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("coach panel failure copy", () => {
  it("uses actionable recovery language for chat and feedback failures", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "CoachChatPanel.tsx"),
      "utf8"
    );

    expect(source).toContain(
      "I couldn't answer that just now. Try asking again, or ask me to adjust your split, swap an exercise, or explain your first workout."
    );
    expect(source).toContain(
      'toast.error("Your feedback was not saved. Try again in a moment.");'
    );
    expect(source).toContain(
      'toast.error("Sign in to save assistant feedback to your account.");'
    );
    expect(source).not.toContain(
      "I hit a snag answering that, but I can still help. Ask me about the split, exercise swaps, or how to start the week."
    );
    expect(source).not.toContain(
      'toast.error("Couldn\'t save that assistant feedback.");'
    );
    expect(source).not.toContain(
      'toast.error("You need to be signed in to send assistant feedback.");'
    );
  });
});
