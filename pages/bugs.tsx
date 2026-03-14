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
import { emitDevBugInteraction } from "../utils/devBugRecorder";

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

const formatFeedbackForClipboard = (item: FeedbackItemDoc) => {
  const parts = [
    `Title: ${item.title}`,
    `Reporter: ${item.username || item.email || item.userId}`,
    `Created: ${
      item.createdAt ? new Date(item.createdAt).toLocaleString() : "Unknown"
    }`,
    `Status: ${item.status || "new"}`,
    `Type: ${item.type}`,
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
    emitDevBugInteraction({
      type: "lifecycle",
      kind: "semantic",
      label: "Open bugs inbox",
      expected: "All bug reports load and stay current.",
      actual: "Bugs page mounted and started loading reports.",
      status: "info",
    });

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
            emitDevBugInteraction({
              type: "lifecycle",
              kind: "semantic",
              label: "Live bug refresh received new reports",
              expected: "New bug reports appear automatically in the inbox.",
              actual: `${feedback.length - prev.length} new report(s) were added to the list.`,
              status: "success",
            });
            toast.info("New bug report received");
          }

          return feedback;
        });
      } catch (error) {
        if (!options?.silent) {
          emitDevBugInteraction({
            type: "lifecycle",
            kind: "semantic",
            label: "Load bugs inbox failed",
            expected: "All bug reports load and stay current.",
            actual: "The bugs page could not load feedback records.",
            status: "failure",
          });
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
  const feedbackItems = useMemo(
    () => items.filter((item) => item.type === "feature"),
    [items]
  );

  const handleDelete = async (feedbackId: string) => {
    setDeletingId(feedbackId);
    const item = items.find((entry) => String(entry._id) === String(feedbackId));

    emitDevBugInteraction({
      type: "click",
      kind: "semantic",
      label: `Delete bug report "${item?.title || feedbackId}"`,
      expected: "The selected bug report is removed from the inbox.",
      actual: "Bug delete was requested from the bugs page.",
      status: "info",
    });

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
      emitDevBugInteraction({
        type: "click",
        kind: "semantic",
        label: `Copy bug report "${item.title}"`,
        expected: "The full bug report is copied to the clipboard.",
        actual: "Clipboard copy was requested from the bugs page.",
        status: "info",
      });
      await navigator.clipboard.writeText(
        item.type === "bug"
          ? formatBugForClipboard(item)
          : formatFeedbackForClipboard(item)
      );
      emitDevBugInteraction({
        type: "lifecycle",
        kind: "semantic",
        label: `Copied ${item.type} report "${item.title}"`,
        expected: "The full report is copied to the clipboard.",
        actual: "Clipboard copy succeeded.",
        status: "success",
      });
      toast.success(
        item.type === "bug" ? "Bug report copied" : "Feedback copied"
      );
    } catch (error) {
      emitDevBugInteraction({
        type: "lifecycle",
        kind: "semantic",
        label: `Copy ${item.type} report failed for "${item.title}"`,
        expected: "The full report is copied to the clipboard.",
        actual: "Clipboard copy failed.",
        status: "failure",
      });
      console.error("Copy bug error:", error);
      toast.error(
        item.type === "bug"
          ? "Couldn't copy that bug report."
          : "Couldn't copy that feedback item."
      );
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
              <Typography variant="h6">Feedback inbox</Typography>
              <Typography sx={{ mt: 0.75, color: "text.secondary" }}>
                Showing every record in `feedback` where `type` is `feature`.
              </Typography>
            </Box>
            <Chip
              label={`${feedbackItems.length} feedback item${
                feedbackItems.length === 1 ? "" : "s"
              }`}
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
          {feedbackItems.length === 0 ? (
            <Alert severity="info">No feature feedback found.</Alert>
          ) : (
            <Stack divider={<Divider flexItem />} spacing={0}>
              {feedbackItems.map((item) => {
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
                          label="Feature"
                          color="info"
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          label={item.status || "new"}
                          color={statusTone[item.status || "new"] || "default"}
                        />
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
