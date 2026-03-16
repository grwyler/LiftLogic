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
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BugReportOutlinedIcon from "@mui/icons-material/BugReportOutlined";
import LoadingIndicator from "../components/LoadingIndicator";
import {
  deleteFeedbackWorkItem,
  fetchMonetizationSummary,
  fetchFoundingBetaUsers,
  fetchFeedbackWorkflow,
  saveFoundingBetaAccess,
  updateFeedbackWorkItem,
} from "../utils/helpers";
import {
  FeedbackItemDoc,
  FeedbackTriageStatus,
  FeedbackWorkItemDoc,
  MonetizationSummaryResponse,
} from "../utils/types";
import { toast } from "react-toastify";
import { emitDevBugInteraction } from "../utils/devBugRecorder";
import {
  formatFingerprintLabel,
  getWorkItemAnchorId,
} from "../utils/feedbackWorkflow";
import {
  getFeedbackEvidenceForWorkItem,
  buildCodexCopyText,
  summarizeBugReportEvidence,
} from "../utils/feedbackDetails";

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
  title: string;
  latestDescription: string;
  fixThreadId: string;
  fixCommitSha: string;
};

type QueueSortMode =
  | "workflow"
  | "latest"
  | "oldest"
  | "reports"
  | "severity";

type FoundingBetaUserRecord = {
  _id: string;
  username: string;
  name?: string;
  email?: string;
  createdAt?: Date | string;
  billingPlan?: string;
  subscriptionStatus?: string;
  productPlan?: string;
  manualProBetaAccess?: {
    grantedAt?: Date | string;
    grantedByEmail?: string;
    expiresAt?: Date | string;
    revokedAt?: Date | string;
    revokedByEmail?: string;
    paymentCollectionNote?: string;
    active?: boolean;
  } | null;
};

type FoundingBetaDraft = {
  expiresAt: string;
  paymentCollectionNote: string;
};

const inactiveTriageStatuses: FeedbackTriageStatus[] = [
  "resolved",
  "duplicate",
  "verified",
];

