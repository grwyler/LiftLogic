import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("feedback page design language", () => {
  it("keeps the feedback page on the shared Lift Logic panel system instead of a one-off glass treatment", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "feedback.tsx"),
      "utf8"
    );

    expect(source).toContain("const feedbackRadius = brandRadii;");
    expect(source).toContain('const feedbackPanelPadding = { xs: "20px", sm: "24px" }');
    expect(source).toContain("const feedbackPanelSx = {");
    expect(source).toContain("const feedbackControlSx = {");
    expect(source).toContain("const feedbackTextFieldSx = {");
    expect(source).toContain("brandBackgrounds.premiumPanel");
    expect(source).toContain("brandBackgrounds.darkPremiumPanel");
    expect(source).toContain("Core product styling");
    expect(source).toContain("Shared Lift Logic tokens");
    expect(source).toContain("one-off design experiment");
    expect(source).not.toContain("Glass-inspired refresh");
    expect(source).not.toContain("backdropFilter");
  });

  it("keeps the shared app theme focused on core tokens instead of route-specific novelty styling", () => {
    const appSource = fs.readFileSync(
      path.join(process.cwd(), "pages", "_app.tsx"),
      "utf8"
    );

    expect(appSource).toContain('backgroundAttachment: "scroll"');
    expect(appSource).toContain(
      'const DESKTOP_BACKGROUND_ATTACHMENT_MEDIA_QUERY ='
    );
    expect(appSource).toContain('[DESKTOP_BACKGROUND_ATTACHMENT_MEDIA_QUERY]: {');
    expect(appSource).toContain('backgroundAttachment: "fixed"');
    expect(appSource).not.toContain("Glass-inspired refresh");
  });
});
