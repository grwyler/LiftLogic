import React from "react";
import {
  AppBar,
  Box,
  Button,
  Dialog,
  IconButton,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import RepeatIcon from "@mui/icons-material/Repeat";
import AddIcon from "@mui/icons-material/Add";
import SelectedSetItem from "../SelectedSetItem";
import CompletedSetItem from "../CompletedSetItem";
import SetItem from "../SetItem";

const ExerciseLoggingDialog = ({
  isOpen,
  setCurrentExerciseIndex,
  darkMode,
  currentExercise,
  completedCount,
  totalCount,
  upcomingWeight,
  upcomingReps,
  preferredUnits,
  handleOpenRepeatFlow,
  isRepeating,
  currentSetIndex,
  exerciseIndex,
  setCurrentSetIndex,
  setCurrentExercise,
  formattedDate,
  workout,
  exercises,
  setExercises,
  openRestTimer,
  exerciseIdentity,
  setRefetchExercises,
  refreshCalendarStatuses,
  isRestTimerBlocking,
  handleLogSetAttempt,
  handleLogSetPersisted,
  handleLogSetFailed,
  handleDeleteSet,
  handleAddSet,
  renderRecommendationPanel,
  mobileTouchTarget,
  routineName,
  recommendation,
}: any) => (
  <Dialog
    fullScreen
    open={isOpen}
    onClose={() => setCurrentExerciseIndex(-1)}
    PaperProps={{
      sx: {
        backgroundColor: darkMode ? "#0f1720" : "#f8fafc",
        backgroundImage: "none",
      },
    }}
  >
    <AppBar
      position="sticky"
      elevation={0}
      color="transparent"
      sx={{
        borderBottom: "1px solid",
        borderColor: darkMode
          ? "rgba(148,163,184,0.12)"
          : "rgba(17,24,39,0.08)",
        backdropFilter: "blur(18px)",
        backgroundColor: darkMode
          ? "rgba(15,23,32,0.82)"
          : "rgba(248,250,252,0.88)",
      }}
    >
      <Toolbar sx={{ gap: 1, minHeight: { xs: 72, sm: 80 } }}>
        <IconButton
          edge="start"
          color="inherit"
          onClick={() => setCurrentExerciseIndex(-1)}
          sx={{ minWidth: mobileTouchTarget, minHeight: mobileTouchTarget }}
        >
          <CloseIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography
            variant="overline"
            sx={{ color: "text.secondary", letterSpacing: "0.12em" }}
          >
            Exercise
          </Typography>
          <Typography variant="h5" sx={{ lineHeight: 1.1 }}>
            {currentExercise.name}
          </Typography>
          <Typography sx={{ color: "text.secondary", mt: 0.25 }}>
            {completedCount}/{totalCount} sets logged
            {currentExercise.type === "weight" &&
            upcomingWeight !== null &&
            upcomingReps
              ? ` | Next target ${upcomingWeight} ${preferredUnits} x ${upcomingReps}`
              : ""}
          </Typography>
        </Box>
        <Button
          onClick={handleOpenRepeatFlow}
          title={isRepeating ? "Edit repeating schedule" : "Repeat this exercise"}
          color="inherit"
          variant="outlined"
          startIcon={<RepeatIcon color={isRepeating ? "primary" : "disabled"} />}
          sx={{
            minWidth: mobileTouchTarget,
            minHeight: mobileTouchTarget,
            borderRadius: 999,
            px: { xs: 1.35, sm: 1.5 },
            whiteSpace: "nowrap",
          }}
        >
          <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
            {isRepeating ? "Edit repeat" : "Repeat Lift"}
          </Box>
        </Button>
      </Toolbar>
    </AppBar>

    <Box
      sx={{
        px: { xs: 1, sm: 2 },
        py: { xs: 1.5, sm: 2 },
        maxWidth: 820,
        width: "100%",
        mx: "auto",
      }}
    >
      {renderRecommendationPanel()}

      {currentExercise.sets &&
        currentExercise.sets.map((s: any, i: number) => {
          if (i === currentSetIndex) {
            return (
              <SelectedSetItem
                key={`selectedSetItem-${s.id ?? i}`}
                routineName={routineName}
                set={s}
                currentExercise={currentExercise}
                progressionStyle={recommendation?.progressionStyle}
                setIndex={i}
                currentExerciseIndex={exerciseIndex}
                setCurrentSetIndex={setCurrentSetIndex}
                setCurrentExercise={setCurrentExercise}
                formattedDate={formattedDate}
                setCurrentExerciseIndex={setCurrentExerciseIndex}
                workout={workout}
                exercises={exercises}
                setExercises={setExercises}
                darkMode={darkMode}
                preferredUnits={preferredUnits}
                onStartRestTimer={(seconds: number) =>
                  openRestTimer({
                    exerciseKey: exerciseIdentity,
                    exerciseName: currentExercise.name,
                    seconds,
                    restSeconds: currentExercise.rest ?? 0,
                  })
                }
                setRefetchExercises={setRefetchExercises}
                refreshCalendarStatuses={refreshCalendarStatuses}
                isRestTimerBlocking={isRestTimerBlocking}
                onLogSetAttempt={handleLogSetAttempt}
                onLogSetPersisted={handleLogSetPersisted}
                onLogSetFailed={handleLogSetFailed}
              />
            );
          }

          if (s.complete) {
            return (
              <CompletedSetItem
                key={`completedSetItem-${s.id ?? i}`}
                set={s}
                setIndex={i}
                setCurrentSetIndex={setCurrentSetIndex}
                type={currentExercise.type}
                darkMode={darkMode}
                preferredUnits={preferredUnits}
              />
            );
          }

          return (
            <SetItem
              key={`setItem-${s.id ?? i}`}
              set={s}
              handleDeleteSet={(setId: string) => handleDeleteSet(setId)}
              type={currentExercise.type}
              darkMode={darkMode}
              preferredUnits={preferredUnits}
            />
          );
        })}

      <Button
        variant="outlined"
        size="large"
        title="Adds an exercise only to the currently selected day"
        onClick={handleAddSet}
        startIcon={<AddIcon />}
        sx={{
          mt: 3,
          mb: 2,
          width: "100%",
          minHeight: 48,
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
      <Box sx={{ height: { xs: 88, sm: 0 } }} />
    </Box>

    <Box
      sx={{
        display: { xs: "block", sm: "none" },
        position: "sticky",
        bottom: 0,
        px: 1,
        pb: "calc(12px + env(safe-area-inset-bottom, 0px))",
        pt: 1,
        borderTop: "1px solid",
        borderColor: darkMode
          ? "rgba(148,163,184,0.12)"
          : "rgba(17,24,39,0.08)",
        backdropFilter: "blur(18px)",
        backgroundColor: darkMode
          ? "rgba(15,23,32,0.9)"
          : "rgba(248,250,252,0.94)",
      }}
    >
      <Stack direction="column" spacing={1}>
        <Button
          variant="outlined"
          onClick={() => setCurrentExerciseIndex(-1)}
          startIcon={<CloseIcon />}
          sx={{
            flex: 1,
            minHeight: 52,
            borderRadius: 10,
          }}
        >
          Back
        </Button>
        <Button
          variant="contained"
          onClick={handleAddSet}
          startIcon={<AddIcon />}
          sx={{
            flex: 1.2,
            minHeight: 52,
            borderRadius: 10,
          }}
        >
          Add Set
        </Button>
        <Button
          variant="outlined"
          onClick={handleOpenRepeatFlow}
          startIcon={<RepeatIcon />}
          sx={{
            width: "100%",
            minHeight: 52,
            borderRadius: 10,
          }}
        >
          {isRepeating ? "Edit Repeat" : "Repeat Lift"}
        </Button>
      </Stack>
    </Box>
  </Dialog>
);

export default ExerciseLoggingDialog;
