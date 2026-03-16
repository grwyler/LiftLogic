import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("routines assistant visibility", () => {
  it("shows the restored/generated workout assistant panel by default on the routines page", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "routines.tsx"),
      "utf8"
    );

    expect(source).toContain("coachResponse={generatedCoachResponse}");
    expect(source).toContain("defaultMinimized={false}");
    expect(source).toContain(
      'minimizedStorageKey="lift-logic:routines:assistant-minimized"'
    );
  });
});
