import { describe, expect, it } from "vitest";
import {
  getSessionUserId,
  isAppAdminSession,
  isFoundingBetaAdminUser,
  isBugWorkflowAdminSession,
  isBugWorkflowAdminUser,
} from "../../utils/adminAuthorization";

describe("admin authorization", () => {
  it("grants workflow admin access from explicit permissions", () => {
    expect(
      isBugWorkflowAdminUser({
        username: "teammate",
        permissions: {
          bugWorkflowAdmin: true,
        },
      })
    ).toBe(true);
  });

  it("grants workflow admin access from admin roles", () => {
    expect(
      isBugWorkflowAdminSession({
        user: {
          _id: "admin-1",
          roles: ["admin"],
        },
      })
    ).toBe(true);
  });

  it("does not grant workflow admin access from a hardcoded username alone", () => {
    expect(
      isBugWorkflowAdminSession({
        user: {
          _id: "user-2",
          username: "grwyler",
        },
      })
    ).toBe(false);
  });

  it("does not grant workflow admin access from a hardcoded email alone", () => {
    expect(
      isBugWorkflowAdminUser({
        email: "grwyler@gmail.com",
      })
    ).toBe(false);
  });

  it("grants generic app admin access from the admin role", () => {
    expect(
      isAppAdminSession({
        user: {
          roles: ["admin"],
        },
      })
    ).toBe(true);
  });

  it("grants founding beta admin access from explicit permissions", () => {
    expect(
      isFoundingBetaAdminUser({
        permissions: {
          foundingBetaAdmin: true,
        },
      })
    ).toBe(true);
  });

  it("reads the requester id from either session shape", () => {
    expect(
      getSessionUserId({
        token: {
          user: {
            _id: "user-123",
          },
        },
      })
    ).toBe("user-123");
  });
});
