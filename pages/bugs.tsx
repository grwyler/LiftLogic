"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Session } from "next-auth";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import {
  Alert,
  Box,
  Button,
  Checkbox,
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
import VersionChangelogDialog from "../components/VersionChangelogDialog";
import {
  createFollowUpFeedbackWorkItem,
  deleteFeedbackWorkItem,
  fetchMonetizationSummary,
  fetchFoundingBetaUsers,
  fetchFeedbackWorkflow,
  saveFoundingBetaAccess,
  updateFeedbackWorkItem,
} from "../utils/helpers";
import {
  FeedbackBugArchetype,
  FeedbackItemDoc,
  FeedbackRegressionCheck,
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
import { isBugWorkflowAdminSession } from "../utils/adminAuthorization";
import {
  CodexCopyVariant,
  getFeedbackEvidenceForWorkItem,
  buildTopFiveCopyFooter,
  buildCodexCopyText,
  getRelatedWorkItems,
  summarizeBugReportEvidence,
} from "../utils/feedbackDetails";
import {
  WorkflowDraft,
  createWorkflowDraft,
  getWorkflowDraftBugContext,
  getWorkItemClosureWarnings,
  getWorkflowDraftResolution,
} from "../utils/bugsWorkflow";
import {
  buildImplementationContext,
  buildVerificationPack,
} from "../utils/feedbackWorkItemContext";
import { parseMultilineList, serializeMultilineList } from "../utils/feedbackResolution";

const LIVE_REFRESH_INTERVAL_MS = 5000;

const triageTone: Record<
  FeedbackTriageStatus,
  "default" | "success" | "warning" | "info"
> = {
  new: "warning",
  "details copied": "info",
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

type QueueSortMode =
  | "workflow"
  | "latest"
  | "oldest"
  | "reports"
  | "severity"
  | "title";

type WorkItemFilterType = "all" | "bug" | "feature";
type WorkItemListScope = "active" | "completed" | "all";
type WorkItemStatusFilter = "all" | FeedbackTriageStatus;
type WorkItemSeverityFilter = "all" | "high" | "medium" | "low" | "unset";
type WorkItemLabelFilter = "all" | string;

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

type FollowUpDraft = {
  title: string;
  description: string;
  type: "bug" | "feature";
};

const inactiveTriageStatuses: FeedbackTriageStatus[] = [
  "resolved",
  "duplicate",
  "verified",
];

const triageLabel: Record<FeedbackTriageStatus, string> = {
  new: "New",
  "details copied": "Details Copied",
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
  "details copied": 1,
  queued: 2,
  new: 3,
  resolved: 4,
  duplicate: 5,
  verified: 6,
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
    case "title":
      return byTitle || byNewestActivity;
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

const isActiveWorkItem = (item: FeedbackWorkItemDoc) => !isInactiveWorkItem(item);

const formatLabelsInput = (labels?: string[]) => (labels || []).join(", ");

const parseLabelInput = (value: string) => {
  const seen = new Set<string>();

  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter((entry) => {
      if (!entry) {
        return false;
      }

      const key = entry.toLowerCase();
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
};

const createDraftMap = (
  items: FeedbackWorkItemDoc[],
  previous: Record<string, WorkflowDraft>
) => {
  const next = { ...previous };

  const formatLinks = (
    links:
      | NonNullable<FeedbackWorkItemDoc["implementationContext"]>["confirmed"]
      | NonNullable<FeedbackWorkItemDoc["implementationContext"]>["inferred"]
      | undefined
  ) =>
    (links || [])
      .map(
        (link) =>
          `[${link.type}] ${link.path}${link.label ? ` | ${link.label}` : ""}${
            link.note ? ` | ${link.note}` : ""
          }`
      )
      .join("\n");

  items.forEach((item) => {
    const id = String(item._id);
    if (!next[id]) {
      next[id] = createWorkflowDraft(item);
      return;
    }

    const implementationContext = buildImplementationContext(item);
    const verificationPack = buildVerificationPack(item);
    next[id] = {
      ...next[id],
      title: next[id].title || item.title || "",
      latestDescription: next[id].latestDescription || item.latestDescription || "",
      labels: next[id].labels || formatLabelsInput(item.labels),
      actualBehavior:
        next[id].actualBehavior || item.structuredRepro?.actualBehavior || "",
      expectedBehavior:
        next[id].expectedBehavior || item.structuredRepro?.expectedBehavior || "",
      reproSteps:
        next[id].reproSteps ||
        serializeMultilineList(item.structuredRepro?.reproSteps),
      affectedFlow: next[id].affectedFlow || item.structuredRepro?.affectedFlow || "",
      triggerConditions:
        next[id].triggerConditions || item.structuredRepro?.triggerConditions || "",
      regressionRisks:
        next[id].regressionRisks || item.structuredRepro?.regressionRisks || "",
      implementationSummary:
        next[id].implementationSummary || implementationContext.summary || "",
      implementationConfirmed:
        next[id].implementationConfirmed ||
        formatLinks(implementationContext.confirmed),
      implementationInferred:
        next[id].implementationInferred || formatLinks(implementationContext.inferred),
      verificationSummary:
        next[id].verificationSummary || verificationPack.summary || "",
      verificationCommands:
        next[id].verificationCommands ||
        serializeMultilineList(
          (verificationPack.items || [])
            .filter((entry) => entry.kind === "command")
            .map((entry) => entry.command || entry.label)
        ),
      verificationManualChecks:
        next[id].verificationManualChecks ||
        serializeMultilineList(
          (verificationPack.items || [])
            .filter((entry) => entry.kind === "manual")
            .map((entry) => entry.label)
        ),
      verificationDoneCriteria:
        next[id].verificationDoneCriteria ||
        serializeMultilineList(
          (verificationPack.items || [])
            .filter((entry) => entry.kind === "done" || entry.kind === "acceptance")
            .map((entry) => entry.label)
        ),
      completedVerificationIds:
        next[id].completedVerificationIds?.length
          ? next[id].completedVerificationIds
          : item.completedVerificationIds || [],
    };
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
  const [followUpDrafts, setFollowUpDrafts] = useState<Record<string, FollowUpDraft>>({});
  const [advancedOpenById, setAdvancedOpenById] = useState<
    Record<string, boolean>
  >({});
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<string | null>(null);
  const [queueSortMode, setQueueSortMode] = useState<QueueSortMode>("workflow");
  const [workItemSearch, setWorkItemSearch] = useState("");
  const [workItemTypeFilter, setWorkItemTypeFilter] =
    useState<WorkItemFilterType>("all");
  const [workItemListScope, setWorkItemListScope] =
    useState<WorkItemListScope>("active");
  const [workItemStatusFilter, setWorkItemStatusFilter] =
    useState<WorkItemStatusFilter>("all");
  const [workItemSeverityFilter, setWorkItemSeverityFilter] =
    useState<WorkItemSeverityFilter>("all");
  const [workItemLabelFilter, setWorkItemLabelFilter] =
    useState<WorkItemLabelFilter>("all");
  const [showCompletedSection, setShowCompletedSection] = useState(false);
  const [selectedChangelogVersion, setSelectedChangelogVersion] = useState<string | null>(
    null
  );
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

  const isAdmin = isBugWorkflowAdminSession(session as any);

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

  const sortedWorkItems = useMemo(
    () => [...workItems].sort((left, right) => compareWorkItems(left, right, queueSortMode)),
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
  const selectedDraft = useMemo(
    () =>
      selectedWorkItem
        ? drafts[String(selectedWorkItem._id)] || createWorkflowDraft(selectedWorkItem)
        : null,
    [drafts, selectedWorkItem]
  );
  const selectedClosureWarnings = useMemo(
    () => (selectedDraft ? getWorkItemClosureWarnings(selectedDraft) : []),
    [selectedDraft]
  );
  const bugItems = useMemo(
    () => workItems.filter((item) => item.type === "bug"),
    [workItems]
  );
  const selectedRelatedWork = useMemo(
    () =>
      selectedWorkItem
        ? getRelatedWorkItems({
            workItem: selectedWorkItem,
            workItems,
            feedbackItems,
          })
        : [],
    [feedbackItems, selectedWorkItem, workItems]
  );
  const activeBugItems = useMemo(
    () => bugItems.filter((item) => !isInactiveWorkItem(item)),
    [bugItems]
  );
  const selectedRelatedActiveWork = useMemo(
    () => selectedRelatedWork.filter((match) => isActiveWorkItem(match.workItem)),
    [selectedRelatedWork]
  );
  const selectedRelatedClosedWork = useMemo(
    () => selectedRelatedWork.filter((match) => isInactiveWorkItem(match.workItem)),
    [selectedRelatedWork]
  );
  const activeWorkItems = useMemo(
    () => sortedWorkItems.filter((item) => isActiveWorkItem(item)),
    [sortedWorkItems]
  );
  const completedWorkItems = useMemo(
    () => sortedWorkItems.filter((item) => isInactiveWorkItem(item)),
    [sortedWorkItems]
  );
  const activeBugCount = useMemo(
    () => activeWorkItems.filter((item) => item.type === "bug").length,
    [activeWorkItems]
  );
  const activeFeatureCount = useMemo(
    () => activeWorkItems.filter((item) => item.type === "feature").length,
    [activeWorkItems]
  );
  const completedBugCount = useMemo(
    () => completedWorkItems.filter((item) => item.type === "bug").length,
    [completedWorkItems]
  );
  const completedFeatureCount = useMemo(
    () => completedWorkItems.filter((item) => item.type === "feature").length,
    [completedWorkItems]
  );
  const availableLabels = useMemo(
    () =>
      Array.from(
        new Set(
          workItems
            .flatMap((item) => item.labels || [])
            .map((label) => label.trim())
            .filter(Boolean)
            .sort((left, right) => left.localeCompare(right))
        )
      ),
    [workItems]
  );
  const matchesWorkItemFilters = (item: FeedbackWorkItemDoc) => {
    const normalizedSearch = workItemSearch.trim().toLowerCase();
    const matchesSearch =
      !normalizedSearch ||
      [
        item.title,
        item.latestDescription,
        ...(item.labels || []),
        item.page,
        item.fingerprint,
        item.fixThreadId,
        item.fixCommitSha,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));
    const matchesType =
      workItemTypeFilter === "all" || item.type === workItemTypeFilter;
    const matchesStatus =
      workItemStatusFilter === "all" || item.triageStatus === workItemStatusFilter;
    const matchesSeverity =
      workItemSeverityFilter === "all"
        ? true
        : workItemSeverityFilter === "unset"
        ? !item.severity
        : item.severity === workItemSeverityFilter;
    const matchesLabel =
      workItemLabelFilter === "all"
        ? true
        : (item.labels || []).some(
            (label) => label.toLowerCase() === workItemLabelFilter.toLowerCase()
          );

    return (
      matchesSearch &&
      matchesType &&
      matchesStatus &&
      matchesSeverity &&
      matchesLabel
    );
  };
  const filteredActiveWorkItems = useMemo(
    () => activeWorkItems.filter(matchesWorkItemFilters),
    [
      activeWorkItems,
      workItemSearch,
      workItemTypeFilter,
      workItemStatusFilter,
      workItemSeverityFilter,
      workItemLabelFilter,
    ]
  );
  const filteredCompletedWorkItems = useMemo(
    () => completedWorkItems.filter(matchesWorkItemFilters),
    [
      completedWorkItems,
      workItemSearch,
      workItemTypeFilter,
      workItemStatusFilter,
      workItemSeverityFilter,
      workItemLabelFilter,
    ]
  );
  const currentPrimaryListItems = useMemo(() => {
    if (workItemListScope === "completed") {
      return filteredCompletedWorkItems;
    }

    return filteredActiveWorkItems;
  }, [filteredActiveWorkItems, filteredCompletedWorkItems, workItemListScope]);

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

  const createBlankDraft = (): WorkflowDraft => ({
    title: "",
    latestDescription: "",
    labels: "",
    bugArchetype: "general",
    fixThreadId: "",
    fixCommitSha: "",
    actualBehavior: "",
    expectedBehavior: "",
    reproSteps: "",
    affectedFlow: "",
    triggerConditions: "",
    regressionRisks: "",
    uiSelectors: "",
    uiScreenshots: "",
    uiViewports: "",
    apiEndpoint: "",
    apiMethod: "",
    apiRequestShape: "",
    apiResponseShape: "",
    apiSchemaPaths: "",
    perfBenchmark: "",
    perfMetric: "",
    perfBaseline: "",
    perfRegression: "",
    perfDeviceContext: "",
    refactorTouchedSystems: "",
    refactorContractSurfaces: "",
    refactorMigrationRisks: "",
    scopeInScope: "",
    scopeOutOfScope: "",
    scopeNonGoals: "",
    scopeAllowedTouchAreas: "",
    implementationSummary: "",
    implementationConfirmed: "",
    implementationInferred: "",
    verificationSummary: "",
    verificationCommands: "",
    verificationManualChecks: "",
    verificationDoneCriteria: "",
    completedVerificationIds: [],
    verificationOwner: "",
    resolvedAppVersion: "",
    resolvedDeployId: "",
    shippedSummary: "",
    deferredFollowUpsText: "",
    validatedCommandsText: "",
    manualChecksText: "",
    regressionChecklist: createWorkflowDraft().regressionChecklist,
  });

  const formatMultilineList = (items?: string[]) => serializeMultilineList(items);

  const parseImplementationLinks = (value: string) =>
    parseMultilineList(value).map((entry) => {
      const typeMatch = entry.match(/^\[([a-z]+)\]\s+/i);
      const rawType = typeMatch?.[1]?.toLowerCase();
      const remainder = entry.replace(/^\[[a-z]+\]\s+/i, "");
      const [path, label, note] = remainder.split("|").map((part) => part.trim());
      const normalizedType:
        | "route"
        | "component"
        | "api"
        | "hook"
        | "schema"
        | "test" =
        rawType === "route" ||
        rawType === "component" ||
        rawType === "api" ||
        rawType === "hook" ||
        rawType === "schema" ||
        rawType === "test"
          ? rawType
          : "route";

      return {
        type: normalizedType,
        path: path || remainder,
        label: label || undefined,
        note: note || undefined,
      };
    });

  const buildWorkItemUpdatePayload = (item: FeedbackWorkItemDoc, draft: WorkflowDraft) => {
    const verificationPack = buildVerificationPack({
      page: item.page,
      verificationPack: {
        summary: draft.verificationSummary || undefined,
        items: [
          ...parseMultilineList(draft.verificationCommands).map((command) => ({
            id: "",
            kind: "command" as const,
            label: command,
            command,
          })),
          ...parseMultilineList(draft.verificationManualChecks).map((label) => ({
            id: "",
            kind: "manual" as const,
            label,
          })),
          ...parseMultilineList(draft.verificationDoneCriteria).map((label) => ({
            id: "",
            kind: "done" as const,
            label,
          })),
        ],
      },
    });

    return {
      severity: item.severity,
      title: draft.title,
      latestDescription: draft.latestDescription,
      labels: parseLabelInput(draft.labels),
      bugArchetype: draft.bugArchetype,
      bugContext: getWorkflowDraftBugContext(draft),
      fixThreadId: draft.fixThreadId || undefined,
      fixCommitSha: draft.fixCommitSha || undefined,
      structuredRepro: {
        actualBehavior: draft.actualBehavior || undefined,
        expectedBehavior: draft.expectedBehavior || undefined,
        reproSteps: parseMultilineList(draft.reproSteps),
        affectedFlow: draft.affectedFlow || undefined,
        triggerConditions: draft.triggerConditions || undefined,
        regressionRisks: draft.regressionRisks || undefined,
        source: "manual" as const,
      },
      scopeGuardrails: {
        inScope: parseMultilineList(draft.scopeInScope),
        outOfScope: parseMultilineList(draft.scopeOutOfScope),
        nonGoals: parseMultilineList(draft.scopeNonGoals),
        allowedTouchAreas: parseMultilineList(draft.scopeAllowedTouchAreas),
      },
      implementationContext: {
        summary: draft.implementationSummary || undefined,
        confirmed: parseImplementationLinks(draft.implementationConfirmed),
        inferred: parseImplementationLinks(draft.implementationInferred),
      },
      verificationPack,
      completedVerificationIds: draft.completedVerificationIds,
    };
  };

  const handleDraftChange = (
    workItemId: string,
    key: keyof WorkflowDraft,
    value: string
  ) => {
    setDrafts((previous) => ({
      ...previous,
      [workItemId]: {
        ...(previous[workItemId] || createWorkflowDraft()),
        [key]: value,
      },
    }));
  };

  const handleRegressionChecklistChange = (
    workItemId: string,
    checklistIndex: number,
    patch: Partial<FeedbackRegressionCheck>
  ) => {
    setDrafts((previous) => {
      const baseDraft = previous[workItemId] || createWorkflowDraft();
      return {
        ...previous,
        [workItemId]: {
          ...baseDraft,
          regressionChecklist: baseDraft.regressionChecklist.map((entry, index) =>
            index === checklistIndex
              ? {
                  ...entry,
                  ...patch,
                }
              : entry
          ),
        },
      };
    });
  };

  const applyUpdatedWorkItem = (workItemId: string, updatedWorkItem: FeedbackWorkItemDoc) => {
    setWorkItems((previous) =>
      previous.map((item) =>
        String(item._id) === workItemId ? { ...item, ...updatedWorkItem } : item
      )
    );
    setDrafts((previous) => ({
      ...previous,
      [workItemId]: createWorkflowDraft(updatedWorkItem),
    }));
  };

  const handleVerificationCompletionToggle = (
    workItemId: string,
    verificationId: string,
    checked: boolean
  ) => {
    setDrafts((previous) => {
      const baseDraft = previous[workItemId] || createWorkflowDraft();
      const existingIds = new Set(baseDraft.completedVerificationIds || []);
      if (checked) {
        existingIds.add(verificationId);
      } else {
        existingIds.delete(verificationId);
      }

      return {
        ...previous,
        [workItemId]: {
          ...baseDraft,
          completedVerificationIds: Array.from(existingIds),
        },
      };
    });
  };

  const handleFollowUpDraftChange = (
    workItemId: string,
    key: keyof FollowUpDraft,
    value: string
  ) => {
    setFollowUpDrafts((previous) => ({
      ...previous,
      [workItemId]: {
        title: previous[workItemId]?.title || "",
        description: previous[workItemId]?.description || "",
        type: previous[workItemId]?.type || "bug",
        [key]: value,
      },
    }));
  };

  const handleCreateFollowUp = async (item: FeedbackWorkItemDoc) => {
    const workItemId = String(item._id || "");
    const draft = followUpDrafts[workItemId];

    if (!draft?.title?.trim() || !draft?.description?.trim()) {
      toast.warning("Add a follow-up title and description first.");
      return;
    }

    setSavingId(workItemId);
    try {
      const response = await createFollowUpFeedbackWorkItem({
        title: draft.title.trim(),
        description: draft.description.trim(),
        type: draft.type,
        linkedWorkItemId: workItemId,
        page: item.page,
      });

      const nextWorkItem = response?.workItem as FeedbackWorkItemDoc | undefined;
      if (nextWorkItem) {
        setWorkItems((previous) => [nextWorkItem, ...previous]);
      }

      const freshWorkflow = await fetchFeedbackWorkflow();
      setWorkItems(freshWorkflow.workItems);
      setFeedbackItems(freshWorkflow.feedback);
      setDrafts((previous) => createDraftMap(freshWorkflow.workItems, previous));
      setFollowUpDrafts((previous) => ({
        ...previous,
        [workItemId]: {
          title: "",
          description: "",
          type: "bug",
        },
      }));
      toast.success("Created a linked follow-up work item.");
    } catch (error) {
      console.error("Follow-up creation failed:", error);
      toast.error("Couldn't create the follow-up work item.");
    } finally {
      setSavingId(null);
    }
  };

  const handleWorkflowUpdate = async (
    item: FeedbackWorkItemDoc,
    {
      triageStatus,
      severity,
      title,
      latestDescription,
      successMessage,
    }: {
      triageStatus: FeedbackTriageStatus;
      severity?: "low" | "medium" | "high";
      title?: string;
      latestDescription?: string;
      successMessage?: string;
    }
  ) => {
    const workItemId = String(item._id);
    const draft = drafts[workItemId] || createWorkflowDraft(item);
    const closureWarnings =
      triageStatus === "resolved" || triageStatus === "verified"
        ? getWorkItemClosureWarnings(draft)
        : [];

    if (closureWarnings.length > 0) {
      toast.warning(closureWarnings.join(" "));
      return;
    }

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
        resolution: getWorkflowDraftResolution(draft),
        ...buildWorkItemUpdatePayload(item, draft),
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
                  resolution: updatedWorkItem.resolution,
                  resolvedAt: updatedWorkItem.resolvedAt,
                }
              : entry
          )
        );
        setDrafts((previous) => ({
          ...previous,
          [workItemId]: createWorkflowDraft(updatedWorkItem),
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

  const handleCopyDetails = async (
    item: FeedbackWorkItemDoc,
    variant: CodexCopyVariant = "full"
  ) => {
    const workItemId = String(item._id || "");
    const evidence = getFeedbackEvidenceForWorkItem({
      workItem: item,
      feedbackItems,
    });
    const relatedWork = getRelatedWorkItems({
      workItem: item,
      workItems,
      feedbackItems,
    });
    const copyText = buildCodexCopyText({
      workItem: item,
      evidence,
      relatedWork,
      variant,
    });

    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      toast.error("Clipboard copy is not available in this browser.");
      return;
    }

    try {
      await navigator.clipboard.writeText(copyText);
      setSavingId(workItemId);
      try {
        const response = await updateFeedbackWorkItem({
          workItemId,
          triageStatus: "details copied",
          severity: item.severity,
          title: item.title,
          latestDescription: item.latestDescription,
          fixThreadId: item.fixThreadId || undefined,
          fixCommitSha: item.fixCommitSha || undefined,
        });
        const updatedWorkItem = response?.workItem as FeedbackWorkItemDoc | undefined;
        if (updatedWorkItem) {
          applyUpdatedWorkItem(workItemId, updatedWorkItem);
        }
        toast.success(
          `Copied ${
            variant === "full"
              ? "full brief"
              : variant === "fast"
              ? "fast path"
              : "investigator brief"
          } and marked the ticket as details copied.`
        );
      } catch (statusError) {
        console.error("Copied work item details but failed to update status:", statusError);
        toast.warning("Copied issue details, but couldn't update the ticket status.");
      }
    } catch (error) {
      console.error("Failed to copy work item details:", error);
      toast.error("Couldn't copy the work item details.");
    } finally {
      setSavingId(null);
    }
  };

  const handleCopyTopFiveDetails = async () => {
    const itemsToCopy = currentPrimaryListItems.slice(0, 5);

    if (itemsToCopy.length === 0) {
      toast.info("No work items match the current filters.");
      return;
    }

    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      toast.error("Clipboard copy is not available in this browser.");
      return;
    }

    const combinedText = itemsToCopy
      .map((item, index) => {
        const evidence = getFeedbackEvidenceForWorkItem({
          workItem: item,
          feedbackItems,
        });

        return [
          `Issue ${index + 1} of ${itemsToCopy.length}`,
          buildCodexCopyText({
            workItem: item,
            evidence,
            relatedWork: getRelatedWorkItems({
              workItem: item,
              workItems,
              feedbackItems,
            }),
            variant: "full",
          }),
        ].join("\n");
      })
      .join("\n\n----------------------------------------\n\n");
    const combinedTextWithFooter = `${combinedText}\n\n${buildTopFiveCopyFooter()}`;

    try {
      await navigator.clipboard.writeText(combinedTextWithFooter);
      const results = await Promise.allSettled(
        itemsToCopy.map((item) =>
          updateFeedbackWorkItem({
            workItemId: String(item._id || ""),
            triageStatus: "details copied",
            severity: item.severity,
            title: item.title,
            latestDescription: item.latestDescription,
            fixThreadId: item.fixThreadId || undefined,
            fixCommitSha: item.fixCommitSha || undefined,
          })
        )
      );

      let updatedCount = 0;
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          const updatedWorkItem = result.value?.workItem as FeedbackWorkItemDoc | undefined;
          if (updatedWorkItem) {
            applyUpdatedWorkItem(String(itemsToCopy[index]._id || ""), updatedWorkItem);
            updatedCount += 1;
          }
          return;
        }

        console.error("Failed to update copied work item status:", result.reason);
      });

      if (updatedCount === itemsToCopy.length) {
        toast.success(`Copied the top ${itemsToCopy.length} issues and marked them as details copied.`);
      } else if (updatedCount > 0) {
        toast.warning(
          `Copied ${itemsToCopy.length} issues, but only updated ${updatedCount} ticket statuses.`
        );
      } else {
        toast.warning(
          `Copied the top ${itemsToCopy.length} issues, but couldn't update their ticket statuses.`
        );
      }
    } catch (error) {
      console.error("Failed to copy top work item details:", error);
      toast.error("Couldn't copy the top filtered work item details.");
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

  const renderWorkItems = (items: FeedbackWorkItemDoc[], emptyMessage: string) => {
    if (items.length === 0) {
      return <Alert severity="info">{emptyMessage}</Alert>;
    }

    return (
      <Stack divider={<Divider flexItem />} spacing={0}>
        {items.map((item) => {
          const workItemId = String(item._id);
          const draft = drafts[workItemId] || createWorkflowDraft(item);
          const closureWarnings = getWorkItemClosureWarnings(draft);
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
                    label={item.type === "bug" ? "Bug" : "Feature"}
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
                      severity: item.severity,
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
                <TextField
                  select
                  size="small"
                  label="Priority"
                  value={item.severity || "unset"}
                  onChange={(event) =>
                    handleWorkflowUpdate(item, {
                      triageStatus: item.triageStatus,
                      severity:
                        event.target.value === "unset"
                          ? undefined
                          : (event.target.value as "low" | "medium" | "high"),
                      successMessage: "Priority updated",
                    })
                  }
                  disabled={savingId === workItemId}
                  sx={{ minWidth: 150 }}
                >
                  <MenuItem value="unset">Unset</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
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
                  onClick={() => handleCopyDetails(item, "full")}
                >
                  Copy Full Brief
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
                  {closureWarnings.length > 0 ? (
                    <Alert severity="warning" sx={{ mb: 1.25 }}>
                      Closing this item still needs: {closureWarnings.join(" ")}
                    </Alert>
                  ) : null}
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
                    direction={{ xs: "column", md: "row" }}
                    spacing={1}
                    sx={{ mt: 1 }}
                  >
                    <TextField
                      label="Verification owner"
                      size="small"
                      value={draft.verificationOwner}
                      onChange={(event) =>
                        handleDraftChange(
                          workItemId,
                          "verificationOwner",
                          event.target.value
                        )
                      }
                      fullWidth
                    />
                    <TextField
                      label="Resolved app version"
                      size="small"
                      value={draft.resolvedAppVersion}
                      onChange={(event) =>
                        handleDraftChange(
                          workItemId,
                          "resolvedAppVersion",
                          event.target.value
                        )
                      }
                      fullWidth
                    />
                    <TextField
                      label="Resolved deploy"
                      size="small"
                      value={draft.resolvedDeployId}
                      onChange={(event) =>
                        handleDraftChange(
                          workItemId,
                          "resolvedDeployId",
                          event.target.value
                        )
                      }
                      fullWidth
                    />
                  </Stack>
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    <TextField
                      label="Validation commands"
                      helperText="One command per line."
                      size="small"
                      value={draft.validatedCommandsText}
                      onChange={(event) =>
                        handleDraftChange(
                          workItemId,
                          "validatedCommandsText",
                          event.target.value
                        )
                      }
                      multiline
                      minRows={2}
                      fullWidth
                    />
                    <TextField
                      label="Manual checks completed"
                      helperText="One completed check per line."
                      size="small"
                      value={draft.manualChecksText}
                      onChange={(event) =>
                        handleDraftChange(
                          workItemId,
                          "manualChecksText",
                          event.target.value
                        )
                      }
                      multiline
                      minRows={2}
                      fullWidth
                    />
                  </Stack>
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    <Typography variant="subtitle2">Regression checklist</Typography>
                    {draft.regressionChecklist.map((entry, index) => (
                      <Stack
                        key={`${workItemId}-regression-${entry.label}`}
                        direction={{ xs: "column", md: "row" }}
                        spacing={1}
                      >
                        <TextField
                          select
                          size="small"
                          label={entry.label}
                          value={entry.outcome}
                          onChange={(event) =>
                            handleRegressionChecklistChange(workItemId, index, {
                              outcome: event.target.value as FeedbackRegressionCheck["outcome"],
                            })
                          }
                          sx={{ minWidth: { md: 220 } }}
                        >
                          <MenuItem value="pending">Pending</MenuItem>
                          <MenuItem value="passed">Passed</MenuItem>
                          <MenuItem value="failed">Failed</MenuItem>
                          <MenuItem value="not_applicable">Not applicable</MenuItem>
                        </TextField>
                        <TextField
                          size="small"
                          label={`${entry.label} notes`}
                          value={entry.notes || ""}
                          onChange={(event) =>
                            handleRegressionChecklistChange(workItemId, index, {
                              notes: event.target.value,
                            })
                          }
                          fullWidth
                        />
                      </Stack>
                    ))}
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
                      Record the fix metadata and verification evidence before
                      moving the item to Fixed or Closed.
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
                {item.resolution?.verificationOwner ? (
                  <Chip
                    size="small"
                    label={`Verified by ${item.resolution.verificationOwner}`}
                    variant="outlined"
                  />
                ) : null}
                {item.resolution?.resolvedAppVersion ? (
                  <Chip
                    size="small"
                    label={`Fixed in ${item.resolution.resolvedAppVersion}`}
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
                    onClick={() =>
                      setSelectedChangelogVersion(item.latestRuntimeContext?.appVersion || null)
                    }
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
                {(item.labels || []).map((label) => (
                  <Chip
                    key={`${workItemId}-${label}`}
                    size="small"
                    label={`Label ${label}`}
                    variant="outlined"
                  />
                ))}
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
            spacing={2}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
            >
              <Box>
                <Typography variant="h6">Work queue</Typography>
                <Typography sx={{ mt: 0.75, color: "text.secondary" }}>
                  Bugs and features now stay in one sortable list so you can triage,
                  reprioritize, and hand work off faster. Use the filters to narrow
                  the queue without losing the separate bug and feature totals.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  icon={<BugReportOutlinedIcon />}
                  label={`${activeBugCount} open bug${activeBugCount === 1 ? "" : "s"}`}
                  variant="outlined"
                />
                <Chip
                  label={`${activeFeatureCount} open feature${
                    activeFeatureCount === 1 ? "" : "s"
                  }`}
                  variant="outlined"
                />
                <Chip
                  label={`${completedBugCount} closed bug${
                    completedBugCount === 1 ? "" : "s"
                  }`}
                  variant="outlined"
                />
                <Chip
                  label={`${completedFeatureCount} closed feature${
                    completedFeatureCount === 1 ? "" : "s"
                  }`}
                  variant="outlined"
                />
              </Stack>
            </Stack>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1}
              alignItems={{ xs: "stretch", md: "center" }}
              useFlexGap
              flexWrap="wrap"
            >
              <TextField
                size="small"
                label="Search"
                value={workItemSearch}
                onChange={(event) => setWorkItemSearch(event.target.value)}
                placeholder="Title, page, fingerprint, thread..."
                sx={{ minWidth: { xs: "100%", md: 260 } }}
              />
              <TextField
                select
                size="small"
                label="Type"
                value={workItemTypeFilter}
                onChange={(event) =>
                  setWorkItemTypeFilter(event.target.value as WorkItemFilterType)
                }
                sx={{ minWidth: { xs: "100%", sm: 150 } }}
              >
                <MenuItem value="all">All types</MenuItem>
                <MenuItem value="bug">Bugs</MenuItem>
                <MenuItem value="feature">Features</MenuItem>
              </TextField>
              <TextField
                select
                size="small"
                label="List"
                value={workItemListScope}
                onChange={(event) =>
                  setWorkItemListScope(event.target.value as WorkItemListScope)
                }
                sx={{ minWidth: { xs: "100%", sm: 150 } }}
              >
                <MenuItem value="active">Open only</MenuItem>
                <MenuItem value="completed">Closed only</MenuItem>
                <MenuItem value="all">Open and closed</MenuItem>
              </TextField>
              <TextField
                select
                size="small"
                label="Status"
                value={workItemStatusFilter}
                onChange={(event) =>
                  setWorkItemStatusFilter(event.target.value as WorkItemStatusFilter)
                }
                sx={{ minWidth: { xs: "100%", sm: 170 } }}
              >
                <MenuItem value="all">All statuses</MenuItem>
                {Object.entries(triageLabel).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Priority"
                value={workItemSeverityFilter}
                onChange={(event) =>
                  setWorkItemSeverityFilter(event.target.value as WorkItemSeverityFilter)
                }
                sx={{ minWidth: { xs: "100%", sm: 150 } }}
              >
                <MenuItem value="all">All priorities</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="unset">Unset</MenuItem>
              </TextField>
              <TextField
                select
                size="small"
                label="Label"
                value={workItemLabelFilter}
                onChange={(event) =>
                  setWorkItemLabelFilter(event.target.value as WorkItemLabelFilter)
                }
                sx={{ minWidth: { xs: "100%", sm: 170 } }}
              >
                <MenuItem value="all">All labels</MenuItem>
                {availableLabels.map((label) => (
                  <MenuItem key={label} value={label}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Sort"
                value={queueSortMode}
                onChange={(event) =>
                  setQueueSortMode(event.target.value as QueueSortMode)
                }
                sx={{ minWidth: { xs: "100%", sm: 170 } }}
              >
                <MenuItem value="workflow">Workflow priority</MenuItem>
                <MenuItem value="severity">Highest priority</MenuItem>
                <MenuItem value="reports">Most reports</MenuItem>
                <MenuItem value="latest">Latest activity</MenuItem>
                <MenuItem value="oldest">Oldest first</MenuItem>
                <MenuItem value="title">Title</MenuItem>
              </TextField>
              <Button
                variant="outlined"
                onClick={() => void handleCopyTopFiveDetails()}
                disabled={currentPrimaryListItems.length === 0}
              >
                Copy Details Of Top 5
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {(workItemListScope === "active" || workItemListScope === "all") ? (
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Stack spacing={1.5}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
              >
                <Typography variant="h6">Open work items</Typography>
                <Chip
                  label={`${filteredActiveWorkItems.length} match${
                    filteredActiveWorkItems.length === 1 ? "" : "es"
                  }`}
                  variant="outlined"
                />
              </Stack>
              {renderWorkItems(
                filteredActiveWorkItems,
                "No open work items match the current filters."
              )}
            </Stack>
          </Paper>
        ) : null}

        {(workItemListScope === "completed" || workItemListScope === "all") &&
        completedWorkItems.length > 0 ? (
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
                    Resolved, verified, and duplicate items stay available for reference
                    without crowding the live queue.
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    label={`${filteredCompletedWorkItems.length} match${
                      filteredCompletedWorkItems.length === 1 ? "" : "es"
                    }`}
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
                  filteredCompletedWorkItems,
                  "No closed work items match the current filters."
                )}
              </Paper>
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
                        onClick={() => handleCopyDetails(selectedWorkItem, "full")}
                      >
                        Copy Full Brief
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleCopyDetails(selectedWorkItem, "fast")}
                      >
                        Copy Fast Path
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleCopyDetails(selectedWorkItem, "investigator")}
                      >
                        Copy Investigator
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
                        severity: selectedWorkItem.severity,
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
                  <TextField
                    select
                    size="small"
                    label="Priority"
                    value={selectedWorkItem.severity || "unset"}
                    onChange={(event) =>
                      handleWorkflowUpdate(selectedWorkItem, {
                        triageStatus: selectedWorkItem.triageStatus,
                        severity:
                          event.target.value === "unset"
                            ? undefined
                            : (event.target.value as "low" | "medium" | "high"),
                        successMessage: "Priority updated",
                      })
                    }
                    disabled={savingId === String(selectedWorkItem._id)}
                    sx={{ maxWidth: 220 }}
                  >
                    <MenuItem value="unset">Unset</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
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
                    {(selectedWorkItem.labels || []).map((label) => (
                      <Chip
                        key={`selected-${label}`}
                        size="small"
                        label={label}
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                  <TextField
                    label="Title"
                    value={selectedDraft?.title ?? selectedWorkItem.title}
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
                      selectedDraft?.latestDescription ??
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
                  <TextField
                    label="Labels"
                    helperText="Separate labels with commas. Example: auth, mobile, regression"
                    value={
                      drafts[String(selectedWorkItem._id)]?.labels ??
                      formatLabelsInput(selectedWorkItem.labels)
                    }
                    onChange={(event) =>
                      handleDraftChange(
                        String(selectedWorkItem._id),
                        "labels",
                        event.target.value
                      )
                    }
                    disabled={savingId === String(selectedWorkItem._id)}
                    fullWidth
                  />
                  <Stack spacing={1.25}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Structured repro
                    </Typography>
                    <TextField
                      label="Actual behavior"
                      value={
                        drafts[String(selectedWorkItem._id)]?.actualBehavior ??
                        selectedWorkItem.structuredRepro?.actualBehavior ??
                        ""
                      }
                      onChange={(event) =>
                        handleDraftChange(
                          String(selectedWorkItem._id),
                          "actualBehavior",
                          event.target.value
                        )
                      }
                      disabled={savingId === String(selectedWorkItem._id)}
                      fullWidth
                      multiline
                      minRows={2}
                    />
                    <TextField
                      label="Expected behavior"
                      value={
                        drafts[String(selectedWorkItem._id)]?.expectedBehavior ??
                        selectedWorkItem.structuredRepro?.expectedBehavior ??
                        ""
                      }
                      onChange={(event) =>
                        handleDraftChange(
                          String(selectedWorkItem._id),
                          "expectedBehavior",
                          event.target.value
                        )
                      }
                      disabled={savingId === String(selectedWorkItem._id)}
                      fullWidth
                      multiline
                      minRows={2}
                    />
                    <TextField
                      label="Repro steps"
                      helperText="Use one step per line. Enter Unknown if repro steps are not available."
                      value={
                        drafts[String(selectedWorkItem._id)]?.reproSteps ??
                        formatMultilineList(selectedWorkItem.structuredRepro?.reproSteps)
                      }
                      onChange={(event) =>
                        handleDraftChange(
                          String(selectedWorkItem._id),
                          "reproSteps",
                          event.target.value
                        )
                      }
                      disabled={savingId === String(selectedWorkItem._id)}
                      fullWidth
                      multiline
                      minRows={4}
                    />
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                      <TextField
                        label="Affected flow"
                        value={
                          drafts[String(selectedWorkItem._id)]?.affectedFlow ??
                          selectedWorkItem.structuredRepro?.affectedFlow ??
                          ""
                        }
                        onChange={(event) =>
                          handleDraftChange(
                            String(selectedWorkItem._id),
                            "affectedFlow",
                            event.target.value
                          )
                        }
                        disabled={savingId === String(selectedWorkItem._id)}
                        fullWidth
                      />
                      <TextField
                        label="Trigger conditions"
                        value={
                          drafts[String(selectedWorkItem._id)]?.triggerConditions ??
                          selectedWorkItem.structuredRepro?.triggerConditions ??
                          ""
                        }
                        onChange={(event) =>
                          handleDraftChange(
                            String(selectedWorkItem._id),
                            "triggerConditions",
                            event.target.value
                          )
                        }
                        disabled={savingId === String(selectedWorkItem._id)}
                        fullWidth
                      />
                    </Stack>
                    <TextField
                      label="Regression risks"
                      value={
                        drafts[String(selectedWorkItem._id)]?.regressionRisks ??
                        selectedWorkItem.structuredRepro?.regressionRisks ??
                        ""
                      }
                      onChange={(event) =>
                        handleDraftChange(
                          String(selectedWorkItem._id),
                          "regressionRisks",
                          event.target.value
                        )
                      }
                      disabled={savingId === String(selectedWorkItem._id)}
                      fullWidth
                      multiline
                      minRows={2}
                    />
                  </Stack>
                  <Stack spacing={1.25}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Bug archetype
                    </Typography>
                    <TextField
                      select
                      label="Archetype"
                      value={selectedDraft?.bugArchetype || "general"}
                      onChange={(event) =>
                        handleDraftChange(
                          String(selectedWorkItem._id),
                          "bugArchetype",
                          event.target.value
                        )
                      }
                      fullWidth
                    >
                      <MenuItem value="general">General</MenuItem>
                      <MenuItem value="ui">UI</MenuItem>
                      <MenuItem value="api">API</MenuItem>
                      <MenuItem value="performance">Performance</MenuItem>
                      <MenuItem value="refactor">Refactor</MenuItem>
                    </TextField>
                    {(selectedDraft?.bugArchetype || "general") === "ui" ? (
                      <Stack spacing={1}>
                        <TextField
                          label="Selectors"
                          helperText="One selector or element clue per line."
                          value={selectedDraft?.uiSelectors || ""}
                          onChange={(event) =>
                            handleDraftChange(
                              String(selectedWorkItem._id),
                              "uiSelectors",
                              event.target.value
                            )
                          }
                          multiline
                          minRows={2}
                          fullWidth
                        />
                        <TextField
                          label="Screenshot references"
                          helperText="One screenshot URL or artifact reference per line."
                          value={selectedDraft?.uiScreenshots || ""}
                          onChange={(event) =>
                            handleDraftChange(
                              String(selectedWorkItem._id),
                              "uiScreenshots",
                              event.target.value
                            )
                          }
                          multiline
                          minRows={2}
                          fullWidth
                        />
                        <TextField
                          label="Viewport notes"
                          value={selectedDraft?.uiViewports || ""}
                          onChange={(event) =>
                            handleDraftChange(
                              String(selectedWorkItem._id),
                              "uiViewports",
                              event.target.value
                            )
                          }
                          multiline
                          minRows={2}
                          fullWidth
                        />
                      </Stack>
                    ) : null}
                    {(selectedDraft?.bugArchetype || "general") === "api" ? (
                      <Stack spacing={1}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                          <TextField
                            label="Endpoint"
                            value={selectedDraft?.apiEndpoint || ""}
                            onChange={(event) =>
                              handleDraftChange(
                                String(selectedWorkItem._id),
                                "apiEndpoint",
                                event.target.value
                              )
                            }
                            fullWidth
                          />
                          <TextField
                            label="Method"
                            value={selectedDraft?.apiMethod || ""}
                            onChange={(event) =>
                              handleDraftChange(
                                String(selectedWorkItem._id),
                                "apiMethod",
                                event.target.value
                              )
                            }
                            fullWidth
                          />
                        </Stack>
                        <TextField
                          label="Request shape"
                          value={selectedDraft?.apiRequestShape || ""}
                          onChange={(event) =>
                            handleDraftChange(
                              String(selectedWorkItem._id),
                              "apiRequestShape",
                              event.target.value
                            )
                          }
                          multiline
                          minRows={2}
                          fullWidth
                        />
                        <TextField
                          label="Response shape"
                          value={selectedDraft?.apiResponseShape || ""}
                          onChange={(event) =>
                            handleDraftChange(
                              String(selectedWorkItem._id),
                              "apiResponseShape",
                              event.target.value
                            )
                          }
                          multiline
                          minRows={2}
                          fullWidth
                        />
                        <TextField
                          label="Schema paths"
                          helperText="One schema file or contract path per line."
                          value={selectedDraft?.apiSchemaPaths || ""}
                          onChange={(event) =>
                            handleDraftChange(
                              String(selectedWorkItem._id),
                              "apiSchemaPaths",
                              event.target.value
                            )
                          }
                          multiline
                          minRows={2}
                          fullWidth
                        />
                      </Stack>
                    ) : null}
                    {(selectedDraft?.bugArchetype || "general") === "performance" ? (
                      <Stack spacing={1}>
                        <TextField
                          label="Benchmark"
                          value={selectedDraft?.perfBenchmark || ""}
                          onChange={(event) =>
                            handleDraftChange(
                              String(selectedWorkItem._id),
                              "perfBenchmark",
                              event.target.value
                            )
                          }
                          fullWidth
                        />
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                          <TextField
                            label="Metric"
                            value={selectedDraft?.perfMetric || ""}
                            onChange={(event) =>
                              handleDraftChange(
                                String(selectedWorkItem._id),
                                "perfMetric",
                                event.target.value
                              )
                            }
                            fullWidth
                          />
                          <TextField
                            label="Device context"
                            value={selectedDraft?.perfDeviceContext || ""}
                            onChange={(event) =>
                              handleDraftChange(
                                String(selectedWorkItem._id),
                                "perfDeviceContext",
                                event.target.value
                              )
                            }
                            fullWidth
                          />
                        </Stack>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                          <TextField
                            label="Baseline"
                            value={selectedDraft?.perfBaseline || ""}
                            onChange={(event) =>
                              handleDraftChange(
                                String(selectedWorkItem._id),
                                "perfBaseline",
                                event.target.value
                              )
                            }
                            fullWidth
                          />
                          <TextField
                            label="Regression"
                            value={selectedDraft?.perfRegression || ""}
                            onChange={(event) =>
                              handleDraftChange(
                                String(selectedWorkItem._id),
                                "perfRegression",
                                event.target.value
                              )
                            }
                            fullWidth
                          />
                        </Stack>
                      </Stack>
                    ) : null}
                    {(selectedDraft?.bugArchetype || "general") === "refactor" ? (
                      <Stack spacing={1}>
                        <TextField
                          label="Touched systems"
                          value={selectedDraft?.refactorTouchedSystems || ""}
                          onChange={(event) =>
                            handleDraftChange(
                              String(selectedWorkItem._id),
                              "refactorTouchedSystems",
                              event.target.value
                            )
                          }
                          multiline
                          minRows={2}
                          fullWidth
                        />
                        <TextField
                          label="Contract surfaces"
                          value={selectedDraft?.refactorContractSurfaces || ""}
                          onChange={(event) =>
                            handleDraftChange(
                              String(selectedWorkItem._id),
                              "refactorContractSurfaces",
                              event.target.value
                            )
                          }
                          multiline
                          minRows={2}
                          fullWidth
                        />
                        <TextField
                          label="Migration risks"
                          value={selectedDraft?.refactorMigrationRisks || ""}
                          onChange={(event) =>
                            handleDraftChange(
                              String(selectedWorkItem._id),
                              "refactorMigrationRisks",
                              event.target.value
                            )
                          }
                          multiline
                          minRows={2}
                          fullWidth
                        />
                      </Stack>
                    ) : null}
                  </Stack>
                  <Stack spacing={1.25}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Scope guardrails
                    </Typography>
                    <TextField
                      label="In scope"
                      helperText="One in-scope boundary per line."
                      value={selectedDraft?.scopeInScope || ""}
                      onChange={(event) =>
                        handleDraftChange(
                          String(selectedWorkItem._id),
                          "scopeInScope",
                          event.target.value
                        )
                      }
                      multiline
                      minRows={2}
                      fullWidth
                    />
                    <TextField
                      label="Out of scope"
                      value={selectedDraft?.scopeOutOfScope || ""}
                      onChange={(event) =>
                        handleDraftChange(
                          String(selectedWorkItem._id),
                          "scopeOutOfScope",
                          event.target.value
                        )
                      }
                      multiline
                      minRows={2}
                      fullWidth
                    />
                    <TextField
                      label="Non-goals"
                      value={selectedDraft?.scopeNonGoals || ""}
                      onChange={(event) =>
                        handleDraftChange(
                          String(selectedWorkItem._id),
                          "scopeNonGoals",
                          event.target.value
                        )
                      }
                      multiline
                      minRows={2}
                      fullWidth
                    />
                    <TextField
                      label="Allowed touch areas"
                      value={selectedDraft?.scopeAllowedTouchAreas || ""}
                      onChange={(event) =>
                        handleDraftChange(
                          String(selectedWorkItem._id),
                          "scopeAllowedTouchAreas",
                          event.target.value
                        )
                      }
                      multiline
                      minRows={2}
                      fullWidth
                    />
                  </Stack>
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
                      Save the summary, structured repro fields, implementation hints, and verification pack together.
                    </Typography>
                  </Stack>
                  {selectedClosureWarnings.length > 0 ? (
                    <Alert severity="warning">
                      Closing this item still needs: {selectedClosureWarnings.join(" ")}
                    </Alert>
                  ) : null}
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
                    Resolution and regression evidence
                  </Typography>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                    <TextField
                      label="Fix thread ID"
                      size="small"
                      value={selectedDraft?.fixThreadId || ""}
                      onChange={(event) =>
                        handleDraftChange(
                          String(selectedWorkItem._id),
                          "fixThreadId",
                          event.target.value
                        )
                      }
                      fullWidth
                    />
                    <TextField
                      label="Commit SHA"
                      size="small"
                      value={selectedDraft?.fixCommitSha || ""}
                      onChange={(event) =>
                        handleDraftChange(
                          String(selectedWorkItem._id),
                          "fixCommitSha",
                          event.target.value
                        )
                      }
                      fullWidth
                    />
                  </Stack>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                    <TextField
                      label="Verification owner"
                      size="small"
                      value={selectedDraft?.verificationOwner || ""}
                      onChange={(event) =>
                        handleDraftChange(
                          String(selectedWorkItem._id),
                          "verificationOwner",
                          event.target.value
                        )
                      }
                      fullWidth
                    />
                    <TextField
                      label="Resolved app version"
                      size="small"
                      value={selectedDraft?.resolvedAppVersion || ""}
                      onChange={(event) =>
                        handleDraftChange(
                          String(selectedWorkItem._id),
                          "resolvedAppVersion",
                          event.target.value
                        )
                      }
                      fullWidth
                    />
                    <TextField
                      label="Resolved deploy"
                      size="small"
                      value={selectedDraft?.resolvedDeployId || ""}
                      onChange={(event) =>
                        handleDraftChange(
                          String(selectedWorkItem._id),
                          "resolvedDeployId",
                          event.target.value
                        )
                      }
                      fullWidth
                    />
                  </Stack>
                  <TextField
                    label="Shipped work summary"
                    helperText="What shipped in this fix?"
                    size="small"
                    value={selectedDraft?.shippedSummary || ""}
                    onChange={(event) =>
                      handleDraftChange(
                        String(selectedWorkItem._id),
                        "shippedSummary",
                        event.target.value
                      )
                    }
                    multiline
                    minRows={2}
                    fullWidth
                  />
                  <TextField
                    label="Deferred follow-ups"
                    helperText="One deferred item per line."
                    size="small"
                    value={selectedDraft?.deferredFollowUpsText || ""}
                    onChange={(event) =>
                      handleDraftChange(
                        String(selectedWorkItem._id),
                        "deferredFollowUpsText",
                        event.target.value
                      )
                    }
                    multiline
                    minRows={2}
                    fullWidth
                  />
                  <TextField
                    label="Validation commands"
                    helperText="One command per line."
                    size="small"
                    value={selectedDraft?.validatedCommandsText || ""}
                    onChange={(event) =>
                      handleDraftChange(
                        String(selectedWorkItem._id),
                        "validatedCommandsText",
                        event.target.value
                      )
                    }
                    multiline
                    minRows={3}
                    fullWidth
                  />
                  <TextField
                    label="Manual checks completed"
                    helperText="One completed check per line."
                    size="small"
                    value={selectedDraft?.manualChecksText || ""}
                    onChange={(event) =>
                      handleDraftChange(
                        String(selectedWorkItem._id),
                        "manualChecksText",
                        event.target.value
                      )
                    }
                    multiline
                    minRows={3}
                    fullWidth
                  />
                  <Stack spacing={1}>
                    <Typography variant="subtitle2">Regression checklist</Typography>
                    {(selectedDraft?.regressionChecklist || []).map((entry, index) => (
                      <Stack
                        key={`${String(selectedWorkItem._id)}-regression-${entry.label}`}
                        direction={{ xs: "column", md: "row" }}
                        spacing={1}
                      >
                        <TextField
                          select
                          size="small"
                          label={entry.label}
                          value={entry.outcome}
                          onChange={(event) =>
                            handleRegressionChecklistChange(
                              String(selectedWorkItem._id),
                              index,
                              {
                                outcome: event.target.value as FeedbackRegressionCheck["outcome"],
                              }
                            )
                          }
                          sx={{ minWidth: { md: 220 } }}
                        >
                          <MenuItem value="pending">Pending</MenuItem>
                          <MenuItem value="passed">Passed</MenuItem>
                          <MenuItem value="failed">Failed</MenuItem>
                          <MenuItem value="not_applicable">Not applicable</MenuItem>
                        </TextField>
                        <TextField
                          size="small"
                          label={`${entry.label} notes`}
                          value={entry.notes || ""}
                          onChange={(event) =>
                            handleRegressionChecklistChange(
                              String(selectedWorkItem._id),
                              index,
                              {
                                notes: event.target.value,
                              }
                            )
                          }
                          fullWidth
                        />
                      </Stack>
                    ))}
                  </Stack>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() =>
                        handleWorkflowUpdate(selectedWorkItem, {
                          triageStatus: selectedWorkItem.triageStatus,
                          successMessage: "Resolution metadata saved.",
                        })
                      }
                      disabled={savingId === String(selectedWorkItem._id)}
                    >
                      Save Resolution Metadata
                    </Button>
                    <Typography variant="body2" color="text.secondary">
                      These fields determine whether the issue can be closed.
                    </Typography>
                  </Stack>
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
                    Start here
                  </Typography>
                  <TextField
                    label="Implementation summary"
                    value={
                      drafts[String(selectedWorkItem._id)]?.implementationSummary ??
                      buildImplementationContext(selectedWorkItem).summary ??
                      ""
                    }
                    onChange={(event) =>
                      handleDraftChange(
                        String(selectedWorkItem._id),
                        "implementationSummary",
                        event.target.value
                      )
                    }
                    disabled={savingId === String(selectedWorkItem._id)}
                    fullWidth
                    multiline
                    minRows={2}
                  />
                  <TextField
                    label="Confirmed links"
                    helperText="Use one link per line, for example: [route] pages/bugs.tsx | Bugs inbox"
                    value={
                      drafts[String(selectedWorkItem._id)]?.implementationConfirmed ??
                      ""
                    }
                    onChange={(event) =>
                      handleDraftChange(
                        String(selectedWorkItem._id),
                        "implementationConfirmed",
                        event.target.value
                      )
                    }
                    disabled={savingId === String(selectedWorkItem._id)}
                    fullWidth
                    multiline
                    minRows={4}
                  />
                  <TextField
                    label="Inferred links"
                    helperText="Use one link per line for likely components, API handlers, hooks, schemas, or tests."
                    value={
                      drafts[String(selectedWorkItem._id)]?.implementationInferred ??
                      ""
                    }
                    onChange={(event) =>
                      handleDraftChange(
                        String(selectedWorkItem._id),
                        "implementationInferred",
                        event.target.value
                      )
                    }
                    disabled={savingId === String(selectedWorkItem._id)}
                    fullWidth
                    multiline
                    minRows={5}
                  />
                </Paper>

                <Paper
                  variant="outlined"
                  sx={{ p: 2, borderRadius: 2, display: "grid", gap: 1.5 }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Linked follow-ups
                  </Typography>
                  {selectedWorkItem.followUps?.length ? (
                    <Stack spacing={1}>
                      {selectedWorkItem.followUps.map((entry, index) => (
                        <Paper
                          key={`${String(selectedWorkItem._id)}-follow-up-${index}`}
                          variant="outlined"
                          sx={{ p: 1.25, borderRadius: 2 }}
                        >
                          <Typography variant="subtitle2">{entry.title}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {`${entry.type || "bug"} | ${entry.status || "tracked"}${
                              entry.workItemId ? ` | ${String(entry.workItemId)}` : ""
                            }`}
                          </Typography>
                          {entry.notes ? (
                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                              {entry.notes}
                            </Typography>
                          ) : null}
                        </Paper>
                      ))}
                    </Stack>
                  ) : (
                    <Alert severity="info">
                      No linked follow-up work items yet.
                    </Alert>
                  )}
                  <TextField
                    label="Follow-up title"
                    value={followUpDrafts[String(selectedWorkItem._id)]?.title || ""}
                    onChange={(event) =>
                      handleFollowUpDraftChange(
                        String(selectedWorkItem._id),
                        "title",
                        event.target.value
                      )
                    }
                    fullWidth
                  />
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <TextField
                      select
                      label="Follow-up type"
                      value={followUpDrafts[String(selectedWorkItem._id)]?.type || "bug"}
                      onChange={(event) =>
                        handleFollowUpDraftChange(
                          String(selectedWorkItem._id),
                          "type",
                          event.target.value
                        )
                      }
                      sx={{ minWidth: { sm: 180 } }}
                    >
                      <MenuItem value="bug">Bug</MenuItem>
                      <MenuItem value="feature">Feature</MenuItem>
                    </TextField>
                    <Button
                      variant="outlined"
                      onClick={() => handleCreateFollowUp(selectedWorkItem)}
                      disabled={savingId === String(selectedWorkItem._id)}
                    >
                      Create Linked Follow-up
                    </Button>
                  </Stack>
                  <TextField
                    label="Follow-up description"
                    helperText="Describe the adjacent work that should stay out of this fix."
                    value={followUpDrafts[String(selectedWorkItem._id)]?.description || ""}
                    onChange={(event) =>
                      handleFollowUpDraftChange(
                        String(selectedWorkItem._id),
                        "description",
                        event.target.value
                      )
                    }
                    multiline
                    minRows={3}
                    fullWidth
                  />
                </Paper>

                <Paper
                  variant="outlined"
                  sx={{ p: 2, borderRadius: 2, display: "grid", gap: 1.5 }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Auto-generated intelligence
                  </Typography>
                  {renderMetadataRows([
                    {
                      label: "Ownership hints",
                      value:
                        buildImplementationContext(selectedWorkItem).derived?.ownershipHints?.join(
                          ", "
                        ),
                    },
                    {
                      label: "Likely files",
                      value:
                        buildImplementationContext(selectedWorkItem).derived?.likelyFilePaths?.join(
                          "\n"
                        ),
                    },
                    {
                      label: "Stack clues",
                      value:
                        buildImplementationContext(selectedWorkItem).derived?.stackClues?.join(
                          "\n"
                        ),
                    },
                    {
                      label: "Runtime provenance",
                      value:
                        buildImplementationContext(selectedWorkItem).derived?.runtimeProvenance?.join(
                          "\n"
                        ),
                    },
                    {
                      label: "Open questions",
                      value:
                        buildImplementationContext(selectedWorkItem).derived?.openQuestions?.join(
                          "\n"
                        ),
                    },
                  ])}
                  <TextField
                    label="Recent commits"
                    value={(
                      buildImplementationContext(selectedWorkItem).derived?.recentCommits || []
                    )
                      .map(
                        (entry) =>
                          `${entry.sha} ${entry.summary}${
                            entry.file ? ` (${entry.file})` : ""
                          }`
                      )
                      .join("\n")}
                    InputProps={{ readOnly: true }}
                    fullWidth
                    multiline
                    minRows={3}
                  />
                </Paper>

                <Paper
                  variant="outlined"
                  sx={{ p: 2, borderRadius: 2, display: "grid", gap: 1.5 }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Verification pack
                  </Typography>
                  <TextField
                    label="Verification summary"
                    value={
                      drafts[String(selectedWorkItem._id)]?.verificationSummary ??
                      buildVerificationPack(selectedWorkItem).summary ??
                      ""
                    }
                    onChange={(event) =>
                      handleDraftChange(
                        String(selectedWorkItem._id),
                        "verificationSummary",
                        event.target.value
                      )
                    }
                    disabled={savingId === String(selectedWorkItem._id)}
                    fullWidth
                    multiline
                    minRows={2}
                  />
                  <TextField
                    label="Recommended commands"
                    helperText="Use one command per line."
                    value={
                      drafts[String(selectedWorkItem._id)]?.verificationCommands ?? ""
                    }
                    onChange={(event) =>
                      handleDraftChange(
                        String(selectedWorkItem._id),
                        "verificationCommands",
                        event.target.value
                      )
                    }
                    disabled={savingId === String(selectedWorkItem._id)}
                    fullWidth
                    multiline
                    minRows={3}
                  />
                  <TextField
                    label="Manual checks"
                    helperText="Use one manual check per line."
                    value={
                      drafts[String(selectedWorkItem._id)]?.verificationManualChecks ?? ""
                    }
                    onChange={(event) =>
                      handleDraftChange(
                        String(selectedWorkItem._id),
                        "verificationManualChecks",
                        event.target.value
                      )
                    }
                    disabled={savingId === String(selectedWorkItem._id)}
                    fullWidth
                    multiline
                    minRows={3}
                  />
                  <TextField
                    label="Done criteria"
                    helperText="Use one done criterion per line."
                    value={
                      drafts[String(selectedWorkItem._id)]?.verificationDoneCriteria ?? ""
                    }
                    onChange={(event) =>
                      handleDraftChange(
                        String(selectedWorkItem._id),
                        "verificationDoneCriteria",
                        event.target.value
                      )
                    }
                    disabled={savingId === String(selectedWorkItem._id)}
                    fullWidth
                    multiline
                    minRows={3}
                  />
                  <Stack spacing={1}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Completed checks
                    </Typography>
                    {buildVerificationPack({
                      ...selectedWorkItem,
                      verificationPack: buildWorkItemUpdatePayload(
                        selectedWorkItem,
                        drafts[String(selectedWorkItem._id)] || createDraftMap([selectedWorkItem], {})[String(selectedWorkItem._id)]
                      ).verificationPack,
                    }).items.map((item) => (
                      <Paper
                        key={item.id}
                        variant="outlined"
                        sx={{ p: 1, borderRadius: 2 }}
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Checkbox
                            checked={
                              (
                                drafts[String(selectedWorkItem._id)]?.completedVerificationIds ||
                                []
                              ).includes(item.id)
                            }
                            onChange={(event) =>
                              handleVerificationCompletionToggle(
                                String(selectedWorkItem._id),
                                item.id,
                                event.target.checked
                              )
                            }
                          />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {item.label}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {item.kind === "command"
                                ? item.command || item.label
                                : item.kind === "manual"
                                ? "Manual validation"
                                : "Done criterion"}
                            </Typography>
                          </Box>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </Paper>

                <Paper
                  variant="outlined"
                  sx={{ p: 2, borderRadius: 2, display: "grid", gap: 1.5 }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Related work
                  </Typography>
                  {selectedRelatedWork.length === 0 ? (
                    <Alert severity="info">
                      No nearby duplicates or related work items were detected.
                    </Alert>
                  ) : (
                    <Stack spacing={1}>
                      {selectedRelatedWork.map((match) => (
                        <Paper
                          key={String(match.workItem._id)}
                          variant="outlined"
                          sx={{ p: 1.25, borderRadius: 2 }}
                        >
                          <Typography variant="subtitle2">
                            {match.workItem.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {match.reasons.join("; ")}
                          </Typography>
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </Paper>

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
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Related work
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Similar items combine fingerprint, route, stack clues, and nearby
                        code-area signals so duplicate triage can reuse existing work.
                      </Typography>
                    </Box>
                    {selectedRelatedWork.length > 0 ? (
                      <Chip
                        size="small"
                        label={`${selectedRelatedWork.length} related item${
                          selectedRelatedWork.length === 1 ? "" : "s"
                        }`}
                        variant="outlined"
                      />
                    ) : null}
                  </Stack>
                  {selectedRelatedWork.length === 0 ? (
                    <Alert severity="info">
                      No likely duplicates or nearby fixes were found for this work item yet.
                    </Alert>
                  ) : (
                    <Stack spacing={1.5}>
                      {selectedRelatedActiveWork.length > 0 ? (
                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", mb: 1 }}
                          >
                            Active work items
                          </Typography>
                          <Stack spacing={1}>
                            {selectedRelatedActiveWork.map((match) => {
                              const relatedWorkItemId = String(match.workItem._id || "");

                              return (
                                <Paper
                                  key={relatedWorkItemId}
                                  variant="outlined"
                                  sx={{ p: 1.5, borderRadius: 2, display: "grid", gap: 1 }}
                                >
                                  <Stack
                                    direction={{ xs: "column", sm: "row" }}
                                    spacing={1}
                                    justifyContent="space-between"
                                    alignItems={{ xs: "flex-start", sm: "center" }}
                                  >
                                    <Box>
                                      <Typography variant="subtitle2">
                                        {match.workItem.title}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {relatedWorkItemId}
                                      </Typography>
                                    </Box>
                                    <Button
                                      variant="text"
                                      size="small"
                                      onClick={() => setSelectedWorkItemId(relatedWorkItemId)}
                                    >
                                      Open Work Item
                                    </Button>
                                  </Stack>
                                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    <Chip
                                      size="small"
                                      label={
                                        triageLabel[match.workItem.triageStatus] ||
                                        match.workItem.triageStatus
                                      }
                                      color={triageTone[match.workItem.triageStatus] || "default"}
                                    />
                                    <Chip
                                      size="small"
                                      label={`Score ${match.score}`}
                                      variant="outlined"
                                    />
                                    {match.workItem.page ? (
                                      <Chip
                                        size="small"
                                        label={match.workItem.page}
                                        variant="outlined"
                                      />
                                    ) : null}
                                  </Stack>
                                  <Typography
                                    variant="body2"
                                    sx={{ color: "text.secondary", whiteSpace: "pre-wrap" }}
                                  >
                                    {match.reasons.join(" | ")}
                                  </Typography>
                                </Paper>
                              );
                            })}
                          </Stack>
                        </Box>
                      ) : null}
                      {selectedRelatedClosedWork.length > 0 ? (
                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", mb: 1 }}
                          >
                            Resolved and duplicate history
                          </Typography>
                          <Stack spacing={1}>
                            {selectedRelatedClosedWork.map((match) => {
                              const relatedWorkItemId = String(match.workItem._id || "");

                              return (
                                <Paper
                                  key={relatedWorkItemId}
                                  variant="outlined"
                                  sx={{ p: 1.5, borderRadius: 2, display: "grid", gap: 1 }}
                                >
                                  <Stack
                                    direction={{ xs: "column", sm: "row" }}
                                    spacing={1}
                                    justifyContent="space-between"
                                    alignItems={{ xs: "flex-start", sm: "center" }}
                                  >
                                    <Box>
                                      <Typography variant="subtitle2">
                                        {match.workItem.title}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {relatedWorkItemId}
                                      </Typography>
                                    </Box>
                                    <Button
                                      variant="text"
                                      size="small"
                                      onClick={() => setSelectedWorkItemId(relatedWorkItemId)}
                                    >
                                      Open Work Item
                                    </Button>
                                  </Stack>
                                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    <Chip
                                      size="small"
                                      label={
                                        triageLabel[match.workItem.triageStatus] ||
                                        match.workItem.triageStatus
                                      }
                                      color={triageTone[match.workItem.triageStatus] || "default"}
                                    />
                                    <Chip
                                      size="small"
                                      label={`Score ${match.score}`}
                                      variant="outlined"
                                    />
                                    {match.workItem.resolvedAt ? (
                                      <Chip
                                        size="small"
                                        label={`Resolved ${formatTimestamp(match.workItem.resolvedAt)}`}
                                        variant="outlined"
                                      />
                                    ) : null}
                                  </Stack>
                                  <Typography
                                    variant="body2"
                                    sx={{ color: "text.secondary", whiteSpace: "pre-wrap" }}
                                  >
                                    {match.reasons.join(" | ")}
                                  </Typography>
                                </Paper>
                              );
                            })}
                          </Stack>
                        </Box>
                      ) : null}
                    </Stack>
                  )}
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
        <VersionChangelogDialog
          open={Boolean(selectedChangelogVersion)}
          version={selectedChangelogVersion}
          onClose={() => setSelectedChangelogVersion(null)}
        />
      </Box>
    </Box>
  );
};

export default BugsPage;
