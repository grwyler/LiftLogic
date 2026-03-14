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
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BugReportOutlinedIcon from "@mui/icons-material/BugReportOutlined";
import LoadingIndicator from "../components/LoadingIndicator";
import {
  fetchFeedbackWorkflow,
  updateFeedbackWorkItem,
} from "../utils/helpers";
import {
  FeedbackTriageStatus,
  FeedbackWorkItemDoc,
} from "../utils/types";
import { toast } from "react-toastify";
import { emitDevBugInteraction } from "../utils/devBugRecorder";
import {
  formatFingerprintLabel,
  getWorkItemAnchorId,
} from "../utils/feedbackWorkflow";

const LIVE_REFRESH_INTERVAL_MS = 5000;

const triageTone: Record<
  FeedbackTriageStatus,
  "default" | "success" | "warning" | "info"
> = {
  new: "warning",
  duplicate: "default",
  queued: "info",
  fixing: "warning",
  resolved: "success",
  verified: "success",
};

const notificationTone: Record<
  string,
  "default" | "success" | "warning" | "error"
> = {
  pending: "warning",
  sent: "success",
  skipped: "default",
  failed: "error",
};

type WorkflowDraft = {
  fixThreadId: string;
  fixCommitSha: string;
};

const triageLabel: Record<FeedbackTriageStatus, string> = {
  new: "New",
  duplicate: "Duplicate",
  queued: "Sent to Codex",
  fixing: "In Progress",
  resolved: "Ready to Verify",
  verified: "Verified",
};

const getPrimaryAction = (triageStatus: FeedbackTriageStatus) => {
  switch (triageStatus) {
    case "new":
    case "duplicate":
      return {
        label: "Send to Codex",
        nextStatus: "fixing" as FeedbackTriageStatus,
      };
    case "queued":
    case "fixing":
      return {
        label: "Ready to Verify",
        nextStatus: "resolved" as FeedbackTriageStatus,
      };
    case "resolved":
      return {
        label: "Verified",
        nextStatus: "verified" as FeedbackTriageStatus,
      };
    case "verified":
    default:
      return null;
  }
};

const serializeWorkItems = (items: FeedbackWorkItemDoc[]) =>
  JSON.stringify(
    items.map((item) => ({
      _id: String(item._id),
      updatedAt: item.updatedAt,
      occurrenceCount: item.occurrenceCount,
      triageStatus: item.triageStatus,
      notificationStatus: item.notificationStatus,
    }))
  );

const formatTimestamp = (value?: Date | string) =>
  value ? new Date(value).toLocaleString() : "Unknown";

const createDraftMap = (
  items: FeedbackWorkItemDoc[],
  previous: Record<string, WorkflowDraft>
) => {
  const next = { ...previous };

  items.forEach((item) => {
    const id = String(item._id);
    if (!next[id]) {
      next[id] = {
        fixThreadId: item.fixThreadId || "",
        fixCommitSha: item.fixCommitSha || "",
      };
    }
  });

  return next;
};

