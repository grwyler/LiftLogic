import React from "react";
import { Box, Button, Chip, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RepeatIcon from "@mui/icons-material/Repeat";
import { workoutFrequencyOptions } from "../../utils/profileSetup";
import { routinesPanelRadius } from "./panelStyles";

const WorkoutHeaderSummary = ({
  comebackGuide,
  darkMode,
  hasExercises,
  isWholeWorkoutRepeating,
  isWorkoutComplete,
  nextExercise,
  onLightRestart,
  onOpenNextSet,
  onOpenWorkoutRepeatDialog,
  onRescheduleThisWeek,
  onResumeToday,
  progressTrendCards,
  progressTrendSummary,
  shouldShowNextSummary,
  statusChip,
  weeklyConsistency,
  weeklyTargetDraft,
  savingWeeklyTarget,
  onWeeklyTargetChange,
}: any) => (
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
      {weeklyConsistency ? (
        <Paper
          elevation={0}
          sx={{
            p: 1.4,
            borderRadius: routinesPanelRadius.section,
            border: "1px solid",
            borderColor:
              weeklyConsistency.state === "goal_hit"
                ? "success.light"
                : weeklyConsistency.state === "behind"
                ? "warning.light"
                : "divider",
            backgroundColor: darkMode
              ? "rgba(15,23,42,0.52)"
              : "rgba(248,250,252,0.9)",
          }}
        >
          <Stack spacing={1.15}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.2}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
            >
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography
                    variant="overline"
                    sx={{ color: "text.secondary", letterSpacing: "0.12em" }}
                  >
                    Weekly Consistency
                  </Typography>
                  <Chip
                    size="small"
                    color={
                      weeklyConsistency.state === "goal_hit"
                        ? "success"
                        : weeklyConsistency.state === "behind"
                        ? "warning"
                        : "primary"
                    }
                    label={
                      weeklyConsistency.state === "goal_hit"
                        ? "Goal hit"
                        : weeklyConsistency.state === "behind"
                        ? "Behind"
                        : "On track"
                    }
                    variant="outlined"
                  />
                </Stack>
                <Typography variant="h6" sx={{ mt: 0.25 }}>
                  {weeklyConsistency.completedCount} / {weeklyConsistency.target} workouts this week
                </Typography>
                <Typography sx={{ mt: 0.35, color: "text.secondary" }}>
                  {weeklyConsistency.supportingCopy}
                </Typography>
              </Box>

              <TextField
                select
                size="small"
                label="Weekly target"
                value={weeklyTargetDraft}
                onChange={(event) => void onWeeklyTargetChange(event.target.value)}
                disabled={savingWeeklyTarget}
                sx={{ minWidth: { xs: "100%", sm: 148 } }}
              >
                {workoutFrequencyOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option} / week
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip size="small" label={`${weeklyConsistency.scheduledCount} scheduled`} variant="outlined" />
              <Chip
                size="small"
                label={`${weeklyConsistency.remainingScheduledCount} remaining`}
                variant="outlined"
              />
              <Chip size="small" label={weeklyConsistency.headline} variant="outlined" />
            </Stack>
          </Stack>
        </Paper>
      ) : null}

      {comebackGuide ? (
        <Paper
          elevation={0}
          sx={{
            p: 1.4,
            borderRadius: routinesPanelRadius.section,
            border: "1px solid",
            borderColor: darkMode ? "rgba(96,165,250,0.26)" : "rgba(59,130,246,0.18)",
            background: darkMode
              ? "linear-gradient(145deg, rgba(30,41,59,0.82), rgba(15,23,42,0.74))"
              : "linear-gradient(145deg, rgba(239,246,255,0.94), rgba(255,255,255,0.96))",
          }}
        >
          <Stack spacing={1.15}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
            >
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography
                    variant="overline"
                    sx={{ color: "text.secondary", letterSpacing: "0.12em" }}
                  >
                    Comeback Plan
                  </Typography>
                  <Chip size="small" color="primary" label="Fresh win opportunity" variant="outlined" />
                </Stack>
                <Typography variant="h6" sx={{ mt: 0.25 }}>
                  {comebackGuide.headline}
                </Typography>
                <Typography sx={{ mt: 0.35, color: "text.secondary" }}>
                  {comebackGuide.supportingCopy}
                </Typography>
              </Box>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {comebackGuide.missedScheduledCount > 0 ? (
                  <Chip
                    size="small"
                    label={`${comebackGuide.missedScheduledCount} session${
                      comebackGuide.missedScheduledCount === 1 ? "" : "s"
                    } slipped`}
                    variant="outlined"
                  />
                ) : null}
                {comebackGuide.daysSinceLastLog !== null ? (
                  <Chip size="small" label={`${comebackGuide.daysSinceLastLog} day gap`} variant="outlined" />
                ) : null}
              </Stack>
            </Stack>

            <Typography sx={{ color: "text.secondary" }}>
              No streak debt, no catch-up workout. Pick the easiest next step and let today count.
            </Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button variant="contained" onClick={onResumeToday}>
                Resume today
              </Button>
              <Button variant="outlined" onClick={onLightRestart}>
                Light restart session
              </Button>
              <Button variant="text" onClick={onRescheduleThisWeek}>
                Reschedule this week
              </Button>
            </Stack>
          </Stack>
        </Paper>
      ) : null}

      {progressTrendCards.length > 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 1.4,
            borderRadius: routinesPanelRadius.section,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: darkMode ? "rgba(15,23,42,0.58)" : "rgba(248,250,252,0.92)",
          }}
        >
          <Stack spacing={1.15}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
            >
              <Box>
                <Typography
                  variant="overline"
                  sx={{ color: "text.secondary", letterSpacing: "0.12em" }}
                >
                  Progress Summary
                </Typography>
                <Typography variant="h6" sx={{ mt: 0.25 }}>
                  What improved recently?
                </Typography>
                <Typography sx={{ mt: 0.35, color: "text.secondary" }}>
                  {progressTrendSummary.supportingCopy}
                </Typography>
              </Box>
              <Chip
                size="small"
                variant="outlined"
                color={progressTrendSummary.counts.up > 0 ? "success" : "default"}
                label={progressTrendSummary.headline}
              />
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip size="small" label={`${progressTrendSummary.counts.up} up`} color="success" variant="outlined" />
              <Chip size="small" label={`${progressTrendSummary.counts.steady} steady`} color="primary" variant="outlined" />
              <Chip size="small" label={`${progressTrendSummary.counts.down} reset`} color="warning" variant="outlined" />
            </Stack>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                gap: 1,
              }}
            >
              {progressTrendCards.slice(0, 4).map((card: any) => (
                <Paper
                  key={card.id}
                  variant="outlined"
                  sx={{
                    p: 1.15,
                    borderRadius: routinesPanelRadius.section,
                    backgroundColor: darkMode ? "rgba(30,41,59,0.6)" : "rgba(255,255,255,0.88)",
                  }}
                >
                  <Stack spacing={0.45}>
                    <Typography variant="caption" color="text.secondary">
                      {card.exerciseName}
                    </Typography>
                    <Typography sx={{ fontWeight: 700 }}>{card.label}</Typography>
                    <Typography sx={{ color: "text.secondary" }}>{card.benchmark}</Typography>
                    <Typography sx={{ color: "text.secondary" }}>{card.detail}</Typography>
                  </Stack>
                </Paper>
              ))}
            </Box>
          </Stack>
        </Paper>
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
          <Button variant="outlined" size="small" startIcon={<RepeatIcon />} onClick={onOpenWorkoutRepeatDialog}>
            {isWholeWorkoutRepeating ? "Edit workout schedule" : "Repeat this workout"}
          </Button>
        ) : null}
      </Box>

      {shouldShowNextSummary ? (
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
              <Typography
                variant="overline"
                sx={{ color: "text.secondary", letterSpacing: "0.12em" }}
              >
                Up Next
              </Typography>
              <Typography variant="h6">{nextExercise?.name}</Typography>
              <Typography sx={{ mt: 0.35, color: "text.secondary" }}>
                Open this exercise to keep moving through today's plan.
              </Typography>
            </Box>

            <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={onOpenNextSet}>
              Open Next Set
            </Button>
          </Box>
        </Box>
      ) : isWorkoutComplete ? (
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
              <Typography
                variant="overline"
                sx={{ color: "text.secondary", letterSpacing: "0.12em" }}
              >
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
