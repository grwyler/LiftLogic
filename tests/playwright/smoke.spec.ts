import { expect, test } from "@playwright/test";
import {
  buildUsername,
  closeExerciseDetail,
  completeAssistantSetup,
  continueAsTracker,
  getSessionUserId,
  logFirstSetForFirstExercise,
  quickAddFirstExercise,
  reportFailedTestAsBug,
  signUp,
} from "./helpers";

test.describe("Lift Logic smoke", () => {
  let currentUserId = "";

  test.beforeEach(async () => {
    currentUserId = "";
  });

  test.afterEach(async ({ page }, testInfo) => {
    await reportFailedTestAsBug({
      page,
      testInfo,
      currentUserId,
    });
  });

  test("landing page exposes pricing, signup, and signin entry points", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /Plan smarter lifts/i })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Pricing" }).first()).toBeVisible();
    await expect(page.getByText("Create account").first()).toBeVisible();
    await expect(page.getByText("I already have an account")).toBeVisible();

    await page.getByRole("link", { name: "Pricing" }).first().click();
    await page.waitForURL(/\/pricing/);
    await expect(
      page.getByRole("heading", {
        name: /Tracking stays free\. Adaptive planning becomes Pro Beta\./i,
      })
    ).toBeVisible();

    await page.getByRole("link", { name: /Start free beta/i }).first().click();
    await page.waitForURL(/\/signup/);
  });

  test("new user can save assistant setup and immediately access the workout assistant", async ({
    page,
  }) => {
    const username = buildUsername("assistant");
    await signUp(page, username);

    currentUserId = await getSessionUserId(page);
    await completeAssistantSetup(page);
  });

  test("user can quick add an exercise and log a set", async ({ page }) => {
    const username = buildUsername("logging");
    await signUp(page, username);
    currentUserId = await getSessionUserId(page);

    await continueAsTracker(page);
    await quickAddFirstExercise(page);
    await logFirstSetForFirstExercise(page);
  });

  test("critical /routines QA journey covers assistant setup, quick add, logging, and free-tier schedule gating", async ({
    page,
  }) => {
    const username = buildUsername("critical-routines");
    await signUp(page, username);
    currentUserId = await getSessionUserId(page);

    await completeAssistantSetup(page, {
      name: "Critical QA",
      goal: "Get stronger",
      frequency: "3 days",
    });
    await quickAddFirstExercise(page);
    await logFirstSetForFirstExercise(page);
    await closeExerciseDetail(page);

    await expect(
      page.locator('[title="Repeat this exercise"]').first()
    ).toBeDisabled();
    await expect(page.getByText("Upgrade for planning")).toBeVisible();
  });

  test("free users see the Pro Beta gate before assistant plan generation", async ({
    page,
  }) => {
    const username = buildUsername("coach-plan");
    await signUp(page, username);
    currentUserId = await getSessionUserId(page);

    await page
      .getByRole("button", { name: "Yes, help me plan workouts" })
      .click();
    await page.getByLabel("Name").fill("Coach Gate");
    await page.getByRole("button", { name: "Get stronger" }).click();
    await page.getByRole("button", { name: "4 days" }).click();

    await expect(
      page.getByText("Pro Beta is required to generate assistant-built workout plans.")
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Upgrade for Pro Beta" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save preferences only" })
    ).toBeVisible();
  });

  test("signed in user can submit bug feedback", async ({ page }) => {
    const username = buildUsername("feedback");
    await signUp(page, username);
    currentUserId = await getSessionUserId(page);

    await continueAsTracker(page);
    await page.goto("/feedback");

    const title = `Feedback bug ${Date.now()}`;
    await page.getByLabel("What went wrong?").fill(title);
    await page
      .getByLabel("What happened, and how can we reproduce it?")
      .fill(
        "Open the feedback page, submit a signed-in bug report, and confirm it shows up in recent submissions."
      );
    await page.getByRole("button", { name: "Submit bug report" }).click();

    await expect(page.getByText("Bug report submitted")).toBeVisible();
    await expect(page.getByText(title)).toBeVisible();
  });
});
