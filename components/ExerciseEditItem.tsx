import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Slider,
  Divider,
} from "@mui/material";
import { FaPlus, FaSave, FaTimes } from "react-icons/fa";
import { DragDropContext, Droppable } from "react-beautiful-dnd";

import TimerInput from "./TimerInput";
import SetEditTimerItem from "./SetEditTimerItem";
import SetEditWeightItem from "./SetEditWeightItem";
import { emptyOrNullToZero } from "../utils/helpers";

interface ExerciseEditItemProps {
  index: number;
  exercise: any;
  onSave: (updatedExercise: any) => void;
  onCancel: () => void;
  darkMode: boolean;
  isValid: boolean;
  autoFocusWeight?: boolean;
}

const ExerciseEditItem: React.FC<ExerciseEditItemProps> = ({
  index,
  exercise,
  onSave,
  onCancel,
  darkMode,
  isValid,
  autoFocusWeight = false,
}) => {
  const {
    setMyOneRepMax,
    mySets,
    setMySets,
    myHours,
    setMyHours,
    myMinutes,
    setMyMinutes,
    mySeconds,
    setMySeconds,
    myOneRepMax,
    isManualEdit,
    setIsManualEdit,
    effort,
    setEffort,
  } = useExerciseEditItemState(exercise);

  const [desiredSetCount, setDesiredSetCount] = useState(3);

  const handleUpdateOneRepMax = (oneRepMax: string) => {
    const numericValue = parseFloat(oneRepMax);
    if (!isNaN(numericValue)) {
      setMyOneRepMax(numericValue);
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    const { source, destination } = result;
    if (source.index === destination.index) return;
    const newSets = Array.from(mySets);
    const [removed] = newSets.splice(source.index, 1);
    newSets.splice(destination.index, 0, removed);
    setMySets(newSets);
  };

  const handleInputChange = (value: any, setValue: (v: any) => void) => {
    const trimmedValue = value.toString().replace(/^0+/, "");
    const intValue = parseInt(trimmedValue, 10);
    setValue(isNaN(intValue) ? 0 : trimmedValue);
  };

  // Use local state (mySets) for adding a new set.
  const handleAddSet = () => {
    const sets = [...mySets];
    if (sets.length === 0) {
      let defaultSet;
      if (exercise.type === "weight") {
        defaultSet = {
          name: "Working Set 1",
          reps: 10,
          weight: exercise.max || 0,
          actualWeight: "",
          actualReps: "",
          complete: false,
        };
      } else {
        defaultSet = {
          name: "Timed Set 1",
          duration: exercise.duration || 0,
          actualDuration: "",
          complete: false,
        };
      }
      sets.push(defaultSet);
      setMySets(sets);
      return;
    }
    const lastSet = sets[sets.length - 1];
    const newSetNumber = sets.length + 1;
    const newSet = {
      ...lastSet,
      weight: lastSet.weight + lastSet.weight * 0.05,
      actualWeight: "",
      actualReps: "",
      complete: false,
      name: `Working Set ${newSetNumber}`,
    };
    setMySets([...sets, newSet]);
  };

  const handleManualToggle = () => {
    setIsManualEdit(!isManualEdit);
  };

  const handleChangeEffort = (e: any, newValue: number | number[]) => {
    setEffort(newValue as number);
  };

  const handleGenerateSets = () => {
    // Generation logic can be added here.
  };

  const handleSave = () => {
    const updatedExercise = {
      ...exercise,
      sets: mySets,
    };
    if (exercise.type === "weight") {
      updatedExercise.oneRepMax = myOneRepMax;
      updatedExercise.effort = effort;
    } else if (exercise.type === "timed") {
      updatedExercise.hours = myHours;
      updatedExercise.minutes = myMinutes;
      updatedExercise.seconds = mySeconds;
    }
    onSave(updatedExercise);
  };

  return (
    <Card
      sx={{
        border: isValid ? "2px solid #007bff" : "2px solid #6c757d",
        m: 2,
        ...(darkMode && {
          backgroundColor: "grey.900",
          color: "grey.100",
        }),
      }}
    >
      <CardHeader
        title={
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            Editing <strong>{exercise.name}</strong>
          </Typography>
        }
        sx={{
          backgroundColor: isValid ? "grey.100" : "grey.200",
          ...(darkMode && {
            backgroundColor: isValid ? "grey.800" : "grey.700",
          }),
        }}
      />
      <CardContent>
        <Box>
          {exercise.type === "timed" ? (
            <TimerInput
              hours={myHours}
              setHours={setMyHours}
              minutes={myMinutes}
              setMinutes={setMyMinutes}
              seconds={mySeconds}
              setSeconds={setMySeconds}
              handleBlur={() => {}}
              handleInputChange={handleInputChange}
              darkMode={darkMode}
            />
          ) : !isManualEdit ? (
            <Box>
              <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={isManualEdit}
                      onChange={handleManualToggle}
                      color="primary"
                    />
                  }
                  label="Manually Enter"
                />
              </Box>
              <Box sx={{ display: "flex", mb: 2 }}>
                <Box sx={{ flex: 1, mr: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                    One Rep Max (1RM)
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                    <TextField
                      type="number"
                      fullWidth
                      variant="outlined"
                      value={myOneRepMax}
                      onChange={(e) => handleUpdateOneRepMax(e.target.value)}
                      sx={{
                        ...(darkMode && {
                          backgroundColor: "grey.800",
                          "& input": { color: "white" },
                        }),
                      }}
                    />
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      lbs
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ width: 120 }}>
                  <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                    Sets
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                    <TextField
                      type="number"
                      fullWidth
                      variant="outlined"
                      value={desiredSetCount}
                      onChange={(e) =>
                        setDesiredSetCount(parseFloat(e.target.value))
                      }
                      sx={{
                        ...(darkMode && {
                          backgroundColor: "grey.800",
                          "& input": { color: "white" },
                        }),
                      }}
                    />
                  </Box>
                </Box>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                  Effort: {effort}%
                </Typography>
                <Slider
                  value={effort}
                  onChange={handleChangeEffort}
                  step={1}
                  min={1}
                  max={100}
                  sx={{ mt: 1 }}
                />
              </Box>
              <Box sx={{ textAlign: "center", mb: 2 }}>
                <Button variant="contained" onClick={handleGenerateSets}>
                  Generate
                </Button>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={isManualEdit}
                    onChange={handleManualToggle}
                    color="primary"
                  />
                }
                label="Manually Enter"
              />
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />
        <Typography variant="h5" sx={{ mb: 1 }}>
          Sets
        </Typography>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="sets">
            {(provided) => (
              <Box
                ref={provided.innerRef}
                {...provided.droppableProps}
                sx={{ mb: 2 }}
              >
                {mySets.map((set, index) =>
                  exercise.type === "timed" ? (
                    <SetEditTimerItem
                      key={`set-edit-timer-${set.name}-${index}`}
                      set={set}
                      index={index}
                      darkMode={darkMode}
                    />
                  ) : (
                    <SetEditWeightItem
                      key={`set-edit-weight-${set.name}-${index}`}
                      set={set}
                      index={index}
                      isManualEdit={isManualEdit}
                      darkMode={darkMode}
                      handleDeleteSet={(setToRemove) =>
                        setMySets(
                          mySets.filter((s) => s.name !== setToRemove.name)
                        )
                      }
                    />
                  )
                )}
                {provided.placeholder}
              </Box>
            )}
          </Droppable>
        </DragDropContext>

        {/* Action Buttons: Save and Cancel only */}
        <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
          <Button
            variant="contained"
            color="success"
            startIcon={<FaSave />}
            onClick={handleSave}
          >
            Save
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<FaTimes />}
            onClick={onCancel}
          >
            Cancel
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

const useExerciseEditItemState = (exercise: any) => {
  const [mySets, setMySets] = useState<any[]>(exercise.sets);
  const [myOneRepMax, setMyOneRepMax] = useState(exercise.oneRepMax);
  const [myHours, setMyHours] = useState(emptyOrNullToZero(exercise.hours));
  const [myMinutes, setMyMinutes] = useState(
    emptyOrNullToZero(exercise.minutes)
  );
  const [mySeconds, setMySeconds] = useState(
    emptyOrNullToZero(exercise.seconds)
  );
  const [isManualEdit, setIsManualEdit] = useState(false);
  const [effort, setEffort] = useState(50);

  return {
    setMyOneRepMax,
    mySets,
    setMySets,
    myHours,
    setMyHours,
    myMinutes,
    setMyMinutes,
    mySeconds,
    setMySeconds,
    myOneRepMax,
    isManualEdit,
    setIsManualEdit,
    effort,
    setEffort,
  };
};

export default ExerciseEditItem;
