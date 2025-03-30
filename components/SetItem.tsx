import React, { Fragment } from "react";
import { roundToNearestFive } from "../utils/helpers";
import { Card, CardContent, Box, Typography, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const SetItem = ({ set, handleDeleteSet, type, darkMode }) => {
  const { weight, reps, seconds, minutes, hours } = set;

  return (
    <Card
      key={`card-set-item-${set.name}`}
      sx={{
        m: 2,
        backgroundColor: darkMode ? "grey.900" : "grey.100",
        color: darkMode ? "white" : "black",
        border: darkMode ? "1px solid #6c757d" : "1px solid #dee2e6",
      }}
    >
      <CardContent
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 2,
        }}
      >
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 2, flexGrow: 1 }}
        >
          {type === "weight" && (
            <Fragment>
              <Typography variant="body2">
                {roundToNearestFive(weight)} lbs.
              </Typography>
              <Typography variant="body2">{set.name}</Typography>
              <Typography variant="body2">{reps} reps</Typography>
            </Fragment>
          )}
          {type === "timed" && (
            <Fragment>
              <Typography variant="body2">{set.name}</Typography>
              {hours > 0 && <Typography variant="body2">{hours}h</Typography>}
              {minutes > 0 && (
                <Typography variant="body2">{minutes}m</Typography>
              )}
              {seconds > 0 && (
                <Typography variant="body2">{seconds}s</Typography>
              )}
            </Fragment>
          )}
        </Box>
        <IconButton
          size="small"
          onClick={() => handleDeleteSet(set.name)}
          sx={{ ml: 2, p: 0 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </CardContent>
    </Card>
  );
};

export default SetItem;
