import React, { useEffect, useRef, useState } from "react";
import { Paper, Box, Button, Typography, IconButton, Chip } from "@mui/material";
import RepeatIcon from "@mui/icons-material/Repeat";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckIcon from "@mui/icons-material/Check";
import AddIcon from "@mui/icons-material/Add";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import SelectedSetItem from "./SelectedSetItem";
import CompletedSetItem from "./CompletedSetItem";
import SetItem from "./SetItem";
import ExerciseEditItem from "./ExerciseEditItem";
import CRUDMenuButton from "./CRUDMenuButton";
import {
  deactivateRecurringRule,
  deleteWorkoutEntry,
  fetchExerciseProgress,
  saveRecurringRule,
  saveWorkoutEntry,
  toTitleCase,
} from "../utils/helpers";
import { useSession } from "next-auth/react";
import { Session } from "next-auth";
import DeleteDialog from "./DeleteDialog";
import { toast } from "react-toastify";

const ExerciseItem = ({
  exercise,
  exerciseIndex,
  workout,
  currentExerciseIndex,
  setCurrentExerciseIndex,
  formattedDate,
  routineName,
  shownMenuIndex,
  setShownMenuIndex,
  darkMode,
  setRefetchExercises,
}) => {
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [currentExercise, setCurrentExercise] = useState(exercise);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isRepeating, setIsRepeating] = useState(exercise.isRepeating);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [progressSummary, setProgressSummary] = useState<any>(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const appliedRecommendationRef = useRef<string | null>(null);
  const { data: session } = useSession() as {
    data: (Session & { token: { user } }) | null;
  };
  const currentUserId =
    (session as any)?.token?.user?._id ??
    (session as any)?.user?._id ??
    currentExercise?.userId ??
    exercise?.userId;

  useEffect(() => {
    setCurrentExercise(exercise);
    setIsRepeating(exercise.isRepeating);
    appliedRecommendationRef.current = null;
  }, [exercise]);

  useEffect(() => {
    const exerciseId = currentExercise?.exerciseId ?? currentExercise?._id;

    if (!currentUserId || !exerciseId || currentExercise?.type !== "weight") {
      setRecommendation(null);
      setLoadingRecommendation(false);
      return;
    }

    let active = true;
    setLoadingRecommendation(true);

    const timeout = setTimeout(async () => {
      try {
        const result = await fetchExerciseProgress(currentUserId, exerciseId);
        if (!active) {
          return;
        }

        setProgressSummary(result?.summary ?? null);
        setRecommendation(result?.recommendation ?? null);
      } catch (error) {
        console.error("Failed to load exercise recommendation", error);
        if (active) {
          setProgressSummary(null);
          setRecommendation(null);
        }
      } finally {
        if (active) {
          setLoadingRecommendation(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [
    currentUserId,
    currentExercise?._id,
    currentExercise?.exerciseId,
    currentExercise?.type,
    currentExercise?.complete,
  ]);

  useEffect(() => {
    if (
      currentExercise?.type !== "weight" ||
      currentExercise?.complete ||
      !recommendation?.recommendedWeight ||
      !recommendation?.recommendedReps ||
      !recommendation?.recommendedSets
    ) {
      return;
    }

    const recommendationKey = [
      currentExercise?.exerciseId ?? currentExercise?._id,
      formattedDate,
      recommendation.recommendedWeight,
      recommendation.recommendedReps,
      recommendation.recommendedSets,
    ].join("::");

    if (appliedRecommendationRef.current === recommendationKey) {
      return;
    }

    const completedSets = (currentExercise?.sets ?? []).filter((set) => set.complete);
    const incompleteTemplate =
      (currentExercise?.sets ?? []).find((set) => !set.complete) ??
      (currentExercise?.sets ?? [])[0] ?? {
        name: "Working Set 1",
        percentage: undefined,
      };

    const recommendedIncompleteSets = Array.from(
      { length: recommendation.recommendedSets },
      (_, index) => ({
        ...incompleteTemplate,
        name: `Working Set ${index + 1}`,
        reps: recommendation.recommendedReps,
        weight: recommendation.recommendedWeight,
        actualWeight: "",
        actualReps: "",
        complete: false,
      })
    );

    appliedRecommendationRef.current = recommendationKey;
    setCurrentExercise((prev) => ({
      ...prev,
      sets: [...completedSets, ...recommendedIncompleteSets],
    }));
  }, [currentExercise, formattedDate, recommendation]);

  const renderCompletedPerformancePanel = () => {
    if (currentExercise.type !== "weight" || !currentExercise.complete) {
      return null;
    }

    const latestEstimated1RM = progressSummary?.latestEstimated1RM ?? null;
    const previousEstimated1RM = progressSummary?.previousEstimated1RM ?? null;
    const heaviestWeightEver = progressSummary?.heaviestWeightEver ?? null;
    const delta =
      latestEstimated1RM !== null && previousEstimated1RM !== null
        ? Math.round((latestEstimated1RM - previousEstimated1RM) * 10) / 10
        : null;
    const trendLabel =
      progressSummary?.latestWorkoutBrokePR
        ? "PR"
        : delta === null
        ? "Logged"
        : delta > 0
        ? "Trending Up"
        : delta < 0
        ? "Trending Down"
        : "Steady";
    const trendColor =
      progressSummary?.latestWorkoutBrokePR || (delta !== null && delta > 0)
        ? "success"
        : delta !== null && delta < 0
        ? "warning"
        : "default";

    return (
      <Paper
        elevation={0}
        sx={{
          mt: 1.5,
          p: 1.5,
          borderRadius: 3,
          border: "1px solid",
          borderColor: darkMode ? "rgba(96,165,250,0.3)" : "rgba(59,130,246,0.22)",
          backgroundColor: darkMode ? "rgba(15,23,42,0.8)" : "rgba(239,246,255,0.92)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Performance
          </Typography>
          {trendLabel ? (
            <Chip
              size="small"
              label={trendLabel}
              color={trendColor as any}
              variant="outlined"
            />
          ) : null}
        </Box>

        {loadingRecommendation ? (
          <Typography sx={{ mt: 1, color: "text.secondary" }}>
            Loading performance...
          </Typography>
        ) : latestEstimated1RM ? (
          <>
            <Box
              sx={{
                mt: 1,
                display: "flex",
                gap: 1,
                flexWrap: "wrap",
              }}
            >
              <Chip
                label={`Est. 1RM ${latestEstimated1RM}`}
                color="primary"
                sx={{ fontWeight: 700 }}
              />
              {delta !== null ? (
                <Chip
                  label={`${delta > 0 ? "+" : ""}${delta} vs last`}
                  variant="outlined"
                />
              ) : null}
              {heaviestWeightEver ? (
                <Chip
                  label={`Best weight ${heaviestWeightEver}`}
                  variant="outlined"
                />
              ) : null}
            </Box>

            {progressSummary?.bestRepPerformance ? (
              <Typography sx={{ mt: 1, color: "text.secondary" }}>
                Best logged set: {progressSummary.bestRepPerformance.weight} x{" "}
                {progressSummary.bestRepPerformance.reps}.
              </Typography>
            ) : null}
          </>
        ) : (
          <Typography sx={{ mt: 1, color: "text.secondary" }}>
            No weight-performance trend yet.
          </Typography>
        )}
      </Paper>
    );
  };

  const handleWorkoutButtonClick = (index) => {
    setCurrentExerciseIndex((prevIndex) => (prevIndex === index ? -1 : index));
    setShownMenuIndex(-1);
    const nextSetIndex = exercise.sets.findIndex((s) => !s.complete);
    setCurrentSetIndex(nextSetIndex !== -1 ? nextSetIndex : 0);
  };

  const handleAddSet = () => {
    const sets = [...currentExercise.sets];
    if (sets.length === 0) return;
    const lastSet = sets[sets.length - 1];
    const newSetNumber = sets.length + 1;
    const newSet = {
      ...lastSet,
      weight: lastSet.weight + lastSet.weight * 0.05,
      actualWeight: "",
      actualReps: "",
      complete: false,
      name: `Working Set ${newSetNumber}`,
    };
    setCurrentExercise({ ...currentExercise, sets: [...sets, newSet] });
  };

  const handleDeleteSet = (setName) => {
    const sets = [...currentExercise.sets];
    setCurrentExercise({
      ...currentExercise,
      sets: sets.filter((s) => s.name !== setName),
    });
  };

  const handleDelete = async (scope: "today" | "all") => {
    try {
      if (scope === "today" && currentExercise.ruleId) {
        await saveWorkoutEntry({
          userId: currentUserId,
          exerciseId: currentExercise.exerciseId,
          routineName,
          date: formattedDate,
          rest: currentExercise.rest ?? 0,
          complete: false,
          sets: [],
          ruleId: currentExercise.ruleId,
          skipped: true,
        });
      }

      if (scope === "all" && currentExercise.ruleId) {
        await deactivateRecurringRule(currentExercise.ruleId);
      }

      if (currentExercise._id && !currentExercise.ruleId) {
        await deleteWorkoutEntry(currentExercise._id);
      }

      setRefetchExercises((prev) => !prev);
      toast.success(scope === "all" ? "Deleted everywhere" : "Deleted today");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    }
  };

  const handleUpdate = () => {
    setShownMenuIndex(-1);
    setIsEditing(true);
  };

  const handleExerciseSave = (updatedExercise) => {
    setIsEditing(false);
    saveWorkoutEntry({
      ...updatedExercise,
      name: updatedExercise.name ?? currentExercise.name,
      type: updatedExercise.type ?? currentExercise.type,
      max: updatedExercise.max ?? currentExercise.max,
      userId: updatedExercise.userId ?? currentUserId,
      exerciseId: updatedExercise.exerciseId ?? updatedExercise._id,
      routineName: updatedExercise.routineName ?? routineName,
      date: updatedExercise.date ?? formattedDate,
    });
    setRefetchExercises((prev) => !prev);
  };

  if (isEditing) {
    return (
      <ExerciseEditItem
        index={exerciseIndex}
        exercise={currentExercise}
        onSave={handleExerciseSave}
        onCancel={() => setIsEditing(false)}
        darkMode={darkMode}
        isValid={true}
      />
    );
  }

  const toggleRepeat = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const parseFormattedDate = (value: string): Date | null => {
      const trimmed = value.trim();
      const direct = new Date(trimmed);
      if (!Number.isNaN(+direct)) {
        return direct;
      }

      const needsYear = !/\b\d{4}\b/.test(trimmed);
      if (needsYear) {
        const withYear = `${trimmed} ${new Date().getFullYear()}`;
        const fallback = new Date(withYear);
        if (!Number.isNaN(+fallback)) {
          return fallback;
        }
      }

      return null;
    };

    const parsedDate = parseFormattedDate(formattedDate);
    if (!parsedDate) return console.error("Bad date:", formattedDate);
    if (!currentUserId) {
      console.error("Missing userId for repeat toggle");
      return;
    }

    setIsRepeating((p) => !p);
    const willRepeat = !isRepeating;

    try {
      if (willRepeat) {
        const savedRule = await saveRecurringRule({
          userId: currentUserId,
          exerciseId: currentExercise.exerciseId ?? currentExercise._id,
          exerciseName: currentExercise.name,
          exerciseType: currentExercise.type,
          routineName,
          dayOfWeek: parsedDate.getDay(),
          intervalWeeks: 1,
          startDate: parsedDate,
          templateSets: currentExercise.sets,
          active: true,
        } as any);

        setCurrentExercise((prev) => ({
          ...prev,
          isRepeating: true,
          ruleId: savedRule._id,
        }));

        await saveWorkoutEntry({
          ...currentExercise,
          name: currentExercise.name,
          type: currentExercise.type,
          max: currentExercise.max,
          userId: currentExercise.userId ?? currentUserId,
          exerciseId: currentExercise.exerciseId ?? currentExercise._id,
          routineName,
          isRepeating: true,
          ruleId: savedRule._id.toString(),
          date: parsedDate.toISOString().slice(0, 10),
        } as any);
      } else {
        if (currentExercise.ruleId) {
          await deactivateRecurringRule(currentExercise.ruleId);
        }
        setCurrentExercise((prev) => ({
          ...prev,
          isRepeating: false,
          ruleId: undefined,
        }));
        await saveWorkoutEntry({
          name: currentExercise.name,
          type: currentExercise.type,
          max: currentExercise.max,
          userId: currentUserId,
          exerciseId: currentExercise.exerciseId ?? currentExercise._id,
          routineName,
          date: parsedDate.toISOString().slice(0, 10),
          rest: currentExercise.rest ?? 0,
          complete: currentExercise.complete ?? false,
          sets: currentExercise.sets,
          isRepeating: false,
          ruleId: undefined,
        } as any);
      }
    } catch (err) {
      console.error(err);
      setIsRepeating((p) => !p);
    }
  };

  if (currentExercise.complete) {
    const completedSetCount = currentExercise.sets?.filter((s) => s.complete).length ?? 0;
    const completedExerciseName =
      toTitleCase(currentExercise.name) || toTitleCase(exercise.name) || "Completed Exercise";
    const completedExerciseType = currentExercise.type ?? exercise.type;

    return (
      <Paper
        key={`exercise-log-${currentExercise.name}-${exerciseIndex}`}
        elevation={0}
        sx={{
          p: 1.75,
          my: 1.25,
          borderRadius: 3,
          border: "1px solid",
          borderColor: darkMode ? "rgba(148,163,184,0.12)" : "rgba(17,24,39,0.08)",
          backgroundColor: darkMode ? "rgba(17,24,39,0.88)" : "rgba(255,255,255,0.94)",
          boxShadow: darkMode
            ? "0 12px 28px rgba(0,0,0,0.16)"
            : "0 10px 24px rgba(17,24,39,0.06)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CRUDMenuButton
              darkMode={darkMode}
              handleDelete={() => {
                if (isRepeating) {
                  setShowDeleteDialog(true);
                } else {
                  handleDelete("today");
                }
              }}
              handleUpdate={handleUpdate}
              onClickMenuButton={() =>
                setShownMenuIndex(
                  shownMenuIndex === exerciseIndex ? -1 : exerciseIndex
                )
              }
              show={shownMenuIndex === exerciseIndex}
            />
            <IconButton
              onClick={toggleRepeat}
              title="Toggle on to make this exercise repeat next week"
              size="small"
            >
              <RepeatIcon
                color={isRepeating ? "primary" : "disabled"}
                fontSize="small"
              />
            </IconButton>
          </Box>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h6">{completedExerciseName}</Typography>
            <Typography sx={{ color: "text.secondary", mt: 0.5 }}>
              Logged on {formattedDate}
            </Typography>
          </Box>

          <Chip
            label="Logged"
            color="success"
            variant="outlined"
            size="small"
            sx={{ fontWeight: 700 }}
          />
        </Box>

        <Box
          sx={{
            mt: 1.75,
            mb: 0.25,
            px: 0.25,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Typography sx={{ color: "text.secondary" }}>
            {completedSetCount} completed set{completedSetCount === 1 ? "" : "s"}
          </Typography>
          <Typography sx={{ color: "text.secondary" }}>
            {completedExerciseType === "weight" ? "Performance log" : "Completed timer log"}
          </Typography>
        </Box>

        {currentExercise.sets?.filter((s) => s.complete).map((s, i) => (
          <CompletedSetItem
            key={`completed-log-set-${i}`}
            set={s}
            setIndex={i}
            setCurrentSetIndex={setCurrentSetIndex}
            type={completedExerciseType}
            darkMode={darkMode}
            interactive={false}
          />
        ))}

        {renderCompletedPerformancePanel()}

        <DeleteDialog
          open={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onDeleteToday={() => {
            handleDelete("today");
            setShowDeleteDialog(false);
          }}
          onDeleteAll={() => {
            handleDelete("all");
            setShowDeleteDialog(false);
          }}
          targetDate={formattedDate}
        />
      </Paper>
    );
  }

  const isExpanded = exerciseIndex === currentExerciseIndex;
  const completedCount =
    currentExercise.sets?.filter((s) => s.complete).length ?? 0;
  const totalCount = currentExercise.sets?.length ?? 0;
  const nextOpenSet =
    currentExercise.sets?.find((s) => !s.complete) ?? currentExercise.sets?.[0];
  const upcomingWeight =
    currentExercise.type === "weight" && nextOpenSet?.weight
      ? Math.round((Number(nextOpenSet.weight) || 0) / 5) * 5
      : null;
  const upcomingReps =
    currentExercise.type === "weight" ? nextOpenSet?.reps ?? null : null;

  return (
      <Paper
        key={`exercise-${exercise.name}-${exerciseIndex}`}
        elevation={0}
      sx={{
        p: 1.5,
        my: 1.5,
        borderRadius: 3,
        backgroundColor:
          isExpanded
            ? darkMode
              ? "rgba(17,24,39,0.92)"
              : "rgba(255,255,255,0.98)"
            : darkMode
            ? "rgba(17,24,39,0.72)"
            : "rgba(249,250,251,0.96)",
        border: "1px solid",
        borderColor: isExpanded
          ? darkMode
            ? "rgba(148,163,184,0.18)"
            : "rgba(17,24,39,0.12)"
          : darkMode
          ? "rgba(148,163,184,0.1)"
          : "rgba(17,24,39,0.08)",
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          boxShadow: darkMode
            ? "0 14px 28px rgba(0,0,0,0.16)"
            : "0 14px 24px rgba(17,24,39,0.06)",
        },
      }}
    >
      <Box
        onClick={() => handleWorkoutButtonClick(exerciseIndex)}
        sx={{
          display: "grid",
          gridTemplateColumns: "auto minmax(0,1fr) auto",
          alignItems: "center",
          gap: 1.25,
          cursor: "pointer",
        }}
      >
        <Box
          onClick={(e) => e.stopPropagation()}
          sx={{ display: "flex", alignItems: "center", gap: 0.25 }}
        >
          <CRUDMenuButton
            darkMode={darkMode}
            handleDelete={() => {
              if (isRepeating) {
                setShowDeleteDialog(true);
              } else {
                handleDelete("today");
              }
            }}
            handleUpdate={handleUpdate}
            onClickMenuButton={() =>
              setShownMenuIndex(
                shownMenuIndex === exerciseIndex ? -1 : exerciseIndex
              )
            }
            show={shownMenuIndex === exerciseIndex}
          />
          <IconButton
            onClick={toggleRepeat}
            title="Toggle on to make this exercise repeat next week"
            size="small"
          >
            <RepeatIcon
              color={isRepeating ? "primary" : "disabled"}
              fontSize="small"
            />
          </IconButton>
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ lineHeight: 1.1 }}>
            {toTitleCase(currentExercise.name)}
          </Typography>
          <Box sx={{ mt: 0.65, display: "flex", gap: 0.75, flexWrap: "wrap", alignItems: "center" }}>
            <Chip
              size="small"
              icon={
                completedCount === totalCount && totalCount > 0 ? (
                  <CheckIcon fontSize="small" />
                ) : (
                  <RadioButtonUncheckedIcon fontSize="small" />
                )
              }
              label={`${completedCount}/${totalCount} sets`}
              variant="outlined"
              sx={{
                backgroundColor: darkMode
                  ? "rgba(255,255,255,0.03)"
                  : "rgba(255,255,255,0.8)",
                borderColor: darkMode
                  ? "rgba(148,163,184,0.14)"
                  : "rgba(17,24,39,0.08)",
              }}
            />
            {currentExercise.type === "weight" && upcomingWeight && upcomingReps ? (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Next up: {upcomingWeight} x {upcomingReps}
              </Typography>
            ) : null}
          </Box>
        </Box>

        <ExpandMoreIcon
          sx={{
            color: "text.secondary",
            transition: "transform 0.2s ease-in-out",
            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </Box>

      {isExpanded &&
        currentExercise.sets &&
        currentExercise.sets.map((s, i) => {
          if (i === currentSetIndex) {
            return (
              <SelectedSetItem
                key={`selectedSetItem-${i}`}
                routineName={routineName}
                set={s}
                currentExercise={currentExercise}
                progressionStyle={recommendation?.progressionStyle}
                setIndex={i}
                currentExerciseIndex={currentExerciseIndex}
                setCurrentSetIndex={setCurrentSetIndex}
                setCurrentExercise={setCurrentExercise}
                formattedDate={formattedDate}
                setCurrentExerciseIndex={setCurrentExerciseIndex}
                workout={workout}
                darkMode={darkMode}
              />
            );
          } else if (s.complete) {
            return (
              <CompletedSetItem
                key={`completedSetItem-${i}`}
                set={s}
                setIndex={i}
                setCurrentSetIndex={setCurrentSetIndex}
                type={currentExercise.type}
                darkMode={darkMode}
              />
            );
          } else {
            return (
              <SetItem
                key={`setItem-${i}`}
                set={s}
                handleDeleteSet={(setName) => handleDeleteSet(setName)}
                type={currentExercise.type}
                darkMode={darkMode}
              />
            );
          }
        })}

      {isExpanded && (
        <>
          <Button
            variant="outlined"
            size="small"
            title="Adds an exercise only to the currently selected day"
            onClick={handleAddSet}
            startIcon={<AddIcon />}
            sx={{
              mt: 3,
              mb: 2,
              width: "100%",
              borderRadius: 10,
              borderColor: darkMode
                ? "rgba(148,163,184,0.14)"
                : "rgba(17,24,39,0.1)",
              color: "text.primary",
              backgroundColor: darkMode
                ? "rgba(255,255,255,0.02)"
                : "rgba(249,250,251,0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              "&:hover": {
                borderColor: darkMode
                  ? "rgba(148,163,184,0.2)"
                  : "rgba(17,24,39,0.14)",
                backgroundColor: darkMode
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(243,244,246,0.96)",
              },
            }}
          >
            Add Set
          </Button>
        </>
      )}

      <DeleteDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onDeleteToday={() => {
          handleDelete("today");
          setShowDeleteDialog(false);
        }}
        onDeleteAll={() => {
          handleDelete("all");
          setShowDeleteDialog(false);
        }}
        targetDate={formattedDate}
      />
    </Paper>
  );
};

export default ExerciseItem;
