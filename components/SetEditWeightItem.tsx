import React, { useState } from "react";
import { Draggable } from "react-beautiful-dnd";
import {
  Card,
  CardHeader,
  CardContent,
  TextField,
  IconButton,
  Box,
  Typography,
} from "@mui/material";
import { FaTrash } from "react-icons/fa";

const SetEditWeightItem = ({
  set,
  index,
  darkMode,
  handleDeleteSet,
  isManualEdit,
}) => {
  const [mySet, setMySet] = useState(set);

  return (
    <Draggable draggableId={`set-${index}`} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          sx={{
            my: 2,
            backgroundColor: darkMode ? "grey.900" : "white",
            color: darkMode ? "grey.100" : "text.primary",
            boxShadow: snapshot.isDragging
              ? "0px 4px 8px rgba(0,0,0,0.2)"
              : "none",
            transition: "box-shadow 0.3s ease",
          }}
        >
          <CardHeader
            sx={{
              display: "flex",
              alignItems: "center",
              // Typically CardHeader places title on the left, action on the right.
              // We'll override that to match your layout
              "& .MuiCardHeader-title": {
                flexGrow: 1,
                marginRight: 2,
              },
            }}
            title={
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={mySet.name}
                onChange={(e) => setMySet({ ...mySet, name: e.target.value })}
                sx={{
                  backgroundColor: darkMode ? "grey.800" : "inherit",
                  "& input": {
                    color: darkMode ? "white" : "inherit",
                  },
                }}
              />
            }
            action={
              <IconButton
                onClick={() => handleDeleteSet(mySet)}
                disabled={index === 0}
                sx={{
                  color: darkMode ? "grey.300" : "inherit",
                }}
              >
                <FaTrash />
              </IconButton>
            }
          />
          <CardContent>
            <Box sx={{ display: "flex", gap: 2 }}>
              {/* Weight Field */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Weight
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    size="small"
                    disabled={!isManualEdit}
                    value={mySet.weight}
                    onChange={(e) =>
                      setMySet({ ...mySet, weight: e.target.value })
                    }
                    sx={{
                      backgroundColor: darkMode ? "grey.800" : "inherit",
                      "& input": {
                        color: darkMode ? "white" : "inherit",
                      },
                    }}
                  />
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    lbs
                  </Typography>
                </Box>
              </Box>

              {/* Reps Field */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Reps
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    size="small"
                    disabled={!isManualEdit}
                    value={mySet.reps}
                    onChange={(e) =>
                      setMySet({ ...mySet, reps: e.target.value })
                    }
                    sx={{
                      backgroundColor: darkMode ? "grey.800" : "inherit",
                      "& input": {
                        color: darkMode ? "white" : "inherit",
                      },
                    }}
                  />
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    reps
                  </Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}
    </Draggable>
  );
};

export default SetEditWeightItem;
