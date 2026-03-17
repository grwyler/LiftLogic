import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("workout pending save queue wiring", () => {
  it("uses the offline queue wrapper from the active set logging flow", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "SelectedSetItem.tsx"),
      "utf8"
    );

    expect(source).toContain("persistWorkoutEntryWithOfflineQueue");
    expect(source).toContain("Saved offline. We'll sync this set when your connection returns.");
  });

  it("flushes queued workout saves when the app boots and reconnects", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "_app.tsx"),
      "utf8"
    );

    expect(source).toContain("flushPendingWorkoutSaveQueue");
    expect(source).toContain('window.addEventListener("online", handleOnline);');
    expect(source).toContain('void flushQueuedWorkoutSaves("boot");');
  });
});
