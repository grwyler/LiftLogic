import React, { useEffect, useState } from "react";
import { Paper, Box, Button, Typography, IconButton, Chip } from "@mui/material";
import RepeatIcon from "@mui/icons-material/Repeat";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckIcon from "@mui/icons-material/Check";
import AddIcon from "@mui/icons-material/Add";
import SelectedSetItem from "./SelectedSetItem";
import CompletedSetItem from "./CompletedSetItem";
import SetItem from "./SetItem";
import ExerciseEditItem from "./ExerciseEditItem";
import CRUDMenuButton from "./CRUDMenuButton";
import {
  deactivateRecurringRule,
  deleteWorkoutEntry,
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
  }, [exercise]);

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
    const parseFormattedDate = (str: string): Date | null => {
      const safe = `${str.trim()} ${new Date().getFullYear()}`;
      const d = new Date(safe);
      return isNaN(+d) ? null : d;
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
          p: 2,
          my: 2,
          borderRadius: 4,
          border: "1px solid",
          borderColor: darkMode ? "rgba(148,163,184,0.18)" : "rgba(148,163,184,0.32)",
          backgroundColor: darkMode ? "rgba(15,23,42,0.72)" : "rgba(248,250,252,0.96)",
          boxShadow: darkMode
            ? "0 10px 30px rgba(0,0,0,0.18)"
            : "0 10px 24px rgba(148,163,184,0.14)",
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

  return (
    <Paper
      key={`exercise-${exercise.name}-${exerciseIndex}`}
      elevation={currentExerciseIndex === exerciseIndex ? 4 : 1}
      sx={{
        p: 2,
        my: 2,
        borderRadius: 2,
        backgroundColor:
          currentExerciseIndex === exerciseIndex
            ? darkMode
              ? "grey.800"
              : "white"
            : darkMode
            ? "grey.900"
            : "transparent",
        border:
          currentExerciseIndex === exerciseIndex
            ? "2px solid #007bff"
            : "1px solid rgba(0,123,255,0.2)",
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          boxShadow: "0px 4px 16px rgba(0,123,255,0.3)",
        },
      }}
    >
      <Box
        className="d-flex justify-content-between align-items-center"
        onClick={() => handleWorkoutButtonClick(exerciseIndex)}
      >
        <Box
          onClick={(e) => e.stopPropagation()}
          className="d-flex justify-content-center"
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
          >
            <RepeatIcon
              color={isRepeating ? "primary" : "disabled"}
            />
          </IconButton>
        </Box>

        <Typography variant="h6">
          {toTitleCase(currentExercise.name)}
        </Typography>
        {currentExercise.complete && (
          <CheckIcon sx={{ color: "success.main", mr: 1 }} />
        )}

        <ExpandMoreIcon
          sx={{
            transition: "transform 0.2s ease-in-out",
            transform:
              currentExerciseIndex === exerciseIndex
                ? "rotate(180deg)"
                : "rotate(0deg)",
          }}
        />
      </Box>

      {exerciseIndex === currentExerciseIndex &&
        currentExercise.sets &&
        currentExercise.sets.map((s, i) => {
          if (i === currentSetIndex) {
            return (
              <SelectedSetItem
                key={`selectedSetItem-${i}`}
                routineName={routineName}
                set={s}
                currentExercise={currentExercise}
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

      {exerciseIndex === currentExerciseIndex && (
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
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          Add Set
        </Button>
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
