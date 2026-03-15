import { expect, test } from "@playwright/test";
import {
  buildUsername,
  closeExerciseDetail,
  completeAssistantSetup,
  continueAsTracker,
  fetchRecurringRulesForUser,
  generatePlanForProfile,
  getSessionUserId,
  logFirstSetForFirstExercise,
  quickAddFirstExercise,
  reportFailedTestAsBug,
  saveAndEditRepeatScheduleEndDate,
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

  test("landing page exposes signup and signin entry points", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /Plan smarter lifts/i })
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

  test("critical /routines QA journey covers assistant setup, quick add, logging, and repeat schedules", async ({
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
    await saveAndEditRepeatScheduleEndDate(page, {
      initialOffsetDays: 10,
      updatedOffsetDays: 18,
    });
  });

  test("generated plans schedule recurring rules onto the routines calendar", async ({
    page,
  }) => {
    const username = buildUsername("coach-plan");
    await signUp(page, username);
    currentUserId = await getSessionUserId(page);

    const generated = await generatePlanForProfile(page, currentUserId, {
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
      notes: "Focus on progressive overload with practical compound lifts.",
    });

    expect(generated?.coachResponse?.planSnapshot?.length).toBe(4);

    await expect
      .poll(async () => {
        const rules = await fetchRecurringRulesForUser(page, currentUserId);
        const distinctDays = new Set(
          rules.flatMap((rule) =>
            Array.isArray(rule.daysOfWeek) && rule.daysOfWeek.length > 0
              ? rule.daysOfWeek
              : typeof rule.dayOfWeek === "number"
              ? [rule.dayOfWeek]
              : []
          )
        );

        return JSON.stringify({
          ruleCount: rules.length,
          distinctDayCount: distinctDays.size,
        });
      })
      .toContain('"distinctDayCount":4');
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
