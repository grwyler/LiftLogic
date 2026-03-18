import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const liveSecretPatterns = [
  /sk-proj-[A-Za-z0-9_\-]+/,
  /GOCSPX-[A-Za-z0-9_\-]+/,
  /mongodb:\/\/[^<\s]/,
  /mongodb\+srv:\/\/[^<\s]/,
  /BEGIN PRIVATE KEY/,
];

describe("secret hygiene", () => {
  it("keeps local env files ignored by git", () => {
    const gitignore = fs.readFileSync(
      path.join(process.cwd(), ".gitignore"),
      "utf8"
    );

    expect(gitignore).toContain(".env.local");
    expect(gitignore).toContain(".env.production.local");
  });

  it("keeps tracked environment examples and docs on placeholders instead of live credentials", () => {
    const envExample = fs.readFileSync(
      path.join(process.cwd(), ".env.example"),
      "utf8"
    );
    const readme = fs.readFileSync(path.join(process.cwd(), "README.md"), "utf8");

    expect(envExample).toContain("<username>");
    expect(envExample).toContain("<openai-api-key>");
    expect(readme).toContain("Do not commit real credentials");
    expect(readme).toContain("rotate it in the provider dashboard");

    for (const pattern of liveSecretPatterns) {
      expect(envExample).not.toMatch(pattern);
      expect(readme).not.toMatch(pattern);
    }
  });
});
