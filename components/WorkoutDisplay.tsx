import React, { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Session } from "next-auth";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import RepeatIcon from "@mui/icons-material/Repeat";
import ExerciseItem from "./ExerciseItem";
import MuscleRecoveryMap from "./MuscleRecoveryMap";
import RepeatScheduleDialog from "./RepeatScheduleDialog";
import { saveRecurringRule, saveWorkoutEntry } from "../utils/helpers";
import { toast } from "react-toastify";

const WorkoutDisplay = ({
  exercises,
  currentWorkout,
  currentExerciseIndex,
  setCurrentExerciseIndex,
  currentDate,
  formattedDate,
  routineName,
  setIsAddingExercise,
  setExercises,
  darkMode,
  setRefetchExercises,
  refreshCalendarStatuses,
  userProfile,
}) => {
  const [shownMenuIndex, setShownMenuIndex] = useState(-1);
  const [showWorkoutRepeatDialog, setShowWorkoutRepeatDialog] = useState(false);
  const { data: session } = useSession() as {
    data: (Session & { token?: { user?: { _id?: string } } }) | null;
  };

  const currentUserId =
    session?.token?.user?._id ?? (session?.user as { _id?: string } | undefined)?._id ?? "";

  const repeatingExercises = useMemo(
    () => exercises.filter((exercise) => Boolean(exercise?.isRepeating || exercise?.ruleId)),
    [exercises]
  );

  const sharedWorkoutSchedule = useMemo(() => {
    if (repeatingExercises.length === 0 || repeatingExercises.length !== exercises.length) {
      return null;
    }

    const [firstExercise, ...restExercises] = repeatingExercises;
    const baseSchedule = {
      recurrenceType: firstExercise?.recurrenceType ?? "weekly",
      interval: Number(firstExercise?.interval ?? firstExercise?.intervalWeeks ?? 1) || 1,
      dayOfWeek: Number(
        firstExercise?.dayOfWeek ??
          (Array.isArray(firstExercise?.daysOfWeek) ? firstExercise.daysOfWeek[0] : currentDate.getDay())
      ),
      daysOfWeek: Array.isArray(firstExercise?.daysOfWeek)
        ? firstExercise.daysOfWeek.map(Number)
        : [
            Number(
              firstExercise?.dayOfWeek ??
                (Array.isArray(firstExercise?.daysOfWeek) ? firstExercise.daysOfWeek[0] : currentDate.getDay())
            ),
          ],
      dayOfMonth: Number(firstExercise?.dayOfMonth ?? currentDate.getDate()) || currentDate.getDate(),
      endDate: firstExercise?.endDate ? String(firstExercise.endDate).slice(0, 10) : "",
    };

    const allMatch = restExercises.every((exercise) => {
      const exerciseDays = Array.isArray(exercise?.daysOfWeek)
        ? exercise.daysOfWeek.map(Number).sort().join(",")
        : "";
      const baseDays = [...baseSchedule.daysOfWeek].sort().join(",");

      return (
        (exercise?.recurrenceType ?? "weekly") === baseSchedule.recurrenceType &&
        (Number(exercise?.interval ?? exercise?.intervalWeeks ?? 1) || 1) === baseSchedule.interval &&
        Number(
          exercise?.dayOfWeek ??
            (Array.isArray(exercise?.daysOfWeek) ? exercise.daysOfWeek[0] : baseSchedule.dayOfWeek)
        ) === baseSchedule.dayOfWeek &&
        exerciseDays === baseDays &&
        Number(exercise?.dayOfMonth ?? baseSchedule.dayOfMonth) === baseSchedule.dayOfMonth &&
        String(exercise?.endDate ? String(exercise.endDate).slice(0, 10) : "") === baseSchedule.endDate
      );
    });

    return allMatch ? baseSchedule : null;
  }, [currentDate, exercises.length, repeatingExercises]);

  const [recurrenceType, setRecurrenceType] = useState<
    "daily" | "weekly" | "custom" | "monthly"
  >(sharedWorkoutSchedule?.recurrenceType ?? "weekly");
  const [repeatInterval, setRepeatInterval] = useState(sharedWorkoutSchedule?.interval ?? 1);
  const [repeatDayOfWeek, setRepeatDayOfWeek] = useState(
    sharedWorkoutSchedule?.dayOfWeek ?? currentDate.getDay()
  );
  const [repeatDaysOfWeek, setRepeatDaysOfWeek] = useState<number[]>(
    sharedWorkoutSchedule?.daysOfWeek ?? [currentDate.getDay()]
  );
  const [repeatDayOfMonth, setRepeatDayOfMonth] = useState(
    sharedWorkoutSchedule?.dayOfMonth ?? currentDate.getDate()
  );
  const [repeatEndDate, setRepeatEndDate] = useState(sharedWorkoutSchedule?.endDate ?? "");

  const isExerciseComplete = (exercise: any) => {
    const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
    return Boolean(
      exercise?.complete || (sets.length > 0 && sets.every((set) => set.complete))
    );
  };

  const isWholeWorkoutRepeating =
    exercises.length > 0 && repeatingExercises.length === exercises.length;

  const openWorkoutRepeatDialog = () => {
    const schedule = sharedWorkoutSchedule;
    setRecurrenceType(schedule?.recurrenceType ?? "weekly");
    setRepeatInterval(schedule?.interval ?? 1);
    setRepeatDayOfWeek(schedule?.dayOfWeek ?? currentDate.getDay());
    setRepeatDaysOfWeek(schedule?.daysOfWeek ?? [currentDate.getDay()]);
    setRepeatDayOfMonth(schedule?.dayOfMonth ?? currentDate.getDate());
    setRepeatEndDate(schedule?.endDate ?? "");
    setShowWorkoutRepeatDialog(true);
  };

  const handleSaveWorkoutSchedule = async () => {
    if (!currentUserId) {
      toast.error("Couldn't save the workout schedule");
      return;
    }

    try {
      const nextExercises = await Promise.all(
        exercises.map(async (exercise) => {
          if (exercise?.ruleId) {
            const deleteResponse = await fetch("/api/recurringRule", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ruleId: String(exercise.ruleId) }),
            });

            if (!deleteResponse.ok) {
              const message = await deleteResponse.text();
              throw new Error(`deleteRecurringRule ${deleteResponse.status}: ${message}`);
            }
          }

          const exerciseId = exercise.exerciseId ?? exercise._id ?? exercise.name;
          const savedRule = await saveRecurringRule({
            userId: currentUserId,
            exerciseId,
            exerciseName: exercise.name,
            exerciseType: exercise.type,
            routineName,
            recurrenceType,
            interval: repeatInterval,
            dayOfWeek: repeatDayOfWeek,
            daysOfWeek:
              recurrenceType === "custom" ? repeatDaysOfWeek : [repeatDayOfWeek],
            dayOfMonth: repeatDayOfMonth,
            intervalWeeks: repeatInterval,
            startDate: currentDate,
            endDate: repeatEndDate || undefined,
            templateSets: exercise.sets,
            defaultMax: exercise.max,
            defaultRest: exercise.rest,
            active: true,
          } as any);

          const updatedExercise = {
            ...exercise,
            userId: exercise.userId ?? currentUserId,
            exerciseId,
            routineName,
            isRepeating: true,
            ruleId: String(savedRule._id),
            recurrenceType,
            interval: repeatInterval,
            intervalWeeks: repeatInterval,
            dayOfWeek: repeatDayOfWeek,
            daysOfWeek:
              recurrenceType === "custom" ? repeatDaysOfWeek : [repeatDayOfWeek],
            dayOfMonth: repeatDayOfMonth,
            endDate: repeatEndDate || undefined,
            date: currentDate.toISOString().slice(0, 10),
          };

          await saveWorkoutEntry(updatedExercise as any);
          return updatedExercise;
        })
      );

      setExercises(nextExercises as any);
      setShowWorkoutRepeatDialog(false);
      setRefetchExercises((prev) => !prev);
      refreshCalendarStatuses?.();
      toast.success("Workout schedule updated");
    } catch (error) {
      console.error(error);
      toast.error("Couldn't save the workout schedule");
    }
  };

  const handleRemoveWorkoutSchedule = async () => {
    if (!currentUserId) {
      toast.error("Couldn't remove the workout schedule");
      return;
    }

    try {
      const nextExercises = await Promise.all(
        exercises.map(async (exercise) => {
          if (exercise?.ruleId) {
            const deleteResponse = await fetch("/api/recurringRule", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ruleId: String(exercise.ruleId) }),
            });

            if (!deleteResponse.ok) {
              const message = await deleteResponse.text();
              throw new Error(`deleteRecurringRule ${deleteResponse.status}: ${message}`);
            }
          }

          const updatedExercise = {
            ...exercise,
            userId: exercise.userId ?? currentUserId,
            exerciseId: exercise.exerciseId ?? exercise._id ?? exercise.name,
            routineName,
            isRepeating: false,
            ruleId: null,
            recurrenceType: null,
            interval: null,
            intervalWeeks: null,
            dayOfWeek: null,
            daysOfWeek: null,
            dayOfMonth: null,
            endDate: null,
            date: currentDate.toISOString().slice(0, 10),
          };

          await saveWorkoutEntry(updatedExercise as any);
          return updatedExercise;
        })
      );

      setExercises(nextExercises as any);
      setShowWorkoutRepeatDialog(false);
      setRefetchExercises((prev) => !prev);
      refreshCalendarStatuses?.();
      toast.success("Workout schedule removed");
    } catch (error) {
      console.error(error);
      toast.error("Couldn't remove the workout schedule");
    }
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

  const persistExerciseOrder = async (orderedExercises: any[]) => {
    await Promise.all(
      orderedExercises.map(async (exercise, index) => {
        const nextSortOrder = index;
        const updatedExercise = {
          ...exercise,
          sortOrder: nextSortOrder,
          userId: exercise.userId ?? currentUserId,
          exerciseId: exercise.exerciseId ?? exercise._id ?? exercise.name,
          routineName,
          date: currentDate.toISOString().slice(0, 10),
        };

        if (exercise?.ruleId) {
          await saveRecurringRule({
            userId: updatedExercise.userId,
            exerciseId: updatedExercise.exerciseId,
            exerciseName: updatedExercise.name,
            exerciseType: updatedExercise.type,
            routineName,
            sortOrder: nextSortOrder,
            recurrenceType: updatedExercise.recurrenceType ?? "weekly",
            interval:
              updatedExercise.interval ?? updatedExercise.intervalWeeks ?? 1,
            dayOfWeek:
              updatedExercise.dayOfWeek ??
              (Array.isArray(updatedExercise.daysOfWeek)
                ? updatedExercise.daysOfWeek[0]
                : currentDate.getDay()),
            daysOfWeek:
              Array.isArray(updatedExercise.daysOfWeek) &&
              updatedExercise.daysOfWeek.length > 0
                ? updatedExercise.daysOfWeek
                : [
                    updatedExercise.dayOfWeek ?? currentDate.getDay(),
                  ],
            dayOfMonth: updatedExercise.dayOfMonth ?? currentDate.getDate(),
            intervalWeeks:
              updatedExercise.intervalWeeks ?? updatedExercise.interval ?? 1,
            startDate: currentDate,
            endDate: updatedExercise.endDate || undefined,
            templateSets: updatedExercise.sets,
            defaultMax: updatedExercise.max,
            defaultRest: updatedExercise.rest,
            active: true,
            _id: updatedExercise.ruleId,
          } as any);
        }

        await saveWorkoutEntry(updatedExercise as any);
        return updatedExercise;
      })
    );
  };

  const handleExerciseDragEnd = async (result: any) => {
    if (!result.destination) {
      return;
    }

    if (result.source.index === result.destination.index) {
      return;
    }

    const reorderedPlanned = [...plannedExercises];
    const [movedExercise] = reorderedPlanned.splice(result.source.index, 1);
    reorderedPlanned.splice(result.destination.index, 0, movedExercise);

    const reorderedAllExercises = [...reorderedPlanned, ...completedExercises].map(
      (exercise, index) => ({
        ...exercise,
        sortOrder: index,
      })
    );

    setExercises(reorderedAllExercises as any);

    try {
      await persistExerciseOrder(reorderedAllExercises);
      setRefetchExercises((prev) => !prev);
      refreshCalendarStatuses?.();
      toast.success("Exercise order updated");
    } catch (error) {
      console.error(error);
      toast.error("Couldn't save the new exercise order");
      setRefetchExercises((prev) => !prev);
    }
  };

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

        {title === "Scheduled" ? (
          <DragDropContext onDragEnd={handleExerciseDragEnd}>
            <Droppable droppableId="scheduled-exercises">
              {(provided) => (
                <Box ref={provided.innerRef} {...provided.droppableProps}>
                  {items.map((exercise, index) => {
                    const exerciseIndex = exercises.findIndex((item) => item === exercise);
                    const draggableId = String(
                      exercise?.ruleId ??
                        exercise?.exerciseId ??
                        exercise?._id ??
                        `${exercise?.name ?? "exercise"}-${exerciseIndex}`
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
                              userProfile={userProfile}
                            />
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
          items.map((exercise) => {
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
                userProfile={userProfile}
              />
            );
          })
        )}
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
            {hasExercises ? (
              <Button
                variant="outlined"
                size="small"
                startIcon={<RepeatIcon />}
                onClick={openWorkoutRepeatDialog}
              >
                {isWholeWorkoutRepeating ? "Edit workout schedule" : "Repeat this workout"}
              </Button>
            ) : null}
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

      <MuscleRecoveryMap
        exercises={exercises}
        userId={currentUserId}
        sex={userProfile?.sex}
        currentDate={currentDate}
        darkMode={darkMode}
      />

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

      <Box sx={{ height: { xs: 88, sm: 0 } }} />
      <Box
        sx={{
          position: { xs: "fixed", sm: "sticky" },
          bottom: { xs: "calc(12px + env(safe-area-inset-bottom, 0px))", sm: 16 },
          left: { xs: 12, sm: "auto" },
          right: { xs: 12, sm: "auto" },
          zIndex: 20,
          display: "flex",
          justifyContent: "center",
          mt: { xs: 0, sm: 2.5 },
          pointerEvents: "none",
        }}
      >
        <Button
          variant="contained"
          onClick={() => {
            setIsAddingExercise(true);
          }}
          startIcon={<AddIcon />}
          sx={{
            pointerEvents: "auto",
            px: 3,
            py: 1.1,
            borderRadius: 10,
            backgroundColor: darkMode ? "rgba(255,255,255,0.08)" : "#111827",
            color: darkMode ? "#f3f4f6" : "#f8fafc",
            boxShadow: darkMode
              ? "0 18px 40px rgba(2,6,23,0.42)"
              : "0 16px 34px rgba(15,23,42,0.18)",
            minWidth: { xs: "min(100%, 320px)", sm: "auto" },
            "&:hover": {
              backgroundColor: darkMode ? "rgba(255,255,255,0.14)" : "#000000",
            },
          }}
        >
          {hasExercises ? "Add Exercise" : "Add First Exercise"}
        </Button>
      </Box>

      <RepeatScheduleDialog
        open={showWorkoutRepeatDialog}
        onClose={() => setShowWorkoutRepeatDialog(false)}
        isRepeating={isWholeWorkoutRepeating}
        title={isWholeWorkoutRepeating ? "Edit workout schedule" : "Repeat this whole workout"}
        description="Apply one repeating schedule to every exercise currently on this day."
        disableLabel="Remove workout schedule"
        recurrenceType={recurrenceType}
        setRecurrenceType={setRecurrenceType}
        interval={repeatInterval}
        setInterval={setRepeatInterval}
        dayOfWeek={repeatDayOfWeek}
        setDayOfWeek={setRepeatDayOfWeek}
        daysOfWeek={repeatDaysOfWeek}
        setDaysOfWeek={setRepeatDaysOfWeek}
        dayOfMonth={repeatDayOfMonth}
        setDayOfMonth={setRepeatDayOfMonth}
        endDate={repeatEndDate}
        setEndDate={setRepeatEndDate}
        onSave={handleSaveWorkoutSchedule}
        onDisable={isWholeWorkoutRepeating ? handleRemoveWorkoutSchedule : undefined}
      />
    </Box>
  );
};

export default WorkoutDisplay;
