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
import { brandBackgrounds, brandRadii } from "../utils/brandSystem";

const pricingRadius = brandRadii;

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
    free: "Pro Beta",
    starter: "Starter kickoff build",
    pro: "Included",
  },
  {
    label: "Assistant-driven plan revisions",
    free: "Pro Beta",
    starter: "Two revision passes",
    pro: "Included",
  },
  {
    label: "Recurring workout schedules",
    free: "Pro Beta",
    starter: "Manual follow-through",
    pro: "Included",
  },
  {
    label: "Progress-based recommendations",
    free: "Pro Beta",
    starter: "Upgrade path into Pro",
    pro: "Included",
  },
];

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
  const pricingViewTrackedRef = useRef(false);

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
    if (pricingViewTrackedRef.current) {
      return;
    }

    pricingViewTrackedRef.current = true;
    void trackBetaFunnelMilestone("pricing_page_viewed", {
      source: isAuthenticated ? "pricing_page_authenticated" : "pricing_page_anonymous",
    }).catch((error) => {
      pricingViewTrackedRef.current = false;
      console.error("Error tracking pricing page view:", error);
    });
  }, [isAuthenticated]);

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
      : { href: "/signup", label: "Start free beta" };
  const starterOfferHref =
    status === "authenticated"
      ? "/user?starterOffer=starter_kickoff"
      : "/signup?plan=starter_kickoff";

  const billingPlan: BillingPlan = billingSummary?.billingPlan || "free";
  const portalEnabled = Boolean(billingSummary?.portalEnabled);
  const checkoutEnabled = Boolean(billingSummary?.configured);
  const currentPeriodEndLabel = formatBillingDate(billingSummary?.currentPeriodEnd);
  const hasPaidAccess = billingPlan === "pro_beta";

  const handleCheckout = async (interval: "month" | "year") => {
    try {
      setActionLoading(interval);
      setBillingError("");
      await trackBetaFunnelMilestone("checkout_started", {
        source: `pricing_checkout_${interval}`,
      });
      const { url } = await createBillingCheckoutSession(interval);
      window.location.assign(url);
    } catch (error) {
      console.error("Error starting checkout:", error);
      const message =
        error instanceof Error ? error.message : "Unable to start checkout.";
      void trackObservabilityEvent({
        kind: "checkout_failure",
        status: "failure",
        route: "/pricing",
        source: `pricing_checkout_${interval}`,
        message,
        metadata: {
          interval,
        },
      }).catch(() => undefined);
      setBillingError(message);
      toast.error(message);
    } finally {
      setActionLoading("");
    }
  };

  const handleManageBilling = async () => {
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
                Free vs Pro Beta
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
                {hasPaidAccess ? "Pro Beta is active on this account." : "This account is on Free."}
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
          <Chip
            label="Pricing direction during beta"
            color="primary"
            sx={{ borderRadius: pricingRadius.chip }}
          />
          <Typography
            variant="h2"
            sx={{
              mt: 2.25,
              maxWidth: 720,
              fontSize: { xs: "2.5rem", md: "4rem" },
              lineHeight: 0.98,
            }}
          >
            Tracking stays free. Adaptive planning becomes Pro Beta.
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
            the session moving. Pro Beta is the layer that drafts plans, revises
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
              logging and execution. Pro Beta is the paid layer for plan
              generation, assistant-led edits, recurring schedules, and
              progression recommendations.
            </Typography>
          </Paper>
        </Paper>

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
              <Chip
                label="Starter Kickoff"
                sx={{
                  borderRadius: pricingRadius.chip,
                  backgroundColor: "rgba(245,158,11,0.14)",
                  color: "text.primary",
                  fontWeight: 700,
                }}
              />
            </Stack>
            <Typography variant="h4" sx={{ mt: 0.75 }}>
              Starter Kickoff
            </Typography>
            <Typography sx={{ mt: 0.5, fontWeight: 700 }}>$29 one-time beta offer</Typography>
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
                Starter purchases are being tested as a beta offer, but they still use
                the same account and setup data you would keep if you later move into
                Pro Beta.
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
              <Chip
                label={hasPaidAccess ? "Current plan" : "Pro Beta"}
                color="primary"
                icon={<WorkspacePremiumOutlinedIcon fontSize="small" />}
                sx={{ borderRadius: pricingRadius.chip }}
              />
            </Stack>
            <Typography variant="h4" sx={{ mt: 0.75 }}>
              Pro Beta
            </Typography>
            <Typography sx={{ mt: 0.5, fontWeight: 700 }}>{proPlanPriceLabel}</Typography>
            <Typography sx={{ mt: 1.25, color: "text.secondary" }}>
              Use Lift Logic when you want the app to build, revise, and adapt the
              week with you.
            </Typography>

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
                    <Button
                      key={option.interval}
                      variant={option.interval === "year" ? "contained" : "outlined"}
                      onClick={() => handleCheckout(option.interval)}
                      disabled={Boolean(actionLoading) || hasPaidAccess}
                    >
                      {actionLoading === option.interval
                        ? "Opening checkout..."
                        : hasPaidAccess
                        ? "Already on Pro Beta"
                        : `Upgrade ${option.interval === "year" ? "yearly" : "monthly"}`}
                    </Button>
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
            The free product handles execution. Pro Beta handles adaptation.
          </Typography>
          <Typography sx={{ mt: 1, color: "text.secondary", maxWidth: 760 }}>
            If a user mainly wants to log workouts cleanly, Free should be enough.
            If they want Lift Logic to help decide what the week should look like
            and how it should change, that is the Pro Beta value.
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
                    label={`Pro Beta: ${row.pro}`}
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
                Pro Beta pays for itself only if the planning, schedule changes,
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
