"use client";

import React, { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { Session } from "next-auth";
import { fetchUser, fetchRoutine, saveUser } from "../utils/helpers";
import { useRouter } from "next/router";
import WorkoutsManager from "../components/WorkoutsManager";
import Header from "../components/Header";
import LoadingIndicator from "../components/LoadingIndicator";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { toast } from "react-toastify";

interface Set {
  name: string;
  reps?: number;
  percentage?: number;
  actualReps?: string | number;
  actualWeight?: string | number;
  weight?: number;
}

interface Exercise {
  name: string;
  type: string;
  sets: Set[];
  equipment?: string[];
}

interface DayRoutine {
  title: string;
  exercises: Exercise[];
}

interface Routine {
  _id?: string;
  userId?: string;
  days: {
    sunday: DayRoutine[];
    monday: DayRoutine[];
    tuesday: DayRoutine[];
    wednesday: DayRoutine[];
    thursday: DayRoutine[];
    friday: DayRoutine[];
    saturday: DayRoutine[];
  };
}

const isProfileIncomplete = (user: any) =>
  !user?.trainingGoal || !user?.workoutDaysPerWeek;

const goalOptions = [
  { value: "strength", label: "Get stronger" },
  { value: "muscle", label: "Build muscle" },
  { value: "fat_loss", label: "Lose fat" },
  { value: "consistency", label: "Stay consistent" },
  { value: "conditioning", label: "Improve conditioning" },
];

const workoutFrequencyOptions = ["2", "3", "4", "5", "6"];
const unitOptions = [
  { value: "lb", label: "Pounds / inches" },
  { value: "kg", label: "Kilograms / centimeters" },
];
const experienceOptions = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];
const workoutLengthOptions = [
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "60 min" },
  { value: "75", label: "75+ min" },
];
const equipmentOptions = [
  "Full gym",
  "Barbell",
  "Dumbbells",
  "Machines",
  "Bodyweight only",
  "Cardio equipment",
];
const weekdayOptions = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const goalLabels: Record<string, string> = {
  strength: "getting stronger",
  muscle: "building muscle",
  fat_loss: "losing fat",
  consistency: "staying consistent",
  conditioning: "improving conditioning",
};
const experienceLabels: Record<string, string> = {
  beginner: "a beginner",
  intermediate: "an intermediate lifter",
  advanced: "an advanced lifter",
};

