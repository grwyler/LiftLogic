import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("day switcher mobile calendar mode", () => {
  it("defaults phones to the compact header and lazy-mounts the full calendar", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "DaySwitcher.tsx"),
      "utf8"
    );

    expect(source).toContain("const isCompactViewport = useMediaQuery(theme.breakpoints.down(\"md\"));");
    expect(source).toContain("const [isInline, setIsInline] = useState(!isCompactViewport);");
    expect(source).toContain("setIsInline(!isCompactViewport);");
    expect(source).toContain("<Collapse in={isInline} mountOnEnter unmountOnExit>");
    expect(source).toContain("Workout Schedule");
    expect(source).toContain("Pick a day");
    expect(source).toContain("Hide calendar");
  });
});
