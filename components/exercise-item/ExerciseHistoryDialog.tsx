import React, { useMemo, useState } from "react";
import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { WorkoutEntryDoc } from "../../utils/types";
import {
  buildExerciseHistorySummary,
  ExerciseHistoryRange,
} from "../../utils/workoutAnalytics";

const rangeOptions: Array<{ value: ExerciseHistoryRange; label: string }> = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "all", label: "All time" },
];

const ExerciseHistoryDialog = ({
  open,
  onClose,
  exerciseName,
  entries,
  preferredUnits,
}: {
  open: boolean;
  onClose: () => void;
  exerciseName: string;
  entries: WorkoutEntryDoc[];
  preferredUnits?: "lb" | "kg";
}) => {
  const [range, setRange] = useState<ExerciseHistoryRange>("7d");
  const historySummary = useMemo(
    () =>
      buildExerciseHistorySummary({
        entries,
        preferredUnits,
        range,
      }),
    [entries, preferredUnits, range]
  );

  const metricMax = (key: "load" | "reps" | "volume" | "estimatedStrength") =>
    Math.max(
      1,
      ...historySummary.chartPoints.map((point) => Number(point[key] || 0))
    );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{exerciseName} history</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {rangeOptions.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                clickable
                color={range === option.value ? "primary" : "default"}
                variant={range === option.value ? "filled" : "outlined"}
                onClick={() => setRange(option.value)}
              />
            ))}
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {historySummary.lifetimeBestLoad !== null ? (
              <Chip
                label={`Best load ${historySummary.lifetimeBestLoad} ${preferredUnits || "lb"}`}
                variant="outlined"
              />
            ) : null}
            {historySummary.lifetimeBestRepSet ? (
              <Chip label={`Best set ${historySummary.lifetimeBestRepSet}`} variant="outlined" />
            ) : null}
            {historySummary.lifetimeBestEstimatedStrength !== null ? (
              <Chip
                label={`Best est. strength ${historySummary.lifetimeBestEstimatedStrength} ${
                  preferredUnits || "lb"
                }`}
                variant="outlined"
              />
            ) : null}
          </Stack>

          <Paper variant="outlined" sx={{ p: 1.25 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              What the metrics mean
            </Typography>
            <Stack spacing={0.55} sx={{ mt: 0.8 }}>
              <Typography color="text.secondary">
                <strong>Estimated strength:</strong> a calculated 1RM from logged weight and reps.
              </Typography>
              <Typography color="text.secondary">
                <strong>Top set:</strong> your heaviest comparable completed set from that session.
              </Typography>
              <Typography color="text.secondary">
                <strong>Volume:</strong> weight times reps across all completed sets in that workout.
              </Typography>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 1.25 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Top-set trend
            </Typography>
            <Stack spacing={0.7} sx={{ mt: 1 }}>
              {historySummary.topSetTrend.length > 0 ? (
                historySummary.topSetTrend.map((point) => (
                  <Stack
                    key={`${point.date}-${point.label}`}
                    direction="row"
                    justifyContent="space-between"
                    spacing={1}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {point.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {point.topSet ?? "No completed top set"}
                    </Typography>
                  </Stack>
                ))
              ) : (
                <Typography color="text.secondary">
                  Log at least one completed weighted session to unlock the top-set trend.
                </Typography>
              )}
            </Stack>
          </Paper>

          {(["load", "reps", "volume", "estimatedStrength"] as const).map((metric) => (
            <Paper key={metric} variant="outlined" sx={{ p: 1.25 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "capitalize" }}>
                {metric === "estimatedStrength" ? "Estimated strength" : metric} trend
              </Typography>
              <Stack spacing={0.85} sx={{ mt: 1 }}>
                {historySummary.chartPoints.length > 0 ? (
                  historySummary.chartPoints.map((point) => {
                    const value = Number(point[metric] || 0);
                    return (
                      <Box key={`${metric}-${point.date}`}>
                        <Stack direction="row" justifyContent="space-between" spacing={1}>
                          <Typography variant="caption" color="text.secondary">
                            {point.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {value > 0 ? value : "No data"}
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
                              width: `${Math.max(6, (value / metricMax(metric)) * 100)}%`,
                              borderRadius: 999,
                              background:
                                metric === "estimatedStrength"
                                  ? "linear-gradient(90deg, #2563eb, #0ea5e9)"
                                  : "linear-gradient(90deg, #111827, #4b5563)",
                            }}
                          />
                        </Box>
                      </Box>
                    );
                  })
                ) : (
                  <Typography color="text.secondary">
                    Log more sessions for this lift to unlock chart history.
                  </Typography>
                )}
              </Stack>
            </Paper>
          ))}

          <Divider />

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Recent sessions
            </Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              {historySummary.recentSessions.map((session) => (
                <Paper key={`${session.date}-${session.routineName}`} variant="outlined" sx={{ p: 1.1 }}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    spacing={1}
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>{session.date}</Typography>
                      <Typography color="text.secondary">{session.routineName}</Typography>
                    </Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {session.load !== null ? (
                        <Chip label={`${session.load} ${preferredUnits || "lb"}`} variant="outlined" />
                      ) : null}
                      {session.reps !== null ? (
                        <Chip label={`${session.reps} reps`} variant="outlined" />
                      ) : null}
                      {session.volume !== null ? (
                        <Chip label={`Volume ${session.volume}`} variant="outlined" />
                      ) : null}
                      {session.estimatedStrength !== null ? (
                        <Chip label={`Est. strength ${session.estimatedStrength}`} variant="outlined" />
                      ) : null}
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default ExerciseHistoryDialog;
