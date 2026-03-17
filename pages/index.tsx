import React, { useEffect } from "react";
import NextLink from "next/link";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import RepeatRoundedIcon from "@mui/icons-material/RepeatRounded";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import { rememberLandingCta } from "../utils/betaFunnelClient";
import { trackBetaFunnelMilestone } from "../utils/betaFunnelApi";
import { brandBackgrounds, brandRadii } from "../utils/brandSystem";

const landingRadius = brandRadii;

const featureCards = [
  {
    icon: <TaskAltOutlinedIcon fontSize="small" />,
    title: "Cleaner daily flow",
    body:
      "Open the workout, follow the next set, and keep finished work out of the way instead of digging through clutter.",
  },
  {
    icon: <InsightsOutlinedIcon fontSize="small" />,
    title: "Recommendations from your logs",
    body:
      "Completed sets become progression signals, so next-session weight and rep suggestions come from what you actually did.",
  },
  {
    icon: <RepeatRoundedIcon fontSize="small" />,
    title: "Schedules that hold up",
    body:
      "Repeat individual lifts or whole days, reorder exercises fast, and keep the calendar realistic when life changes.",
  },
];

const fitCards = [
  {
    eyebrow: "Track only",
    title: "Use it like a focused training log.",
    body:
      "If you already know what you want to do, skip the planning intake and just keep workouts moving with better defaults and cleaner logging.",
  },
  {
    eyebrow: "Plan with assistant",
    title: "Start from a draft that fits your week.",
    body:
      "Give the app your goal, frequency, equipment, and limitations, then let the assistant build a first pass you can actually revise.",
  },
];

const guestWorkoutPreview = [
  {
    name: "Goblet Squat",
    detail: "3 x 8",
    note: "Simple squat pattern with enough rest to learn it cleanly.",
  },
  {
    name: "Dumbbell Floor Press",
    detail: "3 x 10",
    note: "Shoulder-friendlier press that still feels like real strength work.",
  },
  {
    name: "One-Arm Dumbbell Row",
    detail: "3 x 10 / side",
    note: "Back work paired with easy setup and clear progression room.",
  },
];

