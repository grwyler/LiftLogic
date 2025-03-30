import React, { useState, useEffect } from "react";
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
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import AddIcon from "@mui/icons-material/Add";
import { initialExercises } from "../utils/sample-data";

interface ExerciseSelectorProps {
  setIsAddingExercise: (value: boolean) => void;
  addExerciseToWorkout: (exercise: any) => void;
  darkMode: boolean;
  isPersistent: boolean;
  currentWorkoutTitle: string;
}

const ExerciseSelector: React.FC<ExerciseSelectorProps> = ({
  setIsAddingExercise,
  addExerciseToWorkout,
  darkMode,
  isPersistent,
  currentWorkoutTitle,
}) => {
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [targets, setTargets] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    bodyPart: "",
    equipment: "",
    target: "",
  });

  // Fetch dropdown lists (body parts, equipment, target muscles)
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
        console.warn(
          "API rate limit reached. Using static fallback lists.",
          err
        );
        setError("API request limit reached. Using static lists.");
        setBodyParts(["chest", "back", "legs", "shoulders", "arms"]);
        setEquipment(["barbell", "dumbbell", "machine", "bodyweight"]);
        setTargets(["upper chest", "lats", "hamstrings", "quads", "biceps"]);
      }
    };

    fetchLists();
  }, []);

  // Fetch exercises dynamically from API
  useEffect(() => {
    const fetchExercises = async () => {
      setLoading(true);
      setError(null);

      let apiUrl = "/api/exercises?type=all";

      if (filters.bodyPart)
        apiUrl = `/api/exercises?type=bodyPart&param=${filters.bodyPart}`;
      if (filters.equipment)
        apiUrl = `/api/exercises?type=equipment&param=${filters.equipment}`;
      if (filters.target)
        apiUrl = `/api/exercises?type=target&param=${filters.target}`;
      if (searchQuery)
        apiUrl = `/api/exercises?type=name&param=${searchQuery.toLowerCase()}`;

      try {
        const response = await axios.get(apiUrl);
        setExercises(response.data);
      } catch (err) {
        setError("API is down, using a static list of exercises");
        setExercises(initialExercises);
      } finally {
        setLoading(false);
      }
    };

    fetchExercises();
  }, [filters, searchQuery]);

  // When API is down, filter the static list locally
  const displayedExercises = error
    ? initialExercises.filter((exercise) =>
        exercise.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : exercises;

  // Simplified add exercise handler – delegate to parent's handler
  const handleAddExercise = (exercise: any) => {
    addExerciseToWorkout({
      ...exercise,
      routineName: currentWorkoutTitle,
      isPersistent,
    });
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Back Button */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Button
          onClick={() => setIsAddingExercise(false)}
          variant={darkMode ? "contained" : "outlined"}
          startIcon={<ChevronLeftIcon />}
          sx={darkMode ? { bgcolor: "grey.800", color: "white" } : {}}
        >
          Back
        </Button>
      </Box>

      <Typography variant="h5" align="center" gutterBottom>
        Select an Exercise
      </Typography>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search exercises..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </Box>

      {!error && (
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3 }}>
          <FormControl fullWidth>
            <InputLabel>Filter by Body Part</InputLabel>
            <Select
              label="Filter by Body Part"
              value={filters.bodyPart}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, bodyPart: e.target.value }))
              }
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {bodyParts.map((part) => (
                <MenuItem key={part} value={part}>
                  {part}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Filter by Equipment</InputLabel>
            <Select
              label="Filter by Equipment"
              value={filters.equipment}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, equipment: e.target.value }))
              }
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {equipment.map((eq) => (
                <MenuItem key={eq} value={eq}>
                  {eq}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Filter by Target Muscle</InputLabel>
            <Select
              label="Filter by Target Muscle"
              value={filters.target}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, target: e.target.value }))
              }
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {targets.map((target) => (
                <MenuItem key={target} value={target}>
                  {target}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {loading ? (
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          {error && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 2,
              justifyContent: "center",
            }}
          >
            {displayedExercises.map((exercise) => (
              <Box
                key={exercise.id}
                sx={{ flex: "1 1 300px", maxWidth: "350px" }}
              >
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: 3,
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" component="div">
                      {exercise.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Body Part:</strong> {exercise.bodyPart}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Equipment:</strong> {exercise.equipment}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Target:</strong> {exercise.target}
                    </Typography>
                  </CardContent>
                  <Box sx={{ p: 2 }}>
                    <Button
                      variant="outlined"
                      fullWidth
                      color="success"
                      startIcon={<AddIcon />}
                      onClick={() => handleAddExercise(exercise)}
                    >
                      Add Exercise to Routine
                    </Button>
                  </Box>
                </Card>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ExerciseSelector;
