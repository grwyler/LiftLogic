import React, { Fragment } from "react";
import { formatTime } from "../utils/helpers";
import { Box, Paper, Typography } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

const SetItem = ({
  set,
  setIndex,
  setCurrentSetIndex,
  type,
  darkMode,
  interactive = true,
}) => {
  const { actualReps, actualWeight, totalSeconds } = set;
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
