import React, { Fragment } from "react";
import { formatTime } from "../utils/helpers";
import { Box, Paper, Typography } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { estimateOneRepMax } from "../utils/performance";
import {
  formatWeight,
  formatWeightValue,
  fromCanonicalWeightLb,
  getCanonicalWeightFromSet,
  normalizeWeightUnit,
} from "../utils/weightUnits";
import { radiusTokens } from "../styles/radiusTokens";

const completedSetRadius = {
  card: radiusTokens.card,
  badge: radiusTokens.pill,
} as const;

const SetItem = ({
  set,
  setIndex,
  setCurrentSetIndex,
  type,
  darkMode,
  preferredUnits = "lb",
  interactive = true,
}) => {
  const { actualReps, actualWeight, totalSeconds, actualHours, actualMinutes, actualSeconds } = set;
  const unit = normalizeWeightUnit(preferredUnits);
  const plannedWeightInLb = getCanonicalWeightFromSet(set, "planned");
  const plannedReps = typeof set.reps === "number" ? set.reps : Number(set.reps);
  const numericActualWeightInLb = getCanonicalWeightFromSet(set, "actual");
  const numericActualReps =
    typeof actualReps === "number" ? actualReps : Number(actualReps);
  const hasNumericActualWeight =
    Number.isFinite(numericActualWeightInLb) && numericActualWeightInLb > 0;
  const hasNumericActualReps =
    Number.isFinite(numericActualReps) && numericActualReps > 0;
  const hasPlannedWeight = Number.isFinite(plannedWeightInLb) && plannedWeightInLb > 0;
  const hasPlannedReps = Number.isFinite(plannedReps) && plannedReps > 0;
  const weightDelta =
    hasNumericActualWeight && hasPlannedWeight
      ? Math.round(
          (fromCanonicalWeightLb(numericActualWeightInLb, unit) -
            fromCanonicalWeightLb(plannedWeightInLb, unit)) *
            10
        ) / 10
      : null;
  const repDelta =
    hasNumericActualReps && hasPlannedReps ? numericActualReps - plannedReps : null;
  const estimated1RM =
    hasNumericActualWeight && hasNumericActualReps
      ? Math.round(
          fromCanonicalWeightLb(
            estimateOneRepMax(numericActualWeightInLb, numericActualReps),
            unit
          ) * 10
        ) /
        10
      : null;
  const displayActualWeight = hasNumericActualWeight
    ? fromCanonicalWeightLb(numericActualWeightInLb, unit)
    : null;
  const shouldRenderWeightMetrics =
    type === "weight" ||
    (actualWeight !== undefined &&
      actualWeight !== null &&
      actualWeight !== "" &&
      actualReps !== undefined &&
      actualReps !== null &&
      actualReps !== "");
  const loggedTimedSeconds =
    typeof totalSeconds === "number"
      ? totalSeconds
      : Number(totalSeconds) ||
        Number(actualHours || 0) * 3600 +
          Number(actualMinutes || 0) * 60 +
          Number(actualSeconds || 0);

  const handleClickCompletedSet = () => {
    if (interactive) {
      setCurrentSetIndex(setIndex);
    }
  };
  return (
    <Paper
      elevation={0}
      onClick={handleClickCompletedSet}
      sx={{
        my: 1,
        px: 1.5,
        py: 1.25,
        borderRadius: completedSetRadius.card,
        border: "1px solid",
        borderColor: darkMode ? "rgba(148,163,184,0.16)" : "rgba(15,23,42,0.1)",
        backgroundColor: darkMode ? "rgba(15,23,42,0.54)" : "rgba(248,250,252,0.78)",
        cursor: interactive ? "pointer" : "default",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 1,
          mb: 0.85,
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
          {set.name}
        </Typography>
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.6,
            px: 1,
            py: 0.45,
            borderRadius: completedSetRadius.badge,
            backgroundColor: darkMode
              ? "rgba(34,197,94,0.14)"
              : "rgba(220,252,231,0.92)",
            color: darkMode ? "#bbf7d0" : "#166534",
          }}
        >
          <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />
          <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1 }}>
            Logged
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        {shouldRenderWeightMetrics && (
          <Fragment>
            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
              {formatWeight(displayActualWeight, unit)}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
              {actualReps} reps
            </Typography>
            {estimated1RM ? (
              <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
                Est. 1RM {estimated1RM}
              </Typography>
            ) : null}
            {weightDelta !== null || repDelta !== null ? (
              <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
                vs plan{" "}
                {weightDelta !== null
                  ? `${weightDelta > 0 ? "+" : ""}${formatWeightValue(weightDelta)} ${unit}`
                  : `0 ${unit}`}
                {repDelta !== null ? `, ${repDelta > 0 ? "+" : ""}${repDelta} reps` : ""}
              </Typography>
            ) : null}
          </Fragment>
        )}
        {type === "timed" && (
          <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
            {formatTime(loggedTimedSeconds)}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default SetItem;
