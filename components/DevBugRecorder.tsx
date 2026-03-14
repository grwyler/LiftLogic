"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { Session } from "next-auth";
import { useSession } from "next-auth/react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import BugReportOutlinedIcon from "@mui/icons-material/BugReportOutlined";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import MinimizeRoundedIcon from "@mui/icons-material/MinimizeRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { toast } from "react-toastify";
import { submitFeedback } from "../utils/helpers";
import { FeedbackItemDoc } from "../utils/types";
import {
  DEV_BUG_INTERACTION_EVENT,
  DEV_BUG_ERROR_EVENT,
  emitDevBugInteraction,
} from "../utils/devBugRecorder";

type RecorderInteraction =
  NonNullable<FeedbackItemDoc["bugReport"]>["interactions"] extends Array<infer T>
    ? T
    : never;
type RecorderError =
  NonNullable<FeedbackItemDoc["bugReport"]>["errors"] extends Array<infer T>
    ? T
    : never;

type RecorderState = {
  isRecording: boolean;
  title: string;
  goal: string;
  expectedOutcome: string;
  actualOutcome: string;
  notes: string;
  severity: "low" | "medium" | "high";
  startedAt: string | null;
  interactions: RecorderInteraction[];
  errors: RecorderError[];
};

const STORAGE_KEY = "liftlogic-dev-bug-recorder";
const INTERACTION_LIMIT = 120;
const ERROR_LIMIT = 30;
const COMPLETE_SETTLE_MS = 1500;

const defaultState: RecorderState = {
  isRecording: false,
  title: "",
  goal: "",
  expectedOutcome: "",
  actualOutcome: "",
  notes: "",
  severity: "medium",
  startedAt: null,
  interactions: [],
  errors: [],
};

const isTextInput = (element: HTMLElement | null) => {
  if (!element) {
    return false;
  }

  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  );
};

const safeStringify = (value: unknown) => {
  try {
    return JSON.stringify(value);
  } catch (error) {
    return String(error);
  }
};

const truncate = (value: string, max = 180) =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

const getElementDescriptor = (element: HTMLElement | null) => {
  if (!element) {
    return "unknown target";
  }

  const id = element.id ? `#${element.id}` : "";
  const name = element.getAttribute("name");
  const dataTestId = element.getAttribute("data-testid");
  const role = element.getAttribute("role");
  const labelText =
    element.getAttribute("aria-label") ||
    element.getAttribute("title") ||
    element.textContent ||
    "";
  const parts = [
    element.tagName.toLowerCase(),
    id,
    name ? `[name="${name}"]` : "",
    role ? `[role="${role}"]` : "",
    dataTestId ? `[data-testid="${dataTestId}"]` : "",
  ];

  const descriptor = parts.join("");
  const label = truncate(labelText.replace(/\s+/g, " ").trim(), 80);
  return label ? `${descriptor} "${label}"` : descriptor;
};

const isRecorderElement = (element: HTMLElement | null) =>
  Boolean(element?.closest("[data-dev-bug-recorder='true']"));

const createTimestamp = () => new Date().toISOString();

const loadState = (): RecorderState => {
  if (typeof window === "undefined") {
    return defaultState;
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultState;
    }

    const parsed = JSON.parse(raw) as Partial<RecorderState>;
    return {
      ...defaultState,
      ...parsed,
      interactions: Array.isArray(parsed.interactions) ? parsed.interactions : [],
      errors: Array.isArray(parsed.errors) ? parsed.errors : [],
    };
  } catch (error) {
    console.error("Failed to restore bug recorder state", error);
    return defaultState;
  }
};

const createInteraction = (
  type: RecorderInteraction["type"],
  page: string,
  extras: Partial<RecorderInteraction> = {}
): RecorderInteraction => ({
  timestamp: createTimestamp(),
  type,
  kind: extras.kind,
  page,
  target: extras.target,
  value: extras.value,
  detail: extras.detail,
  label: extras.label,
  expected: extras.expected,
  actual: extras.actual,
  status: extras.status,
});

const createCapturedError = (
  source: RecorderError["source"],
  page: string,
  message: string,
  detail?: string
): RecorderError => ({
  timestamp: createTimestamp(),
  source,
  page,
  message: truncate(message, 240),
  detail: detail ? truncate(detail, 500) : undefined,
});

