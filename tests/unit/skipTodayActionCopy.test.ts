import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("skip for today workout action", () => {
  it("adds a dedicated skip menu action and non-destructive skip dialog copy", () => {
    const menuSource = fs.readFileSync(
      path.join(process.cwd(), "components", "CRUDMenuButton.tsx"),
      "utf8"
    );
    const skipDialogSource = fs.readFileSync(
      path.join(process.cwd(), "components", "SkipTodayDialog.tsx"),
      "utf8"
    );
    const exerciseItemSource = fs.readFileSync(
      path.join(process.cwd(), "components", "ExerciseItem.tsx"),
      "utf8"
    );

    expect(menuSource).toContain('skipLabel = "Skip for today"');
    expect(skipDialogSource).toContain("Skip this exercise for today?");
    expect(skipDialogSource).toContain("Skip for {shortDate}");
    expect(skipDialogSource).toContain("without deleting it from your");
    expect(exerciseItemSource).toContain('toast.success("Skipped for today")');
    expect(exerciseItemSource).toContain("skipped: true");
    expect(exerciseItemSource).not.toContain('toast.success("Removed from this day")');
  });
});
