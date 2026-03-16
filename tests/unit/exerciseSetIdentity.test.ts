import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { ensureExerciseSetIds } from "../../utils/exerciseSetIds";

describe("exercise set identity", () => {
  it("adds stable ids to legacy sets without mutating existing ids", () => {
    const sets = ensureExerciseSetIds([
      { id: "set-a", name: "Working Set 1", reps: 8, weight: 135 },
      { name: "Working Set 1", reps: 10, weight: 115 },
    ] as any);

    expect(sets[0].id).toBe("set-a");
    expect(typeof sets[1].id).toBe("string");
    expect(sets[1].id).not.toBe("set-a");
  });

  it("deletes and drags sets by immutable id instead of display label", () => {
    const exerciseItemSource = fs.readFileSync(
      path.join(process.cwd(), "components", "ExerciseItem.tsx"),
      "utf8"
    );
    const setItemSource = fs.readFileSync(
      path.join(process.cwd(), "components", "SetItem.tsx"),
      "utf8"
    );
    const editWeightSource = fs.readFileSync(
      path.join(process.cwd(), "components", "SetEditWeightItem.tsx"),
      "utf8"
    );
    const editTimerSource = fs.readFileSync(
      path.join(process.cwd(), "components", "SetEditTimerItem.tsx"),
      "utf8"
    );
    const editExerciseSource = fs.readFileSync(
      path.join(process.cwd(), "components", "ExerciseEditItem.tsx"),
      "utf8"
    );

    expect(exerciseItemSource).toContain("sets.filter((s) => s.id !== setId)");
    expect(setItemSource).toContain("onClick={() => handleDeleteSet(set.id)}");
    expect(editWeightSource).toContain("draggableId={`set-${set.id ?? index}`}");
    expect(editTimerSource).toContain("draggableId={`set-${set.id ?? index}`}");
    expect(editExerciseSource).toContain('mySets.filter((s) => s.id !== setToRemove.id)');
    expect(editExerciseSource).toContain("Duplicate set labels are allowed");
  });
});
