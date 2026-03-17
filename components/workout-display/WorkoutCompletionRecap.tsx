import React from "react";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { Box, Button, Chip, Collapse, Paper, Stack, Typography } from "@mui/material";
import { routinesPanelRadius } from "./panelStyles";

const WorkoutCompletionRecap = ({
  completedExercises,
  completionHighlights,
  completionRecapDismissed,
  darkMode,
  isWorkoutComplete,
  milestoneHistory,
  milestoneSummary,
  onCompletionNextStep,
  onDismissRecap,
  onRestoreRecap,
  recentMilestones,
  recentPersonalRecords,
  recurringSchedulingEnabled,
  shouldShowCompletionRecap,
  workoutVolume,
}: any) => (
  <>
    {isWorkoutComplete ? (
      <Collapse in={shouldShowCompletionRecap} appear={false}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.6, sm: 1.9 },
            borderRadius: routinesPanelRadius.shell,
            border: "1px solid",
            borderColor: darkMode ? "rgba(96,165,250,0.26)" : "rgba(59,130,246,0.18)",
            background: darkMode
              ? "linear-gradient(145deg, rgba(30,41,59,0.98), rgba(15,23,42,0.92))"
              : "linear-gradient(145deg, rgba(239,246,255,0.98), rgba(255,255,255,0.95))",
            boxShadow: darkMode
              ? "0 18px 36px rgba(2,6,23,0.28)"
              : "0 18px 34px rgba(59,130,246,0.1)",
          }}
        >
          <Stack spacing={1.5}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.25}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
            >
              <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <AutoAwesomeIcon fontSize="small" color="primary" />
                  <Typography
                    variant="overline"
                    sx={{ color: "text.secondary", letterSpacing: "0.12em" }}
                  >
                    Session Recap
                  </Typography>
                </Stack>
                <Typography variant="h6" sx={{ mt: 0.4 }}>
                  Strong finish. Today&apos;s work is in the bank.
                </Typography>
                <Typography sx={{ mt: 0.55, color: "text.secondary", maxWidth: 620 }}>
                  You closed the loop on this workout. Capture the progress now, then tee up the
                  next session while momentum is still high.
                </Typography>
              </Box>
              <Chip
                icon={<CheckCircleOutlineIcon fontSize="small" />}
                label="Workout saved"
                color="success"
                variant="outlined"
              />
            </Stack>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(2, minmax(0, 1fr))",
                  sm: "repeat(4, minmax(0, 1fr))",
                },
                gap: 1,
              }}
            >
              {completionHighlights.map((highlight: any) => (
                <Paper
                  key={highlight.label}
                  variant="outlined"
                  sx={{
                    p: 1.25,
                    borderRadius: routinesPanelRadius.section,
                    backgroundColor: darkMode ? "rgba(15,23,42,0.55)" : "rgba(255,255,255,0.86)",
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {highlight.label}
                  </Typography>
                  <Typography variant="h6" sx={{ mt: 0.2 }}>
                    {String(highlight.value)}
                  </Typography>
                </Paper>
              ))}
            </Box>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              justifyContent="space-between"
              alignItems={{ xs: "stretch", sm: "center" }}
            >
              <Typography sx={{ color: "text.secondary" }}>
                {recentPersonalRecords.length > 0
                  ? `You set ${recentPersonalRecords.length} new PR${
                      recentPersonalRecords.length === 1 ? "" : "s"
                    } in this session.`
                  : "Consistent logged sessions are what unlock better recommendations and better weeks."}
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button variant="text" onClick={onDismissRecap}>
                  Dismiss
                </Button>
                <Button variant="contained" endIcon={<PlayArrowIcon />} onClick={onCompletionNextStep}>
                  {recurringSchedulingEnabled ? "Schedule next session" : "Plan next move"}
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </Paper>
      </Collapse>
    ) : null}

    {recentMilestones.length > 0 ? (
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, sm: 1.7 },
          borderRadius: routinesPanelRadius.shell,
          border: "1px solid",
          borderColor: darkMode ? "rgba(245,158,11,0.22)" : "rgba(217,119,6,0.16)",
          background: darkMode
            ? "linear-gradient(145deg, rgba(69,26,3,0.42), rgba(15,23,42,0.82))"
            : "linear-gradient(145deg, rgba(255,247,237,0.98), rgba(255,255,255,0.96))",
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
                Milestone Unlocked
              </Typography>
              <Typography variant="h6" sx={{ mt: 0.3 }}>
                Progress earned a marker today
              </Typography>
              <Typography sx={{ mt: 0.35, color: "text.secondary", maxWidth: 620 }}>
                These are quiet proof points that the work is compounding, whether you are early in
                the habit or deep into a long training block.
              </Typography>
            </Box>
            <Chip
              color="warning"
              variant="outlined"
              label={`${recentMilestones.length} new milestone${
                recentMilestones.length === 1 ? "" : "s"
              }`}
              sx={{ fontWeight: 700 }}
            />
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
              gap: 1,
            }}
          >
            {recentMilestones.map((milestone: any) => (
              <Paper
                key={milestone.id}
                variant="outlined"
                sx={{
                  p: 1.2,
                  borderRadius: routinesPanelRadius.section,
                  backgroundColor: darkMode ? "rgba(120,53,15,0.22)" : "rgba(255,251,235,0.9)",
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {milestone.category === "workout_count"
                    ? "Workout count"
                    : milestone.category === "consistency"
                    ? "Consistency"
                    : milestone.category === "training_volume"
                    ? "Training volume"
                    : "Comeback win"}
                </Typography>
                <Typography sx={{ mt: 0.35, fontWeight: 700 }}>{milestone.title}</Typography>
                <Typography sx={{ mt: 0.35, color: "text.secondary" }}>
                  {milestone.detail}
                </Typography>
              </Paper>
            ))}
          </Box>
        </Stack>
      </Paper>
    ) : null}

    {recentPersonalRecords.length > 0 ? (
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.4, sm: 1.6 },
          borderRadius: routinesPanelRadius.shell,
          border: "1px solid",
          borderColor: darkMode ? "rgba(74,222,128,0.22)" : "rgba(22,163,74,0.14)",
          backgroundColor: darkMode ? "rgba(15,23,42,0.74)" : "rgba(248,250,252,0.92)",
        }}
      >
        <Stack spacing={1.2}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            <Box>
              <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.12em" }}>
                Recent PRs
              </Typography>
              <Typography variant="h6" sx={{ mt: 0.3 }}>
                Progress worth remembering
              </Typography>
              <Typography sx={{ mt: 0.35, color: "text.secondary", maxWidth: 620 }}>
                Your latest records stay visible here, so the reward does not disappear the moment
                you finish the set.
              </Typography>
            </Box>
            <Chip
              color="success"
              variant="outlined"
              label={`${recentPersonalRecords.length} PR${
                recentPersonalRecords.length === 1 ? "" : "s"
              } this workout`}
              sx={{ fontWeight: 700 }}
            />
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
              gap: 1,
            }}
          >
            {recentPersonalRecords.map((highlight: any) => (
              <Paper
                key={`${highlight.exerciseName}-${highlight.category}-${highlight.detail}`}
                variant="outlined"
                sx={{
                  p: 1.2,
                  borderRadius: routinesPanelRadius.section,
                  backgroundColor: darkMode ? "rgba(20,83,45,0.2)" : "rgba(240,253,244,0.86)",
                }}
              >
                <Stack spacing={0.45}>
                  <Typography variant="caption" color="text.secondary">
                    {highlight.exerciseName}
                  </Typography>
                  <Typography sx={{ fontWeight: 700 }}>{highlight.label}</Typography>
                  <Typography sx={{ color: "text.secondary" }}>{highlight.detail}</Typography>
                </Stack>
              </Paper>
            ))}
          </Box>
        </Stack>
      </Paper>
    ) : null}

    {milestoneHistory.length > 0 ? (
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.4, sm: 1.6 },
          borderRadius: routinesPanelRadius.shell,
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: darkMode ? "rgba(15,23,42,0.7)" : "rgba(248,250,252,0.92)",
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
                Milestones
              </Typography>
              <Typography variant="h6" sx={{ mt: 0.3 }}>
                Long-term progress, kept visible
              </Typography>
              <Typography sx={{ mt: 0.35, color: "text.secondary", maxWidth: 620 }}>
                Milestones are awarded once per threshold and stay here as a record of the work you
                have already banked.
              </Typography>
            </Box>
            <Chip variant="outlined" label={`${milestoneSummary?.unlocked?.length ?? 0} unlocked`} />
          </Stack>

          <Stack spacing={1}>
            {milestoneHistory.map((milestone: any) => (
              <Paper
                key={`${milestone.id}-${milestone.unlockedAt}`}
                variant="outlined"
                sx={{
                  p: 1.15,
                  borderRadius: routinesPanelRadius.section,
                  backgroundColor: darkMode ? "rgba(30,41,59,0.6)" : "rgba(255,255,255,0.86)",
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", sm: "center" }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>{milestone.title}</Typography>
                    <Typography sx={{ mt: 0.35, color: "text.secondary" }}>
                      {milestone.detail}
                    </Typography>
                  </Box>
                  <Chip size="small" variant="outlined" label={milestone.unlockedAt} />
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Stack>
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
        {isWorkoutComplete && completionRecapDismissed ? (
          <Chip
            label="View session recap"
            color="primary"
            variant="outlined"
            onClick={onRestoreRecap}
            clickable
          />
        ) : null}
        <Chip
          label={`${completedExercises.length} exercise${
            completedExercises.length === 1 ? "" : "s"
          } completed`}
          variant="outlined"
        />
        <Chip label={`Total volume ${workoutVolume.toLocaleString()}`} variant="outlined" />
      </Box>
    )}
  </>
);

export default WorkoutCompletionRecap;
