"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { Session } from "next-auth";
import {
  clearWorkoutProgram,
  deactivateRecurringRule,
  fetchRecurringRules,
  fetchUser,
  fetchRoutine,
  generateWorkoutPlan,
  saveRecurringRule,
  saveExercise,
  saveUser,
} from "../utils/helpers";
import {
  mergeAnonymousBetaFunnel,
  trackBetaFunnelMilestone,
} from "../utils/betaFunnelApi";
import { normalizeBetaFunnel } from "../utils/betaFunnel";
import { useRouter } from "next/router";
import WorkoutsManager from "../components/WorkoutsManager";
import Header from "../components/Header";
import LoadingIndicator from "../components/LoadingIndicator";
import CoachChatPanel from "../components/CoachChatPanel";
import UpgradePromptDialog from "../components/UpgradePromptDialog";
import {
  Alert,
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
import { resolveUserAccess } from "../utils/entitlements";
import {
  AIResponseSourceDetail,
  getAIFallbackNotice,
} from "../utils/aiFallback";
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
import {
  parseLimitations,
  starterPlanLibrary,
  type StarterPlanPreset,
} from "../utils/workoutGuidance";
import {
  clearPendingLandingCta,
  readAnonymousFunnelId,
  rememberAnonymousFunnelMerged,
  readPendingLandingCta,
  shouldMergeAnonymousFunnel,
} from "../utils/betaFunnelClient";
import {
  AppearanceDensity,
  InterfaceScale,
  isAppearanceDensity,
  isInterfaceScale,
  isThemePreference,
  ThemePreference,
} from "../utils/themePreferences";
import {
  buildRoutineSemanticButtonSx,
  buildRoutineSemanticPanelSx,
  buildRoutineSemanticSelectableChipSx,
} from "../utils/routinesSemanticStyles";
import {
  clearUpgradePromptDismissal,
  getUpgradePromptCooldownState,
  normalizeUpgradePromptDismissals,
  recordUpgradePromptDismissal,
  RoutinesUpgradePromptKey,
  shouldShowAssistantSetupPromptCard,
  UpgradePromptDismissalMap,
} from "../utils/routinesPromptState";

type Routine = any;
type GeneratedPlanPayload = {
  routine: Routine | null;
  coachResponse?: any;
  source?: "ai" | "fallback";
  sourceDetail?: AIResponseSourceDetail;
};

type UpgradePromptKey = RoutinesUpgradePromptKey;

type UpgradePromptConfig = {
  title: string;
  description: string;
  benefits: string[];
  continueLabel: string;
  upgradeLabel: string;
};

const routinesRadius = {
  shell: "34px",
  panel: "28px",
  card: "24px",
  button: "18px",
  chip: "999px",
} as const;

const RoutinesPage = ({
  darkMode,
  setDarkMode,
  setThemePreference,
  setAppearanceDensity,
  setInterfaceScale,
}: {
  darkMode: boolean;
  setDarkMode: (darkMode: boolean) => void;
  setThemePreference: (themePreference: ThemePreference) => void;
  setAppearanceDensity: (density: AppearanceDensity) => void;
  setInterfaceScale: (scale: InterfaceScale) => void;
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
  const [clearingProgram, setClearingProgram] = useState(false);
  const [routineViewKey, setRoutineViewKey] = useState(0);
  const [generatedCoachResponse, setGeneratedCoachResponse] = useState<any>(null);
  const [generatedCoachSource, setGeneratedCoachSource] = useState<
    "ai" | "fallback" | undefined
  >(undefined);
  const [generatedCoachSourceDetail, setGeneratedCoachSourceDetail] = useState<
    AIResponseSourceDetail | undefined
  >(undefined);
  const [setupForm, setSetupForm] = useState(defaultSetupForm);
  const [assistantName, setAssistantName] = useState("");
  const [assistantIntent, setAssistantIntent] = useState<"tracker" | "planner" | null>(
    null
  );
  const [showPlanningDetails, setShowPlanningDetails] = useState(false);
  const [showClearProgramDialog, setShowClearProgramDialog] = useState(false);
  const [upgradePrompt, setUpgradePrompt] = useState<UpgradePromptConfig | null>(null);
  const [upgradePromptKey, setUpgradePromptKey] = useState<UpgradePromptKey | null>(null);
  const [inlineUpgradeReminderKey, setInlineUpgradeReminderKey] = useState<UpgradePromptKey | null>(null);
  const [upgradePromptDismissals, setUpgradePromptDismissals] =
    useState<UpgradePromptDismissalMap>({});
  const access = useMemo(() => resolveUserAccess(user), [user]);
  const plannerGenerationEnabled = access.entitlements.assistantPlanGeneration;
  const plannerRegenerationEnabled = access.entitlements.assistantPlanRegeneration;
  const sessionUserId =
    session?.token?.user?._id || (session as any)?.user?._id || "";
  const upgradePromptStorageKey = sessionUserId
    ? `liftlogic-upgrade-prompt-dismissals:${sessionUserId}`
    : "";

  const routeToPricing = (message: string) => {
    toast.info(message);
    void router.push("/pricing");
  };

  const getUpgradePromptConfig = useCallback((key: UpgradePromptKey): UpgradePromptConfig | null => {
    switch (key) {
      case "assistant_generation":
        return {
          title: "Generate a workout plan with the assistant",
          description:
            "Pro is the planning layer that drafts a program around your goal, schedule, and available equipment. Eligible first-time upgrades can start with a 7-day trial, and you can still keep using Lift Logic for free tracking if you skip this.",
          benefits: [
            "Generate a first plan instead of building each day manually.",
            "Replace or rebuild your week when your constraints change.",
            "Start Pro with a 7-day trial if you want to test the adaptive layer first.",
            "Keep free logging, set tracking, and manual workout edits either way.",
          ],
          continueLabel: "Keep tracking free",
          upgradeLabel: "View trial and pricing",
        };
      case "coach_regeneration":
        return {
          title: "Let the coach revise your plan",
          description:
            "Pro unlocks assistant-led rebuilds when your schedule, equipment, or training assumptions change. Eligible first-time upgrades can start with a 7-day trial. If you skip it, you can still track workouts and use chat for guidance.",
          benefits: [
            "Rebuild the split around updated training days or constraints.",
            "Try the adaptive planning layer for 7 days before full billing begins.",
            "Adjust plan structure without losing your free tracking flow.",
            "Keep chatting with the coach and logging manually if you stay on Free.",
          ],
          continueLabel: "Keep chatting on Free",
          upgradeLabel: "See trial options",
        };
      case "recurring_schedule":
        return null;
      case "progression_recommendation":
        return {
          title: "Turn this momentum into next-session guidance",
          description:
            "You have enough logged progress to generate smarter next-session targets. Pro turns that success into adaptive guidance, and eligible first-time upgrades can start with a 7-day trial while Free keeps the base workout logging open.",
          benefits: [
            "See next-session sets, reps, and load recommendations from your logs.",
            "Review performance trends as your completed data grows.",
            "Start with a 7-day trial if you want proof before a full subscription commitment.",
            "Keep logging every session for free if you want to wait.",
          ],
          continueLabel: "Keep logging free",
          upgradeLabel: "See trial and recommendations",
        };
      case "personal_record_celebration":
        return {
          title: "Build on this personal record while it is fresh",
          description:
            "You just beat a prior benchmark. Pro can turn that win into a tighter next block with updated targets, progression, and schedule follow-through, and eligible first-time upgrades can start with a 7-day trial.",
          benefits: [
            "Use today's PR to tighten next-session recommendations.",
            "Carry the new benchmark into your next week instead of guessing.",
            "Try the paid coaching layer for 7 days before ongoing billing starts.",
            "Keep free workout logging intact even if you dismiss this.",
          ],
          continueLabel: "Stay on free logging",
          upgradeLabel: "Extend this with a trial",
        };
      default:
        return null;
    }
  }, []);

  const persistUpgradePromptDismissals = useCallback(
    (nextDismissals: UpgradePromptDismissalMap) => {
      setUpgradePromptDismissals(nextDismissals);
      if (typeof window === "undefined" || !upgradePromptStorageKey) {
        return;
      }
      window.localStorage.setItem(
        upgradePromptStorageKey,
        JSON.stringify(nextDismissals)
      );
    },
    [upgradePromptStorageKey]
  );

  const handleWeeklyTargetChange = async (nextTarget: string) => {
    if (!user?._id) {
      throw new Error("User not loaded");
    }

    await saveUser({
      _id: user._id,
      workoutDaysPerWeek: nextTarget,
    });

    setUser((previous: any) =>
      previous
        ? {
            ...previous,
            workoutDaysPerWeek: nextTarget,
          }
        : previous
    );
    setSetupForm((previous) => ({
      ...previous,
      workoutDaysPerWeek: nextTarget,
    }));
  };

  const presentUpgradePromptModal = useCallback(
    (key: UpgradePromptKey) => {
      const nextPrompt = getUpgradePromptConfig(key);
      if (!nextPrompt) {
        return;
      }
      setInlineUpgradeReminderKey(null);
      setUpgradePromptKey(key);
      setUpgradePrompt(nextPrompt);
    },
    [getUpgradePromptConfig]
  );

  const openUpgradePrompt = (key: UpgradePromptKey) => {
    const cooldownState = getUpgradePromptCooldownState({
      existing: upgradePromptDismissals,
      key,
    });

    if (cooldownState.blocked || upgradePromptDismissals[key]) {
      setInlineUpgradeReminderKey(key);
      return;
    }

    presentUpgradePromptModal(key);
  };

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
    if (typeof window === "undefined" || !upgradePromptStorageKey) {
      setUpgradePromptDismissals({});
      return;
    }

    try {
      const raw = window.localStorage.getItem(upgradePromptStorageKey);
      setUpgradePromptDismissals(normalizeUpgradePromptDismissals(raw ? JSON.parse(raw) : {}));
    } catch (error) {
      console.error("Error reading routines upgrade prompt state:", error);
      setUpgradePromptDismissals({});
    }
  }, [upgradePromptStorageKey]);

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
    if (user && isThemePreference(user.themePreference)) {
      setThemePreference(user.themePreference);
    } else if (user && typeof user.darkMode === "boolean") {
      setDarkMode(user.darkMode);
    }

    if (user && isAppearanceDensity(user.appearanceDensity)) {
      setAppearanceDensity(user.appearanceDensity);
    }

    if (user && isInterfaceScale(user.interfaceScale)) {
      setInterfaceScale(user.interfaceScale);
    }
  }, [
    setAppearanceDensity,
    setDarkMode,
    setInterfaceScale,
    setThemePreference,
    user,
  ]);

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
      setGeneratedCoachSource(undefined);
      setGeneratedCoachSourceDetail(undefined);
    }
  }, [routine, showSetupDialog, user]);

  useEffect(() => {
    if (!user) return;

    setSetupForm(normalizeSetupForm(user));
    setAssistantName(user.name || user.username || "");

    if (!user?.setupPromptSeen) {
      setShowSetupDialog(true);
      const nextUser = { ...user, setupPromptSeen: true };
      setUser(nextUser);
      saveUser(nextUser).catch((error) => {
        console.error("Error marking setup prompt as seen:", error);
      });
    }
  }, [user]);

  useEffect(() => {
    if (!user?._id || typeof window === "undefined") {
      return;
    }

    const createdAt = user?.createdAt ? new Date(user.createdAt) : null;
    const isFreshSignup =
      createdAt &&
      !Number.isNaN(createdAt.getTime()) &&
      Date.now() - createdAt.getTime() <= 24 * 60 * 60 * 1000;

    let cancelled = false;

    const syncAnonymousFunnel = async () => {
      const pendingLandingCta = readPendingLandingCta();
      const anonymousFunnelId =
        pendingLandingCta?.anonymousFunnelId || readAnonymousFunnelId();

      if (!anonymousFunnelId) {
        return;
      }

      if (!isFreshSignup && !shouldMergeAnonymousFunnel()) {
        clearPendingLandingCta();
        return;
      }

      try {
        await mergeAnonymousBetaFunnel(anonymousFunnelId);
      } catch (error) {
        console.error("Error merging anonymous funnel:", error);
        return;
      }

      if (!cancelled) {
        rememberAnonymousFunnelMerged(anonymousFunnelId);
        clearPendingLandingCta();
      }
    };

    void syncAnonymousFunnel();

    return () => {
      cancelled = true;
    };
  }, [user?._id, user?.createdAt]);

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
    let isDisposed = false;

    const releaseWakeLock = async () => {
      if (!wakeLock) {
        return;
      }

      try {
        await wakeLock.release();
      } catch {
        // Ignore release failures from browsers that auto-release on visibility changes.
      } finally {
        wakeLock = null;
      }
    };

    const requestWakeLock = async () => {
      if (
        isDisposed ||
        typeof document === "undefined" ||
        document.visibilityState !== "visible"
      ) {
        return;
      }

      try {
        if ((navigator as any)?.wakeLock) {
          wakeLock = await (navigator as any).wakeLock.request("screen");
        }
      } catch (error: any) {
        if (error?.name === "NotAllowedError") {
          return;
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void requestWakeLock();
        return;
      }

      void releaseWakeLock();
    };

    void requestWakeLock();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isDisposed = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void releaseWakeLock();
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
  const setupDialogCoachResponse = useMemo(
    () =>
      buildSetupCoachResponse({
        ...setupForm,
        age: setupForm.age,
        sex: setupForm.sex,
      }),
    [setupForm]
  );
  const hasProgramExercises = useMemo(() => {
    const routineDays = routine?.days ? Object.values(routine.days) : [];

    return routineDays.some((dayWorkouts: any) =>
      Array.isArray(dayWorkouts) &&
      dayWorkouts.some(
        (workout: any) =>
          Array.isArray(workout?.exercises) && workout.exercises.length > 0
      )
    );
  }, [routine]);
  const normalizedBetaFunnel = useMemo(
    () => normalizeBetaFunnel(user?.betaFunnel),
    [user?.betaFunnel]
  );
  const showAssistantSetupCard = useMemo(
    () =>
      shouldShowAssistantSetupPromptCard({
        setupCompleted: user?.setupCompleted,
        assistantSetupDeferredAt: user?.assistantSetupDeferredAt,
      }),
    [user?.assistantSetupDeferredAt, user?.setupCompleted]
  );
  const inlineUpgradeReminder = useMemo(
    () =>
      inlineUpgradeReminderKey
        ? getUpgradePromptConfig(inlineUpgradeReminderKey)
        : null,
    [getUpgradePromptConfig, inlineUpgradeReminderKey]
  );
  const showActivationChecklist = Boolean(
    user &&
      !user?.activationChecklistDismissed &&
      !normalizedBetaFunnel.firstWorkoutLoggedAt
  );

  const handleDismissActivationChecklist = async () => {
    if (!user?._id) {
      return;
    }

    try {
      await saveUser({
        _id: user._id,
        activationChecklistDismissed: true,
      });
      setUser((previous: any) =>
        previous
          ? {
              ...previous,
              activationChecklistDismissed: true,
            }
          : previous
      );
    } catch (error) {
      console.error("Failed to dismiss activation checklist", error);
      toast.error("The checklist stayed open. Try dismissing it again.");
    }
  };

  const handleOpenSetupDialog = async () => {
    setShowSetupDialog(true);

    if (!user?._id || !user?.assistantSetupDeferredAt) {
      return;
    }

    try {
      await saveUser({
        _id: user._id,
        assistantSetupDeferredAt: "",
      });
      setUser((previous: any) =>
        previous
          ? {
              ...previous,
              assistantSetupDeferredAt: null,
            }
          : previous
      );
    } catch (error) {
      console.error("Failed to clear assistant setup defer state", error);
    }
  };

  const handleSkipSetupForNow = async () => {
    if (!user?._id) {
      setShowSetupDialog(false);
      return;
    }

    const deferredAt = new Date().toISOString();

    try {
      await saveUser({
        _id: user._id,
        setupPromptSeen: true,
        assistantSetupDeferredAt: deferredAt,
      });
      setUser((previous: any) =>
        previous
          ? {
              ...previous,
              setupPromptSeen: true,
              assistantSetupDeferredAt: deferredAt,
            }
          : previous
      );
      setShowSetupDialog(false);
      void trackBetaFunnelMilestone("pricing_cta_clicked", {
        source: "assistant_setup_skipped_for_now",
      }).catch((error) => {
        console.error("Error tracking assistant setup skip:", error);
      });
      toast.info("Tracker mode stays available. You can come back to planning whenever you want.");
    } catch (error) {
      console.error("Failed to defer assistant setup", error);
      toast.error("Could not save that preference right now.");
    }
  };

  const limitationInsights = useMemo(
    () => parseLimitations(setupForm.limitations),
    [setupForm.limitations]
  );

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

  const applyStarterPlanPreset = (preset: StarterPlanPreset) => {
    setAssistantIntent("planner");
    setShowPlanningDetails(true);
    setSetupForm((prev) =>
      normalizeSetupForm({
        ...prev,
        ...preset.draft,
        setupPromptSeen: true,
      })
    );
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
      assistantSetupDeferredAt: "",
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
        setGeneratedCoachSource(undefined);
        setGeneratedCoachSourceDetail(undefined);
        setShowSetupDialog(false);
        toast.success(
          "Your preferences are saved. You can build a plan anytime from setup."
        );
      } else {
        toast.error("Your setup was not saved. Check your connection and try again.");
      }
    } catch (error) {
      console.error("Error saving setup:", error);
      toast.error("We couldn't save your setup changes just now. Try again in a moment.");
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
      assistantSetupDeferredAt: "",
    };

    try {
      const response = await saveUser(nextUser);
      if (response?.success) {
        setUser(nextUser);
        setGeneratedCoachResponse(buildSetupCoachResponse(normalizeSetupForm(nextUser)));
        setGeneratedCoachSource(undefined);
        setGeneratedCoachSourceDetail(undefined);
        setShowSetupDialog(false);
        toast.success(
          "Tracker mode is ready. Start logging workouts whenever you're ready."
        );
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

    if (!plannerGenerationEnabled) {
      openUpgradePrompt("assistant_generation");
      return;
    }

    const nextUser = {
      ...user,
      name: assistantName.trim() || user.name || user.username,
      ...setupForm,
      setupPromptSeen: true,
      setupCompleted: true,
      assistantSetupDeferredAt: "",
    };

    try {
      setGeneratingWorkout(true);
      await saveUser(nextUser);
      const generated = (await generateWorkoutPlan(
        sessionUserId,
        normalizeSetupForm(nextUser)
      )) as GeneratedPlanPayload;
      setUser(nextUser);
      setRoutine(generated.routine);
      setGeneratedCoachResponse(generated.coachResponse ?? null);
      setGeneratedCoachSource(generated.source);
      setGeneratedCoachSourceDetail(generated.sourceDetail);
      setShowSetupDialog(false);
      setRoutineViewKey((prev) => prev + 1);
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

  const handleOpenReplaceProgram = () => {
    if (!plannerGenerationEnabled) {
      openUpgradePrompt("assistant_generation");
      return;
    }

    setAssistantIntent("planner");
    setShowPlanningDetails(true);
    void handleOpenSetupDialog();
  };

  const handleClearProgram = async () => {
    if (!sessionUserId) {
      toast.error("Your current program was not cleared. Try again in a moment.");
      return;
    }

    try {
      setClearingProgram(true);
      const response = await clearWorkoutProgram(sessionUserId);
      setRoutine(response.routine ?? null);
      setGeneratedCoachResponse(null);
      setGeneratedCoachSource(undefined);
      setGeneratedCoachSourceDetail(undefined);
      setRoutineViewKey((prev) => prev + 1);
      setShowClearProgramDialog(false);
      toast.success("Workout program cleared");
    } catch (error) {
      console.error("Error clearing workout program:", error);
      toast.error("Your current program was not cleared. Try again in a moment.");
    } finally {
      setClearingProgram(false);
    }
  };

  const applyCoachProfilePatch = async (patch: Record<string, any>) => {
    if (!user) return;

    if (!plannerRegenerationEnabled) {
      openUpgradePrompt("coach_regeneration");
      return {
        applied: false,
        blockedReason:
          "I can still help you think through the change here, but rebuilding the plan automatically is part of Pro. Free tracking and manual edits still stay available.",
      };
    }

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
      assistantSetupDeferredAt: "",
    };

    setSetupForm(nextSetupForm);
    await saveUser(nextUser);
    const generated = (await generateWorkoutPlan(
      sessionUserId,
      nextSetupForm
    )) as GeneratedPlanPayload;
    setUser(nextUser);
    setRoutine(generated.routine);
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
    setRoutineViewKey((prev) => prev + 1);
    return { applied: true };
  };

  const handleCoachAction = async (action: any) => {
    if (!user || !sessionUserId || !action?.type) {
      return;
    }

    if (action.type === "clear_all_schedules") {
      const response = await clearWorkoutProgram(sessionUserId);
      setRoutine(response.routine ?? null);
      setGeneratedCoachResponse((prev: any) =>
        prev
          ? {
              ...prev,
              plannedDays: [],
              planSnapshot: [],
            }
          : prev
      );
      setRoutineViewKey((prev) => prev + 1);

      return "I cleared your current workout program and removed upcoming scheduled exercises.";
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

    if (action.type === "create_recurring_exercise" && action.exerciseName) {
      const dayIndexLookup: Record<string, number> = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };
      const dayLabelLookup: Record<string, string> = {
        sunday: "Sunday",
        monday: "Monday",
        tuesday: "Tuesday",
        wednesday: "Wednesday",
        thursday: "Thursday",
        friday: "Friday",
        saturday: "Saturday",
      };
      const dayKey = String(action.dayKey ?? "").toLowerCase();
      const dayOfWeek = dayIndexLookup[dayKey];

      if (dayOfWeek === undefined) {
        return "I couldn't tell which day to schedule that on.";
      }

      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const delta = (dayOfWeek - startDate.getDay() + 7) % 7;
      startDate.setDate(startDate.getDate() + delta);

      const endDate = action.endDate ? new Date(action.endDate) : undefined;
      const exerciseName = String(action.exerciseName).trim();
      const exerciseType = action.exerciseType === "timed" ? "timed" : "weight";
      const templateSets =
        exerciseType === "timed"
          ? [{ name: "Set 1", minutes: 20 }]
          : [
              { name: "Set 1", reps: 8, weight: 0 },
              { name: "Set 2", reps: 8, weight: 0 },
              { name: "Set 3", reps: 8, weight: 0 },
            ];

      await saveRecurringRule({
        userId: sessionUserId,
        exerciseId: exerciseName.toLowerCase().replace(/\s+/g, "-"),
        exerciseName,
        exerciseType,
        routineName: `${dayLabelLookup[dayKey]} Assistant Add-On`,
        recurrenceType: action.recurrenceType === "daily" ? "daily" : "weekly",
        interval: 1,
        intervalWeeks: 1,
        dayOfWeek,
        daysOfWeek: [dayOfWeek],
        startDate,
        endDate,
        templateSets,
        defaultMax: 0,
        defaultRest: exerciseType === "timed" ? 0 : 90,
        active: true,
      } as any);

      setRoutineViewKey((prev) => prev + 1);

      const throughLine =
        endDate && !Number.isNaN(endDate.getTime())
          ? ` through ${endDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}`
          : "";

      return `I added ${exerciseName} to ${dayLabelLookup[dayKey]}${throughLine}.`;
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
              pt: { xs: 2.25, sm: 2.75 },
              pb: 2.5,
              borderBottom: "1px solid",
              borderColor: "divider",
              position: "relative",
              overflow: "hidden",
              overflowX: "clip",
              background: darkMode
                ? "linear-gradient(145deg, rgba(17,24,39,0.94), rgba(30,41,59,0.86))"
                : "linear-gradient(145deg, rgba(255,255,255,0.98), rgba(241,245,249,0.9))",
            }}
          >
            <Box
              sx={{
                position: "relative",
                zIndex: 1,
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  top: -80,
                  right: -10,
                  width: 250,
                  height: 250,
                  borderRadius: "50%",
                  background: darkMode
                    ? "radial-gradient(circle, rgba(59,130,246,0.16) 0%, rgba(59,130,246,0) 70%)"
                    : "radial-gradient(circle, rgba(59,130,246,0.14) 0%, rgba(59,130,246,0) 70%)",
                  pointerEvents: "none",
                }}
              />
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
                variant="h2"
                sx={{
                  mt: 0.8,
                  maxWidth: 560,
                  fontFamily: 'var(--font-display), "Manrope", sans-serif',
                  letterSpacing: "-0.06em",
                  lineHeight: 0.98,
                  fontSize: { xs: "2.8rem", sm: "3.6rem" },
                }}
              >
                Today&apos;s training
              </Typography>
              <Typography
                sx={{
                  mt: 1.35,
                  maxWidth: 560,
                  color: "text.secondary",
                  fontSize: { xs: "1rem", sm: "1.05rem" },
                  lineHeight: 1.7,
                }}
              >
                Pick the day, open the workout, and move through your sets
                without extra clutter.
              </Typography>
              <Header user={user} darkMode={darkMode} />
            </Box>
          </Box>
          <Box
            sx={{
              px: { xs: 1.5, sm: 2 },
              py: { xs: 1.75, sm: 2.25 },
              minWidth: 0,
              overflowX: "clip",
            }}
          >
            <Paper
              elevation={0}
              sx={{
                mb: 2,
                p: { xs: 1.75, sm: 2.1 },
                borderRadius: routinesRadius.panel,
                border: "1px solid",
                borderColor: "divider",
                overflow: "hidden",
                position: "relative",
                background: darkMode
                  ? "linear-gradient(145deg, rgba(30,41,59,0.94), rgba(15,23,42,0.82))"
                  : "linear-gradient(145deg, rgba(255,255,255,0.97), rgba(241,245,249,0.92))",
                boxShadow: darkMode
                  ? "0 22px 44px rgba(2,6,23,0.22)"
                  : "0 20px 42px rgba(15,23,42,0.06)",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  inset: "auto -10px -30px auto",
                  width: 180,
                  height: 180,
                  borderRadius: "50%",
                  background: darkMode
                    ? "radial-gradient(circle, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0) 72%)"
                    : "radial-gradient(circle, rgba(148,163,184,0.14) 0%, rgba(148,163,184,0) 72%)",
                  pointerEvents: "none",
                }}
              />
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", md: "center" }}
                sx={{ position: "relative" }}
              >
                <Box sx={{ maxWidth: 700, minWidth: 0 }}>
                  <Typography
                    variant="overline"
                    sx={{ color: "text.secondary", letterSpacing: "0.12em" }}
                  >
                    Program Management
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 0.55, maxWidth: 620 }}>
                    Replace or reset your workout plan in one step
                  </Typography>
                  <Typography sx={{ mt: 1, color: "text.secondary", maxWidth: 640, lineHeight: 1.7 }}>
                    Generating a new plan now replaces your upcoming scheduled exercises from today
                    forward. You can also clear everything and start from a blank slate.
                  </Typography>
                  <Typography sx={{ mt: 1, color: "text.secondary", maxWidth: 660, lineHeight: 1.7 }}>
                    Free keeps logging and basic tracking open. Pro is the
                    adaptive layer for assistant-built plans, recurring schedules,
                    plan revisions, and progression recommendations.
                  </Typography>
                  {!access.hasPremiumAccess ? (
                    <Alert
                      severity="info"
                      sx={{
                        mt: 1.25,
                        maxWidth: 640,
                        borderRadius: routinesRadius.card,
                      }}
                    >
                      Free stays focused on logging. Upgrade to Pro for assistant-built plans,
                      recurring schedules, and adaptive progression.
                    </Alert>
                  ) : null}
                </Box>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  useFlexGap
                  flexWrap="wrap"
                  sx={{
                    width: { xs: "100%", md: "auto" },
                    position: { xs: "sticky", md: "static" },
                    bottom: { xs: 0, md: "auto" },
                    alignSelf: { xs: "stretch", md: "auto" },
                  }}
                >
                  <Button
                    variant="text"
                    onClick={() => router.push("/pricing")}
                    fullWidth
                    sx={{
                      borderRadius: routinesRadius.button,
                      justifyContent: { xs: "center", md: "center" },
                    }}
                  >
                    View pricing
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => setShowClearProgramDialog(true)}
                    disabled={clearingProgram || generatingWorkout || !hasProgramExercises}
                    fullWidth
                    sx={{ borderRadius: routinesRadius.button }}
                  >
                    {clearingProgram ? "Clearing..." : "Start blank"}
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleOpenReplaceProgram}
                    disabled={generatingWorkout || savingSetup}
                    fullWidth
                    sx={{ borderRadius: routinesRadius.button }}
                  >
                    {plannerGenerationEnabled
                      ? hasProgramExercises
                        ? "Replace program"
                        : "Create program"
                      : "Upgrade for planning"}
                  </Button>
                </Stack>
              </Stack>
            </Paper>
            {generatedCoachResponse ? (
              <Box sx={{ mb: 2 }}>
                <CoachChatPanel
                  coachResponse={generatedCoachResponse}
                  coachSource={generatedCoachSource}
                  coachSourceDetail={generatedCoachSourceDetail}
                  profile={setupForm}
                  defaultMinimized={false}
                  minimizedStorageKey="lift-logic:routines:assistant-minimized"
                  onDismiss={() => {
                    setGeneratedCoachResponse(null);
                    setGeneratedCoachSource(undefined);
                    setGeneratedCoachSourceDetail(undefined);
                  }}
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
              onWeeklyTargetChange={handleWeeklyTargetChange}
              onRequestRecurringUpgradePrompt={() =>
                openUpgradePrompt("recurring_schedule")
              }
              onRequestProgressionUpgradePrompt={() =>
                openUpgradePrompt("progression_recommendation")
              }
              onRequestPersonalRecordUpgradePrompt={() =>
                openUpgradePrompt("personal_record_celebration")
              }
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
        overflowX: "clip",
        background: darkMode
          ? "radial-gradient(circle at top, rgba(59,130,246,0.1), transparent 36%), linear-gradient(180deg, #020617 0%, #0f172a 100%)"
          : "radial-gradient(circle at top, rgba(148,163,184,0.14), transparent 32%), linear-gradient(180deg, #f8fbff 0%, #e7edf5 100%)",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 760,
          mx: "auto",
          minWidth: 0,
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
          overflowX: "clip",
          overflowY: "visible",
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
                    First, choose whether you want planning help or just want to
                    start tracking workouts. If you want a personalized plan, you
                    can add a little profile context before I generate it.
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label="1. Choose your path" color="primary" variant="filled" />
                  <Chip label="2. Add planning details if you want them" variant="outlined" />
                  <Chip label="3. Refine later in chat" variant="outlined" />
                </Stack>
              </Stack>
            </Paper>

            <CoachChatPanel
              coachResponse={setupDialogCoachResponse}
              profile={setupForm}
              onApplyProfilePatch={(patch) =>
                setSetupForm((prev) => normalizeSetupForm({ ...prev, ...patch }))
              }
            />

            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: "background.paper",
                ...buildRoutineSemanticPanelSx("premium", darkMode),
              }}
            >
              <Stack spacing={1.5}>
                <Typography sx={{ fontWeight: 700 }}>
                  What do you want to do first?
                </Typography>
                <Typography sx={{ color: "text.secondary" }}>
                  Choose the fast path to start logging now, or get help building
                  your first plan.
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
                    You can start logging workouts right away without entering age
                    or biological sex. You can always add profile details later if
                    you want planning help.
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
            {!plannerGenerationEnabled ? (
              <Alert severity="info" sx={{ borderRadius: 3 }}>
                Pro is required to generate assistant-built workout plans. You can still save
                your preferences here and keep using free workout tracking.
              </Alert>
            ) : null}
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
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>
                    Starter plan library
                  </Typography>
                  <Typography sx={{ mt: 0.5, color: "text.secondary" }}>
                    If you do not want to build from scratch, start from a proven weekly shape and tweak it after the first draft appears.
                  </Typography>
                </Box>

                <Stack spacing={1.2}>
                  {starterPlanLibrary.map((preset) => (
                    <Paper
                      key={preset.id}
                      elevation={0}
                      sx={{
                        p: 1.25,
                        borderRadius: 3,
                        border: "1px solid",
                        borderColor: "divider",
                        backgroundColor: darkMode
                          ? "rgba(15,23,42,0.42)"
                          : "rgba(248,250,252,0.92)",
                      }}
                    >
                      <Stack spacing={1}>
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={1}
                          justifyContent="space-between"
                          alignItems={{ xs: "flex-start", sm: "center" }}
                        >
                          <Box>
                            <Typography sx={{ fontWeight: 700 }}>{preset.title}</Typography>
                            <Typography sx={{ mt: 0.3, color: "text.secondary" }}>
                              {preset.description}
                            </Typography>
                          </Box>
                          <Button
                            variant="outlined"
                            onClick={() => applyStarterPlanPreset(preset)}
                          >
                            Use this starter
                          </Button>
                        </Stack>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip size="small" color="primary" variant="outlined" label={preset.commitment} />
                          {preset.preview.map((item) => (
                            <Chip key={`${preset.id}-${item}`} size="small" variant="outlined" label={item} />
                          ))}
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}
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
                <Typography sx={{ fontWeight: 700 }}>
                  Planning profile
                </Typography>
                <Typography sx={{ color: "text.secondary" }}>
                  Add the basics you want the assistant to use for planning. Age
                  and biological sex are optional here and only help personalize
                  the plan.
                </Typography>
                <TextField
                  label="Name"
                  value={assistantName}
                  onChange={(event) => setAssistantName(event.target.value)}
                  fullWidth
                />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="Age (optional)"
                    value={setupForm.age}
                    onChange={handleSetupFieldChange("age")}
                    fullWidth
                    type="number"
                    inputProps={{ min: 0, max: 120 }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
                      Biological sex (optional)
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
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>
                    Plan draft readiness
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
                  <ToggleButton
                    key={days}
                    value={days}
                    sx={buildRoutineSemanticSelectableChipSx(
                      setupForm.workoutDaysPerWeek === days,
                      darkMode
                    )}
                  >
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
                {limitationInsights.length > 0 ? (
                  <Stack spacing={0.75} sx={{ mt: 1 }}>
                    {limitationInsights.map((insight) => (
                      <Paper
                        key={insight.id}
                        elevation={0}
                        sx={{
                          p: 1,
                          borderRadius: 2,
                          border: "1px solid",
                          borderColor: "divider",
                          backgroundColor: darkMode
                            ? "rgba(15,23,42,0.42)"
                            : "rgba(248,250,252,0.92)",
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {insight.title}
                        </Typography>
                        <Typography variant="caption" sx={{ display: "block", mt: 0.35, color: "text.secondary" }}>
                          {insight.summary}
                        </Typography>
                      </Paper>
                    ))}
                  </Stack>
                ) : null}
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
                {hasProgramExercises
                  ? "Generating a new plan will replace your upcoming scheduled exercises from today forward. The workout assistant can still revise the split, exercises, and assumptions afterward."
                  : "The first draft does not need to be perfect. The workout assistant can revise the split, exercises, and assumptions after generation."}
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button variant="outlined" onClick={() => void handleSkipSetupForNow()}>
                  Close setup for now
                </Button>
                <Button
                  variant="contained"
                  sx={buildRoutineSemanticButtonSx(
                    plannerGenerationEnabled ? "primaryAction" : "premium",
                    "contained",
                    darkMode
                  )}
                  onClick={
                    plannerGenerationEnabled
                      ? handleGenerateWorkoutFromSetup
                      : () => openUpgradePrompt("assistant_generation")
                  }
                  disabled={
                    generatingWorkout ||
                    savingSetup ||
                    !setupReadyToGenerate
                  }
                >
                  {plannerGenerationEnabled
                    ? generatingWorkout
                      ? "Generating..."
                      : hasProgramExercises
                      ? "Build and replace plan"
                      : "Build my first plan"
                    : "Upgrade for Pro"}
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleSaveSetup}
                  disabled={
                    savingSetup ||
                    generatingWorkout ||
                    !setupReadyToGenerate
                  }
                >
                  {savingSetup ? "Saving..." : "Save preferences only"}
                </Button>
              </Stack>
            </Box>
          </>
        ) : null}
          </Stack>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showClearProgramDialog}
        onClose={() => {
          if (!clearingProgram) {
            setShowClearProgramDialog(false);
          }
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Clear current program?</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2}>
            <Typography sx={{ color: "text.secondary" }}>
              This removes your active recurring workout rules and deletes upcoming scheduled
              exercises from today forward, while keeping past completed history intact.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={() => setShowClearProgramDialog(false)}
                disabled={clearingProgram}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={handleClearProgram}
                disabled={clearingProgram}
              >
                {clearingProgram ? "Clearing..." : "Clear program"}
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>

      <UpgradePromptDialog
        open={Boolean(upgradePrompt)}
        title={upgradePrompt?.title || ""}
        description={upgradePrompt?.description || ""}
        benefits={upgradePrompt?.benefits || []}
        continueLabel={upgradePrompt?.continueLabel}
        upgradeLabel={upgradePrompt?.upgradeLabel}
        remindLaterLabel="Remind me later"
        onView={() => {
          void trackBetaFunnelMilestone("upgrade_prompt_viewed", {
            source: upgradePromptKey || undefined,
          }).catch((error) => {
            console.error("Error tracking upgrade prompt view:", error);
          });
        }}
        onClose={() => {
          if (upgradePromptKey) {
            const nextDismissals = recordUpgradePromptDismissal({
              existing: upgradePromptDismissals,
              key: upgradePromptKey,
              reason: "declined",
            });
            persistUpgradePromptDismissals(nextDismissals);
            void trackBetaFunnelMilestone("pricing_cta_clicked", {
              source: `upgrade_prompt_declined_${upgradePromptKey}`,
            }).catch((error) => {
              console.error("Error tracking upgrade prompt decline:", error);
            });
            setInlineUpgradeReminderKey(upgradePromptKey);
          }
          setUpgradePrompt(null);
          setUpgradePromptKey(null);
        }}
        onRemindLater={() => {
          if (upgradePromptKey) {
            const nextDismissals = recordUpgradePromptDismissal({
              existing: upgradePromptDismissals,
              key: upgradePromptKey,
              reason: "snoozed",
            });
            persistUpgradePromptDismissals(nextDismissals);
            void trackBetaFunnelMilestone("pricing_cta_clicked", {
              source: `upgrade_prompt_snoozed_${upgradePromptKey}`,
            }).catch((error) => {
              console.error("Error tracking upgrade prompt snooze:", error);
            });
            setInlineUpgradeReminderKey(upgradePromptKey);
          }
          setUpgradePrompt(null);
          setUpgradePromptKey(null);
        }}
        onUpgrade={() => {
          void trackBetaFunnelMilestone("upgrade_prompt_clicked", {
            source: upgradePromptKey || undefined,
          }).catch((error) => {
            console.error("Error tracking upgrade prompt click:", error);
          });
          if (upgradePromptKey) {
            persistUpgradePromptDismissals(
              clearUpgradePromptDismissal({
                existing: upgradePromptDismissals,
                key: upgradePromptKey,
              })
            );
          }
          setUpgradePrompt(null);
          setUpgradePromptKey(null);
          routeToPricing("Explore Pro plans and pricing.");
        }}
      />

      {inlineUpgradeReminder && inlineUpgradeReminderKey && !showSetupDialog ? (
        <Paper
          elevation={0}
          sx={{
            position: "fixed",
            left: { xs: 12, sm: 24 },
            bottom: { xs: 88, sm: 24 },
            width: { xs: "calc(100% - 24px)", sm: 420 },
            zIndex: 1200,
            p: 1.5,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: darkMode ? "rgba(15,23,42,0.94)" : "rgba(255,255,255,0.98)",
            boxShadow: darkMode
              ? "0 18px 34px rgba(2,6,23,0.42)"
              : "0 16px 32px rgba(15,23,42,0.12)",
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Keep the workout moving
          </Typography>
          <Typography sx={{ mt: 0.5, color: "text.secondary" }}>
            You already said no to this upgrade moment once. Free tracking is still open, and the
            paid coaching layer is here if you want to revisit it without another full interruption.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1.5 }}>
            <Button
              variant="contained"
              onClick={() => presentUpgradePromptModal(inlineUpgradeReminderKey)}
            >
              Show upgrade options
            </Button>
            <Button
              variant="outlined"
              onClick={() => setInlineUpgradeReminderKey(null)}
            >
              Keep going free
            </Button>
          </Stack>
        </Paper>
      ) : null}

      {showActivationChecklist && !showSetupDialog ? (
        <Paper
          elevation={0}
          sx={{
            position: "fixed",
            right: { xs: 12, sm: 24 },
            bottom: {
              xs: "calc(12px + var(--liftlogic-overlay-bottom-offset, 0px))",
              sm: "calc(24px + var(--liftlogic-overlay-bottom-offset, 0px))",
            },
            width: { xs: "calc(100% - 24px)", sm: 380 },
            p: 1.75,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: "background.paper",
            boxShadow: "0 14px 34px rgba(15,23,42,0.14)",
            zIndex: 1300,
          }}
        >
          <Typography variant="overline" sx={{ color: "text.secondary" }}>
            Activation Checklist
          </Typography>
          <Typography variant="subtitle1" sx={{ mt: 0.25, fontWeight: 700 }}>
            Get to your first real win
          </Typography>
          <Typography sx={{ mt: 0.5, color: "text.secondary" }}>
            Follow the next few steps until your first workout is logged. The checklist stays here
            across sessions unless you dismiss it.
          </Typography>
          <Stack spacing={1} sx={{ mt: 1.5 }}>
            <Paper variant="outlined" sx={{ p: 1.1, borderRadius: 2 }}>
              <Typography sx={{ fontWeight: 700 }}>
                {user?.setupCompleted ? "Done: setup path chosen" : "1. Finish assistant setup"}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.35, color: "text.secondary" }}>
                Lock in your goal, training frequency, and plan path so the routines flow can stop
                guessing.
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.1, borderRadius: 2 }}>
              <Typography sx={{ fontWeight: 700 }}>
                {hasProgramExercises ? "Done: first workout created" : "2. Create your first workout"}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.35, color: "text.secondary" }}>
                Build a starter plan or add your first exercise so today&apos;s workout has a clear
                next step.
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.1, borderRadius: 2 }}>
              <Typography sx={{ fontWeight: 700 }}>
                {normalizedBetaFunnel.firstWorkoutLoggedAt
                  ? "Done: first workout logged"
                  : "3. Log your first workout"}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.35, color: "text.secondary" }}>
                Once you log a real session, Lift Logic can start personalizing progress,
                celebrations, and next-step recommendations.
              </Typography>
            </Paper>
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1.5 }}>
            <Button variant="contained" onClick={() => void handleOpenSetupDialog()}>
              {user?.setupCompleted ? "Refine setup" : "Open assistant setup"}
            </Button>
            <Button variant="outlined" onClick={() => router.push("/user")}>
              Open profile
            </Button>
            <Button variant="text" onClick={() => void handleDismissActivationChecklist()}>
              Dismiss
            </Button>
          </Stack>
        </Paper>
      ) : user && showAssistantSetupCard && !showSetupDialog ? (
        <Paper
          elevation={0}
          sx={{
            position: "fixed",
            right: { xs: 12, sm: 24 },
            bottom: {
              xs: "calc(12px + var(--liftlogic-overlay-bottom-offset, 0px))",
              sm: "calc(24px + var(--liftlogic-overlay-bottom-offset, 0px))",
            },
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
            Planning help is available when you want it
          </Typography>
          <Typography sx={{ mt: 0.5, color: "text.secondary" }}>
            Free tracking works on its own. If you want Lift Logic to draft and adapt the week for
            you, you can open assistant setup whenever you are ready.
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
            <Button variant="contained" onClick={() => void handleOpenSetupDialog()}>
              Start planning
            </Button>
            <Button variant="text" onClick={() => router.push("/user")}>
              Full profile
            </Button>
            <Button variant="text" onClick={() => void handleSkipSetupForNow()}>
              Maybe later
            </Button>
          </Stack>
        </Paper>
      ) : null}
    </Box>
  );
};

export default RoutinesPage;
