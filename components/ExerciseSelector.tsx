import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import EditNoteIcon from "@mui/icons-material/EditNote";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import RepeatIcon from "@mui/icons-material/Repeat";
import SearchIcon from "@mui/icons-material/Search";
import { initialExercises } from "../utils/sample-data";

interface ExerciseSelectorProps {
  setIsAddingExercise: (value: boolean) => void;
  addExerciseToWorkout: (exercise: any) => void;
  quickAddExerciseToWorkout: (exercise: any) => Promise<void>;
  darkMode: boolean;
  isRecurring: boolean;
  setIsRecurring: (value: boolean) => void;
  currentWorkoutTitle: string;
  userId: string;
}

type CatalogExercise = {
  _id?: string;
  id?: string;
  name: string;
  type?: "weight" | "timed" | string;
  bodyPart?: string;
  equipment?: string[] | string;
  target?: string;
  category?: string;
  muscleGroup?: string;
  videoUrl?: string;
  description?: string;
  createdBy?: string | null;
  aliases?: string[];
};

const quickGroups = [
  { label: "Push", value: "push" },
  { label: "Pull", value: "pull" },
  { label: "Legs", value: "legs" },
  { label: "Shoulders", value: "shoulders" },
  { label: "Core", value: "core" },
  { label: "Conditioning", value: "conditioning" },
];

const featuredSearches = [
  "Bench",
  "Squat",
  "Deadlift",
  "Pull-Up",
  "RDL",
  "Cycling",
];

const normalizeText = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const toTitle = (value: string) =>
  value.replace(/\b\w/g, (character) => character.toUpperCase());

const normalizeEquipment = (equipment: unknown) => {
  if (Array.isArray(equipment)) {
    return equipment.filter(Boolean).map(String);
  }

  if (typeof equipment === "string" && equipment.trim()) {
    return [equipment.trim()];
  }

  return [];
};

const inferMetadata = (exercise: CatalogExercise) => {
  const name = normalizeText(exercise.name);
  const equipment = normalizeEquipment(exercise.equipment).join(" ").toLowerCase();

  const bodyPart =
    normalizeText(exercise.bodyPart) ||
    normalizeText(exercise.muscleGroup) ||
    normalizeText(exercise.category);

  const target =
    normalizeText(exercise.target) || normalizeText(exercise.muscleGroup);

  if (bodyPart) {
    return { bodyPart, target: target || bodyPart };
  }

  if (/bench|press|dip|tricep|fly|push-up/.test(name)) {
    return {
      bodyPart: "push",
      target: /shoulder|overhead/.test(name) ? "shoulders" : "chest",
    };
  }

  if (/row|pull|pulldown|chin-up|lat|curl/.test(name)) {
    return {
      bodyPart: "pull",
      target: /curl/.test(name) ? "biceps" : "back",
    };
  }

  if (/squat|deadlift|leg|lunge|calf|hamstring|quad|bulgarian/.test(name)) {
    return {
      bodyPart: "legs",
      target: /calf/.test(name) ? "calves" : "legs",
    };
  }

  if (/shoulder|overhead press|lateral raise|rear delt/.test(name)) {
    return { bodyPart: "shoulders", target: "shoulders" };
  }

  if (/plank|core|ab|crunch|twist|carry/.test(name)) {
    return { bodyPart: "core", target: "core" };
  }

  if (/run|cycle|bike|rope|cardio|rowing|elliptical|stairs/.test(name)) {
    return { bodyPart: "conditioning", target: "conditioning" };
  }

  if (/stretch|mobility|yoga/.test(name)) {
    return { bodyPart: "mobility", target: "mobility" };
  }

  if (/bodyweight/.test(equipment)) {
    return { bodyPart: "bodyweight", target: "bodyweight" };
  }

  return { bodyPart: "general", target: "general" };
};

const normalizeCatalogExercise = (exercise: CatalogExercise): CatalogExercise => {
  const metadata = inferMetadata(exercise);
  return {
    ...exercise,
    type: exercise.type === "timed" ? "timed" : "weight",
    bodyPart: metadata.bodyPart,
    target: metadata.target,
    equipment: normalizeEquipment(exercise.equipment),
    aliases: Array.isArray(exercise.aliases) ? exercise.aliases : [],
  };
};

