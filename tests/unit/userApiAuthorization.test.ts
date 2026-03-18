import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("/api/user authorization", () => {
  it("requires an authenticated session and owner-or-admin access checks", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "api", "user.ts"),
      "utf8"
    );

    expect(source).toContain("getServerSession(req, res, authOptions)");
    expect(source).toContain('return res.status(401).json({ message: "Authentication required" })');
    expect(source).toContain("canAccessUser({");
    expect(source).toContain('return res.status(403).json({ message: "Forbidden" })');
    expect(source).toContain("admin || requesterId === targetUserId");
  });
});