const BugsPage = () => {
  const { data: session } = useSession() as {
    data:
      | (Session & {
          token?: {
            user?: { _id?: string; username?: string; email?: string };
          };
        })
      | null;
  };
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [workItems, setWorkItems] = useState<FeedbackWorkItemDoc[]>([]);
  const [drafts, setDrafts] = useState<Record<string, WorkflowDraft>>({});
  const [advancedOpenById, setAdvancedOpenById] = useState<
    Record<string, boolean>
  >({});

  const activeAnchor =
    typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";

  const isAdmin =
    String(session?.token?.user?.username || "").toLowerCase() === "grwyler" ||
    String((session as any)?.user?.username || "").toLowerCase() === "grwyler" ||
    String(session?.token?.user?.email || "").toLowerCase() ===
      "grwyler@gmail.com" ||
    String((session as any)?.user?.email || "").toLowerCase() ===
      "grwyler@gmail.com";

  useEffect(() => {
    if (!session?.token?.user?._id) {
      setLoading(false);
      return;
    }

    if (!isAdmin) {
      setLoading(false);
      return;
    }

    let active = true;

    emitDevBugInteraction({
      type: "lifecycle",
      kind: "semantic",
      label: "Open workflow inbox",
      expected: "Feedback work items load and stay current.",
      actual: "The workflow inbox started loading triaged work items.",
      status: "info",
    });

    const load = async (options?: { silent?: boolean }) => {
      try {
        const { workItems: nextWorkItems } = await fetchFeedbackWorkflow();
        if (!active) {
          return;
        }

        setWorkItems((previous) => {
          if (serializeWorkItems(previous) === serializeWorkItems(nextWorkItems)) {
            return previous;
          }

          if (options?.silent && nextWorkItems.length > previous.length) {
            toast.info("New feedback work item received");
          }

          return nextWorkItems;
        });
        setDrafts((previous) => createDraftMap(nextWorkItems, previous));
      } catch (error) {
        if (!options?.silent) {
          console.error("Error loading bugs workflow:", error);
          toast.error("Couldn't load the feedback workflow.");
        }
      } finally {
        if (!options?.silent && active) {
          setLoading(false);
        }
      }
    };

    void load();

    const interval = window.setInterval(() => {
      void load({ silent: true });
    }, LIVE_REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [isAdmin, session]);

  const bugItems = useMemo(
    () => workItems.filter((item) => item.type === "bug"),
    [workItems]
  );
  const featureItems = useMemo(
    () => workItems.filter((item) => item.type === "feature"),
    [workItems]
  );

  const handleDraftChange = (
    workItemId: string,
    key: keyof WorkflowDraft,
    value: string
  ) => {
    setDrafts((previous) => ({
      ...previous,
      [workItemId]: {
        ...(previous[workItemId] || { fixThreadId: "", fixCommitSha: "" }),
        [key]: value,
      },
    }));
  };

  const handleWorkflowUpdate = async (
    item: FeedbackWorkItemDoc,
    triageStatus: FeedbackTriageStatus
  ) => {
    const workItemId = String(item._id);
    const draft = drafts[workItemId] || {
      fixThreadId: item.fixThreadId || "",
      fixCommitSha: item.fixCommitSha || "",
    };

    setSavingId(workItemId);

    try {
      emitDevBugInteraction({
        type: "click",
        kind: "semantic",
        label: `Update work item "${item.title}" to ${triageStatus}`,
        expected: "The workflow queue updates the selected work item.",
        actual: `A ${triageStatus} action was requested.`,
        status: "info",
      });

      const response = await updateFeedbackWorkItem({
        workItemId,
        triageStatus,
        fixThreadId: draft.fixThreadId || undefined,
        fixCommitSha: draft.fixCommitSha || undefined,
      });

      const updatedWorkItem = response?.workItem as FeedbackWorkItemDoc | undefined;
      if (updatedWorkItem) {
        setWorkItems((previous) =>
          previous.map((entry) =>
            String(entry._id) === workItemId ? updatedWorkItem : entry
          )
        );
        setDrafts((previous) => ({
          ...previous,
          [workItemId]: {
            fixThreadId: updatedWorkItem.fixThreadId || "",
            fixCommitSha: updatedWorkItem.fixCommitSha || "",
          },
        }));
      }

      toast.success(`Marked as ${triageLabel[triageStatus] || triageStatus}`);
    } catch (error) {
      console.error("Feedback workflow update error:", error);
      toast.error("Couldn't update that work item.");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return <LoadingIndicator />;
  }

  if (!session?.token?.user?._id) {
    return (
      <Box sx={{ maxWidth: 760, mx: "auto", px: 2, py: 4 }}>
        <Alert severity="warning">Sign in to view feedback work items.</Alert>
      </Box>
    );
  }

  if (!isAdmin) {
    return (
      <Box sx={{ maxWidth: 760, mx: "auto", px: 2, py: 4 }}>
        <Alert severity="error">
          This page is restricted to the Lift Logic admin account.
        </Alert>
      </Box>
    );
  }

  const renderWorkItems = (
    items: FeedbackWorkItemDoc[],
    emptyMessage: string,
    typeLabel: string
  ) => {
    if (items.length === 0) {
      return <Alert severity="info">{emptyMessage}</Alert>;
    }

    return (
      <Stack divider={<Divider flexItem />} spacing={0}>
        {items.map((item) => {
          const workItemId = String(item._id);
          const primaryAction = getPrimaryAction(item.triageStatus);
          const draft = drafts[workItemId] || {
            fixThreadId: item.fixThreadId || "",
            fixCommitSha: item.fixCommitSha || "",
          };
          const anchorId = getWorkItemAnchorId(workItemId);
          const selected = activeAnchor === anchorId;
          const showAdvanced = Boolean(advancedOpenById[workItemId]);

          return (
            <Box
              key={workItemId}
              id={anchorId}
              sx={{
                py: 1.75,
                scrollMarginTop: 24,
                borderRadius: 2,
                px: selected ? 1.25 : 0,
                mx: selected ? -1.25 : 0,
                backgroundColor: selected
                  ? "rgba(59, 130, 246, 0.08)"
                  : "transparent",
              }}
            >
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1.5}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", md: "center" }}
              >
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    size="small"
                    label={typeLabel}
                    color={item.type === "bug" ? "warning" : "info"}
                    variant="outlined"
                  />
                  <Chip
                    size="small"
                    label={triageLabel[item.triageStatus] || item.triageStatus}
                    color={triageTone[item.triageStatus] || "default"}
                  />
                  <Chip
                    size="small"
                    label={item.notificationStatus || "pending"}
                    color={
                      notificationTone[item.notificationStatus || "pending"] ||
                      "default"
                    }
                    variant="outlined"
                  />
                  <Chip
                    size="small"
                    label={`${item.occurrenceCount} report${
                      item.occurrenceCount === 1 ? "" : "s"
                    }`}
                    variant="outlined"
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
                <Typography variant="body2" color="text.secondary">
                  Latest report {item.latestReportId || "unknown"}
                  {" | "}
                  {formatTimestamp(item.lastReportedAt)}
                </Typography>
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
                {item.latestDescription}
              </Typography>

              <Stack
                direction="row"
                spacing={1}
                flexWrap="wrap"
                useFlexGap
                sx={{ mt: 1.25 }}
              >
                {primaryAction ? (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() =>
                      handleWorkflowUpdate(item, primaryAction.nextStatus)
                    }
                    disabled={savingId === workItemId}
                  >
                    {primaryAction.label}
                  </Button>
                ) : null}
                {item.triageStatus !== "duplicate" ? (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleWorkflowUpdate(item, "duplicate")}
                    disabled={savingId === workItemId}
                  >
                    Mark Duplicate
                  </Button>
                ) : null}
                <Button
                  variant="text"
                  size="small"
                  onClick={() =>
                    setAdvancedOpenById((previous) => ({
                      ...previous,
                      [workItemId]: !previous[workItemId],
                    }))
                  }
                >
                  {showAdvanced ? "Hide Advanced" : "Advanced"}
                </Button>
              </Stack>

              {showAdvanced ? (
                <Box sx={{ mt: 1.25 }}>
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={1}
                  >
                    <TextField
                      label="Fix thread ID"
                      helperText="Optional: store the Codex conversation or job reference."
                      size="small"
                      value={draft.fixThreadId}
                      onChange={(event) =>
                        handleDraftChange(
                          workItemId,
                          "fixThreadId",
                          event.target.value
                        )
                      }
                      fullWidth
                    />
                    <TextField
                      label="Commit SHA"
                      helperText="Optional: store the commit that fixed this issue."
                      size="small"
                      value={draft.fixCommitSha}
                      onChange={(event) =>
                        handleDraftChange(
                          workItemId,
                          "fixCommitSha",
                          event.target.value
                        )
                      }
                      fullWidth
                    />
                  </Stack>
                  <Stack
                    direction="row"
                    spacing={1}
                    flexWrap="wrap"
                    useFlexGap
                    sx={{ mt: 1 }}
                  >
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() =>
                        handleWorkflowUpdate(item, item.triageStatus)
                      }
                      disabled={savingId === workItemId}
                    >
                      Save Tracking
                    </Button>
                    <Typography variant="body2" color="text.secondary">
                      Only use these if you want to remember the Codex thread or
                      the final fix commit.
                    </Typography>
                  </Stack>
                </Box>
              ) : null}

              <Stack
                direction="row"
                spacing={1}
                flexWrap="wrap"
                useFlexGap
                sx={{ mt: 1.25 }}
              >
                <Chip
                  size="small"
                  label={`Fingerprint ${formatFingerprintLabel(item.fingerprint)}`}
                  variant="outlined"
                />
                {item.fixThreadId ? (
                  <Chip
                    size="small"
                    label={`Thread ${item.fixThreadId}`}
                    variant="outlined"
                  />
                ) : null}
                {item.fixCommitSha ? (
                  <Chip
                    size="small"
                    label={`Commit ${item.fixCommitSha}`}
                    variant="outlined"
                  />
                ) : null}
                {item.lastNotificationError ? (
                  <Chip
                    size="small"
                    label={item.lastNotificationError}
                    color="warning"
                    variant="outlined"
                  />
                ) : null}
              </Stack>
            </Box>
          );
        })}
      </Stack>
    );
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        px: { xs: 1.5, sm: 2.5 },
        py: { xs: 2, sm: 3 },
      }}
    >
      <Box sx={{ maxWidth: 1080, mx: "auto", display: "grid", gap: 2 }}>
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
              Workflow
            </Typography>
            <Typography variant="h4">Feedback work items</Typography>
            <Typography sx={{ mt: 1, color: "text.secondary", maxWidth: 760 }}>
              Review the bug, click `Send to Codex` when you want Codex to work
              it, then move it to `Ready to Verify` and `Verified` as you
              confirm the fix. Advanced tracking is optional.
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
              <Typography variant="h6">Bug queue</Typography>
              <Typography sx={{ mt: 0.75, color: "text.secondary" }}>
                One card per unique bug. Duplicates roll into the same card so
                you can decide when to hand the issue to Codex.
              </Typography>
            </Box>
            <Chip
              icon={<BugReportOutlinedIcon />}
              label={`${bugItems.length} work item${
                bugItems.length === 1 ? "" : "s"
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
          {renderWorkItems(
            bugItems,
            "No bug work items found.",
            "Bug"
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
              <Typography variant="h6">Feature queue</Typography>
              <Typography sx={{ mt: 0.75, color: "text.secondary" }}>
                Feature requests use the same simplified queue, but the advanced
                tracking fields stay hidden until you need them.
              </Typography>
            </Box>
            <Chip
              label={`${featureItems.length} work item${
                featureItems.length === 1 ? "" : "s"
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
          {renderWorkItems(
            featureItems,
            "No feature work items found.",
            "Feature"
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default BugsPage;
