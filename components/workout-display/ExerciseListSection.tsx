import React from "react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { Box, Chip, Paper, Typography } from "@mui/material";
import ExerciseItem from "../ExerciseItem";
import { WorkoutExerciseView } from "../../utils/types";
import { routinesPanelRadius } from "./panelStyles";
import {
  WorkoutDisplayExercise,
  WorkoutDisplayUserProfile,
  WorkoutProgressLookup,
} from "./workoutDisplayTypes";

const ExerciseListSection = ({
  activeRestTimer,
  currentExerciseIndex,
  currentWorkout,
  darkMode,
  description,
  exerciseProgressById,
  exercises,
  formattedDate,
  getExerciseCacheKey,
  getExerciseIdentity,
  handleExerciseDragEnd,
  items,
  lowEnergyModeActive,
  loadingProgressById,
  onRequestPersonalRecordUpgradePrompt,
  onRequestProgressionUpgradePrompt,
  onRequestRecurringUpgradePrompt,
  openRestTimer,
  progressionRecommendationsEnabled,
  recurringSchedulingEnabled,
  refreshCalendarStatuses,
  routineName,
  setCurrentExerciseIndex,
  setExercises,
  setRefetchExercises,
  setShownMenuIndex,
  shownMenuIndex,
  title,
  userProfile,
}: {
  activeRestTimer: { exerciseKey: string } | null;
  currentExerciseIndex: number;
  currentWorkout: unknown;
  darkMode: boolean;
  description: string;
  exerciseProgressById: WorkoutProgressLookup;
  exercises: WorkoutDisplayExercise[];
  formattedDate: string;
  getExerciseCacheKey: (exercise: WorkoutDisplayExercise) => string;
  getExerciseIdentity: (exercise: WorkoutDisplayExercise, fallbackIndex?: number | string) => string;
  handleExerciseDragEnd: (...args: unknown[]) => void;
  items: WorkoutDisplayExercise[];
  lowEnergyModeActive: boolean;
  loadingProgressById: Record<string, boolean>;
  onRequestPersonalRecordUpgradePrompt?: () => void;
  onRequestProgressionUpgradePrompt?: () => void;
  onRequestRecurringUpgradePrompt?: () => void;
  openRestTimer: (value: {
    exerciseKey: string;
    exerciseName: string;
    seconds: number;
    restSeconds: number;
  }) => void;
  progressionRecommendationsEnabled: boolean;
  recurringSchedulingEnabled: boolean;
  refreshCalendarStatuses?: () => void;
  routineName: string;
  setCurrentExerciseIndex: React.Dispatch<React.SetStateAction<number>>;
  setExercises: React.Dispatch<React.SetStateAction<WorkoutDisplayExercise[]>>;
  setRefetchExercises: React.Dispatch<React.SetStateAction<boolean>>;
  setShownMenuIndex: React.Dispatch<React.SetStateAction<number>>;
  shownMenuIndex: number;
  title: string;
  userProfile?: WorkoutDisplayUserProfile;
}) => {
  if (items.length === 0) {
    return null;
  }

  const itemCountLabel = `${items.length} item${items.length === 1 ? "" : "s"}`;
  const showSectionDescription = items.length > 1;

  const renderExerciseItem = (exercise: WorkoutDisplayExercise) => {
    const exerciseIndex = exercises.findIndex((item) => item === exercise);

    return (
      <ExerciseItem
        setRefetchExercises={setRefetchExercises}
        refreshCalendarStatuses={refreshCalendarStatuses}
        key={`exercise-item-${exerciseIndex}`}
        exercise={exercise as WorkoutExerciseView & { userId?: string }}
        exerciseIndex={exerciseIndex}
        exercises={exercises as (WorkoutExerciseView & { userId?: string })[]}
        workout={currentWorkout}
        isOpen={exerciseIndex === currentExerciseIndex}
        setCurrentExerciseIndex={setCurrentExerciseIndex}
        formattedDate={formattedDate}
        routineName={routineName}
        setExercises={setExercises}
        shownMenuIndex={shownMenuIndex}
        setShownMenuIndex={setShownMenuIndex}
        darkMode={darkMode}
        userProfile={userProfile}
        recommendation={exerciseProgressById[getExerciseCacheKey(exercise)]?.recommendation ?? null}
        progressSummary={exerciseProgressById[getExerciseCacheKey(exercise)]?.summary ?? null}
        loadingRecommendation={Boolean(loadingProgressById[getExerciseCacheKey(exercise)])}
        lowEnergyModeActive={lowEnergyModeActive}
        progressionRecommendationsEnabled={progressionRecommendationsEnabled}
        recurringSchedulingEnabled={recurringSchedulingEnabled}
        onRequestPersonalRecordUpgradePrompt={onRequestPersonalRecordUpgradePrompt}
        onRequestRecurringUpgradePrompt={onRequestRecurringUpgradePrompt}
        onRequestProgressionUpgradePrompt={onRequestProgressionUpgradePrompt}
        isRestTimerBlocking={
          activeRestTimer?.exerciseKey === getExerciseIdentity(exercise, exerciseIndex)
        }
        openRestTimer={openRestTimer}
      />
    );
  };

  return (
    <Box sx={{ mt: 2.25 }}>
      <Paper
        elevation={0}
        sx={{
          p: 1.75,
          borderRadius: routinesPanelRadius.shell,
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: darkMode
            ? "rgba(17,24,39,0.78)"
            : "rgba(255,255,255,0.88)",
        }}
      >
        <Box
          sx={{
            mb: 1.25,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Box>
            <Typography
              variant="overline"
              sx={{ color: "text.secondary", letterSpacing: "0.12em" }}
            >
              {title}
            </Typography>
            {showSectionDescription ? (
              <Typography sx={{ color: "text.secondary" }}>{description}</Typography>
            ) : null}
          </Box>
          <Chip size="small" label={itemCountLabel} variant="outlined" />
        </Box>

        {title === "Scheduled" ? (
          <DragDropContext onDragEnd={handleExerciseDragEnd}>
            <Droppable droppableId="scheduled-exercises">
              {(provided) => (
                <Box ref={provided.innerRef} {...provided.droppableProps}>
                  {items.map((exercise, index) => {
                    const exerciseIndex = exercises.findIndex((item) => item === exercise);
                    const draggableId = String(
                      getExerciseIdentity(
                        exercise,
                        `${exercise?.name ?? "exercise"}-${exerciseIndex}`
                      )
                    );

                    return (
                      <Draggable
                        key={`exercise-item-${draggableId}`}
                        draggableId={`exercise-${draggableId}`}
                        index={index}
                      >
                        {(dragProvided) => (
                          <Box
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                          >
                            {renderExerciseItem(exercise)}
                          </Box>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </Box>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          items.map((exercise) => renderExerciseItem(exercise))
        )}
      </Paper>
    </Box>
  );
};

export default ExerciseListSection;
