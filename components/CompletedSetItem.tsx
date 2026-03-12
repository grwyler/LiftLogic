import React, { Fragment } from "react";
import { formatTime } from "../utils/helpers";
import { Box, Paper, Typography } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { estimateOneRepMax } from "../utils/performance";

const SetItem = ({
  set,
  setIndex,
  setCurrentSetIndex,
  type,
  darkMode,
  interactive = true,
}) => {
  const { actualReps, actualWeight, totalSeconds } = set;
  const plannedWeight =
    typeof set.weight === "number" ? set.weight : Number(set.weight);
  const plannedReps = typeof set.reps === "number" ? set.reps : Number(set.reps);
  const numericActualWeight =
    typeof actualWeight === "number" ? actualWeight : Number(actualWeight);
  const numericActualReps =
    typeof actualReps === "number" ? actualReps : Number(actualReps);
  const hasNumericActualWeight =
    Number.isFinite(numericActualWeight) && numericActualWeight > 0;
  const hasNumericActualReps =
    Number.isFinite(numericActualReps) && numericActualReps > 0;
  const hasPlannedWeight = Number.isFinite(plannedWeight) && plannedWeight > 0;
  const hasPlannedReps = Number.isFinite(plannedReps) && plannedReps > 0;
  const weightDelta =
    hasNumericActualWeight && hasPlannedWeight
      ? Math.round((numericActualWeight - plannedWeight) * 10) / 10
      : null;
  const repDelta =
    hasNumericActualReps && hasPlannedReps ? numericActualReps - plannedReps : null;
  const estimated1RM =
    hasNumericActualWeight && hasNumericActualReps
      ? Math.round(estimateOneRepMax(numericActualWeight, numericActualReps) * 10) /
        10
      : null;
  const shouldRenderWeightMetrics =
    type === "weight" ||
    (actualWeight !== undefined &&
      actualWeight !== null &&
      actualWeight !== "" &&
      actualReps !== undefined &&
      actualReps !== null &&
      actualReps !== "");

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
        mx: 2,
        my: 1.25,
        px: 1.75,
        py: 1.25,
        borderRadius: 2.5,
        border: "1px solid",
        borderColor: darkMode ? "rgba(148,163,184,0.2)" : "rgba(148,163,184,0.3)",
        backgroundColor: darkMode ? "rgba(15,23,42,0.64)" : "rgba(248,250,252,0.92)",
        cursor: interactive ? "pointer" : "default",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {set.name}
        </Typography>
        <CheckCircleOutlineIcon sx={{ fontSize: 18, color: "success.main" }} />
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
        {shouldRenderWeightMetrics && (
          <Fragment>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {actualWeight} lbs
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {actualReps} reps
            </Typography>
            {estimated1RM ? (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Est. 1RM {estimated1RM}
              </Typography>
            ) : null}
            {weightDelta !== null || repDelta !== null ? (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                vs plan{" "}
                {weightDelta !== null
                  ? `${weightDelta > 0 ? "+" : ""}${weightDelta} lbs`
                  : "0 lbs"}
                {repDelta !== null ? `, ${repDelta > 0 ? "+" : ""}${repDelta} reps` : ""}
              </Typography>
            ) : null}
          </Fragment>
        )}
        {type === "timed" && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {formatTime(totalSeconds)}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default SetItem;
