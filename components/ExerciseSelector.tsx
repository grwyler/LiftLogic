import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Card,
  CardContent,
  Typography,
  Alert,
  Chip,
  Stack,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import AddIcon from "@mui/icons-material/Add";
import TuneIcon from "@mui/icons-material/Tune";
import EditNoteIcon from "@mui/icons-material/EditNote";
import SearchIcon from "@mui/icons-material/Search";
import RepeatIcon from "@mui/icons-material/Repeat";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import { initialExercises } from "../utils/sample-data";

interface ExerciseSelectorProps {
  setIsAddingExercise: (value: boolean) => void;
  addExerciseToWorkout: (exercise: any) => void;
  quickAddExerciseToWorkout: (exercise: any) => Promise<void>;
  darkMode: boolean;
  isRecurring: boolean;
  setIsRecurring: (value: boolean) => void;
  currentWorkoutTitle: string;
}

const quickGroups = [
  { label: "Push", bodyPart: "chest" },
  { label: "Pull", bodyPart: "back" },
  { label: "Legs", bodyPart: "upper legs" },
  { label: "Shoulders", bodyPart: "shoulders" },
  { label: "Core", bodyPart: "waist" },
];

const ExerciseSelector: React.FC<ExerciseSelectorProps> = ({
  setIsAddingExercise,
  addExerciseToWorkout,
  quickAddExerciseToWorkout,
  darkMode,
  isRecurring,
  setIsRecurring,
  currentWorkoutTitle,
}) => {
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [targets, setTargets] = useState<string[]>([]);
  const [busyExerciseId, setBusyExerciseId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    bodyPart: "",
    equipment: "",
    target: "",
  });

  useEffect(() => {
    const fetchLists = async () => {
      try {
        const [bodyPartsRes, equipmentRes, targetsRes] = await Promise.all([
          axios.get("/api/exercises?type=bodyPartList"),
          axios.get("/api/exercises?type=equipmentList"),
          axios.get("/api/exercises?type=targetList"),
        ]);
        setBodyParts(bodyPartsRes.data);
        setEquipment(equipmentRes.data);
        setTargets(targetsRes.data);
      } catch (err) {
        console.warn("API rate limit reached. Using static fallback lists.", err);
        setError("Live exercise lists are unavailable right now. Showing fallback options.");
        setBodyParts(["chest", "back", "legs", "shoulders", "arms", "core"]);
        setEquipment(["barbell", "dumbbell", "machine", "bodyweight"]);
        setTargets(["upper chest", "lats", "hamstrings", "quads", "biceps"]);
      }
    };

    fetchLists();
  }, []);

  useEffect(() => {
    const fetchExercises = async () => {
      setLoading(true);
      if (!error?.includes("fallback")) {
        setError(null);
      }

      let apiUrl = "/api/exercises?type=all";

      if (filters.bodyPart) {
        apiUrl = `/api/exercises?type=bodyPart&param=${filters.bodyPart}`;
      }
      if (filters.equipment) {
        apiUrl = `/api/exercises?type=equipment&param=${filters.equipment}`;
      }
      if (filters.target) {
        apiUrl = `/api/exercises?type=target&param=${filters.target}`;
      }
      if (searchQuery) {
        apiUrl = `/api/exercises?type=name&param=${searchQuery.toLowerCase()}`;
      }

      try {
        const response = await axios.get(apiUrl);
        setExercises(response.data);
      } catch (err) {
        setError("Exercise search is offline, so we're using a smaller local list.");
        setExercises(initialExercises);
      } finally {
        setLoading(false);
      }
    };

    fetchExercises();
  }, [filters, searchQuery]);

  const displayedExercises = useMemo(() => {
    const source = error ? initialExercises : exercises;
    return source.filter((exercise) =>
      exercise.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [error, exercises, searchQuery]);

  const handleAddExercise = (exercise: any) => {
    addExerciseToWorkout({
      ...exercise,
      routineName: currentWorkoutTitle,
      isRecurring,
    });
  };

  const handleQuickAdd = async (exercise: any) => {
    const busyId = String(exercise.id ?? exercise._id ?? exercise.name);
    setBusyExerciseId(busyId);
    try {
      await quickAddExerciseToWorkout({
        ...exercise,
        routineName: currentWorkoutTitle,
        isRecurring,
      });
    } finally {
      setBusyExerciseId(null);
    }
  };

  const clearFilters = () => {
    setFilters({ bodyPart: "", equipment: "", target: "" });
    setSearchQuery("");
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Stack spacing={2.5}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            gap: 1.5,
            flexDirection: { xs: "column", sm: "row" },
          }}
        >
          <Box>
            <Typography
              variant="overline"
              sx={{ color: "text.secondary", letterSpacing: "0.14em" }}
            >
              Add Exercise
            </Typography>
            <Typography variant="h5">Add an exercise</Typography>
            <Typography sx={{ mt: 0.75, color: "text.secondary" }}>
              Adding to <strong>{currentWorkoutTitle}</strong>. Quick add uses a
              sensible default set. Customize lets you edit before saving,
              including whether it should repeat weekly.
            </Typography>
          </Box>

          <Button
            onClick={() => setIsAddingExercise(false)}
            variant="outlined"
            startIcon={<ChevronLeftIcon />}
          >
            Back
          </Button>
        </Box>

        <Card
          sx={{
            borderRadius: 4,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: darkMode
              ? "rgba(255,255,255,0.03)"
              : "rgba(255,255,255,0.62)",
            boxShadow: "none",
          }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Stack spacing={2}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.25}
                alignItems={{ xs: "stretch", sm: "center" }}
              >
                <TextField
                  fullWidth
                  placeholder="Search exercises by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                  }}
                />
                <Button variant="outlined" onClick={clearFilters}>
                  Clear
                </Button>
              </Stack>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {quickGroups.map((group) => (
                  <Chip
                    key={group.label}
                    label={group.label}
                    clickable
                    color={filters.bodyPart === group.bodyPart ? "primary" : "default"}
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        bodyPart:
                          prev.bodyPart === group.bodyPart ? "" : group.bodyPart,
                      }))
                    }
                  />
                ))}
                <Chip
                  icon={<RepeatIcon />}
                  label={isRecurring ? "Repeats weekly" : "Only this workout"}
                  variant="outlined"
                />
              </Stack>

              <Box>
                <Typography
                  variant="body2"
                  sx={{ mb: 1, color: "text.secondary", fontWeight: 600 }}
                >
                  When should this exercise appear?
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  value={isRecurring ? "recurring" : "today"}
                  onChange={(_, nextValue) => {
                    if (nextValue) {
                      setIsRecurring(nextValue === "recurring");
                    }
                  }}
                  color="primary"
                >
                  <ToggleButton value="today">Just this workout</ToggleButton>
                  <ToggleButton value="recurring">Repeat weekly</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {!error && (
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                  <FormControl fullWidth>
                    <InputLabel>Body Part</InputLabel>
                    <Select
                      label="Body Part"
                      value={filters.bodyPart}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, bodyPart: e.target.value }))
                      }
                    >
                      <MenuItem value="">All</MenuItem>
                      {bodyParts.map((part) => (
                        <MenuItem key={part} value={part}>
                          {part}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>Equipment</InputLabel>
                    <Select
                      label="Equipment"
                      value={filters.equipment}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, equipment: e.target.value }))
                      }
                    >
                      <MenuItem value="">All</MenuItem>
                      {equipment.map((eq) => (
                        <MenuItem key={eq} value={eq}>
                          {eq}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>Target</InputLabel>
                    <Select
                      label="Target"
                      value={filters.target}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, target: e.target.value }))
                      }
                    >
                      <MenuItem value="">All</MenuItem>
                      {targets.map((target) => (
                        <MenuItem key={target} value={target}>
                          {target}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>

        {error && (
          <Alert severity="warning" sx={{ borderRadius: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              py: 6,
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {displayedExercises.map((exercise) => {
              const busyId = String(exercise.id ?? exercise._id ?? exercise.name);
              const isBusy = busyExerciseId === busyId;

              return (
                <Card
                  key={busyId}
                  sx={{
                    borderRadius: 4,
                    border: "1px solid",
                    borderColor: "divider",
                    backgroundColor: darkMode
                      ? "rgba(255,255,255,0.03)"
                      : "rgba(255,255,255,0.78)",
                    boxShadow: "none",
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, sm: 2.25 } }}>
                    <Stack spacing={1.5}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 1,
                        }}
                      >
                        <Box>
                          <Typography variant="h6">
                            {exercise.name}
                          </Typography>
                          <Typography sx={{ mt: 0.5, color: "text.secondary" }}>
                            {[exercise.bodyPart, exercise.target, exercise.equipment]
                              .filter(Boolean)
                              .join(" · ")}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={exercise.type === "timed" ? "Timed" : "Weight"}
                          variant="outlined"
                        />
                      </Box>

                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                      >
                        <Button
                          fullWidth
                          variant="contained"
                          startIcon={
                            isBusy ? <CircularProgress size={16} color="inherit" /> : <FlashOnIcon />
                          }
                          onClick={() => handleQuickAdd(exercise)}
                          disabled={isBusy}
                        >
                          {isBusy ? "Adding..." : "Quick Add"}
                        </Button>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<EditNoteIcon />}
                          onClick={() => handleAddExercise(exercise)}
                        >
                          Customize
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}

        {!loading && displayedExercises.length === 0 && (
          <Alert severity="info" sx={{ borderRadius: 3 }}>
            No exercises matched your search yet.
          </Alert>
        )}
      </Stack>
    </Box>
  );
};

export default ExerciseSelector;
