import React from "react";
import { Box, Chip, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { workoutFrequencyOptions } from "../../utils/profileSetup";
import { routinesPanelRadius } from "./panelStyles";
import {
  WorkoutComebackGuide,
  WorkoutTrendCard,
  WorkoutTrendSummary,
  WorkoutWeeklyConsistency,
} from "./workoutDisplayTypes";

type WorkoutSecondaryInsightsProps = {
  comebackGuide?: WorkoutComebackGuide | null;
  darkMode: boolean;
  progressTrendCards: WorkoutTrendCard[];
  progressTrendSummary: WorkoutTrendSummary;
  weeklyConsistency?: WorkoutWeeklyConsistency | null;
  weeklyTargetDraft: string;
  savingWeeklyTarget: boolean;
  onWeeklyTargetChange: (value: string) => void | Promise<void>;
};

const WorkoutSecondaryInsights = ({
  comebackGuide,
  darkMode,
  progressTrendCards,
  progressTrendSummary,
  weeklyConsistency,
  weeklyTargetDraft,
  savingWeeklyTarget,
  onWeeklyTargetChange,
}: WorkoutSecondaryInsightsProps) => {
  const hasInsights =
    Boolean(weeklyConsistency) ||
    Boolean(comebackGuide) ||
    progressTrendCards.length > 0;

  if (!hasInsights) {
    return null;
  }

  return (
    <Stack spacing={1.5}>
      <Box sx={{ px: 0.25 }}>
        <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.14em" }}>
          Secondary Insights
        </Typography>
        <Typography variant="h6" sx={{ mt: 0.25 }}>
          Review consistency, comeback guidance, and trend signals after the active lift flow.
        </Typography>
      </Box>

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
                  <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.12em" }}>
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
                  <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.12em" }}>
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
                <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.12em" }}>
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
              {progressTrendCards.slice(0, 4).map((card) => (
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
    </Stack>
  );
};

export default WorkoutSecondaryInsights;
