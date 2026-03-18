import { expect, test } from "@playwright/test";

test.describe("Lift Logic Android smoke", () => {
  test("landing header actions stay visible without horizontal scrolling", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /Plan smarter lifts/i })
    ).toBeVisible();

    const pricingLink = page.getByRole("link", { name: "Pricing" }).first();
    const signInLink = page.getByRole("link", { name: "Sign in" }).first();
    const startFreeBetaLink = page
      .getByRole("link", { name: /Start free/i })
      .first();

    await expect(pricingLink).toBeVisible();
    await expect(signInLink).toBeVisible();
    await expect(startFreeBetaLink).toBeVisible();

    const pricingBox = await pricingLink.boundingBox();
    const signInBox = await signInLink.boundingBox();
    const startFreeBetaBox = await startFreeBetaLink.boundingBox();

    expect(pricingBox).not.toBeNull();
    expect(signInBox).not.toBeNull();
    expect(startFreeBetaBox).not.toBeNull();

    expect(signInBox!.y).toBeGreaterThan(pricingBox!.y);
    expect(startFreeBetaBox!.y).toBeGreaterThan(signInBox!.y);
    expect(Math.abs(pricingBox!.x - signInBox!.x)).toBeLessThan(2);
    expect(Math.abs(signInBox!.x - startFreeBetaBox!.x)).toBeLessThan(2);

    const noHorizontalOverflow = await page.evaluate(() => {
      const viewportWidth = window.innerWidth;
      return (
        document.documentElement.scrollWidth <= viewportWidth + 1 &&
        document.body.scrollWidth <= viewportWidth + 1
      );
    });

    expect(noHorizontalOverflow).toBe(true);
  });
});
