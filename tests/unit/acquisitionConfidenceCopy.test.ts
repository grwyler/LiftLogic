import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("acquisition confidence copy", () => {
  it("keeps beta language out of primary landing, signup, and pricing calls to action", () => {
    const homeSource = fs.readFileSync(
      path.join(process.cwd(), "pages", "index.tsx"),
      "utf8"
    );
    const pricingSource = fs.readFileSync(
      path.join(process.cwd(), "pages", "pricing.tsx"),
      "utf8"
    );
    const signupSource = fs.readFileSync(
      path.join(process.cwd(), "pages", "signup.tsx"),
      "utf8"
    );

    expect(homeSource).toContain("Start free");
    expect(homeSource).not.toContain("Start free beta");
    expect(homeSource).not.toContain("Join The Beta");
    expect(pricingSource).toContain("Free vs Pro");
    expect(pricingSource).not.toContain("Free vs Pro Beta");
    expect(signupSource).toContain("See Free vs Pro");
    expect(signupSource).not.toContain("See Free vs Pro Beta");
  });
});
