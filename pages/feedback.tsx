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
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BugReportOutlinedIcon from "@mui/icons-material/BugReportOutlined";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import LoadingIndicator from "../components/LoadingIndicator";
import { fetchFeedback, fetchUser, submitFeedback } from "../utils/helpers";
import { FeedbackItemDoc } from "../utils/types";
import { toast } from "react-toastify";

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

const FeedbackPage = () => {
  const { data: session } = useSession() as {
    data: (Session & { token: { user: { _id: string } } }) | null;
  };
  const router = useRouter();
  const [user, setUser] = useState<FeedbackPageUser | null>(null);
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItemDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [type, setType] = useState<"bug" | "feature">("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high">("medium");

  useEffect(() => {
    if (!session?.token?.user?._id) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const [userData, feedbackData] = await Promise.all([
          fetchUser(session.token.user._id),
          fetchFeedback(session.token.user._id),
        ]);

        setUser(userData);
        setFeedbackItems(feedbackData);
      } catch (error) {
        console.error("Error loading feedback page:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [session]);

  const canSubmit = useMemo(
    () => title.trim().length > 2 && description.trim().length > 9,
    [title, description]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user || !canSubmit) {
      return;
    }

    setSubmitting(true);

    try {
      const deviceType =
        typeof window !== "undefined" && window.innerWidth < 900
          ? "mobile"
          : "desktop";

      const response = await submitFeedback({
        userId: user._id,
        username: user.username,
        email: user.email,
        type,
        title: title.trim(),
        description: description.trim(),
        severity: type === "bug" ? severity : undefined,
        page: router.asPath,
        deviceType,
      });

      if (response?.feedback) {
        setFeedbackItems((prev) => [response.feedback, ...prev]);
      }

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
        px: { xs: 1.5, sm: 2.5 },
        py: { xs: 2, sm: 3 },
      }}
    >
      <Box sx={{ maxWidth: 900, mx: "auto", display: "grid", gap: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            flexDirection: { xs: "column", sm: "row" },
            gap: 1.5,
          }}
        >
          <Box>
            <Typography
              variant="overline"
              sx={{ color: "text.secondary", letterSpacing: "0.14em" }}
            >
              Feedback
            </Typography>
            <Typography variant="h4">Help improve Lift Logic</Typography>
            <Typography sx={{ mt: 1, color: "text.secondary", maxWidth: 640 }}>
              Report bugs when something breaks, or request changes when a flow
              feels rough. Keep it short and concrete so it is easy to act on.
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

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Stack component="form" spacing={2} onSubmit={handleSubmit}>
            <ToggleButtonGroup
              exclusive
              value={type}
              onChange={(_, nextValue) => {
                if (nextValue) {
                  setType(nextValue);
                }
              }}
              sx={{ flexWrap: "wrap", gap: 1 }}
            >
              <ToggleButton value="bug">
                <BugReportOutlinedIcon sx={{ mr: 1 }} />
                Report a bug
              </ToggleButton>
              <ToggleButton value="feature">
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
                gap: 1.25,
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

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
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
                        />
                        <Chip
                          size="small"
                          label={item.status || "new"}
                          color={statusTone[item.status || "new"] || "default"}
                        />
                        {item.severity && (
                          <Chip
                            size="small"
                            label={`${item.severity} severity`}
                            variant="outlined"
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
