import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("privacy policy page", () => {
  it("includes the core Play Store privacy sections", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "privacy.tsx"),
      "utf8"
    );

    expect(source).toContain("Privacy Policy");
    expect(source).toContain("Information We Collect");
    expect(source).toContain("How We Use Information");
    expect(source).toContain("Sharing");
    expect(source).toContain("Retention");
    expect(source).toContain("Security");
    expect(source).toContain("Contact");
    expect(source).toContain("grwyler@gmail.com");
  });
});
