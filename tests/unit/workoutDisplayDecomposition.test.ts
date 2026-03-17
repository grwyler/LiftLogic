import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("workout display decomposition", () => {
  it("routes progress, schedule, reorder, and recap concerns through extracted hooks and components", () => {
    const workoutDisplaySource = fs.readFileSync(
      path.join(process.cwd(), "components", "WorkoutDisplay.tsx"),
      "utf8"
    );
    const progressHookSource = fs.readFileSync(
      path.join(process.cwd(), "components", "workout-display", "useWorkoutProgressData.ts"),
      "utf8"
    );
    const scheduleHookSource = fs.readFileSync(
      path.join(process.cwd(), "components", "workout-display", "useWorkoutScheduleActions.ts"),
      "utf8"
    );
    const orderHookSource = fs.readFileSync(
      path.join(process.cwd(), "components", "workout-display", "useWorkoutExerciseOrder.ts"),
      "utf8"
    );
    const restTimerHookSource = fs.readFileSync(
      path.join(process.cwd(), "components", "workout-display", "useRestTimerActions.ts"),
      "utf8"
    );
    const headerSource = fs.readFileSync(
      path.join(process.cwd(), "components", "workout-display", "WorkoutHeaderSummary.tsx"),
      "utf8"
    );
    const secondaryInsightsSource = fs.readFileSync(
      path.join(process.cwd(), "components", "workout-display", "WorkoutSecondaryInsights.tsx"),
      "utf8"
    );
    const recapSource = fs.readFileSync(
      path.join(process.cwd(), "components", "workout-display", "WorkoutCompletionRecap.tsx"),
      "utf8"
    );
    const sectionSource = fs.readFileSync(
      path.join(process.cwd(), "components", "workout-display", "ExerciseListSection.tsx"),
      "utf8"
    );

    expect(workoutDisplaySource).toContain('import WorkoutHeaderSummary from "./workout-display/WorkoutHeaderSummary"');
    expect(workoutDisplaySource).toContain('import WorkoutSecondaryInsights from "./workout-display/WorkoutSecondaryInsights"');
    expect(workoutDisplaySource).toContain('import WorkoutCompletionRecap from "./workout-display/WorkoutCompletionRecap"');
    expect(workoutDisplaySource).toContain('import ExerciseListSection from "./workout-display/ExerciseListSection"');
    expect(workoutDisplaySource).toContain("useWorkoutProgressData({");
    expect(workoutDisplaySource).toContain("useWorkoutScheduleActions({");
    expect(workoutDisplaySource).toContain("useWorkoutExerciseOrder({");
    expect(workoutDisplaySource).toContain("useWeeklyTargetActions({");
    expect(workoutDisplaySource).toContain("useRestTimerActions({");
    expect(workoutDisplaySource).not.toContain("const persistExerciseOrder = async");
    expect(workoutDisplaySource).not.toContain("const handleSaveWorkoutSchedule = async");
    expect(workoutDisplaySource).not.toContain("const handleWeeklyTargetChange = async");
    expect(workoutDisplaySource).not.toContain("const renderSection =");

    expect(progressHookSource).toContain("fetchExerciseProgress");
    expect(scheduleHookSource).toContain('action: "save_workout_schedule"');
    expect(orderHookSource).toContain("const persistExerciseOrder = async");
    expect(restTimerHookSource).toContain("const [activeRestTimer, setActiveRestTimer] = useState<");
    expect(headerSource).toContain("Next Action");
    expect(secondaryInsightsSource).toContain("Weekly Consistency");
    expect(secondaryInsightsSource).toContain("Comeback Plan");
    expect(recapSource).toContain("Session Recap");
    expect(recapSource).toContain("Milestone Unlocked");
    expect(sectionSource).toContain("<DragDropContext onDragEnd={handleExerciseDragEnd}>");
  });
});
