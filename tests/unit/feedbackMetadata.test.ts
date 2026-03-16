import { describe, expect, it } from "vitest";
import { classifyClientDeviceType } from "../../utils/feedbackMetadata";

describe("feedback device classification", () => {
  it("classifies phones as mobile", () => {
    expect(
      classifyClientDeviceType({
        width: 412,
        userAgent:
          "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/123.0 Mobile Safari/537.36",
        touchPoints: 5,
      })
    ).toBe("mobile");
  });

  it("classifies Android tablets as tablet", () => {
    expect(
      classifyClientDeviceType({
        width: 800,
        userAgent:
          "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 Chrome/123.0 Safari/537.36",
        touchPoints: 5,
      })
    ).toBe("tablet");
  });

  it("classifies known foldables as foldable", () => {
    expect(
      classifyClientDeviceType({
        width: 673,
        userAgent:
          "Mozilla/5.0 (Linux; Android 14; Pixel Fold) AppleWebKit/537.36 Chrome/123.0 Mobile Safari/537.36",
        touchPoints: 5,
      })
    ).toBe("foldable");
  });

  it("keeps desktop browsers as desktop", () => {
    expect(
      classifyClientDeviceType({
        width: 1440,
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123.0 Safari/537.36",
        touchPoints: 0,
      })
    ).toBe("desktop");
  });
});
