import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("light mode contrast tokens", () => {
  it("strengthens shared light-mode surface and outline contrast", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "_app.tsx"),
      "utf8"
    );

    expect(source).toContain(': "rgba(15, 23, 42, 0.14)"');
    expect(source).toContain(': "rgba(255, 255, 255, 0.96)"');
    expect(source).toContain('color: darkMode ? "#f8fafc" : "#0f172a"');
    expect(source).toContain('"&.Mui-disabled"');
  });

  it("uses stronger light-mode panel fills on landing, pricing, and auth routes", () => {
    const landingSource = fs.readFileSync(
      path.join(process.cwd(), "pages", "index.tsx"),
      "utf8"
    );
    const pricingSource = fs.readFileSync(
      path.join(process.cwd(), "pages", "pricing.tsx"),
      "utf8"
    );
    const signInSource = fs.readFileSync(
      path.join(process.cwd(), "pages", "signin.tsx"),
      "utf8"
    );
    const signUpSource = fs.readFileSync(
      path.join(process.cwd(), "pages", "signup.tsx"),
      "utf8"
    );
    const brandTokenSource = fs.readFileSync(
      path.join(process.cwd(), "utils", "brandSystem.ts"),
      "utf8"
    );

    expect(landingSource).toContain("rgba(255,255,255,0.97)");
    expect(landingSource).toContain("rgba(255,255,255,0.92)");
    expect(pricingSource).toContain("rgba(255,255,255,0.9)");
    expect(pricingSource).toContain("rgba(255,255,255,0.84)");
    expect(signInSource).toContain("brandBackgrounds.premiumPanel");
    expect(signUpSource).toContain("brandBackgrounds.premiumPanel");
    expect(brandTokenSource).toContain("premiumPanel");
  });
});
