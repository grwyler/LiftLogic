import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("observability and reminder wiring", () => {
  it("wires route performance and reminder delivery through the app shell", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "_app.tsx"),
      "utf8"
    );

    expect(source).toContain("routeChangeStart");
    expect(source).toContain("routeChangeComplete");
    expect(source).toContain("SLOW_ROUTE_TRANSITION_MS");
    expect(source).toContain("fetchPendingReminders()");
    expect(source).toContain("acknowledgeReminder");
  });

  it("routes automatic bug capture into observability in addition to feedback", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "AutomaticBugReporter.tsx"),
      "utf8"
    );

    expect(source).toContain("trackObservabilityEvent");
    expect(source).toContain('kind: "client_error"');
    expect(source).toContain("if (userId) {");
  });

  it("tracks checkout failures and workout save failures as explicit observability events", () => {
    const pricingSource = fs.readFileSync(
      path.join(process.cwd(), "pages", "pricing.tsx"),
      "utf8"
    );
    const helperSource = fs.readFileSync(
      path.join(process.cwd(), "utils", "helpers.ts"),
      "utf8"
    );

    expect(pricingSource).toContain('kind: "checkout_failure"');
    expect(helperSource).toContain('kind: "workout_save_failure"');
    expect(helperSource).toContain('"/api/observability"');
  });

  it("adds reminder preferences to the user settings surface and user API sanitizer", () => {
    const userSource = fs.readFileSync(
      path.join(process.cwd(), "pages", "user.tsx"),
      "utf8"
    );
    const userApiSource = fs.readFileSync(
      path.join(process.cwd(), "pages", "api", "user.ts"),
      "utf8"
    );

    expect(userSource).toContain("Reminders and comeback nudges");
    expect(userSource).toContain("scheduledWorkoutReminderTime");
    expect(userSource).toContain("quietHoursStart");
    expect(userSource).toContain("comebackThresholdDays");
    expect(userApiSource).toContain('"reminderPreferences" in user');
    expect(userApiSource).toContain("normalizeReminderPreferences");
  });
});
