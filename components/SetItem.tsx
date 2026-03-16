import React, { Fragment } from "react";
import { Paper, Box, Typography, IconButton, Chip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import {
  formatWeight,
  getDisplayWeightFromSet,
  normalizeWeightUnit,
} from "../utils/weightUnits";

const SetItem = ({ set, handleDeleteSet, type, darkMode, preferredUnits = "lb" }) => {
  const { weight, reps, seconds, minutes, hours } = set;
  const unit = normalizeWeightUnit(preferredUnits);
  const displayWeight = getDisplayWeightFromSet(set, "planned", unit);

  return (
    <Paper
      key={`card-set-item-${set.id ?? set.name}`}
      elevation={0}
      sx={{
        mx: 2,
        my: 1,
        px: 1.5,
        py: 1.1,
        borderRadius: 2.5,
        backgroundColor: darkMode ? "rgba(15,23,42,0.54)" : "rgba(248,250,252,0.9)",
        color: darkMode ? "white" : "black",
        border: "1px solid",
        borderColor: darkMode ? "rgba(148,163,184,0.16)" : "rgba(148,163,184,0.22)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {set.name}
          </Typography>
          {type === "weight" && (
            <Box sx={{ mt: 0.6, display: "flex", gap: 0.75, flexWrap: "wrap" }}>
              <Chip
                size="small"
                label={formatWeight(displayWeight, unit)}
                color="primary"
                variant="outlined"
              />
              <Chip size="small" label={`${reps} reps`} variant="outlined" />
            </Box>
          )}
          {type === "timed" && (
            <Box sx={{ mt: 0.6, display: "flex", gap: 1, flexWrap: "wrap" }}>
              {hours > 0 && <Typography variant="body2">{hours}h</Typography>}
              {minutes > 0 && <Typography variant="body2">{minutes}m</Typography>}
              {seconds > 0 && <Typography variant="body2">{seconds}s</Typography>}
            </Box>
          )}
        </Box>
        <IconButton
          size="small"
          onClick={() => handleDeleteSet(set.id)}
          sx={{ ml: 1, p: 0.25, color: "text.secondary" }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    </Paper>
  );
};

export default SetItem;
