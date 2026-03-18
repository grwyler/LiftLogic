import { expect, Page, TestInfo } from "@playwright/test";

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

type RecurringRulePayload = {
  rules?: Array<{
    _id?: string;
    userId?: string;
    exerciseName?: string;
    dayOfWeek?: number;
    daysOfWeek?: number[];
    recurrenceType?: string;
    active?: boolean;
  }>;
};

type FeedbackPayload = {
  feedback?: Array<{
    _id?: string;
    title?: string;
    description?: string;
    coachFeedback?: {
      sentiment?: "like" | "dislike";
      explanation?: string;
      selectedResponse?: string;
      conversation?: Array<{
        role?: "coach" | "user";
        text?: string;
      }>;
    };
    createdAt?: string;
  }>;
};

export const buildUsername = (suffix: string) =>
  `e2e-${suffix}-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;

const password = "LiftLogicE2E123!";

export const formatDateInput = (offsetDays = 7) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

export const submitBugFeedback = async (
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

export const getSessionUserId = async (page: Page) => {
  const sessionResponse = await page.request.get("/api/auth/session");
  if (!sessionResponse.ok()) {
    return "";
  }

  const session = (await sessionResponse.json()) as SessionPayload;
  return session?.token?.user?._id || session?.user?._id || "";
};

export const signUp = async (page: Page, username: string) => {
  await page.goto("/signup");
  await page.waitForLoadState("domcontentloaded");
  const createAccountButton = page.getByRole("button", {
    name: "Create account",
  });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Password").fill(password);

    if (await createAccountButton.isEnabled().catch(() => false)) {
      break;
    }

    await page.waitForTimeout(750);
  }

  await expect(createAccountButton).toBeEnabled();
  await createAccountButton.click();
  await page.waitForURL(/\/routines/);
};

export const signInWithCredentials = async (page: Page, username: string) => {
  await page.goto("/signin");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Open workouts" }).click();
  await page.waitForURL(/\/routines/);
};

export const saveUserProfile = async (
  page: Page,
  user: Record<string, unknown>
) => {
  const response = await page.request.post("/api/user", {
    data: {
      user,
    },
  });

  expect(response.ok()).toBeTruthy();
};

export const continueAsTracker = async (page: Page) => {
  const addExerciseButton = page.getByRole("button", {
    name: /Add First Exercise|Add Exercise|Add/,
  });
  const setupHeading = page.getByRole("heading", {
    name: "Set up your workout assistant",
  });

  if (!(await addExerciseButton.isVisible().catch(() => false))) {
    await expect(setupHeading).toBeVisible();
    await page
      .getByRole("button", { name: "No, I just want to track workouts" })
      .click({ force: true });
    await expect(page.getByText("Tracker mode")).toBeVisible();
    await page
      .getByRole("button", { name: "Continue to workouts" })
      .click({ force: true });
  }

  await expect(
    addExerciseButton
  ).toBeVisible();
};

export const completeAssistantSetup = async (
  page: Page,
  {
    name = "E2E Planner",
    goal = "Get stronger",
    frequency = "3 days",
  }: {
    name?: string;
    goal?: string;
    frequency?: string;
  } = {}
) => {
  await page
    .getByRole("heading", { name: "Set up your workout assistant" })
    .waitFor();
  await page
    .getByRole("button", { name: "Yes, help me plan workouts" })
    .click();
  await page.getByLabel("Name").fill(name);
  await page.getByRole("button", { name: goal }).click();
  await page.getByRole("button", { name: frequency }).click();
  const savePreferencesButton = page.getByRole("button", {
    name: "Save preferences only",
  });
  const saveSetupButton = page.getByRole("button", {
    name: "Save assistant setup",
  });

  if (await saveSetupButton.isVisible().catch(() => false)) {
    await saveSetupButton.click();
  } else {
    await expect(
      page.getByRole("button", { name: "Upgrade for Pro" })
    ).toBeVisible();
    await savePreferencesButton.click();
  }

  await expect(
    page.getByRole("textbox", {
      name: /Ask why this fits, how to swap lifts, or what to do first/i,
    })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your workout assistant is ready" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Add First Exercise|Add Exercise/ })
  ).toBeVisible();
};

export const quickAddFirstExercise = async (page: Page) => {
  const manualStarterButton = page.getByRole("button", {
    name: "Build manually instead",
  });
  if (await manualStarterButton.isVisible().catch(() => false)) {
    await manualStarterButton.click({ force: true });
  } else {
    await page
      .getByRole("button", { name: /Add First Exercise|Add Exercise|Add/ })
      .first()
      .click({ force: true });
  }
  await expect(page.getByRole("heading", { name: "Choose an exercise" })).toBeVisible();

  await page.locator("button:has-text('Quick Add')").first().click({ force: true });
  await expect(page.getByText("Active Set")).toBeVisible();
};

export const logFirstSetForFirstExercise = async (page: Page) => {
  const activeSetHeading = page.getByText("Active Set");
  if (!(await activeSetHeading.isVisible().catch(() => false))) {
    const openNextSetButton = page.getByRole("button", { name: "Open Next Set" });
    if (await openNextSetButton.isVisible().catch(() => false)) {
      await openNextSetButton.click({ force: true });
    } else {
      await page.getByRole("button", { name: "Start Lift" }).first().click({ force: true });
    }
  }
  await expect(activeSetHeading).toBeVisible();

  await page.getByRole("button", { name: "Log Set" }).click({ force: true });
  await expect(page.getByText(/1\/3 sets logged|1\/\d+ sets logged/)).toBeVisible();
  await expect(page.getByText(/1\/3 sets logged|1\/\d+ sets logged/)).toBeVisible();
};

export const closeExerciseDetail = async (page: Page) => {
  await page.locator("button:has(svg[data-testid='CloseIcon'])").first().click();
  await expect(page.getByText("Active Set")).not.toBeVisible();
};

export const saveAndEditRepeatScheduleEndDate = async (
  page: Page,
  {
    initialOffsetDays = 10,
    updatedOffsetDays = 18,
  }: {
    initialOffsetDays?: number;
    updatedOffsetDays?: number;
  } = {}
) => {
  const repeatButton = page.locator('[title="Repeat this exercise"]').first();
  await repeatButton.click();

  const initialEndDate = formatDateInput(initialOffsetDays);
  await page.getByLabel("Ends on (optional)").fill(initialEndDate);
  await page.getByRole("button", { name: "Save schedule" }).click();

  await expect(
    page.locator('[title="Edit repeating schedule"]').first()
  ).toBeVisible();

  await page.locator('[title="Edit repeating schedule"]').first().click();
  await expect(page.getByLabel("Ends on (optional)")).toHaveValue(initialEndDate);

  const updatedEndDate = formatDateInput(updatedOffsetDays);
  await page.getByLabel("Ends on (optional)").fill(updatedEndDate);
  await page.getByRole("button", { name: "Save schedule" }).click();

  await page.locator('[title="Edit repeating schedule"]').first().click();
  await expect(page.getByLabel("Ends on (optional)")).toHaveValue(updatedEndDate);
};

export const generatePlanForProfile = async (
  page: Page,
  userId: string,
  profile: Record<string, any>
) => {
  const response = await page.request.post("/api/generateWorkout", {
    data: {
      userId,
      profile,
    },
  });

  expect(response.ok()).toBeTruthy();
  return response.json();
};

export const fetchRecurringRulesForUser = async (page: Page, userId: string) => {
  const response = await page.request.get(
    `/api/recurringRule?userId=${encodeURIComponent(userId)}`
  );

  expect(response.ok()).toBeTruthy();
  const data = (await response.json()) as RecurringRulePayload;
  return Array.isArray(data.rules) ? data.rules : [];
};

export const fetchFeedbackForUser = async (page: Page, userId: string) => {
  const response = await page.request.get(
    `/api/feedback?userId=${encodeURIComponent(userId)}`
  );

  expect(response.ok()).toBeTruthy();
  const data = (await response.json()) as FeedbackPayload;
  return Array.isArray(data.feedback) ? data.feedback : [];
};

export const openingCoachBubble = (page: Page) =>
  page.locator(
    "xpath=(//p[contains(., 'I saved your setup')])[1]/ancestor::div[1]"
  );

export const planCoachBubble = (page: Page) =>
  page.locator(
    "xpath=(//p[contains(., 'I mapped out a ')])[1]/ancestor::div[1]"
  );

export const reportFailedTestAsBug = async ({
  page,
  testInfo,
  currentUserId,
}: {
  page: Page;
  testInfo: TestInfo;
  currentUserId: string;
}) => {
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
};
