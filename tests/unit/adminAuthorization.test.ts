import { describe, expect, it } from "vitest";
import {
  getSessionUserId,
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

  it("grants workflow admin access to the canonical admin username", () => {
    expect(
      isBugWorkflowAdminSession({
        user: {
          _id: "admin-2",
          username: "grwyler",
        },
      })
    ).toBe(true);
  });

  it("grants workflow admin access to the canonical admin email", () => {
    expect(
      isBugWorkflowAdminUser({
        email: "grwyler@gmail.com",
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
