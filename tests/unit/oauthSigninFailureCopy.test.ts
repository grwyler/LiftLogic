import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("oauth sign-in failure handling", () => {
  it("redirects storage outages to a specific sign-in error code", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "api", "auth", "[...nextauth].ts"),
      "utf8"
    );

    expect(source).toContain("oauth_storage_unavailable");
    expect(source).toContain("oauth_signin_failed");
    expect(source).toContain("MongoServerSelectionError");
    expect(source).toContain("return getOAuthFailureRedirect(error);");
  });

  it("explains localhost database outages on the sign-in page", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "signin.tsx"),
      "utf8"
    );

    expect(source).toContain("getAuthErrorMessage");
    expect(source).toContain("oauth_storage_unavailable");
    expect(source).toContain("MongoDB Atlas is unavailable from this machine");
    expect(source).toContain("const visibleError = error || getAuthErrorMessage(queryErrorCode);");
  });
});
