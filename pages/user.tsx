"use client";

import { Session } from "next-auth";
import { useSession } from "next-auth/react";
import React, { useEffect, useMemo, useState } from "react";
import { fetchUser, generateWorkoutPlan, saveExercise, saveUser } from "../utils/helpers";
import LoadingIndicator from "../components/LoadingIndicator";
import CoachChatPanel from "../components/CoachChatPanel";
import { useRouter } from "next/router";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import TuneIcon from "@mui/icons-material/Tune";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import { toast } from "react-toastify";
import {
  AIResponseSourceDetail,
  getAIFallbackNotice,
} from "../utils/aiFallback";
import { emitDevBugInteraction } from "../utils/devBugRecorder";
import {
  buildWhatIHeardSummary,
  currentFitnessOptions,
  equipmentOptions,
  experienceOptions,
  goalOptions,
  normalizeSetupForm,
  sexOptions,
  weekdayOptions,
  workoutFrequencyOptions,
  workoutLengthOptions,
} from "../utils/profileSetup";
import {
  APPEARANCE_DENSITY_OPTIONS,
  AppearanceDensity,
  getThemePreferenceDescription,
  getAppearanceDensityDescription,
  getAppearanceDensityLabel,
  getInterfaceScaleDescription,
  getInterfaceScaleLabel,
  getThemePreferenceLabel,
  getThemePreferenceMeta,
  INTERFACE_SCALE_OPTIONS,
  InterfaceScale,
  isAppearanceDensity,
  isInterfaceScale,
  isThemePreference,
  THEME_OPTIONS,
  ThemePreference,
} from "../utils/themePreferences";
import { normalizeReminderPreferences } from "../utils/reminders";

interface UserPageProps {
  setThemePreference: React.Dispatch<React.SetStateAction<ThemePreference>>;
  setAppearanceDensity: React.Dispatch<React.SetStateAction<AppearanceDensity>>;
  setInterfaceScale: React.Dispatch<React.SetStateAction<InterfaceScale>>;
}

type GeneratedPlanPayload = {
  coachResponse?: any;
  source?: "ai" | "fallback";
  sourceDetail?: AIResponseSourceDetail;
};

type UserProfile = {
  _id: string;
  username: string;
  darkMode?: boolean;
  themePreference?: ThemePreference;
  appearanceDensity?: AppearanceDensity;
  interfaceScale?: InterfaceScale;
  sex?: string;
  age?: string;
  preferredUnits?: "lb" | "kg";
  height?: string;
  weight?: string;
  trainingGoal?: string;
  currentFitnessLevel?: string;
  workoutDaysPerWeek?: string;
  experienceLevel?: string;
  workoutLength?: string;
  equipmentAccess?: string[];
  maxDumbbellWeight?: string;
  preferredTrainingDays?: string[];
  limitations?: string;
  setupPromptSeen?: boolean;
  setupCompleted?: boolean;
  notes?: string;
  reminderPreferences?: {
    enabled?: boolean;
    scheduledWorkoutRemindersEnabled?: boolean;
    scheduledWorkoutReminderTime?: string;
    scheduledWorkoutReminderDays?: string[];
    quietHoursStart?: string;
    quietHoursEnd?: string;
    comebackNudgesEnabled?: boolean;
    comebackThresholdDays?: number;
    timezone?: string;
  };
};

const defaultForm = {
  themePreference: "light" as ThemePreference,
  appearanceDensity: "comfortable" as AppearanceDensity,
  interfaceScale: "normal" as InterfaceScale,
  sex: "",
  age: "",
  preferredUnits: "lb",
  height: "",
  weight: "",
  trainingGoal: "",
  currentFitnessLevel: "",
  workoutDaysPerWeek: "",
  experienceLevel: "",
  workoutLength: "",
  equipmentAccess: [] as string[],
  maxDumbbellWeight: "",
  preferredTrainingDays: [] as string[],
  limitations: "",
  notes: "",
  remindersEnabled: false,
  scheduledWorkoutRemindersEnabled: true,
  scheduledWorkoutReminderTime: "18:00",
  scheduledWorkoutReminderDays: [] as string[],
  quietHoursStart: "21:30",
  quietHoursEnd: "07:00",
  comebackNudgesEnabled: true,
  comebackThresholdDays: "4",
  reminderTimezone:
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
      : "UTC",
};

