import React, { useEffect, useMemo, useRef, useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import { toast } from "react-toastify";
import {
  BillingPlan,
  BillingPriceOption,
  BillingSummaryResponse,
  FeatureFlagResolution,
} from "../utils/types";
import {
  trackObservabilityEvent,
} from "../utils/helpers";
import {
  createBillingCheckoutSession,
  createBillingPortalSession,
  fetchBillingSummary,
} from "../utils/billingClient";
import { trackBetaFunnelMilestone } from "../utils/betaFunnelApi";
import {
  fetchResolvedFeatureFlags,
  logFeatureFlagExposure,
} from "../utils/featureFlagsClient";
import { brandBackgrounds, brandRadii } from "../utils/brandSystem";

const pricingRadius = brandRadii;
const trialDays = 7;

const freePlanFeatures = [
  "Workout logging and quick add",
  "Daily workout flow with set logging",
  "Exercise library and profile settings",
  "Feedback and bug reporting tools",
];

const starterPlanFeatures = [
  "One-time kickoff plan built from your setup",
  "Four-week starter structure with two revision passes",
  "Keeps your account, logs, and preferences intact for a later Pro upgrade",
  "Good fit when you want a concrete plan before committing to a subscription",
];

const proPlanFeatures = [
  "Adaptive plan generation",
  "Assistant-driven plan edits and schedule changes",
  "Recurring workout schedules",
  "Progress-based recommendations from your logs",
  `Eligible first-time upgrades can start with a ${trialDays}-day Pro trial`,
];

const comparisonRows = [
  {
    label: "Workout logging and quick add",
    free: "Included",
    starter: "Included",
    pro: "Included",
  },
  {
    label: "Focused daily workout flow",
    free: "Included",
    starter: "Included",
    pro: "Included",
  },
  {
    label: "Profile settings and feedback tools",
    free: "Included",
    starter: "Included",
    pro: "Included",
  },
  {
    label: "Adaptive plan generation",
    free: "Pro",
    starter: "Starter kickoff build",
    pro: "Included",
  },
  {
    label: "Assistant-driven plan revisions",
    free: "Pro",
    starter: "Two revision passes",
    pro: "Included",
  },
  {
    label: "Recurring workout schedules",
    free: "Pro",
    starter: "Manual follow-through",
    pro: "Included",
  },
  {
    label: "Progress-based recommendations",
    free: "Pro",
    starter: "Upgrade path into Pro",
    pro: "Included",
  },
  {
    label: "Risk-reversal for first upgrade",
    free: "No trial",
    starter: "One-time scope",
    pro: `${trialDays}-day trial`,
  },
];

const premiumProofModules = [
  {
    title: "See the plan before you pay",
    eyebrow: "Sample generated week",
    source: "pricing_proof_sample_plan",
    bullets: [
      "Mon: Lower strength, Wed: Upper strength, Fri: Full-body progression",
      "Uses your training days, equipment access, and session length to keep the week realistic",
      "Pairs core lifts with accessories that fit the time budget instead of dumping a generic template",
    ],
  },
  {
    title: "Preview the recommendation layer",
    eyebrow: "Next-session recommendation",
    source: "pricing_proof_recommendation_preview",
    bullets: [
      "Bench press next week: 155 lb x 6 for 3 working sets after a 135 / 145 ramp-up",
      "Reasoning: you hit all prior targets with room left, so the app nudges load without blowing up fatigue",
      "If you undershoot, Pro adapts the next recommendation instead of pretending the plan never met real life",
    ],
  },
  {
    title: "Watch the week adapt to real life",
    eyebrow: "Before vs after schedule change",
    source: "pricing_proof_schedule_adjustment",
    bullets: [
      "Before: Tue / Thu / Sat gym split with full equipment",
      "After: Wed / Fri / Sun, 45-minute sessions, hotel dumbbells only",
      "Pro rewrites the week around the new constraint set without forcing you to start over",
    ],
  },
];

const premiumTrustSignals = [
  "You keep your workout history, setup, and logs even if you cancel after the trial.",
  "Free logging remains useful on its own, so you are not paying just to access your past training.",
  "The paid layer is specifically the coaching logic: plan generation, revisions, recurring schedules, and recommendations.",
];

const premiumFaqItems = [
  {
    question: "What do I actually get that Free does not?",
    answer:
      "Free keeps the daily logging flow clean. Pro is what drafts the week, revises it around your constraints, and turns your logged performance into updated recommendations.",
  },
  {
    question: "What happens if my schedule changes after I buy?",
    answer:
      "That is one of the main reasons Pro exists. You can regenerate around fewer days, shorter sessions, different equipment, or new limitations instead of rebuilding manually.",
  },
  {
    question: "What if I try the trial and decide it is not worth it?",
    answer:
      "Your account falls back to free logging, and you keep your workout history, setup, and completed sessions. The trial is meant to let the adaptive layer prove itself first.",
  },
];

const cancelReasonOptions = [
  {
    value: "busy",
    label: "Life is packed right now",
    helper: "Keep the relationship lighter for a month instead of treating churn like the only option.",
  },
  {
    value: "overwhelmed",
    label: "The plan feels like too much",
    helper: "A simpler rhythm or shorter reset can save the account without pretending motivation is infinite.",
  },
  {
    value: "value",
    label: "I need more proof",
    helper: "Take the lighter path while you decide whether the coaching layer is earning its place.",
  },
  {
    value: "other",
    label: "Something else",
    helper: "We will still log the reason so churn pressure is visible in the monetization funnel.",
  },
] as const;

const defaultPriceOptions: BillingPriceOption[] = [
  {
    interval: "month",
    label: process.env.NEXT_PUBLIC_STRIPE_PRO_BETA_MONTHLY_LABEL || "$12 / month",
    checkoutEnabled: false,
  },
  {
    interval: "year",
    label: process.env.NEXT_PUBLIC_STRIPE_PRO_BETA_YEARLY_LABEL || "$79 / year",
    checkoutEnabled: false,
  },
];

const statusTone: Record<
  BillingSummaryResponse["subscriptionStatus"],
  "info" | "success" | "warning" | "error"
> = {
  inactive: "info",
  trialing: "success",
  active: "success",
  past_due: "warning",
  canceled: "info",
  unpaid: "warning",
  incomplete: "warning",
  incomplete_expired: "error",
  paused: "warning",
};

const statusLabel: Record<BillingSummaryResponse["subscriptionStatus"], string> = {
  inactive: "Free",
  trialing: "Trialing",
  active: "Active",
  past_due: "Past due",
  canceled: "Canceled",
  unpaid: "Unpaid",
  incomplete: "Incomplete",
  incomplete_expired: "Expired",
  paused: "Paused",
};

const formatBillingDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

const PricingPage: React.FC = () => {
  const router = useRouter();
  const { status } = useSession();
  const [billingSummary, setBillingSummary] = useState<BillingSummaryResponse | null>(
    null
  );
  const [billingLoading, setBillingLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<"" | "month" | "year" | "portal">(
    ""
  );
  const [billingError, setBillingError] = useState("");
  const [showCancelSaveDialog, setShowCancelSaveDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState<(typeof cancelReasonOptions)[number]["value"]>(
    "busy"
  );
  const [resolvedFlags, setResolvedFlags] = useState<FeatureFlagResolution[]>([]);
  const pricingViewTrackedRef = useRef(false);
  const pricingExperimentExposureTrackedRef = useRef(false);

  const isAuthenticated = status === "authenticated";

  const loadBillingSummary = async () => {
    if (!isAuthenticated) {
      setBillingSummary(null);
      setBillingLoading(false);
      setBillingError("");
      return;
    }

    try {
      setBillingLoading(true);
      setBillingError("");
      const summary = await fetchBillingSummary();
      setBillingSummary(summary);
    } catch (error) {
      console.error("Error loading billing summary:", error);
      setBillingError(
        error instanceof Error
          ? error.message
          : "Unable to load your billing status right now."
      );
    } finally {
      setBillingLoading(false);
    }
  };

  useEffect(() => {
    void loadBillingSummary();
  }, [isAuthenticated]);

  useEffect(() => {
    let active = true;

    const loadFlags = async () => {
      try {
        const response = await fetchResolvedFeatureFlags("/pricing");
        if (!active) {
          return;
        }
        setResolvedFlags(response.flags || []);
      } catch (error) {
        console.error("Error loading feature flags:", error);
      }
    };

    void loadFlags();

    return () => {
      active = false;
    };
  }, []);

  const pricingExperiment =
    resolvedFlags.find((flag) => flag.key === "pricing_premium_proof_experiment") || null;
  const pricingExperimentSuffix =
    pricingExperiment?.enabled && pricingExperiment.variant !== "control"
      ? `_exp_${pricingExperiment.variant}`
      : "";

  useEffect(() => {
    if (!pricingExperiment?.enabled || pricingExperimentExposureTrackedRef.current) {
      return;
    }

    pricingExperimentExposureTrackedRef.current = true;
    void logFeatureFlagExposure({
      key: pricingExperiment.key,
      variant: pricingExperiment.variant,
      route: "/pricing",
      source: "pricing_page_view",
    }).catch((error) => {
      pricingExperimentExposureTrackedRef.current = false;
      console.error("Error logging pricing experiment exposure:", error);
    });
  }, [pricingExperiment]);

  useEffect(() => {
    if (pricingViewTrackedRef.current) {
      return;
    }

    pricingViewTrackedRef.current = true;
    void trackBetaFunnelMilestone("pricing_page_viewed", {
      source: `${
        isAuthenticated ? "pricing_page_authenticated" : "pricing_page_anonymous"
      }${pricingExperimentSuffix}`,
    }).catch((error) => {
      pricingViewTrackedRef.current = false;
      console.error("Error tracking pricing page view:", error);
    });
  }, [isAuthenticated, pricingExperimentSuffix]);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const checkoutState = String(router.query.checkout || "");
    const portalState = String(router.query.portal || "");

    if (checkoutState === "success") {
      toast.success("Checkout completed. Billing status will refresh in a moment.");
      void loadBillingSummary();
    } else if (checkoutState === "cancelled") {
      toast.info("Checkout was cancelled.");
    } else if (portalState === "returned") {
      toast.success("Returned from the billing portal.");
      void loadBillingSummary();
    }
  }, [router.isReady, router.query.checkout, router.query.portal]);

  const visiblePriceOptions =
    billingSummary?.prices && billingSummary.prices.length > 0
      ? billingSummary.prices
      : defaultPriceOptions;

  const proPlanPriceLabel = useMemo(
    () => visiblePriceOptions.map((option) => option.label).join(" or "),
    [visiblePriceOptions]
  );

  const primaryCta =
    status === "authenticated"
      ? { href: "/routines", label: "Open workouts" }
      : { href: "/signup", label: "Start free" };
  const starterOfferHref =
    status === "authenticated"
      ? "/user?starterOffer=starter_kickoff"
      : "/signup?plan=starter_kickoff";

  const billingPlan: BillingPlan = billingSummary?.billingPlan || "free";
  const portalEnabled = Boolean(billingSummary?.portalEnabled);
  const checkoutEnabled = Boolean(billingSummary?.configured);
  const currentPeriodEndLabel = formatBillingDate(billingSummary?.currentPeriodEnd);
  const hasPaidAccess = billingPlan === "pro_beta";

  const handleCheckout = async (
    interval: "month" | "year",
    options: {
      trialRequested?: boolean;
      source: string;
    }
  ) => {
    try {
      setActionLoading(interval);
      setBillingError("");
      await trackBetaFunnelMilestone("checkout_started", {
        source: `${options.source}${pricingExperimentSuffix}`,
      });
      const { url } = await createBillingCheckoutSession(interval, {
        trialRequested: options.trialRequested,
      });
      window.location.assign(url);
    } catch (error) {
      console.error("Error starting checkout:", error);
      const message =
        error instanceof Error ? error.message : "Unable to start checkout.";
      void trackObservabilityEvent({
        kind: "checkout_failure",
        status: "failure",
        route: "/pricing",
        source: options.source,
        message,
        metadata: {
          interval,
          trialRequested: Boolean(options.trialRequested),
        },
      }).catch(() => undefined);
      setBillingError(message);
      toast.error(message);
    } finally {
      setActionLoading("");
    }
  };

  const trackCancelSaveAction = async (
    action: string,
    options: { markCancelRequested?: boolean } = {}
  ) => {
    const source = `cancel_save_${action}_${cancelReason}${pricingExperimentSuffix}`;
    await trackBetaFunnelMilestone("pricing_cta_clicked", {
      source,
    });
    if (options.markCancelRequested) {
      await trackBetaFunnelMilestone("cancel_requested", {
        source,
      });
    }
    return source;
  };

  const handleManageBilling = async () => {
    if (hasPaidAccess) {
      setShowCancelSaveDialog(true);
      return;
    }

    try {
      setActionLoading("portal");
      setBillingError("");
      const { url } = await createBillingPortalSession();
      window.location.assign(url);
    } catch (error) {
      console.error("Error opening billing portal:", error);
      const message =
        error instanceof Error ? error.message : "Unable to open billing portal.";
      setBillingError(message);
      toast.error(message);
    } finally {
      setActionLoading("");
    }
  };

  const handleCancelSavePortalAction = async ({
    action,
    markCancelRequested = false,
  }: {
    action: string;
    markCancelRequested?: boolean;
  }) => {
    try {
      setActionLoading("portal");
      setBillingError("");
      await trackCancelSaveAction(action, { markCancelRequested });
      const { url } = await createBillingPortalSession();
      setShowCancelSaveDialog(false);
      window.location.assign(url);
    } catch (error) {
      console.error("Error opening billing portal:", error);
      const message =
        error instanceof Error ? error.message : "Unable to open billing portal.";
      setBillingError(message);
      toast.error(message);
    } finally {
      setActionLoading("");
    }
  };

  const handlePauseInstead = async () => {
    try {
      await trackCancelSaveAction("pause_30_days");
      setShowCancelSaveDialog(false);
      toast.info(
        "Opened reminder preferences so you can take a lighter month without losing workout history."
      );
      await router.push("/user");
    } catch (error) {
      console.error("Error routing to reminder preferences:", error);
      toast.error("Unable to open reminder preferences right now.");
    }
  };

  const handleProofInteraction = (source: string) => {
    void trackBetaFunnelMilestone("pricing_cta_clicked", {
      source: `${source}${pricingExperimentSuffix}`,
    }).catch((error) => {
      console.error("Error tracking pricing proof interaction:", error);
    });
  };

  const premiumProofHeadline =
    pricingExperiment?.enabled && pricingExperiment.variant === "variant_a"
      ? "See the adaptive coaching proof before you commit."
      : "Show me the coaching layer, not just the feature list.";
  const premiumProofSubhead =
    pricingExperiment?.enabled && pricingExperiment.variant === "variant_a"
      ? "This experiment pushes the concrete outputs first so buyers can judge the paid layer on real planning proof instead of abstract claims."
      : "Pro should feel concrete before checkout. These examples show the kinds of outputs the paid layer is responsible for: a drafted week, a recommendation update, and a real-life schedule rewrite.";
  const selectedCancelReason = cancelReasonOptions.find((option) => option.value === cancelReason);

  const handleProofCheckout = async (
    interval: "month" | "year",
    source: string
  ) => {
    handleProofInteraction(source);

    if (!isAuthenticated) {
      void router.push("/signup");
      return;
    }

    await handleCheckout(interval, {
      trialRequested: true,
      source,
    });
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        px: { xs: 1.5, sm: 2.5 },
        py: { xs: 2, sm: 3 },
      }}
    >
      <Box sx={{ maxWidth: 1120, mx: "auto" }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            gap: 1.5,
            flexDirection: { xs: "column", sm: "row" },
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "14px",
                display: "grid",
                placeItems: "center",
                backgroundColor: "text.primary",
                color: "background.paper",
              }}
            >
              <FitnessCenterIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="overline" sx={{ letterSpacing: "0.14em" }}>
                Lift Logic
              </Typography>
              <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
                Free vs Pro
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button component={NextLink} href="/" variant="text">
              Home
            </Button>
            {isAuthenticated && portalEnabled ? (
              <Button
                variant="outlined"
                startIcon={<ManageAccountsOutlinedIcon />}
                onClick={handleManageBilling}
                disabled={actionLoading === "portal"}
              >
                {actionLoading === "portal" ? "Opening portal..." : "Manage billing"}
              </Button>
            ) : null}
            {!isAuthenticated ? (
              <Button component={NextLink} href="/signin" variant="text">
                Sign in
              </Button>
            ) : null}
            <Button
              component={NextLink}
              href={primaryCta.href}
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              onClick={() => {
                if (!isAuthenticated) {
                  void trackBetaFunnelMilestone("pricing_cta_clicked", {
                    source: "pricing_header_primary_cta",
                  }).catch((error) => {
                    console.error("Error tracking pricing CTA click:", error);
                  });
                }
              }}
            >
              {primaryCta.label}
            </Button>
          </Stack>
        </Box>

        {billingSummary ? (
          <Alert
            severity={statusTone[billingSummary.subscriptionStatus]}
            sx={{ mt: 2.5, borderRadius: pricingRadius.inset }}
          >
            <Stack spacing={0.5}>
              <Typography sx={{ fontWeight: 700 }}>
                {hasPaidAccess ? "Pro is active on this account." : "This account is on Free."}
              </Typography>
              <Typography>
                Status: {statusLabel[billingSummary.subscriptionStatus]}
                {billingSummary.subscriptionInterval
                  ? ` on the ${billingSummary.subscriptionInterval} plan`
                  : ""}
                {billingSummary.cancelAtPeriodEnd && currentPeriodEndLabel
                  ? ` until ${currentPeriodEndLabel}`
                  : ""}
                {!billingSummary.cancelAtPeriodEnd && currentPeriodEndLabel && hasPaidAccess
                  ? ` through ${currentPeriodEndLabel}`
                  : ""}
              </Typography>
            </Stack>
          </Alert>
        ) : null}

        {billingError ? (
          <Alert severity="warning" sx={{ mt: 2.5, borderRadius: pricingRadius.inset }}>
            {billingError}
          </Alert>
        ) : null}

        <Paper
          elevation={0}
          sx={{
            mt: { xs: 3, sm: 4.5 },
            p: { xs: 2.5, sm: 3.5 },
            border: "1px solid",
            borderColor: "divider",
            borderRadius: pricingRadius.panel,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              alignSelf: "flex-start",
              px: 1.25,
              py: 0.7,
              borderRadius: pricingRadius.chip,
              border: "1px solid",
              borderColor: "rgba(249,115,22,0.22)",
              backgroundColor: "rgba(249,115,22,0.08)",
            }}
          >
            <Typography variant="overline" sx={{ color: "primary.main", letterSpacing: "0.12em" }}>
              {pricingExperiment?.enabled && pricingExperiment.variant === "variant_a"
                ? "Proof-first pricing experiment"
                : "Pricing direction"}
            </Typography>
          </Box>
          <Typography
            variant="h2"
            sx={{
              mt: 2.25,
              maxWidth: 720,
              fontSize: { xs: "2.5rem", md: "4rem" },
              lineHeight: 0.98,
            }}
          >
            Tracking stays free. Adaptive planning becomes Pro.
          </Typography>
          <Typography
            sx={{
              mt: 2,
              maxWidth: 760,
              color: "text.secondary",
              fontSize: { xs: "1rem", sm: "1.08rem" },
              lineHeight: 1.7,
            }}
          >
            Lift Logic is not trying to charge for basic logging. The free product
            is the clean workout flow: open the day, log what happened, and keep
            the session moving. Pro is the layer that drafts plans, revises
            them around your constraints, manages recurring schedules, and turns
            logged performance into better next-session recommendations.
          </Typography>

          <Paper
            elevation={0}
            sx={{
              mt: 2.5,
              p: 1.75,
              borderRadius: pricingRadius.inset,
              border: "1px solid",
              borderColor: "divider",
              backgroundColor: "rgba(255,255,255,0.9)",
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              What this means today
            </Typography>
            <Typography sx={{ mt: 0.75, color: "text.secondary" }}>
              Billing is now wired for self-serve upgrades. Free stays focused on
              logging and execution. Pro is the paid layer for plan
              generation, assistant-led edits, recurring schedules, and
              progression recommendations.
            </Typography>
          </Paper>
        </Paper>

        <Dialog
          open={showCancelSaveDialog}
          onClose={actionLoading === "portal" ? undefined : () => setShowCancelSaveDialog(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Before you leave Pro</DialogTitle>
          <DialogContent sx={{ display: "grid", gap: 2, pt: 1.5 }}>
            <Typography color="text.secondary">
              If you are overloaded, underusing the plan, or just need a breather, take the
              lightest save path first instead of jumping straight to the billing portal exit.
            </Typography>

            <Paper variant="outlined" sx={{ p: 1.4, borderRadius: pricingRadius.inset }}>
              <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  What is driving the cancel request?
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {cancelReasonOptions.map((option) => (
                    <Chip
                      key={option.value}
                      label={option.label}
                      clickable
                      color={cancelReason === option.value ? "primary" : "default"}
                      variant={cancelReason === option.value ? "filled" : "outlined"}
                      onClick={() => setCancelReason(option.value)}
                    />
                  ))}
                </Stack>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {selectedCancelReason?.helper}
                </Typography>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 1.4, borderRadius: pricingRadius.inset }}>
              <Stack spacing={1.1}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Save options before the billing portal
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Choose the option that keeps the account attached to your training even if your
                  current season is messy.
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <Button variant="contained" onClick={() => void handlePauseInstead()}>
                    Pause for 30 days
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() =>
                      void handleCancelSavePortalAction({
                        action: "switch_cadence",
                      })
                    }
                    disabled={actionLoading === "portal"}
                  >
                    Switch billing cadence
                  </Button>
                </Stack>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.1,
                    borderRadius: pricingRadius.inset,
                    backgroundColor: "rgba(248,250,252,0.72)",
                  }}
                >
                  <Typography sx={{ fontWeight: 700 }}>
                    Free logging fallback stays intact
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.35, color: "text.secondary" }}>
                    If you still want out, you can continue to the billing portal and fall back to
                    free logging with your history, setup, and progress summaries preserved.
                  </Typography>
                </Paper>
              </Stack>
            </Paper>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5, pt: 0.5 }}>
            <Button onClick={() => setShowCancelSaveDialog(false)} disabled={actionLoading === "portal"}>
              Keep Pro for now
            </Button>
            <Button
              variant="outlined"
              color="warning"
              onClick={() =>
                void handleCancelSavePortalAction({
                  action: "free_logging_fallback",
                  markCancelRequested: true,
                })
              }
              disabled={actionLoading === "portal"}
            >
              {actionLoading === "portal" ? "Opening portal..." : "Continue to cancel"}
            </Button>
          </DialogActions>
        </Dialog>

        <Box
          sx={{
            mt: { xs: 3, sm: 4 },
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr 1.08fr" },
            gap: 2,
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.25, sm: 2.75 },
              border: "1px solid",
              borderColor: "divider",
              borderRadius: pricingRadius.card,
            }}
          >
            <Typography
              variant="overline"
              sx={{ letterSpacing: "0.14em", color: "text.secondary" }}
            >
              Logging stays free
            </Typography>
            <Typography variant="h4" sx={{ mt: 0.75 }}>
              Free
            </Typography>
            <Typography sx={{ mt: 0.5, fontWeight: 700 }}>$0</Typography>
            <Typography sx={{ mt: 1.25, color: "text.secondary" }}>
              Use Lift Logic like a cleaner workout log with a better day-to-day
              flow.
            </Typography>

            <Stack spacing={1.1} sx={{ mt: 2 }}>
              {freePlanFeatures.map((feature) => (
                <Stack key={feature} direction="row" spacing={1} alignItems="flex-start">
                  <CheckCircleOutlineIcon
                    fontSize="small"
                    sx={{ mt: "2px", color: "text.primary" }}
                  />
                  <Typography>{feature}</Typography>
                </Stack>
              ))}
            </Stack>

            <Divider sx={{ my: 2 }} />
            <Typography sx={{ color: "text.secondary" }}>
              Best when you already know what you want to do and mainly want better
              execution.
            </Typography>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.25, sm: 2.75 },
              border: "1px solid",
              borderColor: "rgba(245,158,11,0.45)",
              borderRadius: pricingRadius.card,
              position: "relative",
              overflow: "hidden",
              background:
                "linear-gradient(180deg, rgba(255,251,235,0.96) 0%, rgba(255,247,237,0.92) 100%)",
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography
                variant="overline"
                sx={{ letterSpacing: "0.14em", color: "text.secondary" }}
              >
                Lower-friction paid start
              </Typography>
              <Box
                sx={{
                  px: 1.1,
                  py: 0.6,
                  borderRadius: pricingRadius.chip,
                  backgroundColor: "rgba(245,158,11,0.14)",
                }}
              >
                <Typography variant="caption" sx={{ color: "text.primary", fontWeight: 800, letterSpacing: "0.08em" }}>
                  Starter Kickoff
                </Typography>
              </Box>
            </Stack>
            <Typography variant="h4" sx={{ mt: 0.75 }}>
              Starter Kickoff
            </Typography>
            <Typography sx={{ mt: 0.5, fontWeight: 700 }}>$29 one-time kickoff offer</Typography>
            <Typography sx={{ mt: 1.25, color: "text.secondary" }}>
              For users who want Lift Logic to build a serious starting point without
              committing to recurring billing on day one.
            </Typography>

            <Stack spacing={1.1} sx={{ mt: 2 }}>
              {starterPlanFeatures.map((feature) => (
                <Stack key={feature} direction="row" spacing={1} alignItems="flex-start">
                  <CheckCircleOutlineIcon
                    fontSize="small"
                    sx={{ mt: "2px", color: "text.primary" }}
                  />
                  <Typography>{feature}</Typography>
                </Stack>
              ))}
            </Stack>

            <Divider sx={{ my: 2 }} />
            <Typography sx={{ color: "text.secondary" }}>
              Best when you want a clear plan outcome first, then the option to
              upgrade into full adaptive planning later without resetting your
              account data.
            </Typography>

            <Stack spacing={1} sx={{ mt: 2.25 }}>
              <Button
                component={NextLink}
                href={starterOfferHref}
                variant="outlined"
                endIcon={<ArrowForwardIcon />}
                onClick={() => {
                  void trackBetaFunnelMilestone("pricing_cta_clicked", {
                    source: "pricing_starter_kickoff_cta",
                  }).catch((error) => {
                    console.error("Error tracking starter offer CTA:", error);
                  });
                }}
              >
                {status === "authenticated"
                  ? "Use this account for Starter"
                  : "Start with Starter Kickoff"}
              </Button>
              <Alert severity="info" sx={{ borderRadius: pricingRadius.inset }}>
                Starter purchases are a limited kickoff offer, but they still use
                the same account and setup data you would keep if you later move into
                Pro.
              </Alert>
            </Stack>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.25, sm: 2.75 },
              border: "1px solid",
              borderColor: hasPaidAccess ? "primary.main" : "divider",
              borderRadius: pricingRadius.card,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography
                variant="overline"
                sx={{ letterSpacing: "0.14em", color: "text.secondary" }}
              >
                Adaptive planning layer
              </Typography>
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.7,
                  px: 1.15,
                  py: 0.65,
                  borderRadius: pricingRadius.chip,
                  backgroundColor: "rgba(249,115,22,0.12)",
                  color: "primary.main",
                }}
              >
                <WorkspacePremiumOutlinedIcon fontSize="small" />
                <Typography variant="caption" sx={{ color: "inherit", fontWeight: 800, letterSpacing: "0.08em" }}>
                  {hasPaidAccess ? "Current plan" : "Pro"}
                </Typography>
              </Box>
            </Stack>
            <Typography variant="h4" sx={{ mt: 0.75 }}>
              Pro
            </Typography>
            <Typography sx={{ mt: 0.5, fontWeight: 700 }}>{proPlanPriceLabel}</Typography>
            <Typography sx={{ mt: 1.25, color: "text.secondary" }}>
              Use Lift Logic when you want the app to build, revise, and adapt the
              week with you.
            </Typography>
            <Alert severity="success" sx={{ mt: 1.5, borderRadius: pricingRadius.inset }}>
              Start with a real {trialDays}-day Pro trial on your first upgrade. During the
              trial, adaptive planning, recurring schedules, and recommendation tools stay fully
              on. If you cancel before the trial ends, your account falls back to free logging and
              you keep your workouts, setup, and history.
            </Alert>

            <Stack spacing={1.1} sx={{ mt: 2 }}>
              {proPlanFeatures.map((feature) => (
                <Stack key={feature} direction="row" spacing={1} alignItems="flex-start">
                  <CheckCircleOutlineIcon
                    fontSize="small"
                    sx={{ mt: "2px", color: "text.primary" }}
                  />
                  <Typography>{feature}</Typography>
                </Stack>
              ))}
            </Stack>

            <Divider sx={{ my: 2 }} />
            <Typography sx={{ color: "text.secondary" }}>
              Best when your schedule, equipment, or training constraints change
              often.
            </Typography>

            <Stack spacing={1} sx={{ mt: 2.25 }}>
              {!isAuthenticated ? (
                <Button
                  component={NextLink}
                  href="/signup"
                  variant="contained"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => {
                    void trackBetaFunnelMilestone("pricing_cta_clicked", {
                      source: "pricing_plan_card_signup",
                    }).catch((error) => {
                      console.error("Error tracking plan card pricing CTA:", error);
                    });
                  }}
                >
                  Create account to upgrade
                </Button>
              ) : billingLoading ? (
                <Button variant="outlined" disabled startIcon={<CircularProgress size={16} />}>
                  Loading billing state...
                </Button>
              ) : checkoutEnabled ? (
                <>
                  {visiblePriceOptions.map((option) => (
                    <Stack key={option.interval} spacing={0.75}>
                      <Button
                        variant={option.interval === "year" ? "contained" : "outlined"}
                        onClick={() =>
                          handleCheckout(option.interval, {
                            trialRequested: true,
                            source: `pricing_trial_${option.interval}`,
                          })
                        }
                        disabled={Boolean(actionLoading) || hasPaidAccess}
                      >
                        {actionLoading === option.interval
                          ? "Opening checkout..."
                          : hasPaidAccess
                          ? "Already on Pro"
                          : `Start ${trialDays}-day ${
                              option.interval === "year" ? "yearly" : "monthly"
                            } trial`}
                      </Button>
                      <Button
                        variant="text"
                        onClick={() =>
                          handleCheckout(option.interval, {
                            source: `pricing_checkout_${option.interval}_no_trial`,
                          })
                        }
                        disabled={Boolean(actionLoading) || hasPaidAccess}
                      >
                        {`Prefer immediate ${option.interval === "year" ? "yearly" : "monthly"} billing?`}
                      </Button>
                    </Stack>
                  ))}
                </>
              ) : (
                <Alert severity="info" sx={{ borderRadius: pricingRadius.inset }}>
                  Self-serve billing is not fully configured in this environment yet.
                </Alert>
              )}

              {portalEnabled ? (
                <Button
                  variant="text"
                  startIcon={<ManageAccountsOutlinedIcon />}
                  onClick={handleManageBilling}
                  disabled={Boolean(actionLoading)}
                >
                  {actionLoading === "portal" ? "Opening portal..." : "Manage billing"}
                </Button>
              ) : null}

              <Paper
                elevation={0}
                sx={{
                  mt: 0.5,
                  p: 1.15,
                  borderRadius: pricingRadius.inset,
                  border: "1px solid",
                  borderColor: "divider",
                  backgroundColor: "rgba(255,255,255,0.82)",
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  What happens after the trial?
                </Typography>
                <Typography sx={{ mt: 0.5, color: "text.secondary" }}>
                  Pro keeps adaptive planning, recurring scheduling, and data-driven
                  recommendations active. If you do not stay paid, Lift Logic falls back to free
                  logging and execution while preserving your workout history and setup.
                </Typography>
              </Paper>
            </Stack>
          </Paper>
        </Box>

        <Paper
          elevation={0}
          sx={{
            mt: { xs: 3, sm: 4 },
            p: { xs: 2.25, sm: 2.75 },
            border: "1px solid",
            borderColor: "divider",
            borderRadius: pricingRadius.panel,
          }}
        >
          <Typography variant="overline" sx={{ letterSpacing: "0.14em" }}>
            Compare The Split
          </Typography>
          <Typography variant="h4" sx={{ mt: 0.75, maxWidth: 620 }}>
            The free product handles execution. Pro handles adaptation.
          </Typography>
          <Typography sx={{ mt: 1, color: "text.secondary", maxWidth: 760 }}>
            If a user mainly wants to log workouts cleanly, Free should be enough.
            If they want Lift Logic to help decide what the week should look like
            and how it should change, that is the Pro value.
          </Typography>

          <Stack spacing={1} sx={{ mt: 2.25 }}>
            {comparisonRows.map((row) => (
              <Paper
                key={row.label}
                elevation={0}
                sx={{
                  p: 1.5,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: pricingRadius.inset,
                  backgroundColor: "rgba(255,255,255,0.84)",
                }}
              >
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "1.4fr 0.8fr 0.8fr 0.8fr",
                    },
                    gap: 1,
                    alignItems: "center",
                  }}
                >
                  <Typography sx={{ fontWeight: 700 }}>{row.label}</Typography>
                  <Chip
                    label={`Free: ${row.free}`}
                    variant="outlined"
                    sx={{
                      borderRadius: pricingRadius.chip,
                      justifySelf: "flex-start",
                    }}
                  />
                  <Chip
                    label={`Starter: ${row.starter}`}
                    sx={{
                      borderRadius: pricingRadius.chip,
                      justifySelf: "flex-start",
                      backgroundColor: "rgba(245,158,11,0.12)",
                    }}
                  />
                  <Chip
                    label={`Pro: ${row.pro}`}
                    color="primary"
                    variant={row.pro === "Included" ? "filled" : "outlined"}
                    sx={{
                      borderRadius: pricingRadius.chip,
                      justifySelf: "flex-start",
                    }}
                  />
                </Box>
              </Paper>
            ))}
          </Stack>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            mt: { xs: 3, sm: 4 },
            p: { xs: 2.25, sm: 2.75 },
            border: "1px solid",
            borderColor: "divider",
            borderRadius: pricingRadius.panel,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.94) 100%)",
          }}
        >
          <Typography variant="overline" sx={{ letterSpacing: "0.14em" }}>
            Premium Proof
          </Typography>
          <Typography variant="h4" sx={{ mt: 0.75, maxWidth: 720 }}>
            {premiumProofHeadline}
          </Typography>
          <Typography sx={{ mt: 1, color: "text.secondary", maxWidth: 760 }}>
            {premiumProofSubhead}
          </Typography>

          <Box
            sx={{
              mt: 2.25,
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
              gap: 1.5,
            }}
          >
            {premiumProofModules.map((module, index) => (
              <Paper
                key={module.title}
                elevation={0}
                sx={{
                  p: 1.75,
                  borderRadius: pricingRadius.inset,
                  border: "1px solid",
                  borderColor:
                    index === 1 ? "rgba(59,130,246,0.32)" : "divider",
                  backgroundColor:
                    index === 1 ? "rgba(239,246,255,0.9)" : "rgba(255,255,255,0.82)",
                }}
              >
                <Typography variant="overline" sx={{ color: "text.secondary" }}>
                  {module.eyebrow}
                </Typography>
                <Typography variant="h6" sx={{ mt: 0.5, lineHeight: 1.15 }}>
                  {module.title}
                </Typography>
                <Stack spacing={1} sx={{ mt: 1.25 }}>
                  {module.bullets.map((bullet) => (
                    <Typography key={bullet} sx={{ color: "text.secondary" }}>
                      {bullet}
                    </Typography>
                  ))}
                </Stack>
                <Button
                  variant={index === 1 ? "contained" : "outlined"}
                  sx={{ mt: 1.5 }}
                  onClick={() =>
                    void handleProofCheckout(
                      index === 2 ? "year" : "month",
                      module.source
                    )
                  }
                  disabled={Boolean(actionLoading) || (isAuthenticated && !checkoutEnabled)}
                >
                  {isAuthenticated
                    ? `Start ${trialDays}-day trial from this example`
                    : "Use this as my reason to sign up"}
                </Button>
              </Paper>
            ))}
          </Box>

          <Box
            sx={{
              mt: 2.25,
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "1.1fr 0.9fr" },
              gap: 1.5,
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: 1.75,
                borderRadius: pricingRadius.inset,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: "rgba(255,255,255,0.82)",
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Trust signals before checkout
              </Typography>
              <Stack spacing={1} sx={{ mt: 1.25 }}>
                {premiumTrustSignals.map((signal) => (
                  <Stack key={signal} direction="row" spacing={1} alignItems="flex-start">
                    <CheckCircleOutlineIcon
                      fontSize="small"
                      sx={{ mt: "2px", color: "text.primary" }}
                    />
                    <Typography sx={{ color: "text.secondary" }}>{signal}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: 1.75,
                borderRadius: pricingRadius.inset,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: "rgba(255,255,255,0.82)",
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Buyer FAQ
              </Typography>
              <Stack spacing={1.25} sx={{ mt: 1.25 }}>
                {premiumFaqItems.map((item) => (
                  <Box key={item.question}>
                    <Typography sx={{ fontWeight: 700 }}>{item.question}</Typography>
                    <Typography sx={{ mt: 0.45, color: "text.secondary" }}>
                      {item.answer}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Paper>
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            mt: { xs: 3, sm: 4 },
            p: { xs: 2.5, sm: 3.25 },
            border: "1px solid",
            borderColor: "divider",
            borderRadius: pricingRadius.panel,
            background:
              "linear-gradient(135deg, rgba(17,24,39,0.94) 0%, rgba(30,41,59,0.9) 100%)",
            color: "#f8fafc",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              right: { xs: -60, md: -30 },
              top: { xs: -40, md: -20 },
              width: { xs: 180, md: 260 },
              height: { xs: 180, md: 260 },
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(96,165,250,0.16) 0%, rgba(96,165,250,0) 72%)",
              pointerEvents: "none",
            }}
          />
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", md: "center" },
              gap: 2,
              flexDirection: { xs: "column", md: "row" },
              position: "relative",
              zIndex: 1,
            }}
          >
            <Box>
              <Typography
                variant="overline"
                sx={{ letterSpacing: "0.14em", color: "rgba(248,250,252,0.72)" }}
              >
                Next Step
              </Typography>
              <Typography variant="h4" sx={{ mt: 0.75, maxWidth: 620 }}>
                Start with the free product, then pay only if the adaptive layer
                earns a real place in your week.
              </Typography>
              <Typography
                sx={{
                  mt: 1.25,
                  color: "rgba(248,250,252,0.78)",
                  maxWidth: 720,
                }}
              >
                The core promise is simple: logging stays useful on its own, and
                Pro pays for itself only if the planning, schedule changes,
                and recommendations actually reduce friction for you.
              </Typography>
            </Box>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.25}
              sx={{
                width: { xs: "100%", md: "auto" },
                alignItems: "stretch",
                justifyContent: { md: "flex-end" },
              }}
            >
              {isAuthenticated && portalEnabled ? (
                <Button
                  variant="contained"
                  startIcon={<ManageAccountsOutlinedIcon />}
                  onClick={handleManageBilling}
                  sx={{
                    minHeight: 52,
                    minWidth: { sm: 190 },
                    px: 2.5,
                    background:
                      "linear-gradient(135deg, #f8fafc 0%, #dbeafe 100%)",
                    color: "#0f172a",
                    boxShadow: "0 14px 34px rgba(15,23,42,0.22)",
                    fontWeight: 800,
                    "&:hover": {
                      background:
                        "linear-gradient(135deg, #ffffff 0%, #bfdbfe 100%)",
                      boxShadow: "0 18px 36px rgba(15,23,42,0.28)",
                    },
                    borderRadius: pricingRadius.inset,
                  }}
                  disabled={actionLoading === "portal"}
                >
                  {actionLoading === "portal" ? "Opening portal..." : "Manage billing"}
                </Button>
              ) : (
                <Button
                  component={NextLink}
                  href={primaryCta.href}
                  variant="contained"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => {
                    if (!isAuthenticated) {
                      void trackBetaFunnelMilestone("pricing_cta_clicked", {
                        source: "pricing_footer_primary_cta",
                      }).catch((error) => {
                        console.error("Error tracking footer pricing CTA:", error);
                      });
                    }
                  }}
                  sx={{
                    minHeight: 52,
                    minWidth: { sm: 190 },
                    px: 2.5,
                    background:
                      "linear-gradient(135deg, #f8fafc 0%, #dbeafe 100%)",
                    color: "#0f172a",
                    boxShadow: "0 14px 34px rgba(15,23,42,0.22)",
                    fontWeight: 800,
                    "&:hover": {
                      background:
                        "linear-gradient(135deg, #ffffff 0%, #bfdbfe 100%)",
                      boxShadow: "0 18px 36px rgba(15,23,42,0.28)",
                    },
                    borderRadius: pricingRadius.inset,
                  }}
                >
                  {primaryCta.label}
                </Button>
              )}
              <Button
                component={NextLink}
                href="/feedback"
                variant="outlined"
                sx={{
                  minHeight: 52,
                  minWidth: { sm: 170 },
                  px: 2.25,
                  borderColor: "rgba(248,250,252,0.28)",
                  color: "#f8fafc",
                  backgroundColor: "rgba(255,255,255,0.08)",
                  fontWeight: 700,
                  "&:hover": {
                    borderColor: "rgba(248,250,252,0.48)",
                    backgroundColor: "rgba(255,255,255,0.14)",
                  },
                  borderRadius: pricingRadius.inset,
                }}
              >
                Share feedback
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default PricingPage;
