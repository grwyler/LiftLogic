import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError, requestJson } from "../../utils/apiClient";

describe("apiClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws a typed error when a request fails without a fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        text: vi.fn().mockResolvedValue("temporarily down"),
      })
    );

    await expect(requestJson("/api/test")).rejects.toMatchObject({
      name: "ApiRequestError",
      status: 503,
    });
  });

  it("returns the explicit fallback when configured", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Server Error",
        text: vi.fn().mockResolvedValue("boom"),
      })
    );

    await expect(
      requestJson<{ items: string[] }>("/api/test", {
        fallback: { items: [] },
      })
    ).resolves.toEqual({ items: [] });
  });
});
