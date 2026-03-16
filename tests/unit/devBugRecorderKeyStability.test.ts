import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("dev bug recorder key stability", () => {
  it("uses a collision-resistant key for recent interaction rows", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "DevBugRecorder.tsx"),
      "utf8"
    );

    expect(source).toContain(".map((interaction, index) => (");
    expect(source).toContain(
      "key={`${interaction.timestamp}-${interaction.type}-${interaction.target}-${index}`}"
    );
  });
});
