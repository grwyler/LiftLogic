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

export const submitFeatureFeedback = async (
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
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
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
