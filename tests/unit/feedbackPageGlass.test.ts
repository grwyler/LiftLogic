import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("feedback page glass styling", () => {
  it("keeps the feedback page on the glass panel treatment with tighter spacing and corners", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "feedback.tsx"),
      "utf8"
    );

    expect(source).toContain('const feedbackRadius = "6px"');
    expect(source).toContain('const feedbackCompactRadius = "5px"');
    expect(source).toContain('const feedbackPanelPadding = { xs: "20px", sm: "24px" }');
    expect(source).toContain("const glassPanelSx = {");
    expect(source).toContain("const glassControlSx = {");
    expect(source).toContain("const glassTextFieldSx = {");
    expect(source).toContain('gap: { xs: "20px", sm: "24px" }');
    expect(source).toContain('borderRadius: feedbackCompactRadius');
    expect(source).toContain("Glass-inspired refresh");
    expect(source).toContain("keeping the existing light and dark theme identities");
  });

  it("keeps the glass treatment scoped away from the shared app theme", () => {
    const appSource = fs.readFileSync(
      path.join(process.cwd(), "pages", "_app.tsx"),
      "utf8"
    );

    expect(appSource).not.toContain("const glassSurface =");
    expect(appSource).not.toContain('backdropFilter: "blur(24px) saturate(170%)"');
    expect(appSource).not.toContain('overflow: "hidden"');
    expect(appSource).toContain('backgroundAttachment: "scroll"');
    expect(appSource).toContain(
      'const DESKTOP_BACKGROUND_ATTACHMENT_MEDIA_QUERY ='
    );
    expect(appSource).toContain('[DESKTOP_BACKGROUND_ATTACHMENT_MEDIA_QUERY]: {');
    expect(appSource).toContain('backgroundAttachment: "fixed"');
  });
});
