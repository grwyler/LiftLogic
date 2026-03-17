import { describe, expect, it } from "vitest";
import { APP_CHANGELOG, getChangelogEntry } from "../../utils/appChangelog";

describe("app changelog", () => {
  it("returns the matching entry for a version badge click", () => {
    expect(getChangelogEntry("v0.1.7")?.version).toBe("0.1.7");
  });

  it("keeps changes and test guidance for each recorded version", () => {
    APP_CHANGELOG.forEach((entry) => {
      expect(entry.changes.length).toBeGreaterThan(0);
      expect(entry.testFocus.length).toBeGreaterThan(0);
    });
  });
});
