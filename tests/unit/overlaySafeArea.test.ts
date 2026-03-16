import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("overlay safe-area handling", () => {
  it("defines shared safe-area and keyboard offset CSS variables", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "styles", "global.css"),
      "utf8"
    );

    expect(source).toContain("--liftlogic-safe-area-bottom");
    expect(source).toContain("--liftlogic-keyboard-offset");
    expect(source).toContain("--liftlogic-overlay-bottom-offset");
    expect(source).toContain(".Toastify__toast-container--bottom-center");
    expect(source).toContain(
      "bottom: calc(12px + var(--liftlogic-overlay-bottom-offset)) !important;"
    );
  });

  it("tracks keyboard height in the app shell and applies it to toasts", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "_app.tsx"),
      "utf8"
    );

    expect(source).toContain("useEffect");
    expect(source).toContain("OVERLAY_KEYBOARD_OFFSET_CSS_VAR");
    expect(source).toContain("window.visualViewport?.addEventListener");
    expect(source).toContain("toastClassName=\"liftlogic-toast\"");
  });

  it("applies the shared overlay offset to fixed bottom UI", () => {
    const badgeSource = fs.readFileSync(
      path.join(process.cwd(), "components", "AppVersionBadge.tsx"),
      "utf8"
    );
    const recorderSource = fs.readFileSync(
      path.join(process.cwd(), "components", "DevBugRecorder.tsx"),
      "utf8"
    );
    const coachSource = fs.readFileSync(
      path.join(process.cwd(), "components", "CoachChatPanel.tsx"),
      "utf8"
    );
    const routinesSource = fs.readFileSync(
      path.join(process.cwd(), "pages", "routines.tsx"),
      "utf8"
    );

    expect(badgeSource).toContain("var(--liftlogic-overlay-bottom-offset, 0px)");
    expect(recorderSource).toContain("var(--liftlogic-overlay-bottom-offset, 0px)");
    expect(coachSource).toContain("var(--liftlogic-overlay-bottom-offset, 0px)");
    expect(routinesSource).toContain("var(--liftlogic-overlay-bottom-offset, 0px)");
  });
});