const buildSearchHaystack = (exercise: CatalogExercise) =>
  [
    exercise.name,
    exercise.target,
    exercise.bodyPart,
    exercise.description,
    ...(exercise.aliases ?? []),
    ...normalizeEquipment(exercise.equipment),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const mergeCatalogExercises = (catalog: CatalogExercise[]) => {
  const byName = new Map<string, CatalogExercise>();

  [...catalog, ...initialExercises]
    .map((exercise) => normalizeCatalogExercise(exercise))
    .forEach((exercise) => {
      const key = normalizeText(exercise.name);
      if (!key) {
        return;
      }

      const existing = byName.get(key);
      byName.set(key, {
        ...existing,
        ...exercise,
        equipment: Array.from(
          new Set([
            ...normalizeEquipment(existing?.equipment),
            ...normalizeEquipment(exercise.equipment),
          ])
        ),
        aliases: Array.from(
          new Set([...(existing?.aliases ?? []), ...(exercise.aliases ?? [])])
        ),
      });
    });

  return Array.from(byName.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
};

const ExerciseSelector: React.FC<ExerciseSelectorProps> = ({
  setIsAddingExercise,
  addExerciseToWorkout,
  quickAddExerciseToWorkout,
  darkMode,
  isRecurring,
  setIsRecurring,
  currentWorkoutTitle,
  userId,
}) => {
  const [catalogExercises, setCatalogExercises] = useState<CatalogExercise[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [busyExerciseId, setBusyExerciseId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    bodyPart: "",
    type: "",
    equipment: "",
  });

  useEffect(() => {
    let isMounted = true;

    const fetchCatalog = async () => {
      try {
        setLoading(true);
        setError(null);
        const qs = new URLSearchParams();
        if (userId) {
          qs.set("createdBy", userId);
        }

        const response = await fetch(`/api/exercise?${qs.toString()}`);
        if (!response.ok) {
          throw new Error(`Exercise catalog request failed: ${response.status}`);
        }

        const data = await response.json();
        if (!isMounted) {
          return;
        }

        setCatalogExercises(
          mergeCatalogExercises(Array.isArray(data.exercises) ? data.exercises : [])
        );
      } catch (fetchError) {
        console.error("Failed to load local exercise catalog:", fetchError);
        if (!isMounted) {
          return;
        }

        setError("Using the built-in exercise catalog right now.");
        setCatalogExercises(mergeCatalogExercises([]));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchCatalog();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const filterOptions = useMemo(() => {
    const bodyParts = Array.from(
      new Set(catalogExercises.map((exercise) => exercise.bodyPart).filter(Boolean))
    ) as string[];
    const equipment = Array.from(
      new Set(
        catalogExercises.flatMap((exercise) => normalizeEquipment(exercise.equipment))
      )
    );

    return {
      bodyParts: bodyParts.sort(),
      equipment: equipment.sort(),
    };
  }, [catalogExercises]);

  const displayedExercises = useMemo(() => {
    const query = normalizeText(searchQuery);
    const tokens = query.split(/\s+/).filter(Boolean);

    return catalogExercises
      .map((exercise) => {
        const haystack = buildSearchHaystack(exercise);
        const normalizedName = normalizeText(exercise.name);
        const aliasMatch = (exercise.aliases ?? []).some((alias) =>
          normalizeText(alias).includes(query)
        );

        const matchesQuery =
          !query || tokens.every((token) => haystack.includes(token));

        const matchesBodyPart =
          !filters.bodyPart || normalizeText(exercise.bodyPart) === filters.bodyPart;

        const matchesType = !filters.type || exercise.type === filters.type;

        const matchesEquipment =
          !filters.equipment ||
          normalizeEquipment(exercise.equipment)
            .map(normalizeText)
            .includes(filters.equipment);

        if (!matchesQuery || !matchesBodyPart || !matchesType || !matchesEquipment) {
          return null;
        }

        let score = 0;
        if (query) {
          if (normalizedName === query) score += 6;
          if (normalizedName.startsWith(query)) score += 4;
          if (aliasMatch) score += 3;
          if (haystack.includes(query)) score += 1;
        }

        return { exercise, score };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if ((b?.score ?? 0) !== (a?.score ?? 0)) {
          return (b?.score ?? 0) - (a?.score ?? 0);
        }

        return a!.exercise.name.localeCompare(b!.exercise.name);
      })
      .map((entry) => entry!.exercise);
  }, [catalogExercises, filters, searchQuery]);

  const handleAddExercise = (exercise: CatalogExercise) => {
    addExerciseToWorkout({
      ...exercise,
      routineName: currentWorkoutTitle,
      isRecurring,
    });
  };

  const handleQuickAdd = async (exercise: CatalogExercise) => {
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
    setFilters({ bodyPart: "", type: "", equipment: "" });
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
            <Typography variant="h5">Choose an exercise</Typography>
            <Typography sx={{ mt: 0.75, color: "text.secondary" }}>
              Search a much bigger built-in catalog with common names and shortcuts,
              then quick add or customize it.
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
                  placeholder="Search bench, pull-up, RDL, hamstrings, conditioning..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
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
                {featuredSearches.map((term) => (
                  <Chip
                    key={term}
                    label={term}
                    clickable
                    variant="outlined"
                    onClick={() => setSearchQuery(term)}
                  />
                ))}
              </Stack>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {quickGroups.map((group) => (
                  <Chip
                    key={group.label}
                    label={group.label}
                    clickable
                    color={filters.bodyPart === group.value ? "primary" : "default"}
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        bodyPart: prev.bodyPart === group.value ? "" : group.value,
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

              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                <TextField
                  select
                  fullWidth
                  label="Focus"
                  value={filters.bodyPart}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      bodyPart: event.target.value,
                    }))
                  }
                >
                  <MenuItem value="">All</MenuItem>
                  {filterOptions.bodyParts.map((part) => (
                    <MenuItem key={part} value={part}>
                      {toTitle(part)}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  fullWidth
                  label="Type"
                  value={filters.type}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, type: event.target.value }))
                  }
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="weight">Weight</MenuItem>
                  <MenuItem value="timed">Timed</MenuItem>
                </TextField>

                <TextField
                  select
                  fullWidth
                  label="Equipment"
                  value={filters.equipment}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      equipment: event.target.value,
                    }))
                  }
                >
                  <MenuItem value="">All</MenuItem>
                  {filterOptions.equipment.map((item) => (
                    <MenuItem key={item} value={normalizeText(item)}>
                      {item}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {error && (
          <Alert severity="info" sx={{ borderRadius: 3 }}>
            {error}
          </Alert>
        )}

        {!loading && (
          <Typography sx={{ color: "text.secondary" }}>
            {displayedExercises.length} exercise
            {displayedExercises.length === 1 ? "" : "s"} available
          </Typography>
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
              const equipmentLabel = normalizeEquipment(exercise.equipment).join(" · ");

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
                          <Typography variant="h6">{exercise.name}</Typography>
                          <Typography sx={{ mt: 0.5, color: "text.secondary" }}>
                            {[exercise.target, exercise.bodyPart, equipmentLabel]
                              .filter(Boolean)
                              .map((item) => toTitle(String(item)))
                              .join(" · ")}
                          </Typography>
                          {exercise.aliases && exercise.aliases.length > 0 ? (
                            <Typography sx={{ mt: 0.5, color: "text.secondary" }}>
                              Also matches: {exercise.aliases.slice(0, 3).join(", ")}
                            </Typography>
                          ) : null}
                        </Box>
                        <Chip
                          size="small"
                          label={exercise.type === "timed" ? "Timed" : "Weight"}
                          variant="outlined"
                        />
                      </Box>

                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                        <Button
                          fullWidth
                          variant="contained"
                          startIcon={
                            isBusy ? (
                              <CircularProgress size={16} color="inherit" />
                            ) : (
                              <FlashOnIcon />
                            )
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