const getStoredThemePreference = (profile: Pick<UserProfile, "themePreference" | "darkMode">) => {
  if (isThemePreference(profile.themePreference)) {
    return profile.themePreference;
  }

  return profile.darkMode ? "night" : "light";
};

const getStoredAppearanceDensity = (
  profile: Pick<UserProfile, "appearanceDensity">
) => (isAppearanceDensity(profile.appearanceDensity) ? profile.appearanceDensity : "comfortable");

const getStoredInterfaceScale = (profile: Pick<UserProfile, "interfaceScale">) =>
  isInterfaceScale(profile.interfaceScale) ? profile.interfaceScale : "normal";

const getStoredReminderPreferences = (profile: Pick<UserProfile, "reminderPreferences">) =>
  normalizeReminderPreferences(
    profile.reminderPreferences,
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
      : "UTC"
  );

const UserHomePage: React.FC<UserPageProps> = ({
  setThemePreference,
  setAppearanceDensity,
  setInterfaceScale,
}) => {
  const { data: session } = useSession() as {
    data: (Session & { token: { user: { _id: string } } }) | null;
  };
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingWorkout, setGeneratingWorkout] = useState(false);
  const [generatedCoachResponse, setGeneratedCoachResponse] = useState<any>(null);
  const [generatedCoachSource, setGeneratedCoachSource] = useState<
    "ai" | "fallback" | undefined
  >(undefined);
  const [generatedCoachSourceDetail, setGeneratedCoachSourceDetail] = useState<
    AIResponseSourceDetail | undefined
  >(undefined);
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

    const reminderPreferences = getStoredReminderPreferences(user);

    const nextForm = {
      themePreference: getStoredThemePreference(user),
      appearanceDensity: getStoredAppearanceDensity(user),
      interfaceScale: getStoredInterfaceScale(user),
      sex: user.sex || "",
      age: user.age || "",
      preferredUnits: user.preferredUnits || "lb",
      height: user.height || "",
      weight: user.weight || "",
      trainingGoal: user.trainingGoal || "",
      currentFitnessLevel: user.currentFitnessLevel || "",
      workoutDaysPerWeek: user.workoutDaysPerWeek || "",
      experienceLevel: user.experienceLevel || "",
      workoutLength: user.workoutLength || "",
      equipmentAccess: Array.isArray(user.equipmentAccess) ? user.equipmentAccess : [],
      maxDumbbellWeight: user.maxDumbbellWeight || "",
      preferredTrainingDays: Array.isArray(user.preferredTrainingDays)
        ? user.preferredTrainingDays
        : [],
      limitations: user.limitations || "",
      notes: user.notes || "",
      remindersEnabled: Boolean(reminderPreferences.enabled),
      scheduledWorkoutRemindersEnabled: Boolean(
        reminderPreferences.scheduledWorkoutRemindersEnabled
      ),
      scheduledWorkoutReminderTime:
        reminderPreferences.scheduledWorkoutReminderTime || "18:00",
      scheduledWorkoutReminderDays: Array.isArray(
        reminderPreferences.scheduledWorkoutReminderDays
      )
        ? reminderPreferences.scheduledWorkoutReminderDays
        : [],
      quietHoursStart: reminderPreferences.quietHoursStart || "21:30",
      quietHoursEnd: reminderPreferences.quietHoursEnd || "07:00",
      comebackNudgesEnabled: Boolean(reminderPreferences.comebackNudgesEnabled),
      comebackThresholdDays: String(
        reminderPreferences.comebackThresholdDays || 4
      ),
      reminderTimezone: reminderPreferences.timezone || defaultForm.reminderTimezone,
    };

    setForm(nextForm);
    setThemePreference(nextForm.themePreference);
    setAppearanceDensity(nextForm.appearanceDensity);
    setInterfaceScale(nextForm.interfaceScale);
  }, [setAppearanceDensity, setInterfaceScale, setThemePreference, user]);

  const hasChanges = useMemo(() => {
    if (!user) return false;

    return (
      getStoredThemePreference(user) !== form.themePreference ||
      getStoredAppearanceDensity(user) !== form.appearanceDensity ||
      getStoredInterfaceScale(user) !== form.interfaceScale ||
      (user.sex || "") !== form.sex ||
      (user.age || "") !== form.age ||
      (user.preferredUnits || "lb") !== form.preferredUnits ||
      (user.height || "") !== form.height ||
      (user.weight || "") !== form.weight ||
      (user.trainingGoal || "") !== form.trainingGoal ||
      (user.currentFitnessLevel || "") !== form.currentFitnessLevel ||
      (user.workoutDaysPerWeek || "") !== form.workoutDaysPerWeek ||
      (user.experienceLevel || "") !== form.experienceLevel ||
      (user.workoutLength || "") !== form.workoutLength ||
      JSON.stringify(user.equipmentAccess || []) !== JSON.stringify(form.equipmentAccess) ||
      (user.maxDumbbellWeight || "") !== form.maxDumbbellWeight ||
      JSON.stringify(user.preferredTrainingDays || []) !==
        JSON.stringify(form.preferredTrainingDays) ||
      (user.limitations || "") !== form.limitations ||
      (user.notes || "") !== form.notes ||
      JSON.stringify(getStoredReminderPreferences(user)) !==
        JSON.stringify({
          enabled: form.remindersEnabled,
          scheduledWorkoutRemindersEnabled:
            form.scheduledWorkoutRemindersEnabled,
          scheduledWorkoutReminderTime: form.scheduledWorkoutReminderTime,
          scheduledWorkoutReminderDays: form.scheduledWorkoutReminderDays,
          quietHoursStart: form.quietHoursStart,
          quietHoursEnd: form.quietHoursEnd,
          comebackNudgesEnabled: form.comebackNudgesEnabled,
          comebackThresholdDays: Number(form.comebackThresholdDays || 4),
          timezone: form.reminderTimezone,
          deliveryChannel: "in_app",
        })
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

  const toggleListValue =
    (
      field:
        | "equipmentAccess"
        | "preferredTrainingDays"
        | "scheduledWorkoutReminderDays",
      value: string
    ) => {
      setForm((prev) => {
        const currentValues = prev[field];
        return {
          ...prev,
          [field]: currentValues.includes(value)
            ? currentValues.filter((item) => item !== value)
            : [...currentValues, value],
        };
      });
    };

  const handleThemePreferenceChange = (nextThemePreference: ThemePreference) => {
    setForm((prev) => ({ ...prev, themePreference: nextThemePreference }));
    setThemePreference(nextThemePreference);
  };

  const handleAppearanceDensityChange = (nextAppearanceDensity: AppearanceDensity) => {
    setForm((prev) => ({ ...prev, appearanceDensity: nextAppearanceDensity }));
    setAppearanceDensity(nextAppearanceDensity);
  };

  const handleInterfaceScaleChange = (nextInterfaceScale: InterfaceScale) => {
    setForm((prev) => ({ ...prev, interfaceScale: nextInterfaceScale }));
    setInterfaceScale(nextInterfaceScale);
  };

  const buildReminderPreferencesFromForm = () => ({
    enabled: form.remindersEnabled,
    scheduledWorkoutRemindersEnabled: form.scheduledWorkoutRemindersEnabled,
    scheduledWorkoutReminderTime: form.scheduledWorkoutReminderTime,
    scheduledWorkoutReminderDays: form.scheduledWorkoutReminderDays,
    quietHoursStart: form.quietHoursStart,
    quietHoursEnd: form.quietHoursEnd,
    comebackNudgesEnabled: form.comebackNudgesEnabled,
    comebackThresholdDays: Number(form.comebackThresholdDays || 4),
    timezone: form.reminderTimezone || defaultForm.reminderTimezone,
    deliveryChannel: "in_app" as const,
  });

  const handleReset = () => {
    if (!user) return;

    emitDevBugInteraction({
      type: "click",
      kind: "semantic",
      label: "Reset profile changes",
      expected: "Unsaved profile fields return to stored values.",
      actual: "Profile form was reset.",
      status: "info",
    });

    setForm({
      themePreference: getStoredThemePreference(user),
      appearanceDensity: getStoredAppearanceDensity(user),
      interfaceScale: getStoredInterfaceScale(user),
      sex: user.sex || "",
      age: user.age || "",
      preferredUnits: user.preferredUnits || "lb",
      height: user.height || "",
      weight: user.weight || "",
      trainingGoal: user.trainingGoal || "",
      currentFitnessLevel: user.currentFitnessLevel || "",
      workoutDaysPerWeek: user.workoutDaysPerWeek || "",
      experienceLevel: user.experienceLevel || "",
      workoutLength: user.workoutLength || "",
      equipmentAccess: Array.isArray(user.equipmentAccess) ? user.equipmentAccess : [],
      maxDumbbellWeight: user.maxDumbbellWeight || "",
      preferredTrainingDays: Array.isArray(user.preferredTrainingDays)
        ? user.preferredTrainingDays
        : [],
      limitations: user.limitations || "",
      notes: user.notes || "",
      remindersEnabled: Boolean(getStoredReminderPreferences(user).enabled),
      scheduledWorkoutRemindersEnabled: Boolean(
        getStoredReminderPreferences(user).scheduledWorkoutRemindersEnabled
      ),
      scheduledWorkoutReminderTime:
        getStoredReminderPreferences(user).scheduledWorkoutReminderTime || "18:00",
      scheduledWorkoutReminderDays:
        getStoredReminderPreferences(user).scheduledWorkoutReminderDays || [],
      quietHoursStart:
        getStoredReminderPreferences(user).quietHoursStart || "21:30",
      quietHoursEnd:
        getStoredReminderPreferences(user).quietHoursEnd || "07:00",
      comebackNudgesEnabled: Boolean(
        getStoredReminderPreferences(user).comebackNudgesEnabled
      ),
      comebackThresholdDays: String(
        getStoredReminderPreferences(user).comebackThresholdDays || 4
      ),
      reminderTimezone:
        getStoredReminderPreferences(user).timezone || defaultForm.reminderTimezone,
    });
    setThemePreference(getStoredThemePreference(user));
    setAppearanceDensity(getStoredAppearanceDensity(user));
    setInterfaceScale(getStoredInterfaceScale(user));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    const nextUser = {
      ...user,
      darkMode: getThemePreferenceMeta(form.themePreference).mode === "dark",
      themePreference: form.themePreference,
      appearanceDensity: form.appearanceDensity,
      interfaceScale: form.interfaceScale,
      sex: form.sex,
      age: form.age,
      preferredUnits: form.preferredUnits as "lb" | "kg",
      height: form.height,
      weight: form.weight,
      trainingGoal: form.trainingGoal,
      currentFitnessLevel: form.currentFitnessLevel,
      workoutDaysPerWeek: form.workoutDaysPerWeek,
      experienceLevel: form.experienceLevel,
      workoutLength: form.workoutLength,
      equipmentAccess: form.equipmentAccess,
      maxDumbbellWeight: form.maxDumbbellWeight,
      preferredTrainingDays: form.preferredTrainingDays,
      limitations: form.limitations,
      setupPromptSeen: true,
      setupCompleted: true,
      notes: form.notes,
      reminderPreferences: buildReminderPreferencesFromForm(),
    };

    try {
      emitDevBugInteraction({
        type: "submit",
        kind: "semantic",
        label: "Save profile changes",
        expected: "Profile changes persist and the screen reflects the saved values.",
        actual: "Profile save was requested.",
        status: "info",
      });
      const response = await saveUser(nextUser);
      if (response?.success) {
        setUser(nextUser);
        emitDevBugInteraction({
          type: "lifecycle",
          kind: "semantic",
          label: "Profile changes saved",
          expected: "Profile changes persist and the screen reflects the saved values.",
          actual: "Profile save succeeded.",
          status: "success",
        });
        toast.success("Profile updated");
      } else {
        emitDevBugInteraction({
          type: "lifecycle",
          kind: "semantic",
          label: "Profile changes did not save",
          expected: "Profile changes persist and the screen reflects the saved values.",
          actual: "Profile save request returned without success.",
          status: "failure",
        });
        toast.error("Failed to update profile");
      }
    } catch (error) {
      console.error("Error saving user:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateWorkout = async () => {
    if (!user || !session?.token?.user?._id) return;

    const nextUser = {
      ...user,
      darkMode: getThemePreferenceMeta(form.themePreference).mode === "dark",
      themePreference: form.themePreference,
      appearanceDensity: form.appearanceDensity,
      interfaceScale: form.interfaceScale,
      sex: form.sex,
      age: form.age,
      preferredUnits: form.preferredUnits as "lb" | "kg",
      height: form.height,
      weight: form.weight,
      trainingGoal: form.trainingGoal,
      currentFitnessLevel: form.currentFitnessLevel,
      workoutDaysPerWeek: form.workoutDaysPerWeek,
      experienceLevel: form.experienceLevel,
      workoutLength: form.workoutLength,
      equipmentAccess: form.equipmentAccess,
      maxDumbbellWeight: form.maxDumbbellWeight,
      preferredTrainingDays: form.preferredTrainingDays,
      limitations: form.limitations,
      setupPromptSeen: true,
      setupCompleted: true,
      notes: form.notes,
      reminderPreferences: buildReminderPreferencesFromForm(),
    };

    try {
      setGeneratingWorkout(true);
      await saveUser(nextUser);
      const generated = (await generateWorkoutPlan(
        session.token.user._id,
        normalizeSetupForm(nextUser)
      )) as GeneratedPlanPayload;
      setGeneratedCoachResponse(generated.coachResponse ?? null);
      setGeneratedCoachSource(generated.source);
      setGeneratedCoachSourceDetail(generated.sourceDetail);
      setUser(nextUser);
      const fallbackNotice =
        generated.source === "fallback"
          ? getAIFallbackNotice({
              experience: "plan",
              sourceDetail: generated.sourceDetail,
            })
          : "";
      if (fallbackNotice) {
        toast.info(fallbackNotice);
      } else {
        toast.success(
          "Your first workout plan is ready. Open today's session to review or adjust it."
        );
      }
    } catch (error) {
      console.error("Error generating workout plan:", error);
      toast.error(
        "Your workout plan could not be generated right now. Try again, or save your preferences first and generate later."
      );
    } finally {
      setGeneratingWorkout(false);
    }
  };

  const applyCoachProfilePatch = async (patch: Record<string, any>) => {
    if (!user || !session?.token?.user?._id) return;

    const nextForm = normalizeSetupForm({
      ...user,
      ...form,
      ...patch,
    });
    const nextUser = {
      ...user,
      ...nextForm,
      darkMode: getThemePreferenceMeta(form.themePreference).mode === "dark",
      themePreference: form.themePreference,
      appearanceDensity: form.appearanceDensity,
      interfaceScale: form.interfaceScale,
      setupPromptSeen: true,
      setupCompleted: true,
      reminderPreferences: buildReminderPreferencesFromForm(),
    };

    setForm((prev) => ({
      ...prev,
      ...nextForm,
      themePreference: prev.themePreference,
    }));
    await saveUser(nextUser);
    const generated = await generateWorkoutPlan(
      session.token.user._id,
      normalizeSetupForm(nextUser)
    ) as GeneratedPlanPayload;
    setUser(nextUser);
    setGeneratedCoachResponse(generated.coachResponse ?? null);
    setGeneratedCoachSource(generated.source);
    setGeneratedCoachSourceDetail(generated.sourceDetail);
    const fallbackNotice =
      generated.source === "fallback"
        ? getAIFallbackNotice({
            experience: "plan",
            sourceDetail: generated.sourceDetail,
          })
        : "";
    if (fallbackNotice) {
      toast.info(fallbackNotice);
    }
  };

  const handleCoachAction = async (action: any) => {
    if (!user || !session?.token?.user?._id || !action?.type) {
      return;
    }

    if (action.type === "create_catalog_exercise" && action.exercise?.name) {
      await saveExercise({
        ...action.exercise,
        createdBy: session.token.user._id,
      });

      return `${action.exercise.name} is in your exercise library now. You can add it from the workout screen whenever you want.`;
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
          Keep this focused on the info that should shape your recommendations
          and your generated weekly plan.
        </Alert>

        <Box component="form" onSubmit={handleSubmit}>
          <Stack
            spacing={2}
            sx={{
              pb: {
                xs: "calc(108px + env(safe-area-inset-bottom, 0px))",
                sm: "calc(96px + env(safe-area-inset-bottom, 0px))",
              },
            }}
          >
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

                <Box>
                  <Typography
                    variant="body2"
                    sx={{ mb: 1, color: "text.secondary", fontWeight: 600 }}
                  >
                    Theme
                  </Typography>
                  <Stack spacing={1.1}>
                    {THEME_OPTIONS.map((option) => {
                      const selected = form.themePreference === option;
                      const optionMeta = getThemePreferenceMeta(option);

                      return (
                        <Button
                          key={option}
                          type="button"
                          variant={selected ? "contained" : "outlined"}
                          onClick={() => handleThemePreferenceChange(option)}
                          sx={{
                            justifyContent: "space-between",
                            alignItems: "stretch",
                            textAlign: "left",
                            px: 1.5,
                            py: 1.4,
                            borderRadius: "20px",
                          }}
                        >
                          <Box>
                            <Typography sx={{ fontWeight: 800 }}>
                              {getThemePreferenceLabel(option)}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                mt: 0.4,
                                color: selected
                                  ? "inherit"
                                  : "text.secondary",
                                maxWidth: 420,
                              }}
                            >
                              {getThemePreferenceDescription(option)}
                            </Typography>
                          </Box>
                          <Stack
                            direction="row"
                            spacing={0.75}
                            sx={{ ml: 1.5, alignSelf: "center" }}
                          >
                            <Box
                              sx={{
                                width: 14,
                                height: 14,
                                borderRadius: "999px",
                                border: "1px solid",
                                borderColor: "divider",
                                background:
                                  optionMeta.mode === "dark"
                                    ? optionMeta.backgroundDefault
                                    : optionMeta.primaryMain,
                              }}
                            />
                            <Box
                              sx={{
                                width: 14,
                                height: 14,
                                borderRadius: "999px",
                                border: "1px solid",
                                borderColor: "divider",
                                background: optionMeta.backgroundPaper,
                              }}
                            />
                            <Box
                              sx={{
                                width: 14,
                                height: 14,
                                borderRadius: "999px",
                                border: "1px solid",
                                borderColor: "divider",
                                background: optionMeta.secondaryMain,
                              }}
                            />
                          </Stack>
                        </Button>
                      );
                    })}
                  </Stack>
                </Box>

                <Box>
                  <Typography
                    variant="body2"
                    sx={{ mb: 1, color: "text.secondary", fontWeight: 600 }}
                  >
                    Layout density
                  </Typography>
                  <Stack spacing={1.1}>
                    {APPEARANCE_DENSITY_OPTIONS.map((option) => {
                      const selected = form.appearanceDensity === option;

                      return (
                        <Button
                          key={option}
                          type="button"
                          variant={selected ? "contained" : "outlined"}
                          onClick={() => handleAppearanceDensityChange(option)}
                          sx={{
                            justifyContent: "space-between",
                            alignItems: "stretch",
                            textAlign: "left",
                            px: 1.5,
                            py: 1.2,
                            borderRadius: "18px",
                          }}
                        >
                          <Box>
                            <Typography sx={{ fontWeight: 800 }}>
                              {getAppearanceDensityLabel(option)}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                mt: 0.4,
                                color: selected ? "inherit" : "text.secondary",
                                maxWidth: 420,
                              }}
                            >
                              {getAppearanceDensityDescription(option)}
                            </Typography>
                          </Box>
                        </Button>
                      );
                    })}
                  </Stack>
                </Box>

                <Box>
                  <Typography
                    variant="body2"
                    sx={{ mb: 1, color: "text.secondary", fontWeight: 600 }}
                  >
                    Interface scale
                  </Typography>
                  <Stack spacing={1.1}>
                    {INTERFACE_SCALE_OPTIONS.map((option) => {
                      const selected = form.interfaceScale === option;

                      return (
                        <Button
                          key={option}
                          type="button"
                          variant={selected ? "contained" : "outlined"}
                          onClick={() => handleInterfaceScaleChange(option)}
                          sx={{
                            justifyContent: "space-between",
                            alignItems: "stretch",
                            textAlign: "left",
                            px: 1.5,
                            py: 1.2,
                            borderRadius: "18px",
                          }}
                        >
                          <Box>
                            <Typography sx={{ fontWeight: 800 }}>
                              {getInterfaceScaleLabel(option)}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                mt: 0.4,
                                color: selected ? "inherit" : "text.secondary",
                                maxWidth: 420,
                              }}
                            >
                              {getInterfaceScaleDescription(option)}
                            </Typography>
                          </Box>
                        </Button>
                      );
                    })}
                  </Stack>
                </Box>

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
                  <FormControl fullWidth>
                    <Typography
                      variant="body2"
                      sx={{ mb: 1, color: "text.secondary", fontWeight: 600 }}
                    >
                      Biological sex
                    </Typography>
                    <Select
                      value={form.sex}
                      onChange={handleSelectChange("sex")}
                      displayEmpty
                    >
                      <MenuItem value="">Choose sex</MenuItem>
                      {sexOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    label="Age"
                    value={form.age}
                    onChange={handleFieldChange("age")}
                    fullWidth
                    type="number"
                    inputProps={{ min: 0, max: 120 }}
                  />
                </Stack>

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
                    Current fitness level
                  </Typography>
                  <Select
                    value={form.currentFitnessLevel}
                    onChange={handleSelectChange("currentFitnessLevel")}
                    displayEmpty
                  >
                    <MenuItem value="">Choose current fitness</MenuItem>
                    {currentFitnessOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

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
                    {goalOptions.map((goal) => (
                      <MenuItem key={goal.value} value={goal.value}>
                        {goal.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <Typography
                    variant="body2"
                    sx={{ mb: 1, color: "text.secondary", fontWeight: 600 }}
                  >
                    Target workouts per week
                  </Typography>
                  <Select
                    value={form.workoutDaysPerWeek}
                    onChange={handleSelectChange("workoutDaysPerWeek")}
                    displayEmpty
                  >
                    <MenuItem value="">Choose frequency</MenuItem>
                    {workoutFrequencyOptions.map((days) => (
                      <MenuItem key={days} value={days}>
                        {days} days
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <Typography
                    variant="body2"
                    sx={{ mb: 1, color: "text.secondary", fontWeight: 600 }}
                  >
                    Experience level
                  </Typography>
                  <Select
                    value={form.experienceLevel}
                    onChange={handleSelectChange("experienceLevel")}
                    displayEmpty
                  >
                    <MenuItem value="">Choose experience</MenuItem>
                    {experienceOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <Typography
                    variant="body2"
                    sx={{ mb: 1, color: "text.secondary", fontWeight: 600 }}
                  >
                    Usual workout length
                  </Typography>
                  <Select
                    value={form.workoutLength}
                    onChange={handleSelectChange("workoutLength")}
                    displayEmpty
                  >
                    <MenuItem value="">Choose workout length</MenuItem>
                    {workoutLengthOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box>
                  <Typography
                    variant="body2"
                    sx={{ mb: 1, color: "text.secondary", fontWeight: 600 }}
                  >
                    Equipment access
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {equipmentOptions.map((option) => (
                      <Chip
                        key={option}
                        label={option}
                        clickable
                        color={
                          form.equipmentAccess.includes(option) ? "primary" : "default"
                        }
                        variant={
                          form.equipmentAccess.includes(option) ? "filled" : "outlined"
                        }
                        onClick={() => toggleListValue("equipmentAccess", option)}
                      />
                    ))}
                  </Stack>
                </Box>

                <Box>
                  <Typography
                    variant="body2"
                    sx={{ mb: 1, color: "text.secondary", fontWeight: 600 }}
                  >
                    Preferred training days
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {weekdayOptions.map((day) => (
                      <Chip
                        key={day}
                        label={day}
                        clickable
                        color={
                          form.preferredTrainingDays.includes(day)
                            ? "primary"
                            : "default"
                        }
                        variant={
                          form.preferredTrainingDays.includes(day)
                            ? "filled"
                            : "outlined"
                        }
                        onClick={() => toggleListValue("preferredTrainingDays", day)}
                      />
                    ))}
                  </Stack>
                </Box>

                <TextField
                  label="Limitations"
                  value={form.limitations}
                  onChange={handleFieldChange("limitations")}
                  fullWidth
                  multiline
                  minRows={3}
                  placeholder="Shoulder-friendly pressing, avoid deep knee flexion, low-back caution..."
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
              <Stack spacing={2}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <NotificationsActiveOutlinedIcon color="primary" />
                  <Typography variant="h6">Reminders and comeback nudges</Typography>
                </Box>

                <Typography sx={{ color: "text.secondary" }}>
                  Beta reminders are delivered in-app. They respect quiet hours,
                  your local timezone, and recent completed workouts so the app
                  nudges instead of nags.
                </Typography>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    label={form.remindersEnabled ? "Reminders on" : "Reminders off"}
                    color={form.remindersEnabled ? "primary" : "default"}
                    variant={form.remindersEnabled ? "filled" : "outlined"}
                    clickable
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        remindersEnabled: !prev.remindersEnabled,
                      }))
                    }
                  />
                  <Chip
                    label={
                      form.comebackNudgesEnabled
                        ? "Comeback nudges on"
                        : "Comeback nudges off"
                    }
                    color={form.comebackNudgesEnabled ? "primary" : "default"}
                    variant={form.comebackNudgesEnabled ? "filled" : "outlined"}
                    clickable
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        comebackNudgesEnabled: !prev.comebackNudgesEnabled,
                      }))
                    }
                  />
                </Stack>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="Reminder time"
                    type="time"
                    value={form.scheduledWorkoutReminderTime}
                    onChange={handleFieldChange("scheduledWorkoutReminderTime")}
                    fullWidth
                    inputProps={{ step: 60 }}
                  />
                  <TextField
                    label="Timezone"
                    value={form.reminderTimezone}
                    onChange={handleFieldChange("reminderTimezone")}
                    fullWidth
                    helperText="Use your local timezone so reminders stay aligned while traveling."
                  />
                </Stack>

                <Box>
                  <Typography
                    variant="body2"
                    sx={{ mb: 1, color: "text.secondary", fontWeight: 600 }}
                  >
                    Scheduled reminder days
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {weekdayOptions.map((day) => (
                      <Chip
                        key={day}
                        label={day}
                        clickable
                        color={
                          form.scheduledWorkoutReminderDays.includes(day)
                            ? "primary"
                            : "default"
                        }
                        variant={
                          form.scheduledWorkoutReminderDays.includes(day)
                            ? "filled"
                            : "outlined"
                        }
                        onClick={() =>
                          toggleListValue("scheduledWorkoutReminderDays", day)
                        }
                      />
                    ))}
                  </Stack>
                </Box>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="Quiet hours start"
                    type="time"
                    value={form.quietHoursStart}
                    onChange={handleFieldChange("quietHoursStart")}
                    fullWidth
                    inputProps={{ step: 60 }}
                  />
                  <TextField
                    label="Quiet hours end"
                    type="time"
                    value={form.quietHoursEnd}
                    onChange={handleFieldChange("quietHoursEnd")}
                    fullWidth
                    inputProps={{ step: 60 }}
                  />
                </Stack>

                <TextField
                  label="Comeback nudge after this many days"
                  type="number"
                  value={form.comebackThresholdDays}
                  onChange={handleFieldChange("comebackThresholdDays")}
                  inputProps={{ min: 1, max: 14 }}
                  helperText="Only used when no recent completed workout was logged."
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
              <Stack spacing={2}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <AutoAwesomeIcon color="primary" />
                  <Typography variant="h6">Generate workout plan</Typography>
                </Box>

                <Typography sx={{ color: "text.secondary" }}>
                  The generator uses your biological context, age, current fitness,
                  goal, training frequency, experience, equipment, and notes to
                  build a more informed weekly plan.
                </Typography>

                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  {buildWhatIHeardSummary(normalizeSetupForm(form))}
                </Alert>

                <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
                  <Button
                    variant="contained"
                    startIcon={<AutoAwesomeIcon />}
                    onClick={handleGenerateWorkout}
                    disabled={
                      generatingWorkout ||
                      saving ||
                      !form.trainingGoal ||
                      !form.workoutDaysPerWeek
                    }
                  >
                    {generatingWorkout ? "Generating..." : "Generate workout"}
                  </Button>
                </Box>
              </Stack>
            </Paper>

            {generatedCoachResponse ? (
              <CoachChatPanel
                coachResponse={generatedCoachResponse}
                coachSource={generatedCoachSource}
                coachSourceDetail={generatedCoachSourceDetail}
                profile={normalizeSetupForm(form)}
                defaultMinimized
                minimizedStorageKey="lift-logic:user:assistant-minimized"
                onDismiss={() => {
                  setGeneratedCoachResponse(null);
                  setGeneratedCoachSource(undefined);
                  setGeneratedCoachSourceDetail(undefined);
                }}
                primaryActionLabel="View workouts"
                onPrimaryAction={() => router.push("/routines")}
                onApplyProfilePatch={applyCoachProfilePatch}
                onCoachAction={handleCoachAction}
              />
            ) : null}

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
                    <WorkspacePremiumOutlinedIcon color="primary" />
                    <Typography variant="h6">Plans and pricing</Typography>
                  </Box>
                  <Typography sx={{ mt: 1, color: "text.secondary" }}>
                    Free keeps workout logging and basic tracking open. Pro Beta
                    is the adaptive planning layer with plan generation,
                    assistant-led edits, recurring schedules, and progression
                    recommendations.
                  </Typography>
                </Box>
                <Button variant="outlined" onClick={() => router.push("/pricing")}>
                  View Pricing
                </Button>
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

            <Paper
              elevation={0}
              sx={{
                position: "sticky",
                bottom: {
                  xs: "calc(12px + env(safe-area-inset-bottom, 0px))",
                  sm: 16,
                },
                zIndex: 20,
                p: { xs: 1.25, sm: 1.5 },
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: "background.paper",
                opacity: 0.96,
                backdropFilter: "blur(14px)",
                boxShadow: "0 14px 32px rgba(15,23,42,0.12)",
              }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.25}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", sm: "center" }}
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
                    disabled={!hasChanges || saving || generatingWorkout}
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};

export default UserHomePage;
