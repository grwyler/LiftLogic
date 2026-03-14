import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Paper,
  Slider,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { FaSave, FaTimes } from "react-icons/fa";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";

import TimerInput from "./TimerInput";
import SetEditTimerItem from "./SetEditTimerItem";
import SetEditWeightItem from "./SetEditWeightItem";
import { emptyOrNullToZero, roundToNearestFive } from "../utils/helpers";

interface ExerciseEditItemProps {
  index: number;
  exercise: any;
  onSave: (updatedExercise: any) => void;
  onCancel: () => void;
  darkMode: boolean;
  isValid: boolean;
  autoFocusWeight?: boolean;
}

type StrengthProfile = {
  label: string;
  repRange: [number, number];
  intensityRange: [number, number];
  fatigueDrop: number;
  defaultRest: number;
  notes: string;
};

const DEFAULT_PROFILE: StrengthProfile = {
  label: "General strength",
  repRange: [6, 10],
  intensityRange: [0.6, 0.78],
  fatigueDrop: 0.025,
  defaultRest: 90,
  notes: "Balanced loading for general compound lifts.",
};

const PROFILE_MATCHERS: Array<[RegExp, StrengthProfile]> = [
  [
    /squat|deadlift|leg press/i,
    {
      label: "Lower-body compound",
      repRange: [4, 8],
      intensityRange: [0.68, 0.86],
      fatigueDrop: 0.03,
      defaultRest: 150,
      notes: "Heavier loading with lower reps and longer rest works best here.",
    },
  ],
  [
    /bench|row|overhead press|press|dip/i,
    {
      label: "Upper-body compound",
      repRange: [5, 10],
      intensityRange: [0.62, 0.82],
      fatigueDrop: 0.028,
      defaultRest: 120,
      notes: "Moderate reps with steady loading suit pressing and rowing movements.",
    },
  ],
  [
    /curl|fly|raise|tricep|hamstring/i,
    {
      label: "Isolation lift",
      repRange: [8, 15],
      intensityRange: [0.45, 0.68],
      fatigueDrop: 0.02,
      defaultRest: 60,
      notes: "Isolation lifts usually respond better to more reps and slightly lighter weight.",
    },
  ],
  [
    /lunge|bulgarian/i,
    {
      label: "Unilateral lower body",
      repRange: [8, 12],
      intensityRange: [0.5, 0.72],
      fatigueDrop: 0.022,
      defaultRest: 90,
      notes: "Unilateral work tends to feel better with controlled reps and moderate loading.",
    },
  ],
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const normalizeDesiredSetCount = (value: string) => value.replace(/[^\d]/g, "");

const detectStrengthProfile = (exerciseName?: string): StrengthProfile => {
  const match = PROFILE_MATCHERS.find(([regex]) => regex.test(exerciseName || ""));
  return match?.[1] || DEFAULT_PROFILE;
};

const buildSetOffsets = (count: number) => {
  if (count <= 1) return [0];
  const start = -0.06;
  return Array.from({ length: count }, (_, index) =>
    start + (Math.abs(start) * index) / (count - 1)
  );
};

const buildGeneratedSets = ({
  oneRepMax,
  effort,
  desiredSetCount,
  profile,
}: {
  oneRepMax: number;
  effort: number;
  desiredSetCount: number;
  profile: StrengthProfile;
}) => {
  const normalizedEffort = clamp((effort - 45) / 45, 0, 1);
  const targetReps = Math.round(
    profile.repRange[1] -
      normalizedEffort * (profile.repRange[1] - profile.repRange[0])
  );
  const targetIntensity =
    profile.intensityRange[0] +
    normalizedEffort *
      (profile.intensityRange[1] - profile.intensityRange[0]);

  const offsets = buildSetOffsets(desiredSetCount);

  return offsets.map((offset, index) => {
    const intensity = clamp(
      targetIntensity + offset - profile.fatigueDrop * Math.max(0, index - 1) * 0.35,
      0.35,
      0.95
    );
    const workingWeight = roundToNearestFive(oneRepMax * intensity);

    return {
      name: `Working Set ${index + 1}`,
      reps: clamp(targetReps, profile.repRange[0], profile.repRange[1]),
      percentage: Number(intensity.toFixed(2)),
      weight: workingWeight,
      actualWeight: "",
      actualReps: "",
      complete: false,
    };
  });
};

const ExerciseEditItem: React.FC<ExerciseEditItemProps> = ({
  index,
  exercise,
  onSave,
  onCancel,
  darkMode,
  isValid,
}) => {
  const {
    setMyOneRepMax,
    mySets,
    setMySets,
    myRest,
    setMyRest,
    myHours,
    setMyHours,
    myMinutes,
    setMyMinutes,
    mySeconds,
    setMySeconds,
    myOneRepMax,
    setupMode,
    setSetupMode,
    effort,
    setEffort,
  } = useExerciseEditItemState(exercise);

  const profile = detectStrengthProfile(exercise.name);
  const [desiredSetCount, setDesiredSetCount] = useState(
    String(Math.max(exercise.sets?.length || 3, 1))
  );
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);

  const handleUpdateOneRepMax = (oneRepMax: string) => {
    const numericValue = parseFloat(oneRepMax);
    setMyOneRepMax(isNaN(numericValue) ? 0 : numericValue);
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

  const handleInputChange = (
    value: any,
    setValue: (v: any) => void,
    key?: "hours" | "minutes" | "seconds"
  ) => {
    const normalizedValue = String(value ?? "").trim();
    const parsedValue = Math.max(0, parseInt(normalizedValue, 10) || 0);
    setValue(parsedValue);

    if (key === "hours") {
      setMyHours(parsedValue);
    }
    if (key === "minutes") {
      setMyMinutes(parsedValue);
    }
    if (key === "seconds") {
      setMySeconds(parsedValue);
    }
  };

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
          hours: emptyOrNullToZero(exercise.hours),
          minutes: emptyOrNullToZero(exercise.minutes),
          seconds: emptyOrNullToZero(exercise.seconds) || 60,
          actualHours: "",
          actualMinutes: "",
          actualSeconds: "",
          complete: false,
        };
      }
      setMySets([defaultSet]);
      return;
    }

    const lastSet = sets[sets.length - 1];
    const newSetNumber = sets.length + 1;
    const newSet =
      exercise.type === "weight"
        ? {
            ...lastSet,
            weight: roundToNearestFive((lastSet.weight || 0) * 1.05),
            actualWeight: "",
            actualReps: "",
            complete: false,
            name: `Working Set ${newSetNumber}`,
          }
        : {
            ...lastSet,
            actualHours: "",
            actualMinutes: "",
            actualSeconds: "",
            complete: false,
            name: `Timed Set ${newSetNumber}`,
          };

    setMySets([...sets, newSet]);
  };

  const handleGenerateSets = () => {
    if (!myOneRepMax || myOneRepMax <= 0) {
      setGenerationMessage("Enter a realistic 1RM first so we can estimate working sets.");
      return;
    }

    const safeSetCount = clamp(Number(desiredSetCount) || 3, 1, 20);
    const generatedSets = buildGeneratedSets({
      oneRepMax: myOneRepMax,
      effort,
      desiredSetCount: safeSetCount,
      profile,
    });

    setMySets(generatedSets);
    setGenerationMessage(
      `Generated ${safeSetCount} ${profile.label.toLowerCase()} set${
        safeSetCount === 1 ? "" : "s"
      } based on ${effort}% effort.`
    );
  };

  const handleSetChange = (setIndex: number, nextSet: any) => {
    setMySets((prevSets) =>
      prevSets.map((set, index) => (index === setIndex ? nextSet : set))
    );
  };

  const handleSave = () => {
    const updatedExercise = {
      ...exercise,
      sets: mySets,
      rest:
        exercise.type === "weight"
          ? Number(myRest) || profile.defaultRest
          : exercise.rest,
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
        border: isValid ? "1px solid rgba(59,130,246,0.34)" : "1px solid #6c757d",
        m: 0,
        borderRadius: 4,
        boxShadow: "none",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        maxHeight: "calc(100vh - 120px)",
        ...(darkMode && {
          backgroundColor: "grey.900",
          color: "grey.100",
        }),
      }}
    >
      <CardHeader
        title={
          <Box>
            <Typography variant="overline" sx={{ color: "text.secondary" }}>
              Customize Exercise
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              {exercise.name}
            </Typography>
          </Box>
        }
        sx={{
          backgroundColor: isValid ? "rgba(59,130,246,0.06)" : "grey.200",
          ...(darkMode && {
            backgroundColor: isValid ? "rgba(59,130,246,0.12)" : "grey.700",
          }),
        }}
      />
      <CardContent
        sx={{
          p: 0,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          flex: 1,
        }}
      >
        <Box
          sx={{
            p: 2,
            overflowY: "auto",
            minHeight: 0,
            flex: 1,
            pb: 3,
          }}
        >
          <Stack spacing={2.5}>
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
          ) : (
            <>
              <Box>
                <Typography variant="body2" sx={{ mb: 1, color: "text.secondary" }}>
                  Set setup mode
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  value={setupMode}
                  onChange={(_, nextValue) => {
                    if (nextValue) setSetupMode(nextValue);
                  }}
                  fullWidth
                  color="primary"
                >
                  <ToggleButton value="guided">Guided</ToggleButton>
                  <ToggleButton value="manual">Manual</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {setupMode === "guided" ? (
                <Stack spacing={2}>
                  <Alert severity="info" sx={{ borderRadius: 3 }}>
                    <strong>{profile.label}:</strong> {profile.notes}
                  </Alert>

                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip label={`Suggested reps: ${profile.repRange[0]}-${profile.repRange[1]}`} />
                    <Chip label={`Rest: ~${profile.defaultRest}s`} variant="outlined" />
                  </Stack>

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      type="number"
                      fullWidth
                      label="Your estimated 1RM"
                      value={myOneRepMax || ""}
                      onChange={(e) => handleUpdateOneRepMax(e.target.value)}
                    />
                    <TextField
                      type="text"
                      fullWidth
                      label="Number of sets"
                      value={desiredSetCount}
                      onChange={(e) =>
                        setDesiredSetCount(
                          normalizeDesiredSetCount(e.target.value)
                        )
                      }
                      inputProps={{
                        inputMode: "numeric",
                        pattern: "[0-9]*",
                      }}
                      helperText="Pick any reasonable number of sets. We'll validate it when generating."
                    />
                  </Stack>

                  <TextField
                    type="number"
                    fullWidth
                    label="Rest between sets (seconds)"
                    value={myRest}
                    onChange={(e) =>
                      setMyRest(Math.max(0, Number(e.target.value) || 0))
                    }
                    inputProps={{ min: 0, step: 5 }}
                    helperText="This controls the rest timer between sets."
                  />

                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: "bold", mb: 0.75 }}>
                      Target effort: {effort}%
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
                      Lower effort gives you lighter weights and more reps. Higher effort pushes
                      you toward heavier, lower-rep work.
                    </Typography>
                    <Slider
                      value={effort}
                      onChange={(_, newValue) => setEffort(newValue as number)}
                      step={1}
                      min={50}
                      max={95}
                    />
                  </Box>

                  <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
                    <Button variant="contained" onClick={handleGenerateSets}>
                      Generate Working Sets
                    </Button>
                  </Box>

                  {generationMessage && (
                    <Alert severity="success" sx={{ borderRadius: 3 }}>
                      {generationMessage}
                    </Alert>
                  )}
                </Stack>
              ) : (
                <Alert severity="info" sx={{ borderRadius: 3 }}>
                  Manual mode is best when you already know the exact sets and weights you want.
                </Alert>
              )}
            </>
          )}

          {exercise.type === "weight" && setupMode !== "guided" ? (
            <TextField
              type="number"
              fullWidth
              label="Rest between sets (seconds)"
              value={myRest}
              onChange={(e) =>
                setMyRest(Math.max(0, Number(e.target.value) || 0))
              }
              inputProps={{ min: 0, step: 5 }}
              helperText="This controls the rest timer between sets."
            />
          ) : null}

          <Divider />

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <Box>
              <Typography variant="h5">Sets</Typography>
              <Typography sx={{ mt: 0.35, color: "text.secondary" }}>
                Review each set below. Drag to reorder, rename if needed, and
                edit the target values directly.
              </Typography>
            </Box>
            <Button variant="outlined" onClick={handleAddSet}>
              Add Set
            </Button>
          </Box>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="sets">
              {(provided) => (
                <Box ref={provided.innerRef} {...provided.droppableProps} sx={{ mb: 1 }}>
                  {mySets.map((set, setIndex) =>
                    exercise.type === "timed" ? (
                      <SetEditTimerItem
                        key={`set-edit-timer-${set.name}-${setIndex}`}
                        set={set}
                        index={setIndex}
                        darkMode={darkMode}
                        onChangeSet={(nextSet) => handleSetChange(setIndex, nextSet)}
                        handleDeleteSet={(setToRemove) =>
                          setMySets(mySets.filter((s) => s.name !== setToRemove.name))
                        }
                      />
                    ) : (
                      <SetEditWeightItem
                        key={`set-edit-weight-${set.name}-${setIndex}`}
                        set={set}
                        index={setIndex}
                        isManualEdit={true}
                        darkMode={darkMode}
                        onChangeSet={(nextSet) => handleSetChange(setIndex, nextSet)}
                        handleDeleteSet={(setToRemove) =>
                          setMySets(mySets.filter((s) => s.name !== setToRemove.name))
                        }
                      />
                    )
                  )}
                  {provided.placeholder}
                </Box>
              )}
            </Droppable>
          </DragDropContext>

          <Box sx={{ display: "flex", justifyContent: "center", gap: 2, flexWrap: "wrap" }}>
          </Box>
          </Stack>
        </Box>
        <Paper
          elevation={0}
          sx={{
            position: "sticky",
            bottom: 0,
            zIndex: 2,
            px: 2,
            py: 1.5,
            borderTop: "1px solid",
            borderColor: "divider",
            backgroundColor: darkMode
              ? "rgba(17,24,39,0.96)"
              : "rgba(255,255,255,0.96)",
            backdropFilter: "blur(12px)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: { xs: "stretch", sm: "center" },
              flexDirection: { xs: "column", sm: "row" },
              gap: 1.25,
            }}
          >
            <Typography sx={{ color: "text.secondary" }}>
              {exercise.type === "weight"
                ? `Rest timer: ${Number(myRest) || 0}s`
                : "Review your sets, then save."}
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<FaTimes />}
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<FaSave />}
                onClick={handleSave}
              >
                Save Exercise
              </Button>
            </Box>
          </Box>
        </Paper>
      </CardContent>
    </Card>
  );
};

const useExerciseEditItemState = (exercise: any) => {
  const [mySets, setMySets] = useState<any[]>(exercise.sets);
  const [myOneRepMax, setMyOneRepMax] = useState(
    emptyOrNullToZero(exercise.oneRepMax || exercise.max)
  );
  const [myRest, setMyRest] = useState(
    emptyOrNullToZero(exercise.rest) ||
      detectStrengthProfile(exercise.name).defaultRest
  );
  const [myHours, setMyHours] = useState(emptyOrNullToZero(exercise.hours));
  const [myMinutes, setMyMinutes] = useState(
    emptyOrNullToZero(exercise.minutes)
  );
  const [mySeconds, setMySeconds] = useState(
    emptyOrNullToZero(exercise.seconds)
  );
  const [setupMode, setSetupMode] = useState<"guided" | "manual">("guided");
  const [effort, setEffort] = useState(70);

  return {
    setMyOneRepMax,
    mySets,
    setMySets,
    myRest,
    setMyRest,
    myHours,
    setMyHours,
    myMinutes,
    setMyMinutes,
    mySeconds,
    setMySeconds,
    myOneRepMax,
    setupMode,
    setSetupMode,
    effort,
    setEffort,
  };
};

export default ExerciseEditItem;
