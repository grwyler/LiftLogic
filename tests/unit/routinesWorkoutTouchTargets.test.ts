import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("routines workout touch targets", () => {
  it("keeps core workout controls at 44px+ targets with visible labels", () => {
    const exerciseItemSource = fs.readFileSync(
      path.join(process.cwd(), "components", "ExerciseItem.tsx"),
      "utf8"
    );
    const loggingDialogSource = fs.readFileSync(
      path.join(process.cwd(), "components", "exercise-item", "ExerciseLoggingDialog.tsx"),
      "utf8"
    );
    const setItemSource = fs.readFileSync(
      path.join(process.cwd(), "components", "SetItem.tsx"),
      "utf8"
    );
    const selectedSetSource = fs.readFileSync(
      path.join(process.cwd(), "components", "SelectedSetItem.tsx"),
      "utf8"
    );
    const menuButtonSource = fs.readFileSync(
      path.join(process.cwd(), "components", "CRUDMenuButton.tsx"),
      "utf8"
    );

    expect(exerciseItemSource).toContain("const mobileTouchTarget = 44;");
    expect(exerciseItemSource).toContain('minHeight: mobileTouchTarget');
    expect(exerciseItemSource).toContain('minWidth: { xs: "100%", sm: 176 }');
    expect(loggingDialogSource).toContain("Repeat Lift");
    expect(setItemSource).toContain("Delete set");
    expect(setItemSource).toContain("minHeight: 44");
    expect(selectedSetSource).toContain("minHeight: 52");
    expect(selectedSetSource).toContain('minWidth: { xs: "100%", sm: 168 }');
    expect(menuButtonSource).toContain("aria-label=\"Exercise actions\"");
    expect(menuButtonSource).toContain("minHeight: 44");
  });
});
