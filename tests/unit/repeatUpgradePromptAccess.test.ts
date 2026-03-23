import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("repeat action upgrade access", () => {
  it("keeps the repeat action clickable so recurring schedules stay available on free", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "ExerciseItem.tsx"),
      "utf8"
    );

    expect(source).toContain("onClick={handleOpenRepeatFlow}");
    expect(source).not.toContain("disabled={!recurringSchedulingEnabled}");
  });
});
