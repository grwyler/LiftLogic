"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Session } from "next-auth";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import BugReportOutlinedIcon from "@mui/icons-material/BugReportOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LoadingIndicator from "../components/LoadingIndicator";
import { deleteFeedback, fetchFeedback } from "../utils/helpers";
import { FeedbackItemDoc } from "../utils/types";
import { toast } from "react-toastify";

const LIVE_REFRESH_INTERVAL_MS = 5000;

const statusTone: Record<string, "default" | "success" | "warning" | "info"> = {
  new: "warning",
  reviewing: "info",
  planned: "info",
  resolved: "success",
  closed: "default",
};

const formatBugForClipboard = (item: FeedbackItemDoc) => {
  const parts = [
    `Title: ${item.title}`,
    `Reporter: ${item.username || item.email || item.userId}`,
    `Created: ${
      item.createdAt ? new Date(item.createdAt).toLocaleString() : "Unknown"
    }`,
    `Status: ${item.status || "new"}`,
    `Severity: ${item.severity || "unknown"}`,
    `Page: ${item.page || "unknown"}`,
    "",
    item.description,
  ];

  return parts.join("\n");
};

const BugsPage = () => {
  const { data: session } = useSession() as {
    data: (Session & { token?: { user?: { _id?: string } } }) | null;
  };
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [items, setItems] = useState<FeedbackItemDoc[]>([]);

  useEffect(() => {
    if (!session?.token?.user?._id) {
      setLoading(false);
      return;
    }

    let active = true;

    const load = async (options?: { silent?: boolean }) => {
      try {
        const feedback = await fetchFeedback();
        if (!active) {
          return;
        }

        setItems((prev) => {
          const prevSerialized = JSON.stringify(
            prev.map((item) => ({
              _id: String(item._id),
              updatedAt: item.updatedAt,
              createdAt: item.createdAt,
            }))
          );
          const nextSerialized = JSON.stringify(
            feedback.map((item) => ({
              _id: String(item._id),
              updatedAt: item.updatedAt,
              createdAt: item.createdAt,
            }))
          );

          if (prevSerialized === nextSerialized) {
            return prev;
          }

          if (options?.silent && feedback.length > prev.length) {
            toast.info("New bug report received");
          }

          return feedback;
        });
      } catch (error) {
        if (!options?.silent) {
          console.error("Error loading bugs page:", error);
          toast.error("Couldn't load bug reports.");
        }
      } finally {
        if (!options?.silent && active) {
          setLoading(false);
        }
      }
    };

    load();

    const interval = window.setInterval(() => {
      load({ silent: true });
    }, LIVE_REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [session]);

  const bugItems = useMemo(
    () => items.filter((item) => item.type === "bug"),
    [items]
  );

  const handleDelete = async (feedbackId: string) => {
    setDeletingId(feedbackId);

    try {
      await deleteFeedback(feedbackId);
      setItems((prev) =>
        prev.filter((item) => String(item._id) !== String(feedbackId))
      );
      toast.success("Bug report deleted");
    } catch (error) {
      console.error("Delete feedback error:", error);
      toast.error("Couldn't delete that bug report.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopy = async (item: FeedbackItemDoc) => {
    try {
      await navigator.clipboard.writeText(formatBugForClipboard(item));
      toast.success("Bug report copied");
    } catch (error) {
      console.error("Copy bug error:", error);
      toast.error("Couldn't copy that bug report.");
    }
  };

  if (loading) {
    return <LoadingIndicator />;
  }

  if (!session?.token?.user?._id) {
    return (
      <Box sx={{ maxWidth: 760, mx: "auto", px: 2, py: 4 }}>
        <Alert severity="warning">Sign in to view bug reports.</Alert>
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
      <Box sx={{ maxWidth: 980, mx: "auto", display: "grid", gap: 2 }}>
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
              Bugs
            </Typography>
            <Typography variant="h4">All bug reports</Typography>
            <Typography sx={{ mt: 1, color: "text.secondary", maxWidth: 720 }}>
              Review bug reports across all users and remove ones you no longer
              want to keep.
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
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            <Box>
              <Typography variant="h6">Bug inbox</Typography>
              <Typography sx={{ mt: 0.75, color: "text.secondary" }}>
                Showing every record in `feedback` where `type` is `bug`.
              </Typography>
            </Box>
            <Chip
              icon={<BugReportOutlinedIcon />}
              label={`${bugItems.length} bug${bugItems.length === 1 ? "" : "s"}`}
              variant="outlined"
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
          }}
        >
          {bugItems.length === 0 ? (
            <Alert severity="info">No bug reports found.</Alert>
          ) : (
            <Stack divider={<Divider flexItem />} spacing={0}>
              {bugItems.map((item) => {
                const feedbackId = String(item._id);
                return (
                  <Box key={feedbackId} sx={{ py: 1.75 }}>
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={1.5}
                      justifyContent="space-between"
                      alignItems={{ xs: "flex-start", md: "center" }}
                    >
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip
                          size="small"
                          label="Bug"
                          color="warning"
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          label={item.status || "new"}
                          color={statusTone[item.status || "new"] || "default"}
                        />
                        {item.severity ? (
                          <Chip
                            size="small"
                            label={`${item.severity} severity`}
                            variant="outlined"
                          />
                        ) : null}
                        {item.page ? (
                          <Chip size="small" label={item.page} variant="outlined" />
                        ) : null}
                      </Stack>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        alignItems={{ xs: "flex-start", sm: "center" }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {item.username || item.email || item.userId}
                          {" · "}
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleString()
                            : ""}
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<ContentCopyIcon />}
                          onClick={() => handleCopy(item)}
                        >
                          Copy
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          startIcon={<DeleteOutlineIcon />}
                          onClick={() => handleDelete(feedbackId)}
                          disabled={deletingId === feedbackId}
                        >
                          {deletingId === feedbackId ? "Deleting..." : "Delete"}
                        </Button>
                      </Stack>
                    </Stack>

                    <Typography variant="h6" sx={{ mt: 1.25 }}>
                      {item.title}
                    </Typography>
                    <Typography
                      sx={{
                        mt: 0.9,
                        color: "text.secondary",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {item.description}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default BugsPage;
