import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("coach panel warning copy", () => {
  it("keeps the assistant warning honest and calm", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "CoachChatPanel.tsx"),
      "utf8"
    );

    expect(source).toContain(
      "The workout assistant is still improving. Use it as a planning"
    );
    expect(source).toContain(
      "partner, and double-check any changes before you train."
    );
    expect(source).not.toContain(
      "The workout assistant is still in beta testing. It may be wrong,"
    );
  });
});
