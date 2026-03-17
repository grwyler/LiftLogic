import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("exercise item decomposition", () => {
  it("routes schedule persistence through shared actions and extracted subcomponents", () => {
    const exerciseItemSource = fs.readFileSync(
      path.join(process.cwd(), "components", "ExerciseItem.tsx"),
      "utf8"
    );
    const dialogsSource = fs.readFileSync(
      path.join(process.cwd(), "components", "exercise-item", "ExerciseDialogs.tsx"),
      "utf8"
    );
    const loggingDialogSource = fs.readFileSync(
      path.join(process.cwd(), "components", "exercise-item", "ExerciseLoggingDialog.tsx"),
      "utf8"
    );
    const stateHookSource = fs.readFileSync(
      path.join(process.cwd(), "components", "exercise-item", "useExerciseItemState.ts"),
      "utf8"
    );
    const scheduleActionsSource = fs.readFileSync(
      path.join(process.cwd(), "utils", "exerciseScheduleActions.ts"),
      "utf8"
    );

    expect(exerciseItemSource).toContain('import ExerciseDialogs from "./exercise-item/ExerciseDialogs"');
    expect(exerciseItemSource).toContain('import ExerciseLoggingDialog from "./exercise-item/ExerciseLoggingDialog"');
    expect(exerciseItemSource).toContain('useExerciseItemState({');
    expect(exerciseItemSource).toContain("saveExerciseRepeatSchedule");
    expect(exerciseItemSource).toContain("removeExerciseRepeatSchedule");
    expect(exerciseItemSource).not.toContain("React.memo(ExerciseItem");
    expect(dialogsSource).toContain("<RepeatScheduleDialog");
    expect(loggingDialogSource).toContain("<SelectedSetItem");
    expect(stateHookSource).toContain("const [currentExercise, setCurrentExercise] = useState(exercise);");
    expect(scheduleActionsSource).toContain("export const saveExerciseRepeatSchedule");
    expect(scheduleActionsSource).toContain("export const deleteExerciseWithScheduleScope");
  });
});
