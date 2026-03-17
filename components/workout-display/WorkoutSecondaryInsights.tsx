import React from "react";
import { Box, Button, Chip, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { workoutFrequencyOptions } from "../../utils/profileSetup";
import { routinesPanelRadius } from "./panelStyles";
import {
  WorkoutComebackGuide,
  WorkoutTrainingAnalyticsSummary,
  WorkoutTrendCard,
  WorkoutTrendSummary,
  WorkoutWeeklyConsistency,
  WorkoutWeeklyReviewPreview,
} from "./workoutDisplayTypes";

type WorkoutSecondaryInsightsProps = {
  comebackGuide?: WorkoutComebackGuide | null;
  darkMode: boolean;
  progressTrendCards: WorkoutTrendCard[];
  progressTrendSummary: WorkoutTrendSummary;
  showProWeeklyBrief?: boolean;
  trainingAnalytics?: {
    week: WorkoutTrainingAnalyticsSummary;
    month: WorkoutTrainingAnalyticsSummary;
  } | null;
  weeklyConsistency?: WorkoutWeeklyConsistency | null;
  weeklyReviewPreview?: WorkoutWeeklyReviewPreview | null;
  weeklyTargetDraft: string;
  savingWeeklyTarget: boolean;
  onResumeToday?: () => void;
  onLightRestart?: () => void;
  onRescheduleThisWeek?: () => void;
  onWeeklyTargetChange: (value: string) => void | Promise<void>;
};

const WorkoutSecondaryInsights = ({
  comebackGuide,
  darkMode,
  progressTrendCards,
  progressTrendSummary,
  showProWeeklyBrief = false,
  trainingAnalytics,
  weeklyConsistency,
  weeklyReviewPreview,
  weeklyTargetDraft,
  savingWeeklyTarget,
  onResumeToday,
  onLightRestart,
  onRescheduleThisWeek,
  onWeeklyTargetChange,
}: WorkoutSecondaryInsightsProps) => {
  const [analyticsPeriod, setAnalyticsPeriod] = React.useState<"week" | "month">("week");
  const hasInsights =
    Boolean(trainingAnalytics) ||
    Boolean(weeklyConsistency) ||
    Boolean(weeklyReviewPreview) ||
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

      {trainingAnalytics ? (
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
          {(() => {
            const activeAnalytics = trainingAnalytics[analyticsPeriod];
            return (
              <Stack spacing={1.15}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", sm: "center" }}
                >
                  <Box>
                    <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.12em" }}>
                      Training Analytics
                    </Typography>
                    <Typography variant="h6" sx={{ mt: 0.25 }}>
                      {activeAnalytics.label} at a glance
                    </Typography>
                    <Typography sx={{ mt: 0.35, color: "text.secondary" }}>
                      Check workload, muscle balance, and consistency without opening each workout one by one.
                    </Typography>
                    <Typography sx={{ mt: 0.45, color: "text.secondary" }}>
                      Volume here means weight times reps across completed sets. Trend callouts use visible logged history, not a hidden score.
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant={analyticsPeriod === "week" ? "contained" : "outlined"}
                      onClick={() => setAnalyticsPeriod("week")}
                    >
                      Weekly
                    </Button>
                    <Button
                      size="small"
                      variant={analyticsPeriod === "month" ? "contained" : "outlined"}
                      onClick={() => setAnalyticsPeriod("month")}
                    >
                      Monthly
                    </Button>
                  </Stack>
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip size="small" variant="outlined" label={`${activeAnalytics.completedWorkouts} completed`} />
                  <Chip size="small" variant="outlined" label={`${activeAnalytics.plannedWorkouts} planned`} />
                  <Chip size="small" variant="outlined" label={`${activeAnalytics.totalSets} sets`} />
                  <Chip size="small" variant="outlined" label={`Volume ${activeAnalytics.totalVolume.toLocaleString()}`} />
                  <Chip size="small" variant="outlined" label={`${activeAnalytics.consistencyRate}% consistency`} />
                  <Chip size="small" variant="outlined" label={`${activeAnalytics.workoutStreak} day streak`} />
                </Stack>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
                    gap: 1,
                  }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.1,
                      borderRadius: routinesPanelRadius.section,
                      border: "1px solid",
                      borderColor: "divider",
                      backgroundColor: darkMode ? "rgba(30,41,59,0.6)" : "rgba(255,255,255,0.88)",
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Muscle balance
                    </Typography>
                    <Stack spacing={0.7} sx={{ mt: 0.9 }}>
                      {activeAnalytics.muscleDistribution.map((group) => (
                        <Box key={group.group}>
                          <Stack direction="row" justifyContent="space-between" spacing={1}>
                            <Typography variant="caption" color="text.secondary">
                              {group.group}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {group.sets} sets ({group.share}%)
                            </Typography>
                          </Stack>
                          <Box
                            sx={{
                              mt: 0.35,
                              height: 8,
                              borderRadius: 999,
                              backgroundColor: "rgba(148,163,184,0.16)",
                              overflow: "hidden",
                            }}
                          >
                            <Box
                              sx={{
                                height: "100%",
                                width: `${Math.max(8, group.share)}%`,
                                borderRadius: 999,
                                background: "linear-gradient(90deg, #2563eb, #0ea5e9)",
                              }}
                            />
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  </Paper>

                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.1,
                      borderRadius: routinesPanelRadius.section,
                      border: "1px solid",
                      borderColor: "divider",
                      backgroundColor: darkMode ? "rgba(30,41,59,0.6)" : "rgba(255,255,255,0.88)",
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Lift trend watch
                    </Typography>
                    <Stack spacing={0.85} sx={{ mt: 0.9 }}>
                      {activeAnalytics.liftTrendHighlights.map((lift) => (
                        <Paper
                          key={lift.exerciseId}
                          elevation={0}
                          sx={{
                            p: 0.9,
                            borderRadius: routinesPanelRadius.section,
                            border: "1px solid",
                            borderColor: "divider",
                            backgroundColor: darkMode ? "rgba(15,23,42,0.48)" : "rgba(248,250,252,0.92)",
                          }}
                        >
                          <Stack spacing={0.35}>
                            <Typography variant="caption" color="text.secondary">
                              {lift.exerciseName}
                            </Typography>
                            <Typography sx={{ fontWeight: 700 }}>{lift.label}</Typography>
                            <Typography sx={{ color: "text.secondary" }}>{lift.benchmark}</Typography>
                            <Typography sx={{ color: "text.secondary" }}>{lift.detail}</Typography>
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  </Paper>
                </Box>
              </Stack>
            );
          })()}
        </Paper>
      ) : null}

      {weeklyReviewPreview ? (
        <Paper
          elevation={0}
          sx={{
            p: 1.4,
            borderRadius: routinesPanelRadius.section,
            border: "1px solid",
            borderColor: darkMode ? "rgba(96,165,250,0.2)" : "rgba(37,99,235,0.14)",
            background: darkMode
              ? "linear-gradient(145deg, rgba(30,41,59,0.82), rgba(15,23,42,0.7))"
              : "linear-gradient(145deg, rgba(239,246,255,0.94), rgba(255,255,255,0.98))",
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
                  Weekly Review
                </Typography>
                <Typography variant="h6" sx={{ mt: 0.25 }}>
                  {weeklyReviewPreview.reviewHeadline}
                </Typography>
                <Typography sx={{ mt: 0.35, color: "text.secondary" }}>
                  {weeklyReviewPreview.reviewCopy}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  size="small"
                  variant="outlined"
                  color={weeklyReviewPreview.thisWeekCompleted > 0 ? "primary" : "default"}
                  label={`${weeklyReviewPreview.thisWeekCompleted} logged`}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${weeklyReviewPreview.lastWeekCompleted} last week`}
                />
              </Stack>
            </Stack>

            <Paper
              elevation={0}
              sx={{
                p: 1.15,
                borderRadius: routinesPanelRadius.section,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: darkMode ? "rgba(15,23,42,0.5)" : "rgba(255,255,255,0.85)",
              }}
            >
              <Stack spacing={0.65}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Next-week preview
                </Typography>
                <Typography sx={{ color: "text.secondary" }}>
                  {weeklyReviewPreview.previewCopy}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    size="small"
                    variant="outlined"
                    color={weeklyReviewPreview.nextWeekScheduledCount > 0 ? "success" : "warning"}
                    label={`${weeklyReviewPreview.nextWeekScheduledCount} next-week day${
                      weeklyReviewPreview.nextWeekScheduledCount === 1 ? "" : "s"
                    }`}
                  />
                  {weeklyReviewPreview.nextWeekFirstDayLabel ? (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`Starts ${weeklyReviewPreview.nextWeekFirstDayLabel}`}
                    />
                  ) : null}
                  <Chip size="small" variant="outlined" label={weeklyReviewPreview.previewHeadline} />
                </Stack>
              </Stack>
            </Paper>
          </Stack>
        </Paper>
      ) : null}

      {showProWeeklyBrief && weeklyReviewPreview ? (
        <Paper
          elevation={0}
          sx={{
            p: 1.4,
            borderRadius: routinesPanelRadius.section,
            border: "1px solid",
            borderColor: darkMode ? "rgba(250,204,21,0.24)" : "rgba(202,138,4,0.2)",
            background: darkMode
              ? "linear-gradient(145deg, rgba(69,26,3,0.54), rgba(30,41,59,0.82))"
              : "linear-gradient(145deg, rgba(255,251,235,0.96), rgba(255,255,255,0.98))",
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
                  Pro Weekly Brief
                </Typography>
                <Typography variant="h6" sx={{ mt: 0.25 }}>
                  Progress recap plus next-week adaptation
                </Typography>
                <Typography sx={{ mt: 0.35, color: "text.secondary" }}>
                  {weeklyReviewPreview.recommendedFocus}
                </Typography>
              </Box>
              <Chip size="small" color="warning" variant="outlined" label="Paid coaching loop" />
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip size="small" variant="outlined" label={`${weeklyReviewPreview.thisWeekCompleted} completed this week`} />
              <Chip size="small" variant="outlined" label={`${weeklyReviewPreview.lastWeekCompleted} in the prior week`} />
              <Chip
                size="small"
                color={weeklyReviewPreview.nextWeekScheduledCount > 0 ? "success" : "warning"}
                variant="outlined"
                label={`${weeklyReviewPreview.nextWeekScheduledCount} planned next week`}
              />
            </Stack>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                gap: 1,
              }}
            >
              {(weeklyReviewPreview.recentBriefs ?? []).map((brief) => (
                <Paper
                  key={brief.id}
                  elevation={0}
                  sx={{
                    p: 1.1,
                    borderRadius: routinesPanelRadius.section,
                    border: "1px solid",
                    borderColor: "divider",
                    backgroundColor: darkMode ? "rgba(15,23,42,0.48)" : "rgba(255,255,255,0.88)",
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {brief.label}
                  </Typography>
                  <Typography sx={{ mt: 0.25, fontWeight: 700 }}>{brief.headline}</Typography>
                  <Typography sx={{ mt: 0.35, color: "text.secondary" }}>{brief.summary}</Typography>
                </Paper>
              ))}
            </Box>
          </Stack>
        </Paper>
      ) : null}

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
                        ? "Resetting"
                        : "Still in reach"
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
            {comebackGuide.lastCompletedLabel || comebackGuide.adjustmentCopy ? (
              <Stack spacing={0.5}>
                {comebackGuide.lastCompletedLabel ? (
                  <Typography sx={{ color: "text.secondary" }}>
                    Last completed workout: {comebackGuide.lastCompletedLabel}.
                  </Typography>
                ) : null}
                {comebackGuide.adjustmentCopy ? (
                  <Typography sx={{ color: "text.secondary" }}>
                    {comebackGuide.adjustmentCopy}
                  </Typography>
                ) : null}
              </Stack>
            ) : null}
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button variant="contained" size="small" onClick={onResumeToday}>
                Start return session
              </Button>
              <Button variant="outlined" size="small" onClick={onLightRestart}>
                Ease back in
              </Button>
              <Button variant="outlined" size="small" onClick={onRescheduleThisWeek}>
                Reshape this week
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
                <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.12em" }}>
                  Progress Summary
                </Typography>
                <Typography variant="h6" sx={{ mt: 0.25 }}>
                  What improved recently?
                </Typography>
                <Typography sx={{ mt: 0.35, color: "text.secondary" }}>
                  {progressTrendSummary.supportingCopy}
                </Typography>
                <Typography sx={{ mt: 0.45, color: "text.secondary" }}>
                  Estimated strength is a calculated 1RM from logged reps and weight, while PR tags call out whether the win came from estimated 1RM, heaviest load, or best rep set.
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