const HomePage: React.FC = () => {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/routines");
    }
  }, [router, status]);

  useEffect(() => {
    void trackBetaFunnelMilestone("landing_page_viewed", {
      source: "landing_page",
    }).catch((error) => {
      console.error("Error tracking landing page view:", error);
    });
  }, []);

  const handleLandingCtaClick = (source = "landing_cta") => {
    rememberLandingCta(new Date(), source);
    void trackBetaFunnelMilestone("landing_cta", { source }).catch((error) => {
      console.error("Error tracking landing CTA:", error);
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
                Adaptive workout planning and tracking
              </Typography>
            </Box>
          </Stack>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            useFlexGap
            flexWrap="wrap"
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            <Button component={NextLink} href="/pricing" variant="text" fullWidth>
              Pricing
            </Button>
            <Button component={NextLink} href="/signin" variant="text" fullWidth>
              Sign in
            </Button>
            <Button
              component={NextLink}
              href="/signup"
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              onClick={() => handleLandingCtaClick("hero_nav_start_free_beta")}
              fullWidth
            >
              Start free beta
            </Button>
          </Stack>
        </Box>

        <Box
          sx={{
            mt: { xs: 3, sm: 5 },
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "1.05fr 0.95fr" },
            gap: 2,
            alignItems: "stretch",
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, sm: 3.5 },
              border: "1px solid",
              borderColor: "divider",
              borderRadius: brandRadii.panel,
              overflow: "hidden",
              position: "relative",
              backgroundImage: brandBackgrounds.heroGlow,
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: -70,
                right: -30,
                width: 220,
                height: 220,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(59,130,246,0.2) 0%, rgba(59,130,246,0) 68%)",
                pointerEvents: "none",
              }}
            />

            <Chip
              label="Free while beta sharpens up"
              color="primary"
              sx={{ alignSelf: "flex-start", borderRadius: brandRadii.chip }}
            />

            <Typography variant="h2" sx={{ mt: 2.5, maxWidth: 620, fontSize: { xs: "2.7rem", md: "4.2rem" }, lineHeight: 0.95 }}>
              Plan smarter lifts. Keep the workout moving.
            </Typography>

            <Typography
              sx={{
                mt: 2,
                maxWidth: 620,
                color: "text.secondary",
                fontSize: { xs: "1rem", sm: "1.08rem" },
                lineHeight: 1.7,
              }}
            >
              Lift Logic is for people who want less friction than a spreadsheet
              and more control than a generic workout app. Open today&apos;s
              session, log what actually happened, and let the next recommendation
              adapt around your performance, equipment, and schedule.
            </Typography>

            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              flexWrap="wrap"
              sx={{ mt: 2.5 }}
            >
              <Chip
                label="Track-only mode"
                variant="outlined"
                sx={{ borderRadius: brandRadii.chip }}
              />
              <Chip
                label="AI workout setup"
                variant="outlined"
                sx={{ borderRadius: brandRadii.chip }}
              />
              <Chip
                label="Recurring schedules"
                variant="outlined"
                sx={{ borderRadius: brandRadii.chip }}
              />
              <Chip
                label="Progress-based recommendations"
                variant="outlined"
                sx={{ borderRadius: brandRadii.chip }}
              />
            </Stack>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.25}
              sx={{ mt: 3 }}
            >
              <Button
                component={NextLink}
                href="/signup"
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
                onClick={() => handleLandingCtaClick("hero_primary_create_account")}
                sx={{ borderRadius: landingRadius.button }}
              >
                Create account
              </Button>
              <Button
                component={NextLink}
                href="/pricing"
                variant="outlined"
                size="large"
                sx={{ borderRadius: landingRadius.button }}
              >
                Compare plans
              </Button>
              <Button
                component={NextLink}
                href="/signin"
                variant="outlined"
                size="large"
                sx={{ borderRadius: landingRadius.button }}
              >
                I already have an account
              </Button>
            </Stack>

            <Typography sx={{ mt: 2, color: "text.secondary", fontSize: 14 }}>
              Best fit right now: lifters who want a practical weekly plan, a
              cleaner workout screen, and quick schedule adjustments without
              rebuilding everything from scratch.
            </Typography>
          </Paper>

          <Box sx={{ display: "grid", gap: 2 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2.25,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: landingRadius.panel,
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(236,244,255,0.96) 100%)",
              }}
            >
              <Typography variant="overline" sx={{ letterSpacing: "0.12em" }}>
                Today
              </Typography>
              <Typography variant="h5" sx={{ mt: 0.5 }}>
                Tuesday Upper Strength
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.5 }}>
                <Chip
                  label="3 exercises left"
                  color="primary"
                  sx={{ borderRadius: landingRadius.chip }}
                />
                <Chip
                  label="1 set logged"
                  variant="outlined"
                  sx={{ borderRadius: landingRadius.chip }}
                />
                <Chip
                  label="Repeat schedule active"
                  variant="outlined"
                  sx={{ borderRadius: landingRadius.chip }}
                />
              </Stack>

              <Paper
                elevation={0}
                sx={{
                  mt: 2,
                  p: 1.75,
                  borderRadius: landingRadius.inset,
                  border: "1px solid",
                  borderColor: "divider",
                  backgroundColor: "rgba(255,255,255,0.92)",
                }}
              >
                <Typography variant="overline" sx={{ color: "text.secondary" }}>
                  Up Next
                </Typography>
                <Typography sx={{ fontWeight: 700, mt: 0.4 }}>
                  Dumbbell Floor Press
                </Typography>
                <Typography sx={{ color: "text.secondary", mt: 0.35 }}>
                  4 sets of 8 with a conservative starting load for week one.
                </Typography>
              </Paper>
            </Paper>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1.1fr 0.9fr" },
                gap: 2,
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 2.1,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: landingRadius.card,
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <AutoAwesomeIcon fontSize="small" />
                  <Typography variant="overline" sx={{ letterSpacing: "0.12em" }}>
                    Assistant
                  </Typography>
                </Stack>
                <Typography sx={{ mt: 1, fontWeight: 700 }}>
                  "I kept this week around 45 minutes and used shoulder-friendlier
                  pressing options."
                </Typography>
                <Typography sx={{ mt: 1, color: "text.secondary" }}>
                  Start from a draft, then ask for swaps, shorter days, or a
                  better fit for the equipment you actually have.
                </Typography>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  p: 2.1,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: landingRadius.card,
                }}
              >
                <Stack spacing={1.2}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <InsightsOutlinedIcon fontSize="small" />
                    <Typography variant="overline" sx={{ letterSpacing: "0.12em" }}>
                      Signals
                    </Typography>
                  </Stack>
                  <Typography sx={{ fontWeight: 700 }}>
                    Bench press recommendation: +5 lb
                  </Typography>
                  <Typography sx={{ color: "text.secondary" }}>
                    Based on your last completed session.
                  </Typography>
                </Stack>
              </Paper>
            </Box>
          </Box>
        </Box>

        <Box sx={{ mt: { xs: 3, sm: 4 }, display: "grid", gap: 2 }}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.25, sm: 2.75 },
              border: "1px solid",
              borderColor: "divider",
              borderRadius: landingRadius.panel,
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(240,249,255,0.95) 100%)",
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", lg: "0.9fr 1.1fr" },
                gap: 2,
                alignItems: "start",
              }}
            >
              <Box>
                <Typography variant="overline" sx={{ letterSpacing: "0.14em" }}>
                  Preview The Workout
                </Typography>
                <Typography variant="h4" sx={{ mt: 0.75, maxWidth: 580 }}>
                  See a real workout flow before you ever make an account.
                </Typography>
                <Typography sx={{ mt: 1.1, color: "text.secondary", maxWidth: 620 }}>
                  Instead of asking you to imagine the product, here is a sample starter session the app could hand to a beginner with dumbbells and a short training window.
                </Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.5 }}>
                  <Chip label="Beginner-friendly" color="primary" sx={{ borderRadius: landingRadius.chip }} />
                  <Chip label="30-minute session" variant="outlined" sx={{ borderRadius: landingRadius.chip }} />
                  <Chip label="Home dumbbells" variant="outlined" sx={{ borderRadius: landingRadius.chip }} />
                </Stack>
              </Box>

              <Paper
                elevation={0}
                sx={{
                  p: 1.75,
                  borderRadius: landingRadius.card,
                  border: "1px solid",
                  borderColor: "divider",
                  backgroundColor: "rgba(255,255,255,0.88)",
                }}
              >
                <Stack spacing={1.15}>
                  <Box>
                    <Typography variant="overline" sx={{ color: "text.secondary" }}>
                      Guest workout preview
                    </Typography>
                    <Typography variant="h5" sx={{ mt: 0.4 }}>
                      Foundation Dumbbell Day
                    </Typography>
                    <Typography sx={{ mt: 0.45, color: "text.secondary" }}>
                      A first-week session built to feel real, not just inspirational.
                    </Typography>
                  </Box>

                  {guestWorkoutPreview.map((exercise, index) => (
                    <Paper
                      key={exercise.name}
                      elevation={0}
                      sx={{
                        p: 1.25,
                        borderRadius: landingRadius.inset,
                        border: "1px solid",
                        borderColor: "divider",
                        backgroundColor: index === 0 ? "rgba(219,234,254,0.72)" : "rgba(248,250,252,0.94)",
                      }}
                    >
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", sm: "center" }}
                      >
                        <Box>
                          <Typography sx={{ fontWeight: 700 }}>{exercise.name}</Typography>
                          <Typography sx={{ mt: 0.35, color: "text.secondary" }}>
                            {exercise.note}
                          </Typography>
                        </Box>
                        <Chip
                          label={exercise.detail}
                          color={index === 0 ? "primary" : "default"}
                          variant={index === 0 ? "filled" : "outlined"}
                          sx={{ borderRadius: landingRadius.chip, fontWeight: 700 }}
                        />
                      </Stack>
                    </Paper>
                  ))}

                  <Button
                    component={NextLink}
                    href="/signup"
                    variant="outlined"
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => handleLandingCtaClick("guest_preview_start_free_beta")}
                    sx={{ alignSelf: "flex-start", borderRadius: landingRadius.button }}
                  >
                    Try the full beta
                  </Button>
                </Stack>
              </Paper>
            </Box>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.25, sm: 2.75 },
              border: "1px solid",
              borderColor: "divider",
              borderRadius: landingRadius.panel,
            }}
          >
            <Typography variant="overline" sx={{ letterSpacing: "0.14em" }}>
              Built For Real Constraints
            </Typography>
            <Typography variant="h4" sx={{ mt: 0.75, maxWidth: 620 }}>
              Better when your plan needs to survive the week you actually have.
            </Typography>
            <Typography sx={{ mt: 1, color: "text.secondary", maxWidth: 720 }}>
              Lift Logic is strongest when your training needs to fit changing
              days, home-gym setups, limited time, or a plan that should learn
              from logged performance instead of staying static forever.
            </Typography>

            <Box
              sx={{
                mt: 2.25,
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
                gap: 2,
              }}
            >
              {featureCards.map((item) => (
                <Paper
                  key={item.title}
                  elevation={0}
                  sx={{
                    p: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: landingRadius.card,
                    backgroundColor: "rgba(255,255,255,0.82)",
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box
                      sx={{
                        width: 34,
                        height: 34,
                        borderRadius: "12px",
                        display: "grid",
                        placeItems: "center",
                        backgroundColor: "text.primary",
                        color: "background.paper",
                      }}
                    >
                      {item.icon}
                    </Box>
                    <Typography sx={{ fontWeight: 700 }}>{item.title}</Typography>
                  </Stack>
                  <Typography sx={{ mt: 1.2, color: "text.secondary", lineHeight: 1.7 }}>
                    {item.body}
                  </Typography>
                </Paper>
              ))}
            </Box>
          </Paper>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            {fitCards.map((item, index) => (
              <Paper
                key={item.title}
                elevation={0}
                sx={{
                  p: 2.5,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: landingRadius.card,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    inset: "auto -20px -30px auto",
                    width: 120,
                    height: 120,
                    borderRadius: "50%",
                    background:
                      index === 0
                        ? "radial-gradient(circle, rgba(15,23,42,0.12) 0%, rgba(15,23,42,0) 70%)"
                        : "radial-gradient(circle, rgba(59,130,246,0.18) 0%, rgba(59,130,246,0) 70%)",
                    pointerEvents: "none",
                  }}
                />

                <Stack direction="row" spacing={1} alignItems="center">
                  {index === 0 ? (
                    <TuneOutlinedIcon fontSize="small" />
                  ) : (
                    <CalendarMonthOutlinedIcon fontSize="small" />
                  )}
                  <Typography variant="overline" sx={{ letterSpacing: "0.12em" }}>
                    {item.eyebrow}
                  </Typography>
                </Stack>
                <Typography variant="h5" sx={{ mt: 1 }}>
                  {item.title}
                </Typography>
                <Typography sx={{ mt: 1.2, color: "text.secondary", lineHeight: 1.7 }}>
                  {item.body}
                </Typography>
              </Paper>
            ))}
          </Box>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, sm: 3.25 },
              border: "1px solid",
              borderColor: "divider",
              borderRadius: landingRadius.panel,
              background:
                "linear-gradient(135deg, rgba(17,24,39,0.94) 0%, rgba(30,41,59,0.9) 100%)",
              color: "#f8fafc",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: { xs: "flex-start", md: "center" },
                gap: 2,
                flexDirection: { xs: "column", md: "row" },
              }}
            >
              <Box>
                <Typography variant="overline" sx={{ letterSpacing: "0.14em", color: "rgba(248,250,252,0.72)" }}>
                  Join The Beta
                </Typography>
                <Typography variant="h4" sx={{ mt: 0.75, maxWidth: 620 }}>
                  Start free, test the flow, and see if it earns a place in your week.
                </Typography>
                <Typography sx={{ mt: 1.25, color: "rgba(248,250,252,0.76)", maxWidth: 680 }}>
                  The fastest way to know if Lift Logic is worth building bigger is
                  getting real lifters into the daily loop: sign up, generate or
                  build a workout, log a few sessions, and see where the friction is.
                </Typography>
              </Box>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                <Button
                  component={NextLink}
                  href="/signup"
                  variant="contained"
                  sx={{
                    backgroundColor: "#f8fafc",
                    color: "#0f172a",
                    "&:hover": {
                      backgroundColor: "#e2e8f0",
                    },
                    borderRadius: landingRadius.button,
                  }}
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => handleLandingCtaClick("footer_start_free_beta")}
                >
                  Start free beta
                </Button>
                <Button
                  component={NextLink}
                  href="/pricing"
                  variant="outlined"
                  sx={{
                    borderColor: "rgba(248,250,252,0.22)",
                    color: "#f8fafc",
                    backgroundColor: "rgba(255,255,255,0.04)",
                    "&:hover": {
                      borderColor: "rgba(248,250,252,0.36)",
                      backgroundColor: "rgba(255,255,255,0.08)",
                    },
                    borderRadius: landingRadius.button,
                  }}
                >
                  See pricing
                </Button>
                <Button
                  component={NextLink}
                  href="/signin"
                  variant="outlined"
                  sx={{
                    borderColor: "rgba(248,250,252,0.22)",
                    color: "#f8fafc",
                    backgroundColor: "rgba(255,255,255,0.04)",
                    "&:hover": {
                      borderColor: "rgba(248,250,252,0.36)",
                      backgroundColor: "rgba(255,255,255,0.08)",
                    },
                    borderRadius: landingRadius.button,
                  }}
                >
                  Sign in
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default HomePage;
