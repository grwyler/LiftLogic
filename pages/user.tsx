"use client";

import { Session } from "next-auth";
import { useSession } from "next-auth/react";
import React, { useEffect, useMemo, useState } from "react";
import { fetchUser, saveUser } from "../utils/helpers";
import LoadingIndicator from "../components/LoadingIndicator";
import { useRouter } from "next/router";
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormControlLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import TuneIcon from "@mui/icons-material/Tune";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import { toast } from "react-toastify";

interface UserPageProps {
  darkMode: boolean;
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
}

type UserProfile = {
  _id: string;
  username: string;
  darkMode?: boolean;
  preferredUnits?: "lb" | "kg";
  height?: string;
  weight?: string;
  trainingGoal?: string;
  workoutDaysPerWeek?: string;
  notes?: string;
};

const defaultForm = {
  darkMode: false,
  preferredUnits: "lb",
  height: "",
  weight: "",
  trainingGoal: "",
  workoutDaysPerWeek: "",
  notes: "",
};

const UserHomePage: React.FC<UserPageProps> = ({ darkMode, setDarkMode }) => {
  const { data: session } = useSession() as {
    data: (Session & { token: { user: { _id: string } } }) | null;
  };
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (!session?.token?.user?._id) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const userData = await fetchUser(session.token.user._id);
        setUser(userData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session]);

  useEffect(() => {
    if (!user) return;

    const nextForm = {
      darkMode: Boolean(user.darkMode),
      preferredUnits: user.preferredUnits || "lb",
      height: user.height || "",
      weight: user.weight || "",
      trainingGoal: user.trainingGoal || "",
      workoutDaysPerWeek: user.workoutDaysPerWeek || "",
      notes: user.notes || "",
    };

    setForm(nextForm);
    setDarkMode(nextForm.darkMode);
  }, [user, setDarkMode]);

  const hasChanges = useMemo(() => {
    if (!user) return false;

    return (
      Boolean(user.darkMode) !== form.darkMode ||
      (user.preferredUnits || "lb") !== form.preferredUnits ||
      (user.height || "") !== form.height ||
      (user.weight || "") !== form.weight ||
      (user.trainingGoal || "") !== form.trainingGoal ||
      (user.workoutDaysPerWeek || "") !== form.workoutDaysPerWeek ||
      (user.notes || "") !== form.notes
    );
  }, [form, user]);

  const handleFieldChange =
    (field: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleSelectChange =
    (field: keyof typeof form) => (event: any) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleDarkModeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const checked = event.target.checked;
    setForm((prev) => ({ ...prev, darkMode: checked }));
    setDarkMode(checked);
  };

  const handleReset = () => {
    if (!user) return;

    setForm({
      darkMode: Boolean(user.darkMode),
      preferredUnits: user.preferredUnits || "lb",
      height: user.height || "",
      weight: user.weight || "",
      trainingGoal: user.trainingGoal || "",
      workoutDaysPerWeek: user.workoutDaysPerWeek || "",
      notes: user.notes || "",
    });
    setDarkMode(Boolean(user.darkMode));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    const nextUser = {
      ...user,
      darkMode: form.darkMode,
      preferredUnits: form.preferredUnits as "lb" | "kg",
      height: form.height,
      weight: form.weight,
      trainingGoal: form.trainingGoal,
      workoutDaysPerWeek: form.workoutDaysPerWeek,
      notes: form.notes,
    };

    try {
      const response = await saveUser(nextUser);
      if (response?.success) {
        setUser(nextUser);
        toast.success("Profile updated");
      } else {
        toast.error("Failed to update profile");
      }
    } catch (error) {
      console.error("Error saving user:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingIndicator />;
  }

  if (!user) {
    return (
      <Box sx={{ maxWidth: 720, mx: "auto", px: 2, py: 4 }}>
        <Alert severity="error">We couldn&apos;t load your profile.</Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        px: { xs: 1.5, sm: 2.5 },
        py: { xs: 2, sm: 3 },
      }}
    >
      <Box
        sx={{
          maxWidth: 760,
          mx: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
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
              Profile
            </Typography>
            <Typography variant="h4">Account settings</Typography>
            <Typography sx={{ mt: 1, color: "text.secondary" }}>
              Keep this focused on the settings that genuinely improve your
              training flow.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push("/routines")}
          >
            Back to Workouts
          </Button>
        </Box>

        <Alert severity="info" sx={{ borderRadius: 2.5 }}>
          Keep this light: units, goal, weekly target, and any notes that
          should influence your recommendations.
        </Alert>

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 2.5 },
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: "background.paper",
              }}
            >
              <Stack spacing={2}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <PersonOutlineIcon color="primary" />
                  <Typography variant="h6">Account</Typography>
                </Box>

                <TextField
                  label="Username"
                  value={user.username || ""}
                  fullWidth
                  InputProps={{ readOnly: true }}
                  helperText="Usernames are read-only for now."
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={form.darkMode}
                      onChange={handleDarkModeChange}
                    />
                  }
                  label="Use dark mode"
                />

                <FormControl fullWidth>
                  <Typography
                    variant="body2"
                    sx={{ mb: 1, color: "text.secondary", fontWeight: 600 }}
                  >
                    Preferred units
                  </Typography>
                  <Select
                    value={form.preferredUnits}
                    onChange={handleSelectChange("preferredUnits")}
                  >
                    <MenuItem value="lb">Pounds / inches</MenuItem>
                    <MenuItem value="kg">Kilograms / centimeters</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 2.5 },
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: "background.paper",
              }}
            >
              <Stack spacing={2}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <TuneIcon color="primary" />
                  <Typography variant="h6">Training preferences</Typography>
                </Box>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label={
                      form.preferredUnits === "kg"
                        ? "Height (cm)"
                        : "Height (in)"
                    }
                    value={form.height}
                    onChange={handleFieldChange("height")}
                    fullWidth
                    type="number"
                  />

                  <TextField
                    label={
                      form.preferredUnits === "kg"
                        ? "Body weight (kg)"
                        : "Body weight (lb)"
                    }
                    value={form.weight}
                    onChange={handleFieldChange("weight")}
                    fullWidth
                    type="number"
                  />
                </Stack>

                <FormControl fullWidth>
                  <Typography
                    variant="body2"
                    sx={{ mb: 1, color: "text.secondary", fontWeight: 600 }}
                  >
                    Primary goal
                  </Typography>
                  <Select
                    value={form.trainingGoal}
                    onChange={handleSelectChange("trainingGoal")}
                    displayEmpty
                  >
                    <MenuItem value="">No specific goal</MenuItem>
                    <MenuItem value="strength">Build strength</MenuItem>
                    <MenuItem value="muscle">Build muscle</MenuItem>
                    <MenuItem value="fat_loss">Lose fat</MenuItem>
                    <MenuItem value="consistency">Stay consistent</MenuItem>
                    <MenuItem value="conditioning">Improve conditioning</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Target workouts per week"
                  value={form.workoutDaysPerWeek}
                  onChange={handleFieldChange("workoutDaysPerWeek")}
                  type="number"
                  inputProps={{ min: 0, max: 14 }}
                  fullWidth
                  helperText="Optional, but useful if you later want weekly goal reminders."
                />

                <TextField
                  label="Notes"
                  value={form.notes}
                  onChange={handleFieldChange("notes")}
                  fullWidth
                  multiline
                  minRows={4}
                  placeholder="Examples: prioritize deadlift, keep sessions under 45 minutes, shoulder-friendly pressing only."
                />
              </Stack>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 2.5 },
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: "background.paper",
              }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
              >
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CampaignOutlinedIcon color="primary" />
                    <Typography variant="h6">Product feedback</Typography>
                  </Box>
                  <Typography sx={{ mt: 1, color: "text.secondary" }}>
                    Report bugs or request product improvements from a separate
                    feedback page built for production use.
                  </Typography>
                </Box>
                <Button variant="outlined" onClick={() => router.push("/feedback")}>
                  Open Feedback
                </Button>
              </Stack>
            </Paper>

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
                Save only the information you want the app to actually use.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                <Button variant="outlined" onClick={handleReset} disabled={!hasChanges}>
                  Reset
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SaveIcon />}
                  disabled={!hasChanges || saving}
                >
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              </Stack>
            </Box>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};

export default UserHomePage;