const buildReportDescription = (state: RecorderState, currentPath: string) => {
  const semanticSteps = state.interactions.filter(
    (interaction) => interaction.kind === "semantic"
  );
  const fallbackSteps = state.interactions.filter(
    (interaction) => interaction.kind !== "semantic"
  );
  const sections = [
    "Recorded repro session",
    `Current page: ${currentPath}`,
    `Started: ${state.startedAt || "unknown"}`,
    `Completed: ${createTimestamp()}`,
    "",
  ];

  if (state.goal.trim()) {
    sections.push("Goal");
    sections.push(state.goal.trim());
    sections.push("");
  }

  if (state.expectedOutcome.trim()) {
    sections.push("Expected result");
    sections.push(state.expectedOutcome.trim());
    sections.push("");
  }

  if (state.actualOutcome.trim()) {
    sections.push("Actual result");
    sections.push(state.actualOutcome.trim());
    sections.push("");
  }

  if (state.notes.trim()) {
    sections.push("Notes");
    sections.push(state.notes.trim());
    sections.push("");
  }

  sections.push("Steps to reproduce");
  if (semanticSteps.length > 0) {
    semanticSteps.forEach((interaction, index) => {
      sections.push(
        `${index + 1}. ${interaction.label || interaction.detail || "Recorded step"}`
      );
      if (interaction.expected) {
        sections.push(`   Expected: ${interaction.expected}`);
      }
      if (interaction.actual) {
        sections.push(`   Actual: ${interaction.actual}`);
      }
    });
  } else if (fallbackSteps.length === 0) {
    sections.push("1. No interactions were captured.");
  } else {
    fallbackSteps.forEach((interaction, index) => {
      const detail = [interaction.type.toUpperCase(), interaction.target, interaction.value]
        .filter(Boolean)
        .join(" | ");
      sections.push(`${index + 1}. [${interaction.page}] ${detail || interaction.detail || "interaction"}`);
    });
  }

  sections.push("");
  sections.push("Captured errors");
  if (state.errors.length === 0) {
    sections.push("None captured during this session.");
  } else {
    state.errors.forEach((error, index) => {
      sections.push(
        `${index + 1}. [${error.source}] ${error.message}${
          error.detail ? ` (${error.detail})` : ""
        }`
      );
    });
  }

  return sections.join("\n");
};

