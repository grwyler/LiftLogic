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
    expect(source).toContain('gap: { xs: "20px", sm: "24px" }');
    expect(source).toContain('borderRadius: feedbackCompactRadius');
    expect(source).toContain("Glass-inspired refresh");
    expect(source).toContain("keeping the existing light and dark theme identities");
  });

  it("keeps the shared theme glass overrides for controls used on feedback", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "_app.tsx"),
      "utf8"
    );

    expect(source).toContain("const glassSurface =");
    expect(source).toContain("MuiToggleButtonGroup");
    expect(source).toContain('backdropFilter: "blur(24px) saturate(170%)"');
    expect(source).toContain('backgroundAttachment: "fixed"');
  });
});
