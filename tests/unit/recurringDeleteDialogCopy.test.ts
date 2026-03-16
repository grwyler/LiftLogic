import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("recurring delete dialog copy", () => {
  it("clarifies one-day removal versus stopping future repeats", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "DeleteDialog.tsx"),
      "utf8"
    );

    expect(source).toContain(
      "Remove this exercise only from <b>{fullDate}</b>, or stop scheduling"
    );
    expect(source).toContain(
      "it on future <b>{weekDay}s</b>? Past logged history will stay the"
    );
    expect(source).toContain("Remove only for {shortDate}");
    expect(source).toContain("Stop future {weekDay} repeats");
    expect(source).not.toContain(
      "Do you want to remove it only from <b>{fullDate}</b> or from"
    );
    expect(source).not.toContain("All {weekDay}s");
  });
});
