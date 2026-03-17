import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("advanced set logging surface", () => {
  it("adds structured set metadata and quick logging helpers to the active set card", () => {
    const selectedSetSource = fs.readFileSync(
      path.join(process.cwd(), "components", "SelectedSetItem.tsx"),
      "utf8"
    );
    const completedSetSource = fs.readFileSync(
      path.join(process.cwd(), "components", "CompletedSetItem.tsx"),
      "utf8"
    );
    const typesSource = fs.readFileSync(
      path.join(process.cwd(), "utils", "types.ts"),
      "utf8"
    );

    expect(selectedSetSource).toContain("Previous performance context");
    expect(selectedSetSource).toContain("Copy last set");
    expect(selectedSetSource).toContain("Set type");
    expect(selectedSetSource).toContain("Plate math:");
    expect(selectedSetSource).toContain("Add notes or RPE");
    expect(selectedSetSource).toContain("Hide notes and RPE");
    expect(selectedSetSource).toContain("RPE (optional)");
    expect(selectedSetSource).toContain("Set note (optional)");
    expect(selectedSetSource).toContain("adjustWeightQuickly");
    expect(selectedSetSource).toContain("adjustRepsQuickly");

    expect(completedSetSource).toContain("RPE");
    expect(completedSetSource).toContain("Warm-up");
    expect(typesSource).toContain('setType?: "warm_up" | "working" | "drop" | "failure"');
    expect(typesSource).toContain("actualRpe?: number | string;");
    expect(typesSource).toContain("notes?: string;");
  });
});
