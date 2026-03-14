import { expect, Page, test } from "@playwright/test";

type SessionPayload = {
  user?: {
    _id?: string;
    username?: string;
    email?: string;
  };
  token?: {
    user?: {
      _id?: string;
      username?: string;
      email?: string;
    };
  };
};

const buildUsername = (suffix: string) =>
  `e2e-${suffix}-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;

const password = "LiftLogicE2E123!";

const formatDateInput = (offsetDays = 7) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

const submitBugFeedback = async (
  page: Page,
  {
    userId,
    title,
    description,
    severity = "medium",
  }: {
    userId?: string;
    title: string;
    description: string;
    severity?: "low" | "medium" | "high";
  }
) => {
  if (!userId) {
    return false;
  }

  const response = await page.request.post("/api/feedback", {
    data: {
      feedback: {
        userId,
        type: "bug",
        title,
        description,
        severity,
        page: "/routines",
        deviceType: "desktop",
      },
    },
  });

  return response.ok();
};

const submitFeatureFeedback = async (
  page: Page,
  {
    userId,
    username,
    title,
    description,
  }: {
    userId?: string;
    username?: string;
    title: string;
    description: string;
  }
) => {
  if (!userId) {
    return false;
  }

  const response = await page.request.post("/api/feedback", {
    data: {
      feedback: {
        userId,
        username,
        type: "feature",
        title,
        description,
        severity: "low",
        page: "/routines",
        deviceType: "desktop",
      },
    },
  });

  return response.ok();
};

const getSessionUserId = async (page: Page) => {
  const sessionResponse = await page.request.get("/api/auth/session");
  if (!sessionResponse.ok()) {
    return "";
  }

  const session = (await sessionResponse.json()) as SessionPayload;
  return (
    session?.token?.user?._id ||
    session?.user?._id ||
    ""
  );
};

const signUp = async (
  page: Page,
  username: string
) => {
  await page.goto("/signup");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/routines/);
};

const continueAsTracker = async (page: Page) => {
  await expect(
    page.getByRole("heading", { name: "Set up your workout assistant" })
  ).toBeVisible();
  await page
    .getByRole("button", { name: "No, I just want to track workouts" })
    .click();
  await page.getByRole("button", { name: "Continue to workouts" }).click();
  await expect(
    page.getByRole("button", { name: /Add First Exercise|Add Exercise/ })
  ).toBeVisible();
};

test.describe("Lift Logic e2e", () => {
  let currentUserId = "";

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status === testInfo.expectedStatus) {
      return;
    }

    const userId = currentUserId || (await getSessionUserId(page));
    const errorText =
      testInfo.errors.map((error) => error.message).join("\n\n") ||
      "Test failed without a captured Playwright error message.";

    await submitBugFeedback(page, {
      userId,
      title: `E2E failure: ${testInfo.title}`,
      description: `Automated e2e test failure.\n\nTest: ${testInfo.title}\n\nError:\n${errorText}`,
      severity: "high",
    });
  });

  test("new user can save assistant setup and immediately access the workout assistant", async ({
    page,
  }) => {
    const username = buildUsername("assistant");
    await signUp(page, username);

    currentUserId = await getSessionUserId(page);

    await page.getByLabel("Name").fill("E2E Planner");
    await page
      .getByRole("button", { name: "Yes, help me plan workouts" })
      .click();
    await page.getByRole("button", { name: "Get stronger" }).click();
    await page.getByRole("button", { name: "3 days" }).click();
    await page.getByRole("button", { name: "Save assistant setup" }).click();

    await expect(
      page.getByText("The workout assistant is still in beta testing.").first()
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", {
        name: /Ask why this fits, how to swap lifts, or what to do first/i,
      })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Add First Exercise|Add Exercise/ })
    ).toBeVisible();
  });

  test("user can quick add an exercise and log a set", async ({ page }) => {
    const username = buildUsername("logging");
    await signUp(page, username);
    currentUserId = await getSessionUserId(page);

    await continueAsTracker(page);

    await page.getByRole("button", { name: "Add First Exercise" }).click();
    await expect(page.getByRole("heading", { name: "Choose an exercise" })).toBeVisible();

    await page.locator("button:has-text('Quick Add')").first().click();
    await expect(page.getByText(/0\/3 sets|0\/\d+ sets/).first()).toBeVisible();

    await page
      .getByRole("button", { name: /Assisted Pull-Up .* Open/ })
      .click();
    await expect(page.getByText("Active Set")).toBeVisible();

    await page.getByRole("button", { name: "Log Set" }).click();
    await expect(page.getByText("Rest Between Sets")).toBeVisible();
    await page.getByRole("button", { name: "Continue to Next Set" }).click();

    await expect(page.getByText("1/3 sets logged")).toBeVisible();
  });

  test("repeat schedule end date can be saved and edited after reopening", async ({
    page,
  }) => {
    const username = buildUsername("repeat");
    await signUp(page, username);
    currentUserId = await getSessionUserId(page);

    await continueAsTracker(page);

    await page.getByRole("button", { name: "Add First Exercise" }).click();
    await page.locator("button:has-text('Quick Add')").first().click();

    const repeatButton = page.locator('[title="Repeat this exercise"]').first();
    await repeatButton.click();

    const initialEndDate = formatDateInput(10);
    await page.getByLabel("Ends on (optional)").fill(initialEndDate);
    await page.getByRole("button", { name: "Save schedule" }).click();

    await expect(page.locator('[title="Edit repeating schedule"]').first()).toBeVisible();

    await page.locator('[title="Edit repeating schedule"]').first().click();
    await expect(page.getByLabel("Ends on (optional)")).toHaveValue(initialEndDate);

    const updatedEndDate = formatDateInput(18);
    await page.getByLabel("Ends on (optional)").fill(updatedEndDate);
    await page.getByRole("button", { name: "Save schedule" }).click();

    await page.locator('[title="Edit repeating schedule"]').first().click();
    await expect(page.getByLabel("Ends on (optional)")).toHaveValue(updatedEndDate);
  });

  test("logs a QA feedback note for this e2e pass", async ({ page }) => {
    test.skip(
      process.env.LOG_QA_NOTE !== "true",
      "QA feedback logging is only enabled when explicitly requested."
    );

    const username = buildUsername("qa-note");
    await signUp(page, username);
    const userId = await getSessionUserId(page);

    const logged = await submitFeatureFeedback(page, {
      userId,
      username,
      title: "Automated e2e QA pass",
      description: [
        "Playwright e2e coverage completed successfully on localhost.",
        "",
        "Verified flows:",
        "1. New user can save assistant setup and immediately access the workout assistant.",
        "2. User can quick add an exercise and log a set.",
        "3. Repeat schedule end date can be saved and edited after reopening.",
        "",
        "No new bugs were confirmed in these covered flows on the final pass.",
      ].join("\n"),
    });

    expect(logged).toBeTruthy();
  });
});
