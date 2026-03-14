import React, { useMemo, useState } from "react";
import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ExerciseItem from "./ExerciseItem";

const WorkoutDisplay = ({
  exercises,
  currentWorkout,
  currentExerciseIndex,
  setCurrentExerciseIndex,
  formattedDate,
  routineName,
  setIsAddingExercise,
  setExercises,
  darkMode,
  setRefetchExercises,
  refreshCalendarStatuses,
}) => {
  const [shownMenuIndex, setShownMenuIndex] = useState(-1);

  const isExerciseComplete = (exercise: any) => {
    const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
    return Boolean(
      exercise?.complete || (sets.length > 0 && sets.every((set) => set.complete))
    );
  };

  const loggedSetCount = useMemo(
    () =>
      exercises.reduce(
        (total, exercise) =>
          total + (exercise.sets?.filter((set) => set.complete).length ?? 0),
        0
      ),
    [exercises]
  );

  const completedExercises = useMemo(
    () => exercises.filter((exercise) => isExerciseComplete(exercise)),
    [exercises]
  );

  const plannedExercises = useMemo(
    () => exercises.filter((exercise) => !isExerciseComplete(exercise)),
    [exercises]
  );

  const nextExercise = useMemo(
    () => exercises.find((exercise) => !isExerciseComplete(exercise)) ?? null,
    [exercises]
  );

  const nextExerciseIndex = useMemo(
    () => exercises.findIndex((exercise) => !isExerciseComplete(exercise)),
    [exercises]
  );

  const hasExercises = exercises.length > 0;
  const isWorkoutComplete = hasExercises && !nextExercise;
  const shouldShowNextSummary = plannedExercises.length > 1;
  const remainingExerciseCount = plannedExercises.length;
  const statusChip = !hasExercises
    ? { label: "No exercises scheduled", color: "default" as const }
    : isWorkoutComplete
    ? { label: "Workout complete", color: "success" as const }
    : loggedSetCount > 0
    ? {
        label: `In progress · ${loggedSetCount} set${
          loggedSetCount === 1 ? "" : "s"
        } logged`,
        color: "primary" as const,
      }
    : {
        label: `${remainingExerciseCount} exercise${
          remainingExerciseCount === 1 ? "" : "s"
        } scheduled`,
        color: "default" as const,
      };

  const workoutVolume = useMemo(
    () =>
      exercises.reduce((total, exercise) => {
        const exerciseVolume =
          exercise.sets?.reduce((setTotal, set) => {
            const reps = Number(set.actualReps ?? set.reps ?? 0);
            const weight = Number(set.actualWeight ?? set.weight ?? 0);
            if (!set.complete || !reps || !weight) {
              return setTotal;
            }
            return setTotal + reps * weight;
          }, 0) ?? 0;

        return total + exerciseVolume;
      }, 0),
    [exercises]
  );

  const renderSection = (title: string, description: string, items: any[]) => {
    if (items.length === 0) {
      return null;
    }

    const itemCountLabel = `${items.length} item${items.length === 1 ? "" : "s"}`;
    const showSectionDescription = items.length > 1;

    return (
      <Box sx={{ mt: 2.25 }}>
        <Box
          sx={{
            mb: 1,
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
          <Chip
            size="small"
            label={itemCountLabel}
            variant="outlined"
          />
        </Box>

        {items.map((exercise) => {
          const exerciseIndex = exercises.findIndex((item) => item === exercise);
          return (
            <ExerciseItem
              setRefetchExercises={setRefetchExercises}
              refreshCalendarStatuses={refreshCalendarStatuses}
              key={`exercise-item-${exerciseIndex}`}
              exercise={exercise}
              exerciseIndex={exerciseIndex}
              exercises={exercises}
              workout={currentWorkout}
              currentExerciseIndex={currentExerciseIndex}
              setCurrentExerciseIndex={setCurrentExerciseIndex}
              formattedDate={formattedDate}
              routineName={routineName}
              setExercises={setExercises}
              shownMenuIndex={shownMenuIndex}
              setShownMenuIndex={setShownMenuIndex}
              darkMode={darkMode}
            />
          );
        })}
      </Box>
    );
  };

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          p: 1.75,
          borderRadius: 4,
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: darkMode
            ? "rgba(17,24,39,0.78)"
            : "rgba(255,255,255,0.88)",
        }}
      >
        <Stack spacing={1.5}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", sm: "center" },
              flexDirection: { xs: "column", sm: "row" },
              gap: 1,
            }}
          >
            <Chip
              size="small"
              label={statusChip.label}
              color={statusChip.color}
              variant="outlined"
            />
          </Box>

          {nextExercise && shouldShowNextSummary ? (
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: darkMode
                  ? "rgba(255,255,255,0.03)"
                  : "rgba(248,250,252,0.92)",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: { xs: "flex-start", sm: "center" },
                  flexDirection: { xs: "column", sm: "row" },
                  gap: 1.25,
                }}
              >
                <Box>
                  <Typography
                    variant="overline"
                    sx={{ color: "text.secondary", letterSpacing: "0.12em" }}
                  >
                    Up Next
                  </Typography>
                  <Typography variant="h6">{nextExercise.name}</Typography>
                  <Typography sx={{ mt: 0.35, color: "text.secondary" }}>
                    Open this exercise to keep moving through today's plan.
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  startIcon={<PlayArrowIcon />}
                  onClick={() => setCurrentExerciseIndex(nextExerciseIndex)}
                >
                  Open Next Set
                </Button>
              </Box>
            </Paper>
          ) : isWorkoutComplete ? (
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: darkMode
                  ? "rgba(255,255,255,0.03)"
                  : "rgba(248,250,252,0.92)",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: { xs: "flex-start", sm: "center" },
                  flexDirection: { xs: "column", sm: "row" },
                  gap: 1.25,
                }}
              >
                <Box>
                  <Typography
                    variant="overline"
                    sx={{ color: "text.secondary", letterSpacing: "0.12em" }}
                  >
                    Workout Complete
                  </Typography>
                  <Typography variant="h6">
                    Everything for today is logged
                  </Typography>
                  <Typography sx={{ mt: 0.35, color: "text.secondary" }}>
                    Review your completed work below or add another exercise if
                    you want to keep going.
                  </Typography>
                </Box>
                <CheckCircleOutlineIcon color="success" />
              </Box>
            </Paper>
          ) : null}

          {(completedExercises.length > 0 || isWorkoutComplete) && (
            <Box
              sx={{
                display: "flex",
                gap: 1,
                flexWrap: "wrap",
              }}
            >
              <Chip
                label={`${completedExercises.length} exercise${
                  completedExercises.length === 1 ? "" : "s"
                } completed`}
                variant="outlined"
              />
              <Chip
                label={`Total volume ${workoutVolume.toLocaleString()}`}
                variant="outlined"
              />
            </Box>
          )}
        </Stack>
      </Paper>

      {plannedExercises.length > 0
        ? renderSection(
            "Scheduled",
            "Exercises you still have left to complete today.",
            plannedExercises
          )
        : null}

      {completedExercises.length > 0
        ? renderSection(
            "Completed Today",
            "Finished exercises move here so the active workout stays cleaner.",
            completedExercises
          )
        : null}

      {!hasExercises ? (
        <Paper
          elevation={0}
          sx={{
            mt: 2.25,
            p: 2.5,
            borderRadius: 4,
            border: "1px solid",
            borderColor: "divider",
            textAlign: "center",
            backgroundColor: darkMode
              ? "rgba(17,24,39,0.72)"
              : "rgba(255,255,255,0.86)",
          }}
        >
          <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.12em" }}>
            Get Started
          </Typography>
          <Typography variant="h6" sx={{ mt: 0.5 }}>
            Add your first exercise
          </Typography>
          <Typography sx={{ mt: 0.75, color: "text.secondary" }}>
            Start with a lift, movement, or timed activity. You can always add
            more after that.
          </Typography>
        </Paper>
      ) : null}

      <Box sx={{ display: "flex", justifyContent: "center", mt: 2.5 }}>
        <Button
          variant="contained"
          onClick={() => {
            setIsAddingExercise(true);
          }}
          startIcon={<AddIcon />}
          sx={{
            px: 3,
            py: 1.1,
            borderRadius: 10,
            backgroundColor: darkMode ? "rgba(255,255,255,0.08)" : "#111827",
            color: darkMode ? "#f3f4f6" : "#f8fafc",
            "&:hover": {
              backgroundColor: darkMode ? "rgba(255,255,255,0.14)" : "#000000",
            },
          }}
        >
          {hasExercises ? "Add Exercise" : "Add First Exercise"}
        </Button>
      </Box>
    </Box>
  );
};

export default WorkoutDisplay;