const DevBugRecorder = () => {
  const router = useRouter();
  const { data: session } = useSession() as {
    data: (Session & { token?: { user?: { _id?: string } } }) | null;
  };
  const [state, setState] = useState<RecorderState>(defaultState);
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const stateRef = useRef<RecorderState>(defaultState);

  useEffect(() => {
    const restored = loadState();
    stateRef.current = restored;
    setState(restored);
    setExpanded(restored.isRecording);
  }, []);

  useEffect(() => {
    stateRef.current = state;

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  const userId = session?.token?.user?._id || "";
  const currentPath = router.asPath || "/";
  const isAuthenticated = Boolean(userId);

  const interactionCountLabel = useMemo(
    () => `${state.interactions.length} step${state.interactions.length === 1 ? "" : "s"}`,
    [state.interactions.length]
  );

  const errorCountLabel = useMemo(
    () => `${state.errors.length} error${state.errors.length === 1 ? "" : "s"}`,
    [state.errors.length]
  );

  const appendInteraction = (entry: RecorderInteraction) => {
    setState((prev) => ({
      ...prev,
      interactions: [...prev.interactions, entry].slice(-INTERACTION_LIMIT),
    }));
  };

  const appendError = (entry: RecorderError) => {
    setState((prev) => ({
      ...prev,
      errors: [...prev.errors, entry].slice(-ERROR_LIMIT),
    }));
  };

  useEffect(() => {
    if (!state.isRecording || typeof window === "undefined") {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (isRecorderElement(target)) {
        return;
      }

      appendInteraction(
        createInteraction("click", window.location.pathname + window.location.search, {
          kind: "raw",
          target: getElementDescriptor(target),
        })
      );
    };

    const handleChange = (event: Event) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (isRecorderElement(target)) {
        return;
      }

      if (!isTextInput(target)) {
        return;
      }

      const value =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
          ? truncate(String(target.value ?? ""), 120)
          : undefined;

      appendInteraction(
        createInteraction("change", window.location.pathname + window.location.search, {
          kind: "raw",
          target: getElementDescriptor(target),
          value,
        })
      );
    };

    const handleSubmit = (event: Event) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (isRecorderElement(target)) {
        return;
      }

      appendInteraction(
        createInteraction("submit", window.location.pathname + window.location.search, {
          kind: "raw",
          target: getElementDescriptor(target),
        })
      );
    };

    const handleWindowError = (event: ErrorEvent) => {
      appendError(
        createCapturedError(
          "window-error",
          window.location.pathname + window.location.search,
          event.message || "Unhandled window error",
          event.filename
            ? `${event.filename}:${event.lineno || 0}:${event.colno || 0}`
            : undefined
        )
      );
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason =
        event.reason instanceof Error
          ? `${event.reason.name}: ${event.reason.message}`
          : safeStringify(event.reason);

      appendError(
        createCapturedError(
          "unhandled-rejection",
          window.location.pathname + window.location.search,
          reason || "Unhandled promise rejection"
        )
      );
    };

    document.addEventListener("click", handleClick, true);
    document.addEventListener("change", handleChange, true);
    document.addEventListener("submit", handleSubmit, true);
    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("change", handleChange, true);
      document.removeEventListener("submit", handleSubmit, true);
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, [state.isRecording]);

  useEffect(() => {
    if (!state.isRecording || typeof window === "undefined") {
      return;
    }

    const handleSemanticInteraction = (event: Event) => {
      const customEvent = event as CustomEvent<Partial<RecorderInteraction>>;
      const detail = customEvent.detail || {};

      appendInteraction(
        createInteraction(
          detail.type || "lifecycle",
          detail.page || window.location.pathname + window.location.search,
          {
            kind: detail.kind || "semantic",
            target: detail.target,
            value: detail.value,
            detail: detail.detail,
            label: detail.label,
            expected: detail.expected,
            actual: detail.actual,
            status: detail.status,
          }
        )
      );
    };

    const handleSemanticError = (event: Event) => {
      const customEvent = event as CustomEvent<Partial<RecorderError>>;
      const detail = customEvent.detail || {};
      const message = detail.message?.trim();

      if (!message) {
        return;
      }

      appendError(
        createCapturedError(
          detail.source || "console-error",
          detail.page || window.location.pathname + window.location.search,
          message,
          detail.detail
        )
      );
    };

    window.addEventListener(
      DEV_BUG_INTERACTION_EVENT,
      handleSemanticInteraction as EventListener
    );
    window.addEventListener(
      DEV_BUG_ERROR_EVENT,
      handleSemanticError as EventListener
    );

    return () => {
      window.removeEventListener(
        DEV_BUG_INTERACTION_EVENT,
        handleSemanticInteraction as EventListener
      );
      window.removeEventListener(
        DEV_BUG_ERROR_EVENT,
        handleSemanticError as EventListener
      );
    };
  }, [state.isRecording]);

  useEffect(() => {
    if (!state.isRecording) {
      return;
    }

    const handleRouteDone = (url: string) => {
      appendInteraction(
        createInteraction("navigation", url, {
          kind: "raw",
          detail: `Navigated to ${url}`,
        })
      );
    };

    router.events.on("routeChangeComplete", handleRouteDone);
    return () => {
      router.events.off("routeChangeComplete", handleRouteDone);
    };
  }, [router.events, state.isRecording]);

  const handleStart = () => {
    const startedAt = createTimestamp();
    const nextState: RecorderState = {
      ...defaultState,
      isRecording: true,
      startedAt,
      title: state.title,
      goal: state.goal,
      expectedOutcome: state.expectedOutcome,
      actualOutcome: state.actualOutcome,
      notes: state.notes,
      severity: state.severity,
      interactions: [
        createInteraction("lifecycle", currentPath, {
          kind: "semantic",
          label: "Start a repro recording",
          detail: `Recording started on ${currentPath}`,
          actual: `Recording started on ${currentPath}`,
          status: "info",
        }),
      ],
      errors: [],
    };

    setExpanded(true);
    setState(nextState);
  };

  const handleReset = () => {
    setState(defaultState);
    setExpanded(false);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleComplete = async () => {
    if (!isAuthenticated) {
      toast.error("Sign in before saving a recorded bug report.");
      return;
    }

    setSubmitting(true);
    emitDevBugInteraction({
      type: "submit",
      kind: "semantic",
      label: "Complete repro recording",
      expected: "The full bug report is copied and saved to feedback.",
      actual: "Recorder completion was requested.",
      status: "info",
    });

    try {
      await new Promise((resolve) => {
        window.setTimeout(resolve, COMPLETE_SETTLE_MS);
      });

      const snapshot = stateRef.current;
      const finalPath =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : currentPath;

      const deviceType =
        typeof window !== "undefined" && window.innerWidth < 900
          ? "mobile"
          : "desktop";

      const title =
        snapshot.title.trim() || `Recorded bug report from ${finalPath}`;
      const description = buildReportDescription(snapshot, finalPath);

      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(description);
          emitDevBugInteraction({
            type: "lifecycle",
            kind: "semantic",
            label: "Copied recorded bug report",
            expected: "The full bug report is copied to the clipboard.",
            actual: "Clipboard copy succeeded before saving feedback.",
            status: "success",
          });
        } catch (clipboardError) {
          emitDevBugInteraction({
            type: "lifecycle",
            kind: "semantic",
            label: "Copy recorded bug report failed",
            expected: "The full bug report is copied to the clipboard.",
            actual: "Clipboard copy failed before saving feedback.",
            status: "failure",
          });
          console.error("Failed to copy bug report to clipboard", clipboardError);
        }
      }

      await submitFeedback({
        userId,
        type: "bug",
        title,
        description,
        severity: snapshot.severity,
        page: finalPath,
        deviceType,
        bugReport: {
          mode: "recorded",
          startedAt: snapshot.startedAt || undefined,
          completedAt: createTimestamp(),
          currentPath: finalPath,
          userAgent:
            typeof window !== "undefined" ? window.navigator.userAgent : undefined,
          viewport:
            typeof window !== "undefined"
              ? {
                  width: window.innerWidth,
                  height: window.innerHeight,
                }
              : undefined,
          interactions: snapshot.interactions,
          errors: snapshot.errors,
        },
      });

      emitDevBugInteraction({
        type: "lifecycle",
        kind: "semantic",
        label: "Saved recorded bug report",
        expected: "The full bug report is copied and saved to feedback.",
        actual: "Feedback save succeeded.",
        status: "success",
      });
      toast.success("Bug report copied and saved to feedback.");
      handleReset();
    } catch (error) {
      emitDevBugInteraction({
        type: "lifecycle",
        kind: "semantic",
        label: "Save recorded bug report failed",
        expected: "The full bug report is copied and saved to feedback.",
        actual: "Feedback save failed while completing the recording.",
        status: "failure",
      });
      console.error("Failed to submit recorded bug report", error);
      toast.error("Couldn't save the recorded bug report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      data-dev-bug-recorder="true"
      sx={{
        position: "fixed",
        right: { xs: 12, sm: 18 },
        bottom: { xs: 12, sm: 18 },
        zIndex: 1500,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: { xs: "calc(100vw - 24px)", sm: 360 },
          borderRadius: 3,
          border: "1px solid",
          borderColor: state.isRecording ? "error.main" : "divider",
          overflow: "hidden",
          boxShadow: "0 22px 50px rgba(15, 23, 42, 0.18)",
        }}
      >
        <Box
          sx={{
            px: 1.5,
            py: 1.25,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background:
              state.isRecording
                ? "linear-gradient(135deg, rgba(220,38,38,0.14), rgba(248,113,113,0.04))"
                : "linear-gradient(135deg, rgba(15,23,42,0.06), rgba(15,23,42,0.02))",
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <BugReportOutlinedIcon fontSize="small" />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Dev bug recorder
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Development only
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            {state.isRecording ? (
              <FiberManualRecordIcon sx={{ color: "error.main", fontSize: 14 }} />
            ) : null}
            <Tooltip title={expanded ? "Minimize" : "Expand"}>
              <IconButton size="small" onClick={() => setExpanded((prev) => !prev)}>
                <MinimizeRoundedIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        <Collapse in={expanded}>
          <Stack spacing={1.5} sx={{ p: 1.5 }}>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Start a recording, reproduce the issue, then save the generated bug
              report to `feedback`.
            </Alert>

            {!isAuthenticated ? (
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                Sign in to store recorded bug reports.
              </Alert>
            ) : null}

            <TextField
              label="Bug title"
              value={state.title}
              onChange={(event) =>
                setState((prev) => ({ ...prev, title: event.target.value }))
              }
              fullWidth
              size="small"
              placeholder="Example: Logging a set jumps the screen"
            />

            <TextField
              label="What are you trying to do?"
              value={state.goal}
              onChange={(event) =>
                setState((prev) => ({ ...prev, goal: event.target.value }))
              }
              fullWidth
              size="small"
              placeholder="Example: Log a completed set for a scheduled exercise"
            />

            <TextField
              label="What should happen?"
              value={state.expectedOutcome}
              onChange={(event) =>
                setState((prev) => ({
                  ...prev,
                  expectedOutcome: event.target.value,
                }))
              }
              fullWidth
              size="small"
              multiline
              minRows={2}
              placeholder="Example: The completed set count should increase and the set should stay logged after refresh."
            />

            <TextField
              label="What actually happened?"
              value={state.actualOutcome}
              onChange={(event) =>
                setState((prev) => ({
                  ...prev,
                  actualOutcome: event.target.value,
                }))
              }
              fullWidth
              size="small"
              multiline
              minRows={2}
              placeholder="Example: The loading indicator flickered, but the set count stayed at 0/3."
            />

            <TextField
              label="Notes"
              value={state.notes}
              onChange={(event) =>
                setState((prev) => ({ ...prev, notes: event.target.value }))
              }
              fullWidth
              size="small"
              multiline
              minRows={3}
              placeholder="Expected result, what felt off, device details, or anything the automatic log won't know."
            />

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {(["low", "medium", "high"] as const).map((level) => (
                <Chip
                  key={level}
                  label={`${level} severity`}
                  color={state.severity === level ? "primary" : "default"}
                  variant={state.severity === level ? "filled" : "outlined"}
                  onClick={() =>
                    setState((prev) => ({
                      ...prev,
                      severity: level,
                    }))
                  }
                />
              ))}
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                label={interactionCountLabel}
                variant="outlined"
                color={state.interactions.length > 0 ? "primary" : "default"}
              />
              <Chip
                label={errorCountLabel}
                variant="outlined"
                color={state.errors.length > 0 ? "warning" : "default"}
              />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                variant={state.isRecording ? "outlined" : "contained"}
                startIcon={<PlayArrowRoundedIcon />}
                onClick={handleStart}
                disabled={state.isRecording}
                fullWidth
              >
                {state.isRecording ? "Recording" : "Start"}
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<StopRoundedIcon />}
                onClick={handleComplete}
                disabled={!state.isRecording || submitting}
                fullWidth
              >
                {submitting ? "Saving..." : "Complete"}
              </Button>
              <Button
                variant="text"
                color="inherit"
                startIcon={<DeleteOutlineRoundedIcon />}
                onClick={handleReset}
                disabled={submitting}
                fullWidth
              >
                Clear
              </Button>
            </Stack>

            {state.interactions.length > 0 ? (
              <Box
                sx={{
                  maxHeight: 180,
                  overflowY: "auto",
                  px: 0.25,
                }}
              >
                <Stack spacing={0.75}>
                  {state.interactions.slice(-6).reverse().map((interaction) => (
                    <Paper
                  key={`${interaction.timestamp}-${interaction.type}-${interaction.target}`}
                      variant="outlined"
                      sx={{ p: 1, borderRadius: 2 }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {(interaction.label || interaction.type) as string} on {interaction.page}
                      </Typography>
                      <Typography variant="body2">
                        {interaction.label ||
                          interaction.target ||
                          interaction.detail ||
                          "interaction"}
                      </Typography>
                      {interaction.expected ? (
                        <Typography variant="caption" color="text.secondary">
                          Expected: {interaction.expected}
                        </Typography>
                      ) : null}
                      {interaction.actual ? (
                        <Typography variant="caption" color="text.secondary">
                          Actual: {interaction.actual}
                        </Typography>
                      ) : null}
                      {interaction.value ? (
                        <Typography variant="caption" color="text.secondary">
                          {interaction.value}
                        </Typography>
                      ) : null}
                    </Paper>
                  ))}
                </Stack>
              </Box>
            ) : null}
          </Stack>
        </Collapse>
      </Paper>
    </Box>
  );
};

export default DevBugRecorder;
