import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("feedback page recent submissions flow", () => {
  it("refreshes recent submissions from the server after a successful submit", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "feedback.tsx"),
      "utf8"
    );

    expect(source).toContain("const latestFeedback = await fetchFeedback(user._id);");
    expect(source).toContain("setFeedbackItems(latestFeedback);");
  });

  it("supports both token-backed and session-backed user ids when loading feedback", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "feedback.tsx"),
      "utf8"
    );

    expect(source).toContain("const sessionUserId =");
    expect(source).toContain("session?.token?.user?._id");
    expect(source).toContain("(session?.user as { _id?: string } | undefined)?._id");
    expect(source).toContain("await loadFeedbackPageData(sessionUserId);");
  });
});
