import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("dev bug recorder key stability", () => {
  it("uses a collision-resistant key for recent interaction rows", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "DevBugRecorder.tsx"),
      "utf8"
    );

    expect(source).toContain("const buildInteractionPreviewKey");
    expect(source).toContain('interaction.label || "no-label"');
    expect(source).toContain('interaction.detail || "no-detail"');
    expect(source).toContain("key={buildInteractionPreviewKey(interaction, index)}");
  });
});