const RoutinesPage = ({
  darkMode,
  setDarkMode,
}: {
  darkMode: boolean;
  setDarkMode: (darkMode: boolean) => void;
}) => {
  const router = useRouter();
  const { data: session, status } = useSession() as {
    data: (Session & { token: { user: { _id: string } } }) | null;
    status: string;
  };
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [savingSetup, setSavingSetup] = useState(false);
  const [setupForm, setSetupForm] = useState({
    preferredUnits: "lb",
    trainingGoal: "",
    workoutDaysPerWeek: "",
    experienceLevel: "",
    workoutLength: "",
    equipmentAccess: [] as string[],
    preferredTrainingDays: [] as string[],
    limitations: "",
    notes: "",
  });

  const sessionUserId =
    session?.token?.user?._id || (session as any)?.user?._id || "";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    if (!sessionUserId) {
      signOut({ redirect: true, callbackUrl: "/signin" });
    }
  }, [sessionUserId, status]);

  useEffect(() => {
    const userId = sessionUserId;
    if (!userId) return;

    const fetchPageData = async () => {
      try {
        setLoading(true);
        const [fetchedUser, fetchedRoutine] = await Promise.all([
          fetchUser(userId),
          fetchRoutine(userId),
        ]);
        if (!fetchedUser) {
          await signOut({ redirect: true, callbackUrl: "/signin" });
          return;
        }

        setUser(fetchedUser);
        setRoutine(fetchedRoutine || null);
      } catch (error) {
        console.error("Error fetching routines page data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPageData();
  }, [sessionUserId]);

  useEffect(() => {
    if (user && typeof user.darkMode === "boolean") {
      setDarkMode(user.darkMode);
    }
  }, [user, setDarkMode]);

  useEffect(() => {
    if (!user) return;

    setSetupForm({
      preferredUnits: user.preferredUnits || "lb",
      trainingGoal: user.trainingGoal || "",
      workoutDaysPerWeek: user.workoutDaysPerWeek || "",
      experienceLevel: user.experienceLevel || "",
      workoutLength: user.workoutLength || "",
      equipmentAccess: Array.isArray(user.equipmentAccess)
        ? user.equipmentAccess
        : [],
      preferredTrainingDays: Array.isArray(user.preferredTrainingDays)
        ? user.preferredTrainingDays
        : [],
      limitations: user.limitations || "",
      notes: user.notes || "",
    });

    const welcomeRequested = router.query.welcome === "1";
    if (welcomeRequested || isProfileIncomplete(user)) {
      setShowSetupDialog(true);
      if (welcomeRequested) {
        router.replace("/routines", undefined, { shallow: true });
      }
    }
  }, [router, router.query.welcome, user]);

  useEffect(() => {
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      try {
        if ((navigator as any)?.wakeLock) {
          wakeLock = await (navigator as any).wakeLock.request("screen");
        }
      } catch (error: any) {
        console.error(`${error?.name}, ${error?.message}`);
      }
    };

    requestWakeLock();

    return () => {
      if (wakeLock) {
        wakeLock.release();
      }
    };
  }, []);

  const handleSetupFieldChange =
    (field: keyof typeof setupForm) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setSetupForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleSetupSelectChange =
    (field: keyof typeof setupForm) => (event: any) => {
      setSetupForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const toggleSetupListValue =
    (field: "equipmentAccess" | "preferredTrainingDays", value: string) => {
      setSetupForm((prev) => {
        const currentValues = prev[field];
        const nextValues = currentValues.includes(value)
          ? currentValues.filter((item) => item !== value)
          : [...currentValues, value];

        return {
          ...prev,
          [field]: nextValues,
        };
      });
    };

  const handleSaveSetup = async () => {
    if (!user) return;

    setSavingSetup(true);

    const nextUser = {
      ...user,
      preferredUnits: setupForm.preferredUnits,
      trainingGoal: setupForm.trainingGoal,
      workoutDaysPerWeek: setupForm.workoutDaysPerWeek,
      experienceLevel: setupForm.experienceLevel,
      workoutLength: setupForm.workoutLength,
      equipmentAccess: setupForm.equipmentAccess,
      preferredTrainingDays: setupForm.preferredTrainingDays,
      limitations: setupForm.limitations,
      notes: setupForm.notes,
    };

    try {
      const response = await saveUser(nextUser);
      if (response?.success) {
        setUser(nextUser);
        setShowSetupDialog(false);
        toast.success("Profile setup saved");
      } else {
        toast.error("Failed to save setup");
      }
    } catch (error) {
      console.error("Error saving setup:", error);
      toast.error("An error occurred while saving setup");
    } finally {
      setSavingSetup(false);
    }
  };

  const renderBody = () => {
    if (loading || status === "loading") {
      return <LoadingIndicator />;
    }

    if (user && routine) {
      return (
        <>
          <Box
            sx={{
              px: { xs: 2, sm: 3 },
              pt: { xs: 2.5, sm: 3 },
              pb: 2.25,
              borderBottom: "1px solid",
              borderColor: "divider",
              background: darkMode
                ? "linear-gradient(180deg, rgba(59,130,246,0.12) 0%, rgba(255,255,255,0) 100%)"
                : "linear-gradient(180deg, rgba(148,163,184,0.08) 0%, rgba(255,255,255,0) 100%)",
            }}
          >
            <Typography
              variant="overline"
              sx={{
                color: "text.secondary",
                letterSpacing: "0.14em",
                fontWeight: 700,
              }}
            >
              Workout Flow
            </Typography>
            <Typography
              variant="h3"
              sx={{
                mt: 0.5,
                fontFamily: '"Manrope", sans-serif',
                letterSpacing: "-0.05em",
              }}
            >
              Today&apos;s training
            </Typography>
            <Typography sx={{ mt: 1, color: "text.secondary" }}>
              Pick the day, open the workout, and move through your sets
              without extra clutter.
            </Typography>
            <Header
              user={user}
              setUser={setUser}
              setDarkMode={setDarkMode}
              darkMode={darkMode}
            />
          </Box>
          <Box sx={{ px: { xs: 1.5, sm: 2 }, py: { xs: 1.75, sm: 2.25 } }}>
            <WorkoutsManager
              routine={routine}
              setRoutine={setRoutine}
              darkMode={darkMode}
            />
          </Box>
        </>
      );
    }

    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6">Loading your workouts...</Typography>
        <Typography sx={{ mt: 1, color: "text.secondary" }}>
          If this sticks, refresh once and I&apos;ll trace the next issue.
        </Typography>
      </Box>
    );
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        px: { xs: 1.5, sm: 2.5 },
        py: { xs: 2, sm: 3 },
        background: darkMode
          ? "radial-gradient(circle at top, rgba(59,130,246,0.1), transparent 36%), linear-gradient(180deg, #020617 0%, #0f172a 100%)"
          : "radial-gradient(circle at top, rgba(148,163,184,0.14), transparent 32%), linear-gradient(180deg, #f8fbff 0%, #e7edf5 100%)",
      }}
    >
      <Box
        sx={{
          maxWidth: 760,
          mx: "auto",
          minHeight: "calc(100vh - 32px)",
          backgroundColor: "background.paper",
          color: "text.primary",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: { xs: 4, sm: 5 },
          boxShadow: darkMode
            ? "0 28px 90px rgba(2,6,23,0.42)"
            : "0 26px 72px rgba(15,23,42,0.1)",
          backdropFilter: "blur(20px)",
          overflow: "hidden",
        }}
      >
        {renderBody()}
      </Box>

      <Dialog
        open={showSetupDialog && Boolean(user)}
        onClose={() => setShowSetupDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Tune your recommendations</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2.25}>
            <Paper
              elevation={0}
              sx={{
                p: 1.75,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: darkMode
                  ? "rgba(30,41,59,0.72)"
                  : "rgba(248,250,252,0.92)",
              }}
            >
              <Typography variant="overline" sx={{ color: "text.secondary" }}>
                Lift Logic Coach
              </Typography>
              <Typography variant="h6" sx={{ mt: 0.25 }}>
                Let&apos;s tune this in.
              </Typography>
              <Typography sx={{ mt: 0.75, color: "text.secondary" }}>
                These quick answers shape recommendations and defaults. They do
                not create your workout routine for you.
              </Typography>
            </Paper>

            <Box>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>
                What are you training for right now?
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {goalOptions.map((goal) => (
                  <Chip
                    key={goal.value}
                    label={goal.label}
                    clickable
                    color={
                      setupForm.trainingGoal === goal.value ? "primary" : "default"
                    }
                    variant={
                      setupForm.trainingGoal === goal.value ? "filled" : "outlined"
                    }
                    onClick={() =>
                      setSetupForm((prev) => ({
                        ...prev,
                        trainingGoal: goal.value,
                      }))
                    }
                  />
                ))}
              </Stack>
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>
                How many days per week do you usually train?
              </Typography>
              <Typography sx={{ mb: 1, color: "text.secondary" }}>
                This only helps pace suggestions. You&apos;ll add actual exercises
                on the workout screen next.
              </Typography>
              <ToggleButtonGroup
                exclusive
                fullWidth
                value={setupForm.workoutDaysPerWeek}
                onChange={(_, nextValue) => {
                  if (nextValue) {
                    setSetupForm((prev) => ({
                      ...prev,
                      workoutDaysPerWeek: nextValue,
                    }));
                  }
                }}
              >
                {workoutFrequencyOptions.map((days) => (
                  <ToggleButton key={days} value={days}>
                    {days} days
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>
                How experienced are you with lifting?
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {experienceOptions.map((option) => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    clickable
                    color={
                      setupForm.experienceLevel === option.value
                        ? "primary"
                        : "default"
                    }
                    variant={
                      setupForm.experienceLevel === option.value
                        ? "filled"
                        : "outlined"
                    }
                    onClick={() =>
                      setSetupForm((prev) => ({
                        ...prev,
                        experienceLevel: option.value,
                      }))
                    }
                  />
                ))}
              </Stack>
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>
                How long are your usual workouts?
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {workoutLengthOptions.map((option) => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    clickable
                    color={
                      setupForm.workoutLength === option.value
                        ? "primary"
                        : "default"
                    }
                    variant={
                      setupForm.workoutLength === option.value
                        ? "filled"
                        : "outlined"
                    }
                    onClick={() =>
                      setSetupForm((prev) => ({
                        ...prev,
                        workoutLength: option.value,
                      }))
                    }
                  />
                ))}
              </Stack>
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>
                What equipment do you usually have?
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {equipmentOptions.map((option) => (
                  <Chip
                    key={option}
                    label={option}
                    clickable
                    color={
                      setupForm.equipmentAccess.includes(option)
                        ? "primary"
                        : "default"
                    }
                    variant={
                      setupForm.equipmentAccess.includes(option)
                        ? "filled"
                        : "outlined"
                    }
                    onClick={() => toggleSetupListValue("equipmentAccess", option)}
                  />
                ))}
              </Stack>
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>
                Which days do you usually like to train?
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {weekdayOptions.map((day) => (
                  <Chip
                    key={day}
                    label={day}
                    clickable
                    color={
                      setupForm.preferredTrainingDays.includes(day)
                        ? "primary"
                        : "default"
                    }
                    variant={
                      setupForm.preferredTrainingDays.includes(day)
                        ? "filled"
                        : "outlined"
                    }
                    onClick={() =>
                      toggleSetupListValue("preferredTrainingDays", day)
                    }
                  />
                ))}
              </Stack>
            </Box>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="body2"
                  sx={{ mb: 1, color: "text.secondary", fontWeight: 600 }}
                >
                  Which units should I use?
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {unitOptions.map((option) => (
                    <Chip
                      key={option.value}
                      label={option.label}
                      clickable
                      color={
                        setupForm.preferredUnits === option.value
                          ? "primary"
                          : "default"
                      }
                      variant={
                        setupForm.preferredUnits === option.value
                          ? "filled"
                          : "outlined"
                      }
                      onClick={() =>
                        setSetupForm((prev) => ({
                          ...prev,
                          preferredUnits: option.value,
                        }))
                      }
                    />
                  ))}
                </Stack>
              </Box>

              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="body2"
                  sx={{ mb: 1, color: "text.secondary", fontWeight: 600 }}
                >
                  Any injuries or limitations I should respect?
                </Typography>
                <TextField
                  value={setupForm.limitations}
                  onChange={handleSetupFieldChange("limitations")}
                  fullWidth
                  multiline
                  minRows={3}
                  placeholder="Shoulder-friendly pressing, avoid deep knee flexion, low-back caution..."
                />
              </Box>
            </Stack>

            <Box>
              <Typography
                variant="body2"
                sx={{ mb: 1, color: "text.secondary", fontWeight: 600 }}
              >
                Anything else I should keep in mind?
              </Typography>
              <TextField
                value={setupForm.notes}
                onChange={handleSetupFieldChange("notes")}
                fullWidth
                multiline
                minRows={3}
                placeholder="Short sessions, prioritize squat, prefer simple plans..."
              />
            </Box>

            <Paper
              elevation={0}
              sx={{
                p: 1.75,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: darkMode
                  ? "rgba(59,130,246,0.12)"
                  : "rgba(239,246,255,0.92)",
              }}
            >
              <Typography variant="overline" sx={{ color: "text.secondary" }}>
                What I Heard
              </Typography>
              <Typography sx={{ mt: 0.75 }}>
                {setupForm.trainingGoal
                  ? `You want help with ${goalLabels[setupForm.trainingGoal] || "training"}.`
                  : "You have not picked a main goal yet."}{" "}
                {setupForm.workoutDaysPerWeek
                  ? `I should expect about ${setupForm.workoutDaysPerWeek} workout${
                      setupForm.workoutDaysPerWeek === "1" ? "" : "s"
                    } per week.`
                  : "I still need your weekly training target."}{" "}
                {setupForm.experienceLevel
                  ? `You train like ${experienceLabels[setupForm.experienceLevel] || "a lifter with some experience"}. `
                  : ""}{" "}
                {setupForm.workoutLength
                  ? `Your sessions are usually around ${setupForm.workoutLength} minutes. `
                  : ""}{" "}
                {setupForm.equipmentAccess.length > 0
                  ? `You usually have access to ${setupForm.equipmentAccess.join(", ")}. `
                  : ""}{" "}
                {setupForm.preferredTrainingDays.length > 0
                  ? `You like training on ${setupForm.preferredTrainingDays.join(", ")}. `
                  : ""}{" "}
                {setupForm.limitations
                  ? `I should respect these limitations: ${setupForm.limitations}. `
                  : ""}{" "}
                {setupForm.notes
                  ? `You also want me to remember: ${setupForm.notes}`
                  : "You can add notes later if you want more tailored suggestions."}
              </Typography>
            </Paper>

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: { xs: "stretch", sm: "center" },
                flexDirection: { xs: "column", sm: "row" },
                gap: 1.25,
                pt: 0.25,
              }}
            >
              <Typography sx={{ color: "text.secondary" }}>
                We can always refine this later from your full profile.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button variant="outlined" onClick={() => setShowSetupDialog(false)}>
                  Maybe later
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSaveSetup}
                  disabled={
                    savingSetup ||
                    !setupForm.trainingGoal ||
                    !setupForm.workoutDaysPerWeek
                  }
                >
                  {savingSetup ? "Saving..." : "Sounds good"}
                </Button>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
      </Dialog>

      {user && isProfileIncomplete(user) && !showSetupDialog ? (
        <Paper
          elevation={0}
          sx={{
            position: "fixed",
            right: { xs: 12, sm: 24 },
            bottom: { xs: 12, sm: 24 },
            width: { xs: "calc(100% - 24px)", sm: 360 },
            p: 1.75,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: "background.paper",
            boxShadow: "0 14px 34px rgba(15,23,42,0.14)",
            zIndex: 1300,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Tune your recommendations
          </Typography>
          <Typography sx={{ mt: 0.5, color: "text.secondary" }}>
            A few coaching questions will improve defaults, but your workout is
            still built on the main screen.
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
            <Button variant="contained" onClick={() => setShowSetupDialog(true)}>
              Start setup
            </Button>
            <Button variant="text" onClick={() => router.push("/user")}>
              Full profile
            </Button>
          </Stack>
        </Paper>
      ) : null}
    </Box>
  );
};

export default RoutinesPage;
