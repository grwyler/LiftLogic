import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("recurring delete dialog copy", () => {
  it("keeps recurring deletion focused on future schedule removal", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "DeleteDialog.tsx"),
      "utf8"
    );

    expect(source).toContain(
      "This will stop scheduling this exercise on future <b>{weekDay}s</b>."
    );
    expect(source).toContain(
      "If you only want to skip <b>{fullDate}</b>, use the dedicated skip"
    );
    expect(source).toContain("Keep schedule");
    expect(source).toContain("Delete future {weekDay} repeats");
    expect(source).not.toContain("Remove only for {shortDate}");
  });
});
