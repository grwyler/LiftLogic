import React, { useState } from "react";
import { Paper, Box, Button, Typography, IconButton } from "@mui/material";
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
          userId: session!.token.user._id,
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

      setRefetchExercises(true);
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
    saveWorkoutEntry(updatedExercise);
    setRefetchExercises(true);
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

    setIsRepeating((p) => !p);
    const willRepeat = !isRepeating;

    try {
      if (willRepeat) {
        const savedRule = await saveRecurringRule({
          userId: session!.token.user._id,
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

        saveWorkoutEntry({
          ...currentExercise,
          isRepeating: true,
          ruleId: savedRule._id.toString(),
          date: parsedDate.toISOString().slice(0, 10),
        });
      } else {
        if (currentExercise.ruleId) {
          await deactivateRecurringRule(currentExercise.ruleId);
        }
        setCurrentExercise((prev) => ({
          ...prev,
          isRepeating: false,
          ruleId: undefined,
        }));
        saveWorkoutEntry({
          ...currentExercise,
          isRepeating: false,
          ruleId: undefined,
        });
      }
    } catch (err) {
      console.error(err);
      setIsRepeating((p) => !p);
    }
  };

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
              if (currentExercise.isRepeating) {
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
              color={currentExercise.isRepeating ? "primary" : "disabled"}
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
