import React from "react";
import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RepeatIcon from "@mui/icons-material/Repeat";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { routinesPanelRadius } from "./panelStyles";
import {
  buildRoutineSemanticButtonSx,
  buildRoutineSemanticChipSx,
  buildRoutineSemanticPanelSx,
} from "../../utils/routinesSemanticStyles";
import { WorkoutDisplayExercise, WorkoutStatusChip } from "./workoutDisplayTypes";

type WorkoutHeaderSummaryProps = {
  darkMode: boolean;
  hasExercises: boolean;
  isWholeWorkoutRepeating: boolean;
  isWorkoutComplete: boolean;
  minimumWinMode: boolean;
  nextExercise: WorkoutDisplayExercise | null;
  planChangeSummary: string;
  planFitCopy: string;
  planFitHeadline: string;
  preWorkoutFocus: string;
  preWorkoutMinimumSuccess: string;
  preWorkoutTimeLabel: string;
  onToggleMinimumWinMode: () => void;
  onOpenNextSet: () => void;
  onOpenWorkoutRepeatDialog: () => void;
  shouldShowNextSummary: boolean;
  statusChip: WorkoutStatusChip;
};

const WorkoutHeaderSummary = ({
  darkMode,
  hasExercises,
  isWholeWorkoutRepeating,
  isWorkoutComplete,
  minimumWinMode,
  nextExercise,
  planChangeSummary,
  planFitCopy,
  planFitHeadline,
  preWorkoutFocus,
  preWorkoutMinimumSuccess,
  preWorkoutTimeLabel,
  onToggleMinimumWinMode,
  onOpenNextSet,
  onOpenWorkoutRepeatDialog,
  shouldShowNextSummary,
  statusChip,
}: WorkoutHeaderSummaryProps) => (
  <Paper
    elevation={0}
    sx={{
      p: 1.75,
      borderRadius: routinesPanelRadius.shell,
      border: "1px solid",
      borderColor: "divider",
      backgroundColor: darkMode ? "rgba(17,24,39,0.78)" : "rgba(255,255,255,0.88)",
    }}
  >
    <Stack spacing={1.5}>
      {shouldShowNextSummary ? (
        <>
          <Paper
            elevation={0}
            sx={{
              ...buildRoutineSemanticPanelSx("activeWorkout", darkMode),
              p: 1.5,
              borderRadius: routinesPanelRadius.section,
              boxShadow: darkMode
                ? "0 18px 42px rgba(15,23,42,0.34)"
                : "0 20px 40px rgba(37,99,235,0.12)",
            }}
          >
            <Stack spacing={1.1}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.2}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
              >
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.14em" }}>
                      Next Action
                    </Typography>
                    <Chip
                      size="small"
                      label={statusChip.label}
                      sx={buildRoutineSemanticChipSx("activeWorkout", "outline", darkMode)}
                    />
                  </Stack>
                  <Typography variant="h5" sx={{ mt: 0.35, lineHeight: 1.05 }}>
                    {nextExercise?.name}
                  </Typography>
                  <Typography sx={{ mt: 0.55, color: "text.secondary" }}>
                    {statusChip.label.toLowerCase().includes("in progress")
                      ? "Resume the next incomplete set and keep the session moving."
                      : "Start here so the workout begins with the first real lift, not the surrounding dashboard."}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.75, color: "text.secondary" }}>
                    Planning controls stay available below the logging flow so the next lift remains the only obvious move.
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PlayArrowIcon />}
                  onClick={onOpenNextSet}
                  sx={{
                    ...buildRoutineSemanticButtonSx("activeWorkout", "contained", darkMode),
                    minHeight: 56,
                    minWidth: { xs: "100%", sm: 210 },
                    px: 3,
                    borderRadius: 999,
                    fontWeight: 800,
                    boxShadow: darkMode
                      ? "0 16px 34px rgba(59,130,246,0.28)"
                      : "0 18px 34px rgba(37,99,235,0.24)",
                  }}
                >
                  {statusChip.label.toLowerCase().includes("in progress")
                    ? "Open Next Set"
                    : "Start Lift"}
                </Button>
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button
                  variant={minimumWinMode ? "contained" : "outlined"}
                  onClick={onToggleMinimumWinMode}
                  sx={{
                    alignSelf: "flex-start",
                    borderRadius: 999,
                  }}
                >
                  {minimumWinMode ? "Minimum Win On" : "Need a lighter day?"}
                </Button>
              </Stack>
            </Stack>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 1.3,
              borderRadius: routinesPanelRadius.section,
              border: "1px solid",
              borderColor: "divider",
              backgroundColor: darkMode ? "rgba(15,23,42,0.48)" : "rgba(248,250,252,0.88)",
            }}
          >
            <Stack spacing={1.05}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", md: "center" }}
              >
                <Box>
                  <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.12em" }}>
                    This Week&apos;s Fit
                  </Typography>
                  <Typography variant="h6" sx={{ mt: 0.25 }}>
                    {planFitHeadline}
                  </Typography>
                  <Typography sx={{ mt: 0.35, color: "text.secondary" }}>
                    {planFitCopy}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip size="small" variant="outlined" label={`Expected time ${preWorkoutTimeLabel}`} />
                  <Chip size="small" variant="outlined" label={`Main focus ${preWorkoutFocus}`} />
                </Stack>
              </Stack>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                  gap: 1,
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 1,
                    borderRadius: routinesPanelRadius.section,
                    border: "1px solid",
                    borderColor: "divider",
                    backgroundColor: darkMode ? "rgba(30,41,59,0.56)" : "rgba(255,255,255,0.92)",
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    What changed
                  </Typography>
                  <Typography sx={{ mt: 0.35, color: "text.secondary" }}>
                    {planChangeSummary}
                  </Typography>
                </Paper>
                <Paper
                  elevation={0}
                  sx={{
                    p: 1,
                    borderRadius: routinesPanelRadius.section,
                    border: "1px solid",
                    borderColor: "divider",
                    backgroundColor: darkMode ? "rgba(30,41,59,0.56)" : "rgba(255,255,255,0.92)",
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Today&apos;s win
                  </Typography>
                  <Typography sx={{ mt: 0.35, color: "text.secondary" }}>
                    {preWorkoutMinimumSuccess}
                  </Typography>
                </Paper>
              </Box>
            </Stack>
          </Paper>
        </>
      ) : null}

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          flexDirection: { xs: "column", sm: "row" },
          gap: 1,
        }}
      >
        <Chip size="small" label={statusChip.label} color={statusChip.color} variant="outlined" />
        {hasExercises ? (
          <Button
            variant="text"
            size="small"
            startIcon={shouldShowNextSummary ? <MoreHorizIcon /> : <RepeatIcon />}
            onClick={onOpenWorkoutRepeatDialog}
            sx={{ color: "text.secondary" }}
          >
            {shouldShowNextSummary
              ? isWholeWorkoutRepeating
                ? "Workout tools"
                : "Planning tools"
              : isWholeWorkoutRepeating
              ? "Edit workout schedule"
              : "Repeat this workout"}
          </Button>
        ) : null}
      </Box>

      {!shouldShowNextSummary && isWorkoutComplete ? (
        <Box
          sx={{
            py: 1.1,
            px: 0.1,
            borderTop: "1px solid",
            borderBottom: "1px solid",
            borderColor: "divider",
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
              <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.12em" }}>
                Workout Complete
              </Typography>
              <Typography variant="h6">Everything for today is logged</Typography>
              <Typography sx={{ mt: 0.35, color: "text.secondary" }}>
                Lock in the finish, take the win, and choose the next move while the session still feels fresh.
              </Typography>
            </Box>
            <CheckCircleOutlineIcon color="success" />
          </Box>
        </Box>
      ) : null}
    </Stack>
  </Paper>
);

export default WorkoutHeaderSummary;