const triageLabel: Record<FeedbackTriageStatus, string> = {
  new: "New",
  duplicate: "Closed as Duplicate",
  queued: "Triaged",
  fixing: "In Progress",
  resolved: "Fixed",
  verified: "Closed",
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

const formatRate = (value?: number) => `${Math.round((value || 0) * 100)}%`;

const triageSortOrder: Record<FeedbackTriageStatus, number> = {
  fixing: 0,
  queued: 1,
  new: 2,
  resolved: 3,
  duplicate: 4,
  verified: 5,
};

const severitySortOrder: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const getItemActivityTimestamp = (item: FeedbackWorkItemDoc) =>
  new Date(
    item.lastReportedAt || item.updatedAt || item.createdAt || 0
  ).getTime();

const compareWorkItems = (
  left: FeedbackWorkItemDoc,
  right: FeedbackWorkItemDoc,
  sortMode: QueueSortMode
) => {
  const byNewestActivity = getItemActivityTimestamp(right) - getItemActivityTimestamp(left);
  const byTitle = String(left.title || "").localeCompare(String(right.title || ""));

  switch (sortMode) {
    case "latest":
      return byNewestActivity || byTitle;
    case "oldest":
      return getItemActivityTimestamp(left) - getItemActivityTimestamp(right) || byTitle;
    case "reports":
      return (
        (right.occurrenceCount || 0) - (left.occurrenceCount || 0) ||
        byNewestActivity ||
        byTitle
      );
    case "severity":
      return (
        (severitySortOrder[String(left.severity || "low")] ?? 3) -
          (severitySortOrder[String(right.severity || "low")] ?? 3) ||
        byNewestActivity ||
        byTitle
      );
    case "workflow":
    default:
      return (
        (triageSortOrder[left.triageStatus] ?? 99) -
          (triageSortOrder[right.triageStatus] ?? 99) ||
        (severitySortOrder[String(left.severity || "low")] ?? 3) -
          (severitySortOrder[String(right.severity || "low")] ?? 3) ||
        byNewestActivity ||
        byTitle
      );
  }
};

const isInactiveWorkItem = (item: FeedbackWorkItemDoc) =>
  inactiveTriageStatuses.includes(item.triageStatus);

const createDraftMap = (
  items: FeedbackWorkItemDoc[],
  previous: Record<string, WorkflowDraft>
) => {
  const next = { ...previous };

  items.forEach((item) => {
    const id = String(item._id);
    if (!next[id]) {
      next[id] = {
        title: item.title || "",
        latestDescription: item.latestDescription || "",
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
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItemDoc[]>([]);
  const [drafts, setDrafts] = useState<Record<string, WorkflowDraft>>({});
  const [advancedOpenById, setAdvancedOpenById] = useState<
    Record<string, boolean>
  >({});
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<string | null>(null);
  const [queueSortMode, setQueueSortMode] = useState<QueueSortMode>("workflow");
  const [showCompletedSection, setShowCompletedSection] = useState(false);
  const [foundingBetaUsers, setFoundingBetaUsers] = useState<FoundingBetaUserRecord[]>([]);
  const [foundingBetaDrafts, setFoundingBetaDrafts] = useState<
    Record<string, FoundingBetaDraft>
  >({});
  const [foundingBetaSearch, setFoundingBetaSearch] = useState("");
  const [foundingBetaLoading, setFoundingBetaLoading] = useState(false);
  const [foundingBetaSavingId, setFoundingBetaSavingId] = useState<string | null>(null);
  const [monetizationSummary, setMonetizationSummary] =
    useState<MonetizationSummaryResponse | null>(null);
  const [monetizationLoading, setMonetizationLoading] = useState(false);

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
        const {
          feedback: nextFeedbackItems,
          workItems: nextWorkItems,
        } = await fetchFeedbackWorkflow();
        if (!active) {
          return;
        }

        setFeedbackItems(nextFeedbackItems);
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

  useEffect(() => {
    if (!isAdmin || !session?.token?.user?._id) {
      return;
    }

    let active = true;

    const loadFoundingBetaUsers = async () => {
      try {
        setFoundingBetaLoading(true);
        const response = await fetchFoundingBetaUsers("");
        if (!active) {
          return;
        }

        setFoundingBetaUsers(response.users || []);
        setFoundingBetaDrafts((previous) => {
          const next = { ...previous };
          (response.users || []).forEach((user) => {
            next[user._id] = {
              expiresAt: user?.manualProBetaAccess?.expiresAt
                ? String(user.manualProBetaAccess.expiresAt).slice(0, 10)
                : "",
              paymentCollectionNote:
                user?.manualProBetaAccess?.paymentCollectionNote || "",
            };
          });
          return next;
        });
      } catch (error) {
        console.error("Error loading founding beta users:", error);
        toast.error("Couldn't load founding beta access controls.");
      } finally {
        if (active) {
          setFoundingBetaLoading(false);
        }
      }
    };

    void loadFoundingBetaUsers();

    return () => {
      active = false;
    };
  }, [isAdmin, session]);

  useEffect(() => {
    if (!isAdmin || !session?.token?.user?._id) {
      return;
    }

    let active = true;

    const loadMonetizationSummary = async () => {
      try {
        setMonetizationLoading(true);
        const summary = await fetchMonetizationSummary();
        if (!active) {
          return;
        }

        setMonetizationSummary(summary);
      } catch (error) {
        console.error("Error loading monetization summary:", error);
        toast.error("Couldn't load the monetization summary.");
      } finally {
        if (active) {
          setMonetizationLoading(false);
        }
      }
    };

    void loadMonetizationSummary();

    return () => {
      active = false;
    };
  }, [isAdmin, session]);

  const bugItems = useMemo(
    () =>
      [...workItems]
        .filter((item) => item.type === "bug")
        .sort((left, right) => compareWorkItems(left, right, queueSortMode)),
    [queueSortMode, workItems]
  );
  const featureItems = useMemo(
    () =>
      [...workItems]
        .filter((item) => item.type === "feature")
        .sort((left, right) => compareWorkItems(left, right, queueSortMode)),
    [queueSortMode, workItems]
  );
  const selectedWorkItem = useMemo(
    () =>
      workItems.find((item) => String(item._id) === String(selectedWorkItemId)) ||
      null,
    [selectedWorkItemId, workItems]
  );
  const selectedEvidence = useMemo(
    () =>
      getFeedbackEvidenceForWorkItem({
        workItem: selectedWorkItem,
        feedbackItems,
      }),
    [feedbackItems, selectedWorkItem]
  );
  const activeBugItems = useMemo(
    () => bugItems.filter((item) => !isInactiveWorkItem(item)),
    [bugItems]
  );
  const inactiveBugItems = useMemo(
    () => bugItems.filter((item) => isInactiveWorkItem(item)),
    [bugItems]
  );
  const activeFeatureItems = useMemo(
    () => featureItems.filter((item) => !isInactiveWorkItem(item)),
    [featureItems]
  );
  const inactiveFeatureItems = useMemo(
    () => featureItems.filter((item) => isInactiveWorkItem(item)),
    [featureItems]
  );

  const renderMetadataRows = (
    rows: Array<{ label: string; value?: string | number | boolean | null }>
  ) => (
    <Stack spacing={0.75}>
      {rows
        .filter((row) => row.value !== undefined && row.value !== null && row.value !== "")
        .map((row) => (
          <Stack
            key={row.label}
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ minWidth: { sm: 132 } }}
            >
              {row.label}
            </Typography>
            <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
              {String(row.value)}
            </Typography>
          </Stack>
        ))}
    </Stack>
  );

  const handleDraftChange = (
    workItemId: string,
    key: keyof WorkflowDraft,
    value: string
  ) => {
    setDrafts((previous) => ({
      ...previous,
      [workItemId]: {
        ...(
          previous[workItemId] || {
            title: "",
            latestDescription: "",
            fixThreadId: "",
            fixCommitSha: "",
          }
        ),
        [key]: value,
      },
    }));
  };

  const handleWorkflowUpdate = async (
    item: FeedbackWorkItemDoc,
    {
      triageStatus,
      title,
      latestDescription,
      successMessage,
    }: {
      triageStatus: FeedbackTriageStatus;
      title?: string;
      latestDescription?: string;
      successMessage?: string;
    }
  ) => {
    const workItemId = String(item._id);
    const draft = drafts[workItemId] || {
      title: item.title || "",
      latestDescription: item.latestDescription || "",
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
        title: title ?? draft.title,
        latestDescription: latestDescription ?? draft.latestDescription,
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
        setFeedbackItems((previous) =>
          previous.map((entry) =>
            String(entry.workItemId || "") === workItemId
              ? {
                  ...entry,
                  triageStatus: updatedWorkItem.triageStatus,
                  status: updatedWorkItem.status,
                  fixThreadId: updatedWorkItem.fixThreadId,
                  fixCommitSha: updatedWorkItem.fixCommitSha,
                  resolvedAt: updatedWorkItem.resolvedAt,
                }
              : entry
          )
        );
        setDrafts((previous) => ({
          ...previous,
          [workItemId]: {
            title: updatedWorkItem.title || "",
            latestDescription: updatedWorkItem.latestDescription || "",
            fixThreadId: updatedWorkItem.fixThreadId || "",
            fixCommitSha: updatedWorkItem.fixCommitSha || "",
          },
        }));
      }

      toast.success(
        successMessage || `Updated to ${triageLabel[triageStatus] || triageStatus}`
      );
    } catch (error) {
      console.error("Feedback workflow update error:", error);
      toast.error("Couldn't update that work item.");
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteWorkItem = async (item: FeedbackWorkItemDoc) => {
    const workItemId = String(item._id || "");
    const confirmed = window.confirm(
      `Delete "${item.title}" and all ${item.occurrenceCount} linked report${
        item.occurrenceCount === 1 ? "" : "s"
      }? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setSavingId(workItemId);

    try {
      await deleteFeedbackWorkItem(workItemId);
      setWorkItems((previous) =>
        previous.filter((entry) => String(entry._id) !== workItemId)
      );
      setFeedbackItems((previous) =>
        previous.filter((entry) => String(entry.workItemId || "") !== workItemId)
      );
      setDrafts((previous) => {
        const next = { ...previous };
        delete next[workItemId];
        return next;
      });
      if (selectedWorkItemId === workItemId) {
        setSelectedWorkItemId(null);
      }
      toast.success("Issue deleted.");
    } catch (error) {
      console.error("Feedback workflow delete error:", error);
      toast.error("Couldn't delete that issue.");
    } finally {
      setSavingId(null);
    }
  };

  const handleCopyDetails = async (item: FeedbackWorkItemDoc) => {
    const evidence = getFeedbackEvidenceForWorkItem({
      workItem: item,
      feedbackItems,
    });
    const copyText = buildCodexCopyText({
      workItem: item,
      evidence,
    });

    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      toast.error("Clipboard copy is not available in this browser.");
      return;
    }

    try {
      await navigator.clipboard.writeText(copyText);
      toast.success("Copied issue details.");
    } catch (error) {
      console.error("Failed to copy work item details:", error);
      toast.error("Couldn't copy the work item details.");
    }
  };

  const handleFoundingBetaDraftChange = (
    userId: string,
    key: keyof FoundingBetaDraft,
    value: string
  ) => {
    setFoundingBetaDrafts((previous) => ({
      ...previous,
      [userId]: {
        expiresAt: previous[userId]?.expiresAt || "",
        paymentCollectionNote: previous[userId]?.paymentCollectionNote || "",
        [key]: value,
      },
    }));
  };

  const refreshFoundingBetaUsers = async (search: string) => {
    setFoundingBetaLoading(true);
    try {
      const response = await fetchFoundingBetaUsers(search);
      setFoundingBetaUsers(response.users || []);
      setFoundingBetaDrafts((previous) => {
        const next = { ...previous };
        (response.users || []).forEach((user) => {
          next[user._id] = {
            expiresAt: user?.manualProBetaAccess?.expiresAt
              ? String(user.manualProBetaAccess.expiresAt).slice(0, 10)
              : previous[user._id]?.expiresAt || "",
            paymentCollectionNote:
              previous[user._id]?.paymentCollectionNote ||
              user?.manualProBetaAccess?.paymentCollectionNote ||
              "",
          };
        });
        return next;
      });
    } catch (error) {
      console.error("Error refreshing founding beta users:", error);
      toast.error("Couldn't refresh founding beta users.");
    } finally {
      setFoundingBetaLoading(false);
    }
  };

  const refreshMonetizationSummary = async () => {
    setMonetizationLoading(true);
    try {
      const summary = await fetchMonetizationSummary();
      setMonetizationSummary(summary);
    } catch (error) {
      console.error("Error refreshing monetization summary:", error);
      toast.error("Couldn't refresh the monetization summary.");
    } finally {
      setMonetizationLoading(false);
    }
  };

  const handleFoundingBetaAccessSave = async (
    user: FoundingBetaUserRecord,
    operation: "grant" | "revoke" | "update"
  ) => {
    const draft = foundingBetaDrafts[user._id] || {
      expiresAt: "",
      paymentCollectionNote: "",
    };

    setFoundingBetaSavingId(user._id);
    try {
      const response = await saveFoundingBetaAccess({
        userId: user._id,
        operation,
        expiresAt: draft.expiresAt,
        paymentCollectionNote: draft.paymentCollectionNote,
      });

      if (response.user) {
        setFoundingBetaUsers((previous) =>
          previous.map((entry) => (entry._id === user._id ? response.user : entry))
        );
        setFoundingBetaDrafts((previous) => ({
          ...previous,
          [user._id]: {
            expiresAt: response.user?.manualProBetaAccess?.expiresAt
              ? String(response.user.manualProBetaAccess.expiresAt).slice(0, 10)
              : "",
            paymentCollectionNote:
              response.user?.manualProBetaAccess?.paymentCollectionNote || "",
          },
        }));
      }

      toast.success(
        operation === "grant"
          ? "Founding beta access granted."
          : operation === "revoke"
          ? "Founding beta access revoked."
          : "Founding beta access updated."
      );
      void refreshMonetizationSummary();
    } catch (error) {
      console.error("Error saving founding beta access:", error);
      toast.error("Couldn't save founding beta access.");
    } finally {
      setFoundingBetaSavingId(null);
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
          const draft = drafts[workItemId] || {
            title: item.title || "",
            latestDescription: item.latestDescription || "",
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
                <TextField
                  select
                  size="small"
                  label="Status"
                  value={item.triageStatus}
                  onChange={(event) =>
                    handleWorkflowUpdate(item, {
                      triageStatus: event.target.value as FeedbackTriageStatus,
                    })
                  }
                  disabled={savingId === workItemId}
                  sx={{ minWidth: 180 }}
                >
                  {Object.entries(triageLabel).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>
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
                <Button
                  variant="text"
                  size="small"
                  onClick={() => setSelectedWorkItemId(workItemId)}
                >
                  View Details
                </Button>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => handleCopyDetails(item)}
                >
                  Copy Details
                </Button>
                <Button
                  color="error"
                  variant="text"
                  size="small"
                  onClick={() => handleDeleteWorkItem(item)}
                  disabled={savingId === workItemId}
                >
                  Delete
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
                      helperText="Optional: store an implementation thread or job reference."
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
                      onClick={() => handleWorkflowUpdate(item, { triageStatus: item.triageStatus })}
                      disabled={savingId === workItemId}
                    >
                      Save Tracking
                    </Button>
                    <Typography variant="body2" color="text.secondary">
                      Use these optional fields to track the implementation thread
                      or final fix commit.
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
                {item.latestRuntimeContext?.environment ? (
                  <Chip
                    size="small"
                    label={`Env ${item.latestRuntimeContext.environment}`}
                    variant="outlined"
                  />
                ) : null}
                {item.latestRuntimeContext?.appVersion ? (
                  <Chip
                    size="small"
                    label={`Version ${item.latestRuntimeContext.appVersion}`}
                    variant="outlined"
                  />
                ) : null}
                {item.latestRuntimeContext?.commitSha ? (
                  <Chip
                    size="small"
                    label={`Build ${item.latestRuntimeContext.commitSha.slice(0, 10)}`}
                    variant="outlined"
                  />
                ) : null}
                {item.latestReporterRole ? (
                  <Chip
                    size="small"
                    label={`Reporter ${item.latestReporterRole}`}
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
              Review, edit, organize, and remove issues from one place. Status
              changes save immediately, and advanced tracking stays optional.
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
          <Stack spacing={2}>
            <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 2.5 }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
              >
                <Box>
                  <Typography variant="h6">Monetization summary</Typography>
                  <Typography sx={{ mt: 0.75, color: "text.secondary" }}>
                    Measure pricing intent, paid conversion, and cancellation pressure without
                    relying on anecdotes.
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  onClick={() => void refreshMonetizationSummary()}
                  disabled={monetizationLoading}
                >
                  {monetizationLoading ? "Refreshing..." : "Refresh summary"}
                </Button>
              </Stack>

              {monetizationSummary ? (
                <Box
                  sx={{
                    mt: 2,
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                    gap: 1.25,
                  }}
                >
                  {[
                    ["Pricing page viewed", monetizationSummary.pricingPageViews],
                    ["Upgrade prompt viewed", monetizationSummary.upgradePromptViews],
                    ["Checkout started", monetizationSummary.checkoutStarts],
                    ["Checkout completed", monetizationSummary.checkoutCompletions],
                    ["Manual Pro grant applied", monetizationSummary.manualProGrants],
                    ["Billing portal opened", monetizationSummary.billingPortalOpens],
                    ["Cancel requested", monetizationSummary.cancelRequests],
                    ["Subscription canceled", monetizationSummary.subscriptionCancellations],
                    ["Active paid users", monetizationSummary.activePaidUsers],
                    [
                      "Pricing to checkout rate",
                      formatRate(monetizationSummary.pricingToCheckoutStartRate),
                    ],
                    [
                      "Pricing to paid rate",
                      formatRate(monetizationSummary.pricingToPaidRate),
                    ],
                    [
                      "Checkout completion rate",
                      formatRate(monetizationSummary.checkoutCompletionRate),
                    ],
                    [
                      "Cancellation rate",
                      formatRate(monetizationSummary.cancellationRate),
                    ],
                  ].map(([label, value]) => (
                    <Paper
                      key={String(label)}
                      variant="outlined"
                      sx={{ p: 1.5, borderRadius: 2 }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {label}
                      </Typography>
                      <Typography variant="h6" sx={{ mt: 0.4 }}>
                        {String(value)}
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              ) : (
                <Alert severity="info" sx={{ mt: 2 }}>
                  {monetizationLoading
                    ? "Loading monetization summary..."
                    : "Monetization summary is not available yet."}
                </Alert>
              )}
            </Paper>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
            >
              <Box>
                <Typography variant="h6">Founding beta access</Typography>
                <Typography sx={{ mt: 0.75, color: "text.secondary" }}>
                  Grant or revoke manual Pro Beta access for the first paid cohort,
                  set an expiration date, and record how payment was collected.
                </Typography>
              </Box>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <TextField
                  size="small"
                  label="Find user"
                  value={foundingBetaSearch}
                  onChange={(event) => setFoundingBetaSearch(event.target.value)}
                  placeholder="username, name, or email"
                  sx={{ minWidth: { xs: "100%", sm: 260 } }}
                />
                <Button
                  variant="outlined"
                  onClick={() => void refreshFoundingBetaUsers(foundingBetaSearch)}
                  disabled={foundingBetaLoading}
                >
                  {foundingBetaLoading ? "Searching..." : "Search"}
                </Button>
              </Stack>
            </Stack>

            {foundingBetaUsers.length === 0 ? (
              <Alert severity="info">
                {foundingBetaLoading
                  ? "Loading founding beta users..."
                  : "No matching users found yet."}
              </Alert>
            ) : (
              <Stack spacing={1.5}>
                {foundingBetaUsers.map((user) => {
                  const draft = foundingBetaDrafts[user._id] || {
                    expiresAt: "",
                    paymentCollectionNote: "",
                  };
                  const manualAccess = user.manualProBetaAccess;
                  const accessActive = Boolean(manualAccess?.active);
                  const saving = foundingBetaSavingId === user._id;

                  return (
                    <Paper
                      key={user._id}
                      variant="outlined"
                      sx={{ p: 1.5, borderRadius: 2.5 }}
                    >
                      <Stack spacing={1.25}>
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={1}
                          justifyContent="space-between"
                          alignItems={{ xs: "flex-start", sm: "center" }}
                        >
                          <Box>
                            <Typography sx={{ fontWeight: 700 }}>
                              {user.name || user.username}
                            </Typography>
                            <Typography sx={{ color: "text.secondary" }}>
                              @{user.username}
                              {user.email ? ` • ${user.email}` : ""}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Chip
                              label={accessActive ? "Founding beta active" : "No manual grant"}
                              color={accessActive ? "success" : "default"}
                              variant={accessActive ? "filled" : "outlined"}
                            />
                            <Chip
                              label={`Resolved plan: ${user.productPlan || "free"}`}
                              variant="outlined"
                            />
                            <Chip
                              label={`Billing: ${user.billingPlan || "free"} / ${
                                user.subscriptionStatus || "inactive"
                              }`}
                              variant="outlined"
                            />
                          </Stack>
                        </Stack>

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                          <TextField
                            label="Expires on"
                            type="date"
                            size="small"
                            value={draft.expiresAt}
                            onChange={(event) =>
                              handleFoundingBetaDraftChange(
                                user._id,
                                "expiresAt",
                                event.target.value
                              )
                            }
                            InputLabelProps={{ shrink: true }}
                            sx={{ width: { xs: "100%", sm: 180 } }}
                          />
                          <TextField
                            label="Payment collection note"
                            size="small"
                            value={draft.paymentCollectionNote}
                            onChange={(event) =>
                              handleFoundingBetaDraftChange(
                                user._id,
                                "paymentCollectionNote",
                                event.target.value
                              )
                            }
                            placeholder="Cash, Venmo, in-person card, invoice..."
                            fullWidth
                          />
                        </Stack>

                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                          {manualAccess?.grantedAt
                            ? `Granted ${formatTimestamp(manualAccess.grantedAt)}${
                                manualAccess.grantedByEmail
                                  ? ` by ${manualAccess.grantedByEmail}`
                                  : ""
                              }`
                            : "No manual grant recorded yet."}
                          {manualAccess?.revokedAt
                            ? ` Revoked ${formatTimestamp(manualAccess.revokedAt)}${
                                manualAccess.revokedByEmail
                                  ? ` by ${manualAccess.revokedByEmail}`
                                  : ""
                              }.`
                            : ""}
                        </Typography>

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                          <Button
                            variant="contained"
                            onClick={() => void handleFoundingBetaAccessSave(user, "grant")}
                            disabled={saving}
                          >
                            {saving && !accessActive ? "Saving..." : "Grant access"}
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={() => void handleFoundingBetaAccessSave(user, "update")}
                            disabled={saving || !manualAccess}
                          >
                            {saving && accessActive ? "Saving..." : "Save expiration/note"}
                          </Button>
                          <Button
                            variant="text"
                            color="error"
                            onClick={() => void handleFoundingBetaAccessSave(user, "revoke")}
                            disabled={saving || !manualAccess}
                          >
                            Revoke
                          </Button>
                        </Stack>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            )}
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
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            <Box>
              <Typography variant="h6">Bug queue</Typography>
              <Typography sx={{ mt: 0.75, color: "text.secondary" }}>
                Only bugs that still need attention stay here. Fixed, closed,
                and duplicate items live in the completed section below.
              </Typography>
            </Box>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ xs: "stretch", sm: "center" }}
            >
              <TextField
                select
                size="small"
                label="Sort queue"
                value={queueSortMode}
                onChange={(event) =>
                  setQueueSortMode(event.target.value as QueueSortMode)
                }
                sx={{ minWidth: { xs: "100%", sm: 220 } }}
              >
                <MenuItem value="workflow">Workflow priority</MenuItem>
                <MenuItem value="latest">Latest activity</MenuItem>
                <MenuItem value="oldest">Oldest first</MenuItem>
                <MenuItem value="reports">Most reports</MenuItem>
                <MenuItem value="severity">Highest severity</MenuItem>
              </TextField>
              <Chip
                icon={<BugReportOutlinedIcon />}
                label={`${activeBugItems.length} active${
                  activeBugItems.length === 1 ? "" : "s"
                }`}
                variant="outlined"
              />
              {inactiveBugItems.length > 0 ? (
                <Chip
                  label={`${inactiveBugItems.length} completed`}
                  variant="outlined"
                />
              ) : null}
            </Stack>
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
            activeBugItems,
            "No active bug work items found.",
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
                Only active feature work stays here. Completed and closed
                items are separated below with the finished bug history.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                label={`${activeFeatureItems.length} active${
                  activeFeatureItems.length === 1 ? "" : "s"
                }`}
                variant="outlined"
              />
              {inactiveFeatureItems.length > 0 ? (
                <Chip
                  label={`${inactiveFeatureItems.length} completed`}
                  variant="outlined"
                />
              ) : null}
            </Stack>
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
            activeFeatureItems,
            "No active feature work items found.",
            "Feature"
          )}
        </Paper>

        {inactiveBugItems.length > 0 || inactiveFeatureItems.length > 0 ? (
          <>
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
                  <Typography variant="h6">Completed / Closed</Typography>
                  <Typography sx={{ mt: 0.75, color: "text.secondary" }}>
                    Fixed, verified, and duplicate items live here so the main
                    queue stays focused on active work.
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    label={`${inactiveBugItems.length + inactiveFeatureItems.length} total`}
                    variant="outlined"
                  />
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => setShowCompletedSection((previous) => !previous)}
                  >
                    {showCompletedSection ? "Hide Completed" : "Show Completed"}
                  </Button>
                </Stack>
              </Stack>
            </Paper>

            {showCompletedSection ? (
              <>
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
                    inactiveBugItems,
                    "No completed bug work items found.",
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
                  {renderWorkItems(
                    inactiveFeatureItems,
                    "No completed feature work items found.",
                    "Feature"
                  )}
                </Paper>
              </>
            ) : null}
          </>
        ) : null}

        <Dialog
          open={Boolean(selectedWorkItem)}
          onClose={() => setSelectedWorkItemId(null)}
          fullWidth
          maxWidth="md"
        >
          <DialogTitle>
            {selectedWorkItem?.title || "Work item details"}
          </DialogTitle>
          <DialogContent sx={{ display: "grid", gap: 2, pt: 1.5 }}>
            {selectedWorkItem ? (
              <>
                <Paper
                  variant="outlined"
                  sx={{ p: 2, borderRadius: 2, display: "grid", gap: 1.5 }}
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", sm: "center" }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Work item summary
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleCopyDetails(selectedWorkItem)}
                      >
                        Copy Details
                      </Button>
                      <Button
                        color="error"
                        variant="outlined"
                        size="small"
                        onClick={() => handleDeleteWorkItem(selectedWorkItem)}
                        disabled={savingId === String(selectedWorkItem._id)}
                      >
                        Delete
                      </Button>
                    </Stack>
                  </Stack>
                  <TextField
                    select
                    size="small"
                    label="Status"
                    value={selectedWorkItem.triageStatus}
                    onChange={(event) =>
                      handleWorkflowUpdate(selectedWorkItem, {
                        triageStatus: event.target.value as FeedbackTriageStatus,
                      })
                    }
                    disabled={savingId === String(selectedWorkItem._id)}
                    sx={{ maxWidth: 220 }}
                  >
                    {Object.entries(triageLabel).map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip
                      size="small"
                      label={
                        triageLabel[selectedWorkItem.triageStatus] ||
                        selectedWorkItem.triageStatus
                      }
                      color={triageTone[selectedWorkItem.triageStatus] || "default"}
                    />
                    <Chip
                      size="small"
                      label={`${selectedWorkItem.occurrenceCount} report${
                        selectedWorkItem.occurrenceCount === 1 ? "" : "s"
                      }`}
                      variant="outlined"
                    />
                    <Chip
                      size="small"
                      label={`Fingerprint ${formatFingerprintLabel(selectedWorkItem.fingerprint)}`}
                      variant="outlined"
                    />
                    {selectedWorkItem.severity ? (
                      <Chip
                        size="small"
                        label={`${selectedWorkItem.severity} severity`}
                        variant="outlined"
                      />
                    ) : null}
                    {selectedWorkItem.page ? (
                      <Chip
                        size="small"
                        label={selectedWorkItem.page}
                        variant="outlined"
                      />
                    ) : null}
                  </Stack>
                  <TextField
                    label="Title"
                    value={
                      drafts[String(selectedWorkItem._id)]?.title ??
                      selectedWorkItem.title
                    }
                    onChange={(event) =>
                      handleDraftChange(
                        String(selectedWorkItem._id),
                        "title",
                        event.target.value
                      )
                    }
                    disabled={savingId === String(selectedWorkItem._id)}
                    fullWidth
                  />
                  <TextField
                    label="Description"
                    value={
                      drafts[String(selectedWorkItem._id)]?.latestDescription ??
                      selectedWorkItem.latestDescription
                    }
                    onChange={(event) =>
                      handleDraftChange(
                        String(selectedWorkItem._id),
                        "latestDescription",
                        event.target.value
                      )
                    }
                    disabled={savingId === String(selectedWorkItem._id)}
                    multiline
                    minRows={4}
                    fullWidth
                  />
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() =>
                        handleWorkflowUpdate(selectedWorkItem, {
                          triageStatus: selectedWorkItem.triageStatus,
                          successMessage: "Issue details saved.",
                        })
                      }
                      disabled={savingId === String(selectedWorkItem._id)}
                    >
                      Save Details
                    </Button>
                    <Typography variant="body2" color="text.secondary">
                      Update the issue summary here to clarify reports during triage.
                    </Typography>
                  </Stack>
                  {renderMetadataRows([
                    { label: "Work item ID", value: String(selectedWorkItem._id || "") },
                    {
                      label: "First report",
                      value: String(selectedWorkItem.firstReportId || ""),
                    },
                    {
                      label: "Latest report",
                      value: String(selectedWorkItem.latestReportId || ""),
                    },
                    {
                      label: "Latest reporter",
                      value: selectedWorkItem.latestReporter,
                    },
                    {
                      label: "Reporter role",
                      value: selectedWorkItem.latestReporterRole,
                    },
                    { label: "Latest email", value: selectedWorkItem.latestEmail },
                    { label: "Fix thread", value: selectedWorkItem.fixThreadId },
                    { label: "Fix commit", value: selectedWorkItem.fixCommitSha },
                    {
                      label: "Notification",
                      value: selectedWorkItem.notificationStatus,
                    },
                    {
                      label: "First reported",
                      value: formatTimestamp(selectedWorkItem.firstReportedAt),
                    },
                    {
                      label: "Last reported",
                      value: formatTimestamp(selectedWorkItem.lastReportedAt),
                    },
                    {
                      label: "Resolved",
                      value: selectedWorkItem.resolvedAt
                        ? formatTimestamp(selectedWorkItem.resolvedAt)
                        : undefined,
                    },
                  ])}
                </Paper>

                <Paper
                  variant="outlined"
                  sx={{ p: 2, borderRadius: 2, display: "grid", gap: 1.5 }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Latest runtime and build context
                  </Typography>
                  {renderMetadataRows([
                    {
                      label: "Environment",
                      value: selectedWorkItem.latestRuntimeContext?.environment,
                    },
                    {
                      label: "App version",
                      value: selectedWorkItem.latestRuntimeContext?.appVersion,
                    },
                    {
                      label: "Commit SHA",
                      value: selectedWorkItem.latestRuntimeContext?.commitSha,
                    },
                    {
                      label: "Route",
                      value: selectedWorkItem.latestRuntimeContext?.route,
                    },
                    {
                      label: "User agent",
                      value: selectedWorkItem.latestRuntimeContext?.userAgent,
                    },
                    {
                      label: "Viewport",
                      value: selectedWorkItem.latestRuntimeContext?.viewport
                        ? `${selectedWorkItem.latestRuntimeContext.viewport.width}x${selectedWorkItem.latestRuntimeContext.viewport.height}`
                        : undefined,
                    },
                    {
                      label: "Online",
                      value:
                        typeof selectedWorkItem.latestRuntimeContext?.online ===
                        "boolean"
                          ? selectedWorkItem.latestRuntimeContext.online
                            ? "yes"
                            : "no"
                          : undefined,
                    },
                  ])}
                </Paper>

                <Paper
                  variant="outlined"
                  sx={{ p: 2, borderRadius: 2, display: "grid", gap: 1.5 }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Linked evidence
                  </Typography>
                  {selectedEvidence.length === 0 ? (
                    <Alert severity="info">
                      No linked feedback items were found for this work item.
                    </Alert>
                  ) : (
                    <Stack spacing={1.5}>
                      {selectedEvidence.map((entry) => {
                        const bugSummary = summarizeBugReportEvidence(entry);

                        return (
                          <Paper
                            key={String(entry._id)}
                            variant="outlined"
                            sx={{ p: 1.5, borderRadius: 2, display: "grid", gap: 1 }}
                          >
                            <Stack
                              direction={{ xs: "column", sm: "row" }}
                              spacing={1}
                              justifyContent="space-between"
                              alignItems={{ xs: "flex-start", sm: "center" }}
                            >
                              <Stack
                                direction="row"
                                spacing={1}
                                flexWrap="wrap"
                                useFlexGap
                              >
                                <Chip size="small" label={entry.type} variant="outlined" />
                                {entry.triageStatus ? (
                                  <Chip
                                    size="small"
                                    label={
                                      triageLabel[entry.triageStatus] ||
                                      entry.triageStatus
                                    }
                                    variant="outlined"
                                  />
                                ) : null}
                                {entry.severity ? (
                                  <Chip
                                    size="small"
                                    label={`${entry.severity} severity`}
                                    variant="outlined"
                                  />
                                ) : null}
                                {entry.bugReport?.mode ? (
                                  <Chip
                                    size="small"
                                    label={`${bugSummary.errorCount} error${
                                      bugSummary.errorCount === 1 ? "" : "s"
                                    }`}
                                    variant="outlined"
                                  />
                                ) : null}
                                {entry.bugReport?.mode ? (
                                  <Chip
                                    size="small"
                                    label={`${bugSummary.interactionCount} step${
                                      bugSummary.interactionCount === 1 ? "" : "s"
                                    }`}
                                    variant="outlined"
                                  />
                                ) : null}
                              </Stack>
                              <Typography variant="caption" color="text.secondary">
                                {formatTimestamp(entry.createdAt)}
                              </Typography>
                            </Stack>

                            <Typography variant="subtitle2">{entry.title}</Typography>
                            <Typography
                              variant="body2"
                              sx={{ color: "text.secondary", whiteSpace: "pre-wrap" }}
                            >
                              {entry.description}
                            </Typography>

                            {renderMetadataRows([
                              { label: "Feedback ID", value: String(entry._id || "") },
                              {
                                label: "Reporter",
                                value: entry.username || entry.email || entry.userId,
                              },
                              { label: "Reporter role", value: entry.reporterRole },
                              { label: "Email", value: entry.email },
                              { label: "Page", value: entry.page },
                              { label: "Device", value: entry.deviceType },
                              { label: "Notification", value: entry.notificationStatus },
                              { label: "Fix thread", value: entry.fixThreadId },
                              { label: "Fix commit", value: entry.fixCommitSha },
                            ])}

                            {entry.runtimeContext ? (
                              <Box>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ display: "block", mb: 0.75 }}
                                >
                                  Runtime context
                                </Typography>
                                {renderMetadataRows([
                                  {
                                    label: "Environment",
                                    value: entry.runtimeContext.environment,
                                  },
                                  {
                                    label: "App version",
                                    value: entry.runtimeContext.appVersion,
                                  },
                                  {
                                    label: "Commit SHA",
                                    value: entry.runtimeContext.commitSha,
                                  },
                                  {
                                    label: "Route",
                                    value: entry.runtimeContext.route,
                                  },
                                  {
                                    label: "User agent",
                                    value: entry.runtimeContext.userAgent,
                                  },
                                  {
                                    label: "Viewport",
                                    value: entry.runtimeContext.viewport
                                      ? `${entry.runtimeContext.viewport.width}x${entry.runtimeContext.viewport.height}`
                                      : undefined,
                                  },
                                  {
                                    label: "Online",
                                    value:
                                      typeof entry.runtimeContext.online === "boolean"
                                        ? entry.runtimeContext.online
                                          ? "yes"
                                          : "no"
                                        : undefined,
                                  },
                                ])}
                              </Box>
                            ) : null}

                            {entry.bugReport ? (
                              <Box sx={{ display: "grid", gap: 1 }}>
                                <Typography variant="caption" color="text.secondary">
                                  Recorded bug report
                                </Typography>
                                {renderMetadataRows([
                                  { label: "Mode", value: entry.bugReport.mode },
                                  {
                                    label: "Started",
                                    value: entry.bugReport.startedAt
                                      ? formatTimestamp(entry.bugReport.startedAt)
                                      : undefined,
                                  },
                                  {
                                    label: "Completed",
                                    value: entry.bugReport.completedAt
                                      ? formatTimestamp(entry.bugReport.completedAt)
                                      : undefined,
                                  },
                                  {
                                    label: "Current path",
                                    value: entry.bugReport.currentPath,
                                  },
                                  {
                                    label: "User agent",
                                    value: entry.bugReport.userAgent,
                                  },
                                  {
                                    label: "Viewport",
                                    value: entry.bugReport.viewport
                                      ? `${entry.bugReport.viewport.width}x${entry.bugReport.viewport.height}`
                                      : undefined,
                                  },
                                ])}
                                {entry.bugReport.errors?.length ? (
                                  <Box>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ display: "block", mb: 0.75 }}
                                    >
                                      Captured errors
                                    </Typography>
                                    <Stack spacing={0.75}>
                                      {entry.bugReport.errors.map((error, index) => (
                                        <Paper
                                          key={`${String(entry._id)}-error-${index}`}
                                          variant="outlined"
                                          sx={{ p: 1, borderRadius: 2 }}
                                        >
                                          <Typography variant="body2">
                                            [{error.source}] {error.message}
                                          </Typography>
                                          <Typography
                                            variant="caption"
                                            color="text.secondary"
                                          >
                                            {formatTimestamp(error.timestamp)} on{" "}
                                            {error.page}
                                          </Typography>
                                          {error.detail ? (
                                            <Typography
                                              variant="caption"
                                              color="text.secondary"
                                              sx={{
                                                display: "block",
                                                whiteSpace: "pre-wrap",
                                              }}
                                            >
                                              {error.detail}
                                            </Typography>
                                          ) : null}
                                        </Paper>
                                      ))}
                                    </Stack>
                                  </Box>
                                ) : null}
                                {entry.bugReport.interactions?.length ? (
                                  <Box>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ display: "block", mb: 0.75 }}
                                    >
                                      Repro steps and interactions
                                    </Typography>
                                    <Stack spacing={0.75}>
                                      {entry.bugReport.interactions.map(
                                        (interaction, index) => (
                                          <Paper
                                            key={`${String(entry._id)}-interaction-${index}`}
                                            variant="outlined"
                                            sx={{ p: 1, borderRadius: 2 }}
                                          >
                                            <Typography variant="body2">
                                              {interaction.label ||
                                                interaction.detail ||
                                                interaction.target ||
                                                interaction.type}
                                            </Typography>
                                            <Typography
                                              variant="caption"
                                              color="text.secondary"
                                            >
                                              {formatTimestamp(interaction.timestamp)} on{" "}
                                              {interaction.page}
                                            </Typography>
                                            <Typography
                                              variant="caption"
                                              color="text.secondary"
                                              sx={{ display: "block" }}
                                            >
                                              {interaction.kind || "raw"}{" "}
                                              {interaction.type}
                                              {interaction.status
                                                ? ` • ${interaction.status}`
                                                : ""}
                                            </Typography>
                                            {interaction.expected ? (
                                              <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{ display: "block" }}
                                              >
                                                Expected: {interaction.expected}
                                              </Typography>
                                            ) : null}
                                            {interaction.actual ? (
                                              <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{ display: "block" }}
                                              >
                                                Actual: {interaction.actual}
                                              </Typography>
                                            ) : null}
                                            {interaction.value ? (
                                              <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{
                                                  display: "block",
                                                  whiteSpace: "pre-wrap",
                                                }}
                                              >
                                                {interaction.value}
                                              </Typography>
                                            ) : null}
                                          </Paper>
                                        )
                                      )}
                                    </Stack>
                                  </Box>
                                ) : null}
                              </Box>
                            ) : null}

                            {entry.coachFeedback ? (
                              <Box sx={{ display: "grid", gap: 0.75 }}>
                                <Typography variant="caption" color="text.secondary">
                                  Coach feedback evidence
                                </Typography>
                                {renderMetadataRows([
                                  {
                                    label: "Sentiment",
                                    value: entry.coachFeedback.sentiment,
                                  },
                                  {
                                    label: "Message ID",
                                    value: entry.coachFeedback.messageId,
                                  },
                                  {
                                    label: "Selected response",
                                    value: entry.coachFeedback.selectedResponse,
                                  },
                                  {
                                    label: "Explanation",
                                    value: entry.coachFeedback.explanation,
                                  },
                                ])}
                                {entry.coachFeedback.conversation?.length ? (
                                  <Paper variant="outlined" sx={{ p: 1, borderRadius: 2 }}>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ display: "block", mb: 0.75 }}
                                    >
                                      Conversation
                                    </Typography>
                                    <Stack spacing={0.5}>
                                      {entry.coachFeedback.conversation.map(
                                        (turn, index) => (
                                          <Typography
                                            key={`${String(entry._id)}-turn-${index}`}
                                            variant="body2"
                                          >
                                            {turn.role === "coach" ? "Coach" : "User"}:{" "}
                                            {turn.text}
                                          </Typography>
                                        )
                                      )}
                                    </Stack>
                                  </Paper>
                                ) : null}
                              </Box>
                            ) : null}
                          </Paper>
                        );
                      })}
                    </Stack>
                  )}
                </Paper>
              </>
            ) : null}
          </DialogContent>
        </Dialog>
      </Box>
    </Box>
  );
};

export default BugsPage;
