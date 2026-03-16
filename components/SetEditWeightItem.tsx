import React, { useEffect, useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import {
  Box,
  IconButton,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { WORKOUT_VALUE_LIMITS } from "../utils/workoutValidation";
import {
  formatWeightValue,
  getWeightInputConfig,
  normalizeWeightUnit,
} from "../utils/weightUnits";

const SetEditWeightItem = ({
  set,
  index,
  darkMode,
  handleDeleteSet,
  isManualEdit,
  onChangeSet,
  preferredUnits = "lb",
}) => {
  const [mySet, setMySet] = useState(set);
  const weightUnit = normalizeWeightUnit(preferredUnits);
  const weightInputConfig = getWeightInputConfig(weightUnit);

  useEffect(() => {
    setMySet(set);
  }, [set]);

  const updateSet = (nextSet) => {
    setMySet(nextSet);
    onChangeSet?.(nextSet);
  };

  return (
    <Draggable draggableId={`set-${set.id ?? index}`} index={index}>
      {(provided, snapshot) => (
        <Paper
          ref={provided.innerRef}
          {...provided.draggableProps}
          sx={{
            my: 1.25,
            p: 1.5,
            borderRadius: 3,
            border: "1px solid",
            borderColor: darkMode
              ? "rgba(148,163,184,0.12)"
              : "rgba(17,24,39,0.08)",
            backgroundColor: darkMode
              ? "rgba(17,24,39,0.84)"
              : "rgba(255,255,255,0.92)",
            boxShadow: snapshot.isDragging
              ? "0 14px 32px rgba(15,23,42,0.16)"
              : "none",
            transition: "box-shadow 0.2s ease",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 1,
              mb: 1.25,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                {...provided.dragHandleProps}
                sx={{
                  display: "grid",
                  placeItems: "center",
                  color: "text.secondary",
                  cursor: "grab",
                }}
              >
                <DragIndicatorIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Set {index + 1}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Edit the name, target weight, and reps.
                </Typography>
              </Box>
            </Box>

            <IconButton
              onClick={() => handleDeleteSet(mySet)}
              disabled={index === 0}
              size="small"
              sx={{ color: index === 0 ? "text.disabled" : "error.main" }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box sx={{ display: "grid", gap: 1.25 }}>
            <TextField
              fullWidth
              label="Set label"
              size="small"
              value={mySet.name}
              onChange={(e) => updateSet({ ...mySet, name: e.target.value })}
            />

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 1.25,
              }}
            >
              <TextField
                fullWidth
                label={`Target weight (${weightUnit})`}
                size="small"
                type="number"
                disabled={!isManualEdit}
                value={mySet.weight ?? ""}
                onChange={(e) =>
                  updateSet({ ...mySet, weight: e.target.value, weightUnit })
                }
                inputProps={{
                  min: weightInputConfig.min,
                  max: weightInputConfig.max,
                  step: weightInputConfig.step,
                }}
                helperText={`Use ${formatWeightValue(weightInputConfig.step)} ${weightUnit} increments, ${formatWeightValue(weightInputConfig.min)}-${formatWeightValue(weightInputConfig.max)} ${weightUnit}.`}
              />

              <TextField
                fullWidth
                label="Target reps"
                size="small"
                type="number"
                disabled={!isManualEdit}
                value={mySet.reps ?? ""}
                onChange={(e) =>
                  updateSet({ ...mySet, reps: e.target.value })
                }
                inputProps={{
                  min: WORKOUT_VALUE_LIMITS.reps.min,
                  max: WORKOUT_VALUE_LIMITS.reps.max,
                  step: 1,
                }}
                helperText={`Whole reps only, ${WORKOUT_VALUE_LIMITS.reps.min}-${WORKOUT_VALUE_LIMITS.reps.max}.`}
              />
            </Box>
          </Box>
        </Paper>
      )}
    </Draggable>
  );
};

export default SetEditWeightItem;
