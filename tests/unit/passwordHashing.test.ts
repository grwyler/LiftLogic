import { describe, expect, it } from "vitest";
import {
  hashPassword,
  isPasswordHash,
  needsPasswordMigration,
  verifyPassword,
} from "../../utils/passwords";

describe("password hashing", () => {
  it("hashes passwords before storage and verifies candidates safely", async () => {
    const hash = await hashPassword("super-secret-password");

    expect(isPasswordHash(hash)).toBe(true);
    expect(hash).not.toContain("super-secret-password");

    await expect(
      verifyPassword({
        storedPassword: hash,
        candidatePassword: "super-secret-password",
      })
    ).resolves.toBe(true);

    await expect(
      verifyPassword({
        storedPassword: hash,
        candidatePassword: "wrong-password",
      })
    ).resolves.toBe(false);
  });

  it("flags legacy plaintext passwords for migration", () => {
    expect(needsPasswordMigration("plaintext-password")).toBe(true);
    expect(needsPasswordMigration("")).toBe(false);
    expect(needsPasswordMigration(undefined)).toBe(false);
  });
});
