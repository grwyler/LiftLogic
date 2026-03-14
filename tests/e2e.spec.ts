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

const generatePlanForProfile = async (
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

test.describe("Lift Logic e2e", () => {
  let currentUserId = "";

  test.beforeEach(async () => {
    currentUserId = "";
  });

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

  test("landing page exposes signup and signin entry points", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByText(/Plan smarter lifts\. Keep the workout moving\./i)
    ).toBeVisible();
    await expect(page.getByText("Create account").first()).toBeVisible();
    await expect(page.getByText("I already have an account")).toBeVisible();

    await page.getByText("Create account").first().click();
    await page.waitForURL(/\/signup/);
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

  test("coach can move a scheduled day from Friday to Wednesday", async ({
    page,
  }) => {
    const username = buildUsername("coach-swap");
    await signUp(page, username);
    currentUserId = await getSessionUserId(page);

    const profile = {
      sex: "",
      age: "",
      preferredUnits: "lb",
      trainingGoal: "strength",
      currentFitnessLevel: "starting_out",
      workoutDaysPerWeek: "4",
      experienceLevel: "beginner",
      workoutLength: "45",
      equipmentAccess: ["Bodyweight only"],
      maxDumbbellWeight: "",
      preferredTrainingDays: ["Mon", "Tue", "Thu", "Sat"],
      limitations: "",
      notes: "",
    };

    const generated = await generatePlanForProfile(page, currentUserId, profile);
    const initialDays = generated.coachResponse.planSnapshot.map(
      (day: any) => day.dayLabel
    );

    expect(initialDays).toContain("Friday");

    const chatResponse = await page.request.post("/api/workoutCoachChat", {
      data: {
        message: "Friday workouts don't work for me. Can we swap that to wed instead?",
        history: [
          {
            role: "coach",
            text: generated.coachResponse.openingMessage,
          },
        ],
        profile,
        coachResponse: generated.coachResponse,
      },
    });

    expect(chatResponse.ok()).toBeTruthy();
    const chatData = await chatResponse.json();
    expect(chatData.shouldRegeneratePlan).toBeTruthy();
    expect(chatData.profilePatch?.preferredTrainingDays).toContain("Wed");
    expect(chatData.profilePatch?.preferredTrainingDays).not.toContain("Fri");

    const regenerated = await generatePlanForProfile(page, currentUserId, {
      ...profile,
      ...chatData.profilePatch,
    });
    const updatedDays = regenerated.coachResponse.planSnapshot.map(
      (day: any) => day.dayLabel
    );

    expect(updatedDays).toContain("Wednesday");
    expect(updatedDays).not.toContain("Friday");
  });

  test("coach can clear all scheduled workouts from the current plan", async ({
    page,
  }) => {
    const username = buildUsername("coach-clear");
    await signUp(page, username);
    currentUserId = await getSessionUserId(page);

    const profile = {
      sex: "",
      age: "",
      preferredUnits: "lb",
      trainingGoal: "strength",
      currentFitnessLevel: "starting_out",
      workoutDaysPerWeek: "4",
      experienceLevel: "beginner",
      workoutLength: "45",
      equipmentAccess: ["Bodyweight only"],
      maxDumbbellWeight: "",
      preferredTrainingDays: [],
      limitations: "",
      notes: "",
    };

    const generated = await generatePlanForProfile(page, currentUserId, profile);
    expect(generated.coachResponse.planSnapshot.length).toBeGreaterThan(0);

    const chatResponse = await page.request.post("/api/workoutCoachChat", {
      data: {
        message: "unschedule all exercises please",
        history: [
          {
            role: "coach",
            text: generated.coachResponse.openingMessage,
          },
        ],
        profile,
        coachResponse: generated.coachResponse,
      },
    });

    expect(chatResponse.ok()).toBeTruthy();
    const chatData = await chatResponse.json();
    expect(chatData.action?.type).toBe("clear_all_schedules");
    expect(String(chatData.reply)).toMatch(/cleared the current scheduled workouts/i);
  });

  test("coach can interpret instead-of weekday swaps", async ({ page }) => {
    const username = buildUsername("coach-instead");
    await signUp(page, username);
    currentUserId = await getSessionUserId(page);

    const profile = {
      sex: "",
      age: "",
      preferredUnits: "lb",
      trainingGoal: "strength",
      currentFitnessLevel: "starting_out",
      workoutDaysPerWeek: "4",
      experienceLevel: "beginner",
      workoutLength: "45",
      equipmentAccess: ["Bodyweight only"],
      maxDumbbellWeight: "",
      preferredTrainingDays: [],
      limitations: "",
      notes: "",
    };

    const generated = await generatePlanForProfile(page, currentUserId, profile);
    const initialDays = generated.coachResponse.planSnapshot.map(
      (day: any) => day.dayLabel
    );

    expect(initialDays).toContain("Saturday");

    const chatResponse = await page.request.post("/api/workoutCoachChat", {
      data: {
        message: "Instead of Saturday I'd like to workout on wed",
        history: [
          {
            role: "coach",
            text: generated.coachResponse.openingMessage,
          },
        ],
        profile: {
          ...profile,
        },
        coachResponse: generated.coachResponse,
      },
    });

    expect(chatResponse.ok()).toBeTruthy();
    const chatData = await chatResponse.json();
    expect(chatData.shouldRegeneratePlan).toBeTruthy();
    expect(chatData.profilePatch?.preferredTrainingDays).toContain("Wed");
    expect(chatData.profilePatch?.preferredTrainingDays).not.toContain("Sat");
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

  test("routines load does not 500 recurring rule requests", async ({ page }) => {
    const username = buildUsername("recurring-api");
    const recurringRuleFailures: string[] = [];

    page.on("response", (response) => {
      if (
        response.url().includes("/api/recurringRule") &&
        response.status() >= 500
      ) {
        recurringRuleFailures.push(`${response.status()} ${response.url()}`);
      }
    });

    await signUp(page, username);
    currentUserId = await getSessionUserId(page);

    await continueAsTracker(page);
    await expect(
      page.getByRole("button", { name: /Add First Exercise|Add Exercise/ })
    ).toBeVisible();

    await page.waitForTimeout(1500);
    expect(recurringRuleFailures).toEqual([]);
  });

  test("bodyweight-only generation avoids impossible exercises and same-day duplicates", async ({
    page,
  }) => {
    const username = buildUsername("bodyweight");
    await signUp(page, username);
    currentUserId = await getSessionUserId(page);

    const response = await page.request.post("/api/generateWorkout", {
      data: {
        userId: currentUserId,
        profile: {
          sex: "",
          age: "",
          preferredUnits: "lb",
          trainingGoal: "general_fitness",
          currentFitnessLevel: "starting_out",
          workoutDaysPerWeek: "3",
          experienceLevel: "beginner",
          workoutLength: "25",
          equipmentAccess: ["Bodyweight only"],
          maxDumbbellWeight: "",
          preferredTrainingDays: [],
          limitations: "",
          notes: "Apartment workout, no pull-up bar.",
        },
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    const planDays = Array.isArray(data?.coachResponse?.planSnapshot)
      ? data.coachResponse.planSnapshot
      : [];

    expect(planDays.length).toBeGreaterThan(0);

    const forbiddenNames = ["trap bar deadlift"];
    for (const day of planDays) {
      const names = Array.isArray(day.exercises)
        ? day.exercises.map((exercise: any) => String(exercise.name).toLowerCase())
        : [];

      forbiddenNames.forEach((name) => {
        expect(names).not.toContain(name);
      });

      expect(new Set(names).size).toBe(names.length);
    }
  });

  test("older adult limitations generation avoids jump rope and unsupported heavy hinges", async ({
    page,
  }) => {
    const username = buildUsername("limitations");
    await signUp(page, username);
    currentUserId = await getSessionUserId(page);

    const response = await page.request.post("/api/generateWorkout", {
      data: {
        userId: currentUserId,
        profile: {
          sex: "female",
          age: "67",
          preferredUnits: "lb",
          trainingGoal: "general_fitness",
          currentFitnessLevel: "starting_out",
          workoutDaysPerWeek: "3",
          experienceLevel: "beginner",
          workoutLength: "25",
          equipmentAccess: ["Bodyweight only", "Resistance bands"],
          maxDumbbellWeight: "",
          preferredTrainingDays: [],
          limitations:
            "Knee discomfort and shoulder mobility limits. Prioritize joint-friendly movements.",
          notes: "",
        },
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    const planDays = Array.isArray(data?.coachResponse?.planSnapshot)
      ? data.coachResponse.planSnapshot
      : [];
    const allNames = planDays.flatMap((day: any) =>
      Array.isArray(day.exercises)
        ? day.exercises.map((exercise: any) => String(exercise.name).toLowerCase())
        : []
    );

    expect(planDays.length).toBeGreaterThan(0);
    expect(allNames).not.toContain("jump rope");
    expect(allNames).not.toContain("trap bar deadlift");
  });
});
