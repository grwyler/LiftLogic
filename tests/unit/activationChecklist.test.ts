import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("activation checklist", () => {
  it("adds a persistent first-value checklist to routines and persists dismissal on the user record", () => {
    const routinesSource = fs.readFileSync(
      path.join(process.cwd(), "pages", "routines.tsx"),
      "utf8"
    );
    const userApiSource = fs.readFileSync(
      path.join(process.cwd(), "pages", "api", "user.ts"),
      "utf8"
    );
    const typesSource = fs.readFileSync(
      path.join(process.cwd(), "utils", "types.ts"),
      "utf8"
    );

    expect(routinesSource).toContain("Activation Checklist");
    expect(routinesSource).toContain("Get to your first real win");
    expect(routinesSource).toContain("firstWorkoutLoggedAt");
    expect(routinesSource).toContain("activationChecklistDismissed");
    expect(routinesSource).toContain("assistantSetupDeferredAt");
    expect(userApiSource).toContain('"activationChecklistDismissed" in user');
    expect(userApiSource).toContain('"assistantSetupDeferredAt" in user');
    expect(typesSource).toContain("activationChecklistDismissed?: boolean;");
    expect(typesSource).toContain("assistantSetupDeferredAt?: Date | string | null;");
  });
});
