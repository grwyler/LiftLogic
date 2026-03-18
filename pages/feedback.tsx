"use client";

import { Session } from "next-auth";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BugReportOutlinedIcon from "@mui/icons-material/BugReportOutlined";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import LoadingIndicator from "../components/LoadingIndicator";
import { fetchFeedback, fetchUser, submitFeedback } from "../utils/helpers";
import { getClientDeviceType } from "../utils/feedbackMetadata";
import { FeedbackItemDoc } from "../utils/types";
import { toast } from "react-toastify";
import { brandBackgrounds, brandPalette, brandRadii } from "../utils/brandSystem";

type FeedbackPageUser = {
  _id: string;
  username: string;
  email?: string;
};

const statusTone: Record<string, "default" | "success" | "warning" | "info"> = {
  new: "warning",
  reviewing: "info",
  planned: "info",
  resolved: "success",
  closed: "default",
};

const feedbackRadius = brandRadii;
const feedbackPanelPadding = { xs: "20px", sm: "24px" } as const;

const FeedbackPage = () => {
  const { data: session } = useSession() as {
    data: (Session & { token: { user: { _id: string } } }) | null;
  };
  const router = useRouter();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  const [user, setUser] = useState<FeedbackPageUser | null>(null);
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItemDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [type, setType] = useState<"bug" | "feature">("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high">("medium");
  const sessionUserId =
    session?.token?.user?._id || (session?.user as { _id?: string } | undefined)?._id || "";

  const loadFeedbackPageData = async (userId: string) => {
    const [userData, feedbackData] = await Promise.all([
      fetchUser(userId),
      fetchFeedback(userId),
    ]);

    setUser(userData);
    setFeedbackItems(feedbackData);
  };

  useEffect(() => {
    if (!sessionUserId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        await loadFeedbackPageData(sessionUserId);
      } catch (error) {
        console.error("Error loading feedback page:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [sessionUserId]);

  const canSubmit = useMemo(
    () => title.trim().length > 2 && description.trim().length > 9,
    [title, description]
  );
  const feedbackPanelSx = {
    position: "relative",
    overflow: "hidden",
    p: feedbackPanelPadding,
    borderRadius: feedbackRadius.panel,
    border: "1px solid",
    borderColor: "divider",
    background: isDarkMode
      ? brandBackgrounds.darkPremiumPanel
      : brandBackgrounds.premiumPanel,
    boxShadow: isDarkMode
      ? "0 24px 56px rgba(2, 6, 23, 0.28)"
      : "0 20px 46px rgba(15, 23, 42, 0.08)",
  } as const;
  const feedbackControlSx = {
    border: "1px solid",
    borderColor: "divider",
    backgroundColor: isDarkMode
      ? "rgba(15, 23, 42, 0.62)"
      : "rgba(255, 255, 255, 0.94)",
  } as const;
  const feedbackTextFieldSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: feedbackRadius.button,
      ...feedbackControlSx,
      "& fieldset": {
        borderColor: "divider",
      },
      "&:hover fieldset": {
        borderColor: isDarkMode ? "rgba(255,255,255,0.22)" : "rgba(249,115,22,0.34)",
      },
      "&.Mui-focused fieldset": {
        borderColor: brandPalette.signature,
      },
    },
  } as const;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user || !canSubmit) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await submitFeedback({
        userId: user._id,
        username: user.username,
        email: user.email,
        type,
        title: title.trim(),
        description: description.trim(),
        severity: type === "bug" ? severity : undefined,
        page: router.asPath,
        deviceType: getClientDeviceType(),
      });

      if (response?.feedback) {
        setFeedbackItems((prev) => [response.feedback, ...prev]);
      }

      const latestFeedback = await fetchFeedback(user._id);
      setFeedbackItems(latestFeedback);

      setTitle("");
      setDescription("");
      setSeverity("medium");
      toast.success(
        type === "bug"
          ? "Bug report submitted"
          : "Feature request submitted"
      );
    } catch (error) {
      console.error("Feedback submission error:", error);
      toast.error("We couldn't submit that right now.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingIndicator />;
  }

  if (!user) {
    return (
      <Box sx={{ maxWidth: 720, mx: "auto", px: 2, py: 4 }}>
        <Alert severity="warning">
          Sign in to send bug reports or feature requests.
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        px: { xs: "16px", sm: "24px" },
        py: { xs: "20px", sm: "24px" },
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          background: isDarkMode
            ? "radial-gradient(circle at 12% 18%, rgba(249, 115, 22, 0.16), transparent 22%), radial-gradient(circle at 88% 14%, rgba(56, 189, 248, 0.14), transparent 24%)"
            : "radial-gradient(circle at 12% 18%, rgba(249, 115, 22, 0.18), transparent 22%), radial-gradient(circle at 88% 14%, rgba(255, 247, 237, 0.88), transparent 26%)",
          pointerEvents: "none",
        },
      }}
    >
      <Box
        sx={{
          maxWidth: 900,
          mx: "auto",
          display: "grid",
          gap: { xs: "20px", sm: "24px" },
          position: "relative",
        }}
      >
        <Paper elevation={0} sx={feedbackPanelSx}>
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background: isDarkMode
                ? "linear-gradient(180deg, rgba(255,255,255,0.08), transparent 36%)"
                : "linear-gradient(180deg, rgba(255,255,255,0.82), transparent 34%)",
            }}
          />
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", sm: "center" },
              flexDirection: { xs: "column", sm: "row" },
              gap: { xs: "16px", sm: "20px" },
              position: "relative",
            }}
          >
            <Box>
              <Stack
                direction="row"
                spacing={1}
                flexWrap="wrap"
                useFlexGap
                sx={{ mb: "16px" }}
              >
                <Chip
                  label="Core product styling"
                  sx={{
                    borderRadius: feedbackRadius.chip,
                    ...feedbackControlSx,
                    backgroundColor: "rgba(249,115,22,0.12)",
                    color: "text.primary",
                  }}
                />
                <Chip
                  label="Shared Lift Logic tokens"
                  sx={{
                    borderRadius: feedbackRadius.chip,
                    ...feedbackControlSx,
                    color: "text.secondary",
                  }}
                />
              </Stack>
              <Typography
                variant="overline"
                sx={{ color: "text.secondary", letterSpacing: "0.18em" }}
              >
                Feedback
              </Typography>
              <Typography variant="h4">Help improve Lift Logic</Typography>
              <Typography sx={{ mt: 1, color: "text.secondary", maxWidth: 640 }}>
                Report bugs when something breaks, or request changes when a flow
                feels rough. This page uses the same Lift Logic panel language as the
                rest of the product so feedback feels like part of the app, not a
                one-off design experiment.
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
        </Paper>

        <Box sx={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {[
            "Action-first layout",
            "Clear status visibility",
            "Consistent with core routes",
          ].map((label) => (
            <Chip
              key={label}
              label={label}
              sx={{
                px: 0.4,
                borderRadius: feedbackRadius.chip,
                ...feedbackControlSx,
                color: "text.secondary",
              }}
            />
          ))}
        </Box>

        <Paper elevation={0} sx={feedbackPanelSx}>
          <Stack component="form" spacing={2} onSubmit={handleSubmit}>
            <ToggleButtonGroup
              exclusive
              value={type}
              onChange={(_, nextValue) => {
                if (nextValue) {
                  setType(nextValue);
                }
              }}
              sx={{
                flexWrap: "wrap",
                gap: "8px",
                borderRadius: feedbackRadius.card,
                padding: "4px",
                ...feedbackControlSx,
              }}
            >
              <ToggleButton
                value="bug"
                sx={{
                  borderRadius: feedbackRadius.button,
                  px: "14px",
                  "&.Mui-selected": {
                    backgroundColor: "rgba(249,115,22,0.14)",
                  },
                  "&.Mui-selected:hover": {
                    backgroundColor: "rgba(249,115,22,0.18)",
                  },
                }}
              >
                <BugReportOutlinedIcon sx={{ mr: 1 }} />
                Report a bug
              </ToggleButton>
              <ToggleButton
                value="feature"
                sx={{
                  borderRadius: feedbackRadius.button,
                  px: "14px",
                  "&.Mui-selected": {
                    backgroundColor: "rgba(249,115,22,0.14)",
                  },
                  "&.Mui-selected:hover": {
                    backgroundColor: "rgba(249,115,22,0.18)",
                  },
                }}
              >
                <LightbulbOutlinedIcon sx={{ mr: 1 }} />
                Request a feature
              </ToggleButton>
            </ToggleButtonGroup>

            <TextField
              label={
                type === "bug"
                  ? "What went wrong?"
                  : "What would you like changed?"
              }
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              fullWidth
              sx={feedbackTextFieldSx}
            />

            <TextField
              label={
                type === "bug"
                  ? "What happened, and how can we reproduce it?"
                  : "Describe the improvement or feature"
              }
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              fullWidth
              multiline
              minRows={5}
              placeholder={
                type === "bug"
                  ? "Example: I opened Bench Press, logged set 2, and the screen jumped back to the top on mobile."
                  : "Example: I want a simple weekly summary that shows completed workouts, volume, and PRs."
              }
              sx={feedbackTextFieldSx}
            />

            {type === "bug" && (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {(["low", "medium", "high"] as const).map((level) => (
                  <Chip
                    key={level}
                    label={`${level[0].toUpperCase()}${level.slice(1)} severity`}
                    color={severity === level ? "primary" : "default"}
                    variant={severity === level ? "filled" : "outlined"}
                    onClick={() => setSeverity(level)}
                    sx={{ borderRadius: feedbackRadius.chip, ...feedbackControlSx }}
                  />
                ))}
              </Stack>
            )}

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: { xs: "stretch", sm: "center" },
                flexDirection: { xs: "column", sm: "row" },
                gap: { xs: "12px", sm: "16px" },
              }}
            >
              <Typography sx={{ color: "text.secondary" }}>
                We automatically attach the current page and device type.
              </Typography>
              <Button
                type="submit"
                variant="contained"
                startIcon={<SendRoundedIcon />}
                disabled={!canSubmit || submitting}
                sx={{ borderRadius: feedbackRadius.button }}
              >
                {submitting
                  ? "Sending..."
                  : type === "bug"
                  ? "Submit bug report"
                  : "Send request"}
              </Button>
            </Box>
          </Stack>
        </Paper>

        <Paper elevation={0} sx={feedbackPanelSx}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6">Your recent submissions</Typography>
              <Typography sx={{ mt: 0.75, color: "text.secondary" }}>
                This keeps the channel visible and helps users feel heard.
              </Typography>
            </Box>

            {feedbackItems.length === 0 ? (
              <Alert severity="info">
                Nothing submitted yet. Your first bug report or feature request
                will show up here.
              </Alert>
            ) : (
              <Stack divider={<Divider flexItem />} spacing={0}>
                {feedbackItems.map((item) => (
                  <Box key={String(item._id)} sx={{ py: 1.5 }}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      justifyContent="space-between"
                      alignItems={{ xs: "flex-start", sm: "center" }}
                    >
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip
                          size="small"
                          label={item.type === "bug" ? "Bug" : "Feature"}
                          color={item.type === "bug" ? "warning" : "info"}
                          variant="outlined"
                          sx={{ borderRadius: feedbackRadius.chip, ...feedbackControlSx }}
                        />
                        <Chip
                          size="small"
                          label={item.status || "new"}
                          color={statusTone[item.status || "new"] || "default"}
                          sx={{ borderRadius: feedbackRadius.chip, ...feedbackControlSx }}
                        />
                        {item.severity && (
                          <Chip
                            size="small"
                            label={`${item.severity} severity`}
                            variant="outlined"
                            sx={{ borderRadius: feedbackRadius.chip, ...feedbackControlSx }}
                          />
                        )}
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleDateString()
                          : ""}
                      </Typography>
                    </Stack>
                    <Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 700 }}>
                      {item.title}
                    </Typography>
                    <Typography sx={{ mt: 0.75, color: "text.secondary" }}>
                      {item.description}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
};

export default FeedbackPage;
