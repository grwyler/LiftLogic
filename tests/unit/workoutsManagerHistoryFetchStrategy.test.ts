import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("workouts manager history fetch strategy", () => {
  it("does not refetch all workout history on every day refresh", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "WorkoutsManager.tsx"),
      "utf8"
    );

    expect(source).toContain("const [historyLoadedThroughKey, setHistoryLoadedThroughKey] = useState<string | null>(null);");
    expect(source).toContain('if (historyLoadedThroughKey && currentDate <= new Date(`${historyLoadedThroughKey}T23:59:59`)) {');
    expect(source).toContain("const fetchStartDate = historyLoadedThroughKey");
    expect(source).toContain("historyLoadedThroughKey");
    expect(source).not.toContain("}, [currentDate, dayRefreshTick, userId]);");
    expect(source).toContain("}, [currentDate, historyLoadedThroughKey, userId]);");
  });

  it("patches milestone history from the already-loaded current day entries", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "WorkoutsManager.tsx"),
      "utf8"
    );

    expect(source).toContain("const mergeHistoryEntriesForDateKey = ({");
    expect(source).toContain("setHistoryEntries((previousEntries) =>");
    expect(source).toContain("replacementEntries: entries,");
    expect(source).toContain("replacementEntries: fallbackEntries,");
  });
});
