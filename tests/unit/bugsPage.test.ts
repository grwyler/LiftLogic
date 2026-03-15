import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("bugs page workflow actions", () => {
  it("uses the inline status selector flow instead of a removed primary action helper", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "bugs.tsx"),
      "utf8"
    );

    expect(source).not.toContain("getPrimaryAction(");
    expect(source).toContain('label="Status"');
    expect(source).toContain("handleWorkflowUpdate(item, {");
  });
});
