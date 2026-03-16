import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("signup copy clarity", () => {
  it("describes signup as account creation and defers profile setup until after signup", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "signup.tsx"),
      "utf8"
    );

    expect(source).toContain("Create your account to get started.");
    expect(source).toContain(
      "After sign-up, you can set your goal, schedule, equipment, and"
    );
    expect(source).toContain("preferences before Lift Logic starts adapting your");
    expect(source).toContain(
      "Create your login now, then finish your training setup next."
    );
    expect(source).toContain(
      "After account creation, you can choose your goal, schedule, and equipment."
    );
    expect(source).not.toContain("Set up your training profile in a minute.");
    expect(source).not.toContain(
      "Start simple. Create an account, pick your goal, and the app can"
    );
  });
});
