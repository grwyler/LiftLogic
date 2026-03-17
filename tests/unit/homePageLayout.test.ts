import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("home page layout styling", () => {
  it("uses explicit landing radii instead of theme-multiplied numeric radii", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "index.tsx"),
      "utf8"
    );

    expect(source).toContain('panel: "28px"');
    expect(source).toContain('card: "24px"');
    expect(source).toContain('inset: "20px"');
    expect(source).toContain("borderRadius: landingRadius.panel");
    expect(source).toContain("borderRadius: landingRadius.card");
    expect(source).toContain("borderRadius: landingRadius.inset");
  });

  it("stacks header actions vertically on narrow screens", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "index.tsx"),
      "utf8"
    );

    expect(source).toContain('direction={{ xs: "column", sm: "row" }}');
    expect(source).toContain('sx={{ width: { xs: "100%", sm: "auto" } }}');
    expect(source.match(/fullWidth/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it("renders assistant marketing copy without smart quotes or mojibake", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "index.tsx"),
      "utf8"
    );

    expect(source).toContain(
      '"I kept this week around 45 minutes and used shoulder-friendlier'
    );
    expect(source).not.toContain("“");
    expect(source).not.toContain("”");
    expect(source).not.toContain("â€œ");
    expect(source).not.toContain("â€");
  });

  it("keeps the version badge away from the dev indicator area", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "AppVersionBadge.tsx"),
      "utf8"
    );

    expect(source).toContain("right: { xs: 12, sm: 18 }");
    expect(source).toContain("const mobileBottomOffset =");
    expect(source).toContain(
      '"calc(72px + var(--liftlogic-overlay-bottom-offset, 0px))"'
    );
  });

  it("only enables developer chrome from explicit internal mode or internal routes", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "_app.tsx"),
      "utf8"
    );

    expect(source).toContain("liftlogic-developer-mode");
    expect(source).toContain('router.query.devtools === "1"');
    expect(source).toContain('route === "/bugs"');
    expect(source).toContain("developerChromeEnabled ? <AppVersionBadge /> : null");
  });
});
