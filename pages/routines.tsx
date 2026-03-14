"use client";

import React, { useEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { Session } from "next-auth";
import {
  deactivateRecurringRule,
  fetchRecurringRules,
  fetchUser,
  fetchRoutine,
  generateWorkoutPlan,
  saveExercise,
  saveUser,
} from "../utils/helpers";
import { useRouter } from "next/router";
import WorkoutsManager from "../components/WorkoutsManager";
import Header from "../components/Header";
import LoadingIndicator from "../components/LoadingIndicator";
import CoachChatPanel from "../components/CoachChatPanel";
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
import {
  buildWhatIHeardSummary,
  currentFitnessOptions,
  defaultSetupForm,
  equipmentOptions,
  experienceOptions,
  goalOptions,
  normalizeSetupForm,
  sexOptions,
  unitOptions,
  weekdayOptions,
  workoutFrequencyOptions,
  workoutLengthOptions,
} from "../utils/profileSetup";
import {
  buildSetupCoachResponse,
  buildWorkoutCoachResponseFromRoutine,
} from "../utils/workoutGeneration";

type Routine = any;

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
  const [generatingWorkout, setGeneratingWorkout] = useState(false);
  const [routineViewKey, setRoutineViewKey] = useState(0);
  const [generatedCoachResponse, setGeneratedCoachResponse] = useState<any>(null);
  const [setupForm, setSetupForm] = useState(defaultSetupForm);
  const [assistantName, setAssistantName] = useState("");
  const [assistantIntent, setAssistantIntent] = useState<"tracker" | "planner" | null>(
    null
  );
  const [showPlanningDetails, setShowPlanningDetails] = useState(false);

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
    if (!user || !routine || showSetupDialog) {
      return;
    }

    const restored = buildWorkoutCoachResponseFromRoutine(
      normalizeSetupForm(user),
      routine
    );

    if (restored) {
      setGeneratedCoachResponse(restored);
    }
  }, [routine, showSetupDialog, user]);

  useEffect(() => {
    if (!user) return;

    setSetupForm(normalizeSetupForm(user));
    setAssistantName(user.name || user.username || "");

    const welcomeRequested = router.query.welcome === "1";
    if (welcomeRequested || !user?.setupPromptSeen) {
      setShowSetupDialog(true);
      if (!user?.setupPromptSeen) {
        const nextUser = { ...user, setupPromptSeen: true };
        setUser(nextUser);
        saveUser(nextUser).catch((error) => {
          console.error("Error marking setup prompt as seen:", error);
        });
      }
      if (welcomeRequested) {
        router.replace("/routines", undefined, { shallow: true });
      }
    }
  }, [router, router.query.welcome, user]);

  useEffect(() => {
    if (!showSetupDialog) {
      return;
    }

    if (
      setupForm.trainingGoal ||
      setupForm.workoutDaysPerWeek ||
      setupForm.currentFitnessLevel ||
      setupForm.experienceLevel ||
      setupForm.workoutLength ||
      setupForm.equipmentAccess.length > 0 ||
      setupForm.preferredTrainingDays.length > 0 ||
      setupForm.limitations ||
      setupForm.notes
    ) {
      setAssistantIntent("planner");
      setShowPlanningDetails(
        Boolean(
          setupForm.sex ||
            setupForm.age ||
          setupForm.currentFitnessLevel ||
          setupForm.experienceLevel ||
            setupForm.workoutLength ||
            setupForm.equipmentAccess.length > 0 ||
            setupForm.preferredTrainingDays.length > 0 ||
            setupForm.limitations ||
            setupForm.notes
        )
      );
      return;
    }

    setAssistantIntent(null);
    setShowPlanningDetails(false);
  }, [
    setupForm.trainingGoal,
    setupForm.workoutDaysPerWeek,
    setupForm.currentFitnessLevel,
    setupForm.experienceLevel,
    setupForm.workoutLength,
    setupForm.equipmentAccess,
    setupForm.preferredTrainingDays,
    setupForm.limitations,
    setupForm.notes,
    showSetupDialog,
  ]);

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

  const setupReadyToGenerate = Boolean(
    setupForm.trainingGoal && setupForm.workoutDaysPerWeek
  );
  const hasOptionalPlanningContext = Boolean(
    setupForm.sex ||
      setupForm.age ||
      setupForm.currentFitnessLevel ||
      setupForm.experienceLevel ||
      setupForm.workoutLength ||
      setupForm.equipmentAccess.length > 0 ||
      setupForm.preferredTrainingDays.length > 0 ||
      setupForm.limitations ||
      setupForm.notes
  );
  const coachContextCount = [
    setupForm.sex,
    setupForm.age,
    setupForm.currentFitnessLevel,
    setupForm.experienceLevel,
    setupForm.workoutLength,
    setupForm.equipmentAccess.length > 0 ? "equipment" : "",
    setupForm.preferredTrainingDays.length > 0 ? "days" : "",
    setupForm.limitations,
    setupForm.notes,
  ].filter(Boolean).length;
  const missingSetupFields = useMemo(() => {
    const missing: string[] = [];

    if (!setupForm.trainingGoal) {
      missing.push("goal");
    }
    if (!setupForm.workoutDaysPerWeek) {
      missing.push("weekly frequency");
    }

    return missing;
  }, [setupForm.trainingGoal, setupForm.workoutDaysPerWeek]);
  const assistantNextQuestion = useMemo(() => {
    if (!setupForm.trainingGoal) {
      return "What are you training for right now?";
    }
    if (!setupForm.workoutDaysPerWeek) {
      return "How many days per week do you want to train?";
    }
    if (showPlanningDetails && !setupForm.currentFitnessLevel) {
      return "What is your current fitness level?";
    }
    if (showPlanningDetails && !setupForm.experienceLevel) {
      return "How experienced are you with lifting?";
    }
    if (showPlanningDetails && !setupForm.workoutLength) {
      return "How long are your workouts usually?";
    }
    if (showPlanningDetails && setupForm.equipmentAccess.length === 0) {
      return "What equipment do you usually have access to?";
    }
    if (showPlanningDetails && !setupForm.sex) {
      return "What is your biological sex?";
    }
    if (showPlanningDetails && !setupForm.age) {
      return "How old are you?";
    }

    return "I have enough to draft a plan. Add more detail if you want tighter recommendations.";
  }, [
    setupForm.trainingGoal,
    setupForm.workoutDaysPerWeek,
    setupForm.currentFitnessLevel,
    setupForm.experienceLevel,
    setupForm.workoutLength,
    setupForm.equipmentAccess,
    setupForm.sex,
    setupForm.age,
    showPlanningDetails,
  ]);

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
      name: assistantName.trim() || user.name || user.username,
      ...setupForm,
      setupPromptSeen: true,
      setupCompleted: true,
    };

    try {
      const response = await saveUser(nextUser);
      if (response?.success) {
        setUser(nextUser);
        setGeneratedCoachResponse(
          buildWorkoutCoachResponseFromRoutine(
            normalizeSetupForm(nextUser),
            routine
          ) ?? buildSetupCoachResponse(normalizeSetupForm(nextUser))
        );
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

  const handleTrackerOnlySetup = async () => {
    if (!user) return;

    setSavingSetup(true);

    const nextUser = {
      ...user,
      name: assistantName.trim() || user.name || user.username,
      sex: setupForm.sex,
      age: setupForm.age,
      setupPromptSeen: true,
      setupCompleted: true,
    };

    try {
      const response = await saveUser(nextUser);
      if (response?.success) {
        setUser(nextUser);
        setShowSetupDialog(false);
        toast.success("Tracker mode is ready");
      } else {
        toast.error("Failed to save your preference");
      }
    } catch (error) {
      console.error("Error saving tracker preference:", error);
      toast.error("An error occurred while saving your preference");
    } finally {
      setSavingSetup(false);
    }
  };

  const handleGenerateWorkoutFromSetup = async () => {
    if (!user) return;

    const nextUser = {
      ...user,
      name: assistantName.trim() || user.name || user.username,
      ...setupForm,
      setupPromptSeen: true,
      setupCompleted: true,
    };

    try {
      setGeneratingWorkout(true);
      await saveUser(nextUser);
      const generated = await generateWorkoutPlan(sessionUserId, normalizeSetupForm(nextUser));
      setUser(nextUser);
      setRoutine(generated.routine);
      setGeneratedCoachResponse(generated.coachResponse ?? null);
      setShowSetupDialog(false);
      setRoutineViewKey((prev) => prev + 1);
      toast.success("Workout plan generated");
    } catch (error) {
      console.error("Error generating workout plan:", error);
      toast.error("Couldn't generate a workout plan");
    } finally {
      setGeneratingWorkout(false);
    }
  };

  const applyCoachProfilePatch = async (patch: Record<string, any>) => {
    if (!user) return;

    const nextSetupForm = normalizeSetupForm({
      ...user,
      ...setupForm,
      ...patch,
    });
    const nextUser = {
      ...user,
      ...nextSetupForm,
      setupPromptSeen: true,
      setupCompleted: true,
    };

    setSetupForm(nextSetupForm);
    await saveUser(nextUser);
    const generated = await generateWorkoutPlan(sessionUserId, nextSetupForm);
    setUser(nextUser);
    setRoutine(generated.routine);
    setGeneratedCoachResponse(generated.coachResponse ?? null);
    setRoutineViewKey((prev) => prev + 1);
  };

  const handleCoachAction = async (action: any) => {
    if (!user || !sessionUserId || !action?.type) {
      return;
    }

    if (action.type === "remove_day_schedule" && action.dayKey) {
      const dayIndexLookup: Record<string, number> = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };

      const dayKey = String(action.dayKey).toLowerCase();
      const targetDayIndex = dayIndexLookup[dayKey];
      if (targetDayIndex === undefined) {
        return "I couldn't tell which day you wanted to clear.";
      }

      const rules = await fetchRecurringRules(sessionUserId);
      const matchingRules = rules.filter((rule: any) => {
        const recurrenceType = rule.recurrenceType ?? "weekly";
        const days = Array.isArray(rule.daysOfWeek) ? rule.daysOfWeek : [rule.dayOfWeek];
        return (
          recurrenceType === "daily" ||
          days.includes(targetDayIndex)
        );
      });

      await Promise.all(
        matchingRules
          .map((rule: any) => String(rule._id ?? ""))
          .filter(Boolean)
          .map((ruleId: string) => deactivateRecurringRule(ruleId))
      );

      setRoutine((prev: any) => {
        if (!prev?.days?.[dayKey]?.[0]) return prev;
        const next = structuredClone(prev);
        next.days[dayKey][0].exercises = [];
        return next;
      });

      setGeneratedCoachResponse((prev: any) =>
        prev
          ? {
              ...prev,
              plannedDays: (prev.plannedDays ?? []).filter(
                (line: string) => !line.toLowerCase().includes(dayKey)
              ),
              planSnapshot: (prev.planSnapshot ?? []).filter(
                (day: any) => String(day.dayKey).toLowerCase() !== dayKey
              ),
            }
          : prev
      );
      setRoutineViewKey((prev) => prev + 1);

      return `I cleared the scheduled workout for ${dayKey.charAt(0).toUpperCase()}${dayKey.slice(
        1
      )}.`;
    }

    if (action.type === "create_catalog_exercise" && action.exercise?.name) {
      await saveExercise({
        ...action.exercise,
        createdBy: sessionUserId,
      });

      return `${action.exercise.name} is in your exercise library now, so you can add it like any other movement.`;
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
            {generatedCoachResponse ? (
              <Box sx={{ mb: 2 }}>
                <CoachChatPanel
                  coachResponse={generatedCoachResponse}
                  profile={setupForm}
                  onDismiss={() => setGeneratedCoachResponse(null)}
                  onApplyProfilePatch={applyCoachProfilePatch}
                  onCoachAction={handleCoachAction}
                />
              </Box>
            ) : null}
            <WorkoutsManager
              key={`${routine?._id ?? "routine"}-${routineViewKey}`}
              routine={routine}
              setRoutine={setRoutine}
              darkMode={darkMode}
              userProfile={user}
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
          overflow: "visible",
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
        <DialogTitle>Set up your workout assistant</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2.25}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 2.25 },
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                background: darkMode
                  ? "linear-gradient(135deg, rgba(59,130,246,0.16), rgba(15,23,42,0.72))"
                  : "linear-gradient(135deg, rgba(219,234,254,0.96), rgba(248,250,252,0.92))",
              }}
            >
              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="overline" sx={{ color: "text.secondary" }}>
                    Workout Assistant
                  </Typography>
                  <Typography variant="h6" sx={{ mt: 0.25 }}>
                    Hi, I can help you get set up.
                  </Typography>
                  <Typography sx={{ mt: 0.75, color: "text.secondary" }}>
                    First I just need your name, age, and sex. Then I&apos;ll ask whether
                    you want help building a workout plan or just want to use Lift Logic as a tracker.
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label="1. Quick intro" color="primary" variant="filled" />
                  <Chip label="2. Planning help if you want it" variant="outlined" />
                  <Chip label="3. Refine later in chat" variant="outlined" />
                </Stack>
              </Stack>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: "background.paper",
              }}
            >
              <Stack spacing={1.5}>
                <TextField
                  label="Name"
                  value={assistantName}
                  onChange={(event) => setAssistantName(event.target.value)}
                  fullWidth
                />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="Age"
                    value={setupForm.age}
                    onChange={handleSetupFieldChange("age")}
                    fullWidth
                    type="number"
                    inputProps={{ min: 0, max: 120 }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
                      Biological sex
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {sexOptions.map((option) => (
                        <Chip
                          key={option.value}
                          label={option.label}
                          clickable
                          color={setupForm.sex === option.value ? "primary" : "default"}
                          variant={setupForm.sex === option.value ? "filled" : "outlined"}
                          onClick={() =>
                            setSetupForm((prev) => ({
                              ...prev,
                              sex: option.value,
                            }))
                          }
                        />
                      ))}
                    </Stack>
                  </Box>
                </Stack>
                <Typography sx={{ fontWeight: 700 }}>
                  Do you want help setting up a workout plan?
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <Button
                    variant={assistantIntent === "tracker" ? "contained" : "outlined"}
                    onClick={() => setAssistantIntent("tracker")}
                    fullWidth
                  >
                    No, I just want to track workouts
                  </Button>
                  <Button
                    variant={assistantIntent === "planner" ? "contained" : "outlined"}
                    onClick={() => setAssistantIntent("planner")}
                    fullWidth
                  >
                    Yes, help me plan workouts
                  </Button>
                </Stack>
              </Stack>
            </Paper>

            {assistantIntent === "tracker" ? (
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  backgroundColor: "background.paper",
                }}
              >
                <Stack spacing={1.5}>
                  <Typography sx={{ fontWeight: 700 }}>
                    Tracker mode
                  </Typography>
                  <Typography sx={{ color: "text.secondary" }}>
                    You can use Lift Logic as a tracker without filling out a planning intake.
                  </Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <Button
                      variant="contained"
                      onClick={handleTrackerOnlySetup}
                      disabled={savingSetup}
                    >
                      {savingSetup ? "Saving..." : "Continue to workouts"}
                    </Button>
                    <Button variant="text" onClick={() => setAssistantIntent("planner")}>
                      I want planning help instead
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            ) : null}

            {assistantIntent === "planner" ? (
              <>

            <Paper
              elevation={0}
              sx={{
                p: 1.5,
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
                  <Typography sx={{ fontWeight: 700 }}>
                    Ready to generate
                  </Typography>
                  <Typography sx={{ mt: 0.5, color: "text.secondary" }}>
                    {setupReadyToGenerate
                      ? `Goal and weekly frequency are set. You also gave the workout assistant ${coachContextCount} extra detail${
                          coachContextCount === 1 ? "" : "s"
                        } to personalize the first draft.`
                      : `To generate a first plan, I still need ${missingSetupFields.join(
                          " and "
                        )}. Everything else can be refined after the assistant shows you a draft.`}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    label={setupForm.trainingGoal ? "Goal set" : "Goal needed"}
                    color={setupForm.trainingGoal ? "success" : "default"}
                    variant={setupForm.trainingGoal ? "filled" : "outlined"}
                  />
                  <Chip
                    label={
                      setupForm.workoutDaysPerWeek
                        ? "Frequency set"
                        : "Frequency needed"
                    }
                    color={setupForm.workoutDaysPerWeek ? "success" : "default"}
                    variant={setupForm.workoutDaysPerWeek ? "filled" : "outlined"}
                  />
                </Stack>
              </Stack>
            </Paper>

            <Box>
              <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
                Goal
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
              <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
                Days per week
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
              <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
                Current fitness level
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {currentFitnessOptions.map((option) => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    clickable
                    color={
                      setupForm.currentFitnessLevel === option.value
                        ? "primary"
                        : "default"
                    }
                    variant={
                      setupForm.currentFitnessLevel === option.value
                        ? "filled"
                        : "outlined"
                    }
                    onClick={() =>
                      setSetupForm((prev) => ({
                        ...prev,
                        currentFitnessLevel: option.value,
                      }))
                    }
                  />
                ))}
              </Stack>
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
                Lifting experience
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
              <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
                Workout length
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
              <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
                Equipment access
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
              <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
                Preferred training days
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
                  sx={{ mb: 0.5, color: "text.primary", fontWeight: 700 }}
                >
                  Units
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
                  sx={{ mb: 0.5, color: "text.primary", fontWeight: 700 }}
                >
                  Limitations
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
                sx={{ mb: 0.5, color: "text.primary", fontWeight: 700 }}
              >
                Notes
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
                Assistant Brief
              </Typography>
              <Typography sx={{ mt: 0.75 }}>
                {buildWhatIHeardSummary(setupForm)}
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
                The first draft does not need to be perfect. The workout assistant can revise the split, exercises, and assumptions after generation.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button variant="outlined" onClick={() => setShowSetupDialog(false)}>
                  Skip for now
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleGenerateWorkoutFromSetup}
                  disabled={
                    generatingWorkout ||
                    savingSetup ||
                    !setupReadyToGenerate
                  }
                >
                  {generatingWorkout ? "Generating..." : "Generate with assistant"}
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSaveSetup}
                  disabled={
                    savingSetup ||
                    generatingWorkout ||
                    !setupReadyToGenerate
                  }
                >
                  {savingSetup ? "Saving..." : "Save assistant setup"}
                </Button>
              </Stack>
            </Box>
          </>
        ) : null}
          </Stack>
        </DialogContent>
      </Dialog>

      {user && !user?.setupCompleted && !showSetupDialog ? (
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
            Finish assistant setup
          </Typography>
          <Typography sx={{ mt: 0.5, color: "text.secondary" }}>
            Set your goal and training frequency, then let the workout assistant build a first draft you can refine in chat.
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
            <Button variant="contained" onClick={() => setShowSetupDialog(true)}>
              Open assistant setup
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
