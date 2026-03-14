"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AIResponseSourceDetail,
  getAIFallbackNotice,
} from "../utils/aiFallback";
import { askWorkoutCoach, submitFeedback } from "../utils/helpers";
import { SetupFormValues } from "../utils/profileSetup";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Portal,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import ThumbDownAltOutlinedIcon from "@mui/icons-material/ThumbDownAltOutlined";
import { toast } from "react-toastify";

type ChatMessage = {
  id: string;
  role: "coach" | "user";
  text: string;
  feedbackEnabled?: boolean;
};

type CoachResponse = {
  headline: string;
  openingMessage?: string;
  summary?: string;
  suggestedReplies?: string[];
  planSnapshot?: Array<{
    dayKey: string;
    dayLabel: string;
    title: string;
    exerciseCount: number;
    exercises: Array<{
      name: string;
      type: "weight" | "timed";
      sets: number;
      reps?: number | null;
      weight?: number | null;
      minutes?: number | null;
      rest: number;
    }>;
  }>;
};

type CoachReplyPayload = {
  reply: string;
  suggestedReplies?: string[];
  profilePatch?: Partial<SetupFormValues>;
  shouldRegeneratePlan?: boolean;
  action?: any;
  source?: "ai" | "fallback";
  sourceDetail?: AIResponseSourceDetail;
};

const MAX_REACTION_STORAGE_ENTRIES = 24;

const normalizeReactionText = (value: string) =>
  value.replace(/\s+/g, " ").trim().toLowerCase().slice(0, 280);

const getReactionMessageKey = (message: Pick<ChatMessage, "role" | "text">) =>
  `${message.role}:${normalizeReactionText(message.text)}`;

const getReactionStorageKey = ({
  userId,
  pathname,
  coachResponse,
}: {
  userId: string;
  pathname: string;
  coachResponse: CoachResponse;
}) =>
  [
    "lift-logic",
    "coach-feedback",
    userId || "anonymous",
    pathname || "/routines",
    normalizeReactionText(coachResponse.headline || "coach"),
    normalizeReactionText(coachResponse.openingMessage || "opening"),
  ].join(":");

const readStoredReactions = (storageKey: string) => {
  if (typeof window === "undefined") {
    return {} as Record<string, "like" | "dislike">;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return {} as Record<string, "like" | "dislike">;
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([, value]) => value === "like" || value === "dislike"
      )
    ) as Record<string, "like" | "dislike">;
  } catch {
    return {} as Record<string, "like" | "dislike">;
  }
};

const writeStoredReactions = (
  storageKey: string,
  reactions: Record<string, "like" | "dislike">
) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const entries = Object.entries(reactions).slice(-MAX_REACTION_STORAGE_ENTRIES);
    window.localStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Ignore storage failures so feedback saving still works.
  }
};

const buildReactionStateForMessages = (
  messages: ChatMessage[],
  storedReactions: Record<string, "like" | "dislike">
) =>
  Object.fromEntries(
    messages
      .map((message) => {
        const reaction = storedReactions[getReactionMessageKey(message)];
        return reaction ? [message.id, reaction] : null;
      })
      .filter(Boolean) as Array<[string, "like" | "dislike"]>
  );

const buildInitialMessages = (coachResponse: CoachResponse): ChatMessage[] => {
  const messages: ChatMessage[] = [];

  if (coachResponse.openingMessage) {
    messages.push({
      id: "opening",
      role: "coach",
      text: coachResponse.openingMessage,
      feedbackEnabled: true,
    });
  }

  messages.push({
    id: "follow-up",
    role: "coach",
    text: "If you want, ask me why I chose this split, how to adjust it, or what to do first.",
    feedbackEnabled: false,
  });

  return messages;
};

const truncateText = (value: string, maxLength = 120) =>
  value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}...`;

export default function CoachChatPanel({
  coachResponse,
  coachSource,
  coachSourceDetail,
  profile,
  onDismiss,
  primaryActionLabel,
  onPrimaryAction,
  onApplyProfilePatch,
  onCoachAction,
}: {
  coachResponse: CoachResponse;
  coachSource?: "ai" | "fallback";
  coachSourceDetail?: AIResponseSourceDetail;
  profile: SetupFormValues;
  onDismiss?: () => void;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onApplyProfilePatch?: (
    patch: Partial<SetupFormValues>
  ) => Promise<void> | void;
  onCoachAction?: (action: any) => Promise<string | void> | string | void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    buildInitialMessages(coachResponse)
  );
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [planExpanded, setPlanExpanded] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>(
    coachResponse.suggestedReplies ?? []
  );
  const [responseFeedback, setResponseFeedback] = useState<
    Record<string, "like" | "dislike">
  >({});
  const [dislikeTarget, setDislikeTarget] = useState<ChatMessage | null>(null);
  const [dislikeExplanation, setDislikeExplanation] = useState("");
  const [submittingDislike, setSubmittingDislike] = useState(false);
  const [assistantSource, setAssistantSource] = useState<
    "ai" | "fallback" | undefined
  >(coachSource);
  const [assistantSourceDetail, setAssistantSourceDetail] = useState<
    AIResponseSourceDetail | undefined
  >(coachSourceDetail);
  const { data: session } = useSession() as {
    data: { user?: { _id?: string; username?: string; email?: string } } | null;
  };
  const router = useRouter();

  const planDays = useMemo(
    () => coachResponse.planSnapshot ?? [],
    [coachResponse.planSnapshot]
  );

  const sessionUserId =
    session?.user?._id || (session as any)?.token?.user?._id || "";
  const feedbackUsername =
    session?.user?.username || (session as any)?.token?.user?.username || "";
  const feedbackEmail =
    session?.user?.email || (session as any)?.token?.user?.email || "";
  const reactionStorageKey = useMemo(
    () =>
      getReactionStorageKey({
        userId: sessionUserId,
        pathname: router.pathname || "/routines",
        coachResponse,
      }),
    [coachResponse, router.pathname, sessionUserId]
  );

  useEffect(() => {
    setLoading(false);
    setQuickReplies(coachResponse.suggestedReplies ?? []);
    setAssistantSource(coachSource);
    setAssistantSourceDetail(coachSourceDetail);
  }, [coachResponse, coachSource, coachSourceDetail]);

  useEffect(() => {
    const storedReactions = readStoredReactions(reactionStorageKey);
    const nextResponseFeedback = buildReactionStateForMessages(
      messages,
      storedReactions
    );

    setResponseFeedback((previous) =>
      JSON.stringify(previous) === JSON.stringify(nextResponseFeedback)
        ? previous
        : nextResponseFeedback
    );
  }, [messages, reactionStorageKey]);

  const fallbackNotice = useMemo(() => {
    if (
      assistantSource !== "fallback" ||
      !assistantSourceDetail ||
      assistantSourceDetail === "rule_based"
    ) {
      return "";
    }

    return getAIFallbackNotice({
      experience: "coach",
      sourceDetail: assistantSourceDetail,
    });
  }, [assistantSource, assistantSourceDetail]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const nextHistory = [
      ...messages,
      {
        id: `user-${Date.now()}`,
        role: "user" as const,
        text: trimmed,
        feedbackEnabled: false,
      },
    ];

    setMessages(nextHistory);
    setDraft("");
    setLoading(true);

    try {
      const response = (await askWorkoutCoach({
        message: trimmed,
        history: nextHistory.map(({ role, text: messageText }) => ({
          role,
          text: messageText,
        })),
        profile,
        coachResponse,
      })) as CoachReplyPayload;

      setAssistantSource(response.source);
      setAssistantSourceDetail(response.sourceDetail);

      if (
        response.source === "fallback" &&
        response.sourceDetail &&
        response.sourceDetail !== "rule_based"
      ) {
        const notice = getAIFallbackNotice({
          experience: "coach",
          sourceDetail: response.sourceDetail,
        });
        if (notice) {
          toast.info(notice);
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `coach-${Date.now()}`,
          role: "coach",
          text: response.reply,
          feedbackEnabled: true,
        },
      ]);

      if (
        response.shouldRegeneratePlan &&
        response.profilePatch &&
        onApplyProfilePatch
      ) {
        await onApplyProfilePatch(response.profilePatch);
        const patchKeys = Object.keys(response.profilePatch);
        const regenerationMessage = patchKeys.includes("preferredTrainingDays")
          ? "I updated your training days and rebuilt the plan around that schedule change."
          : "I updated your setup based on that and rebuilt the plan so the prescriptions line up better.";
        setMessages((prev) => [
          ...prev,
          {
            id: `coach-plan-${Date.now()}`,
            role: "coach",
            text: regenerationMessage,
            feedbackEnabled: false,
          },
        ]);
      }

      if (response.action && onCoachAction) {
        const actionResult = await onCoachAction(response.action);
        if (actionResult) {
          setMessages((prev) => [
            ...prev,
            {
              id: `coach-action-${Date.now()}`,
              role: "coach",
              text: actionResult,
              feedbackEnabled: false,
            },
          ]);
        }
      }

      setQuickReplies(
        Array.isArray(response.suggestedReplies) ? response.suggestedReplies : []
      );
    } catch (error) {
      console.error("Error chatting with coach:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: `coach-error-${Date.now()}`,
          role: "coach",
          text: "I hit a snag answering that, but I can still help. Ask me about the split, exercise swaps, or how to start the week.",
          feedbackEnabled: false,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleResponseFeedback = async (
    message: ChatMessage,
    sentiment: "like" | "dislike",
    explanation?: string
  ) => {
    if (!sessionUserId) {
      toast.error("You need to be signed in to send assistant feedback.");
      return;
    }

    try {
      await submitFeedback({
        userId: sessionUserId,
        username: feedbackUsername || undefined,
        email: feedbackEmail || undefined,
        type: "bug",
        title:
          sentiment === "like"
            ? `Liked coach response: ${truncateText(message.text, 72)}`
            : "Workout assistant response disliked",
        description:
          sentiment === "like"
            ? `A user marked this coach response as helpful.\n\nSelected response:\n${message.text}\n\nConversation history:\n${messages
                .map(
                  ({ role, text }) =>
                    `${role === "coach" ? "Coach" : "User"}: ${text}`
                )
                .join("\n")}`
            : "A user marked this workout assistant response as unhelpful or incorrect.",
        severity: sentiment === "dislike" ? "medium" : "low",
        page: router.pathname || "/routines",
        deviceType:
          typeof window !== "undefined" && window.innerWidth < 768
            ? "mobile"
            : "desktop",
        coachFeedback: {
          sentiment,
          messageId: message.id,
          selectedResponse: message.text,
          explanation: explanation?.trim() || undefined,
          conversation: messages.map(({ role, text }) => ({ role, text })),
        },
      });

      const nextStoredReactions = {
        ...readStoredReactions(reactionStorageKey),
        [getReactionMessageKey(message)]: sentiment,
      };
      writeStoredReactions(reactionStorageKey, nextStoredReactions);
      setResponseFeedback((prev) => ({ ...prev, [message.id]: sentiment }));
      toast.success(
        sentiment === "like"
          ? "Thanks, that response was marked helpful."
          : "Thanks, I saved that for assistant debugging."
      );
    } catch (error) {
      console.error("Error submitting assistant feedback:", error);
      toast.error("Couldn't save that assistant feedback.");
    }
  };

  const submitDislikeFeedback = async () => {
    if (!dislikeTarget || submittingDislike) {
      return;
    }

    setSubmittingDislike(true);
    try {
      await handleResponseFeedback(
        dislikeTarget,
        "dislike",
        dislikeExplanation
      );
      setDislikeTarget(null);
      setDislikeExplanation("");
    } finally {
      setSubmittingDislike(false);
    }
  };

  if (minimized) {
    return (
      <Portal>
        <Box
          sx={{
            position: "fixed",
            right: { xs: 12, sm: 18 },
            bottom: { xs: 72, sm: 84 },
            zIndex: 1600,
          }}
        >
          <Tooltip title="Reopen workout assistant">
            <Paper
              elevation={0}
              sx={{
                width: 48,
                height: 48,
                borderRadius: "999px",
                border: "1px solid",
                borderColor: "divider",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "background.paper",
                boxShadow: "0 22px 50px rgba(15, 23, 42, 0.18)",
                overflow: "hidden",
              }}
            >
              <IconButton
                size="small"
                onClick={() => setMinimized(false)}
                sx={{ width: 48, height: 48, borderRadius: "999px" }}
              >
                <AutoAwesomeOutlinedIcon fontSize="small" />
              </IconButton>
            </Paper>
          </Tooltip>
        </Box>
      </Portal>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.75, sm: 2.25 },
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        background:
          "linear-gradient(180deg, rgba(59,130,246,0.08) 0%, rgba(255,255,255,0) 100%)",
      }}
    >
      <Stack spacing={1.5}>
        <Alert severity="warning" sx={{ borderRadius: 2.5 }}>
          The workout assistant is still in beta testing. It may be wrong,
          incomplete, or behave unexpectedly while we keep improving it.
        </Alert>

        {fallbackNotice ? (
          <Alert severity="info" sx={{ borderRadius: 2.5 }}>
            {fallbackNotice}
          </Alert>
        ) : null}

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            gap: 1,
            flexDirection: { xs: "column", sm: "row" },
          }}
        >
          <Box>
            <Typography
              variant="overline"
              sx={{ color: "text.secondary", letterSpacing: "0.12em" }}
            >
              Workout Assistant
            </Typography>
            <Typography variant="h6">{coachResponse.headline}</Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            {onDismiss ? (
              <Button variant="text" onClick={() => setMinimized(true)}>
                Dismiss
              </Button>
            ) : null}
            {primaryActionLabel && onPrimaryAction ? (
              <Button variant="outlined" onClick={onPrimaryAction}>
                {primaryActionLabel}
              </Button>
            ) : null}
          </Stack>
        </Box>

        <Stack spacing={1}>
          {messages.map((message) => (
            <Box
              key={message.id}
              sx={{
                alignSelf: message.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "92%",
                px: 1.5,
                py: 1.15,
                borderRadius: 2.5,
                border: "1px solid",
                borderColor:
                  message.role === "user" ? "transparent" : "divider",
                backgroundColor:
                  message.role === "user"
                    ? "primary.main"
                    : "background.paper",
                color:
                  message.role === "user"
                    ? "primary.contrastText"
                    : "text.primary",
              }}
            >
              <Typography sx={{ lineHeight: 1.5 }}>{message.text}</Typography>
              {message.role === "coach" && message.feedbackEnabled !== false ? (
                <Stack
                  direction="row"
                  spacing={0.75}
                  sx={{ mt: 1, justifyContent: "flex-end" }}
                >
                  <Tooltip title="Helpful response">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => handleResponseFeedback(message, "like")}
                        color={
                          responseFeedback[message.id] === "like"
                            ? "primary"
                            : "default"
                        }
                        disabled={Boolean(responseFeedback[message.id])}
                        sx={
                          responseFeedback[message.id] === "like"
                            ? {
                                backgroundColor: "action.selected",
                                "&:hover": {
                                  backgroundColor: "action.selected",
                                },
                                "&.Mui-disabled": {
                                  color: "primary.main",
                                  opacity: 1,
                                  backgroundColor: "action.selected",
                                },
                              }
                            : undefined
                        }
                      >
                        <ThumbUpAltOutlinedIcon fontSize="inherit" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Needs work">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setDislikeTarget(message);
                          setDislikeExplanation("");
                        }}
                        color={
                          responseFeedback[message.id] === "dislike"
                            ? "primary"
                            : "default"
                        }
                        disabled={Boolean(responseFeedback[message.id])}
                        sx={
                          responseFeedback[message.id] === "dislike"
                            ? {
                                backgroundColor: "action.selected",
                                "&:hover": {
                                  backgroundColor: "action.selected",
                                },
                                "&.Mui-disabled": {
                                  color: "primary.main",
                                  opacity: 1,
                                  backgroundColor: "action.selected",
                                },
                              }
                            : undefined
                        }
                      >
                        <ThumbDownAltOutlinedIcon fontSize="inherit" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  {responseFeedback[message.id] ? (
                    <Typography
                      variant="caption"
                      sx={{
                        alignSelf: "center",
                        color: "text.secondary",
                        ml: 0.25,
                      }}
                    >
                      Feedback saved
                    </Typography>
                  ) : null}
                </Stack>
              ) : null}
            </Box>
          ))}

          {loading ? (
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                px: 1.5,
                py: 1,
                borderRadius: 2.5,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: "background.paper",
                width: "fit-content",
              }}
            >
              <CircularProgress size={14} />
              <Typography sx={{ color: "text.secondary" }}>
                Assistant is thinking...
              </Typography>
            </Box>
          ) : null}
        </Stack>

        {planDays.length > 0 ? (
          <Box
            sx={{
              p: 1.25,
              borderRadius: 2.5,
              border: "1px solid",
              borderColor: "divider",
              backgroundColor: "background.paper",
            }}
          >
            <Typography
              variant="overline"
              sx={{ color: "text.secondary", letterSpacing: "0.1em" }}
            >
              Weekly Shape
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="space-between"
              sx={{ mt: 0.75 }}
            >
              <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
                {planDays.length} training day{planDays.length === 1 ? "" : "s"} planned
              </Typography>
              <Button
                size="small"
                variant="text"
                onClick={() => setPlanExpanded((prev) => !prev)}
              >
                {planExpanded ? "Hide plan" : "View plan"}
              </Button>
            </Stack>

            {!planExpanded ? (
              <Typography sx={{ mt: 0.25, color: "text.secondary", fontSize: 14 }}>
                {planDays
                  .slice(0, 2)
                  .map((day) => `${day.dayLabel}: ${day.title}`)
                  .join(" • ")}
                {planDays.length > 2 ? " ..." : ""}
              </Typography>
            ) : null}

            <Collapse in={planExpanded}>
              <Stack spacing={1} sx={{ mt: 1 }}>
                {planDays.map((day) => (
                  <Box
                    key={`${day.dayKey}-${day.title}`}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: { xs: "flex-start", sm: "center" },
                      gap: 1,
                      flexDirection: { xs: "column", sm: "row" },
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>
                        {day.dayLabel}: {day.title}
                      </Typography>
                      <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
                        {day.exercises.map((exercise) => exercise.name).join(", ")}
                      </Typography>
                    </Box>
                    <Chip
                      label={`${day.exerciseCount} exercise${
                        day.exerciseCount === 1 ? "" : "s"
                      }`}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                ))}
              </Stack>
            </Collapse>
          </Box>
        ) : null}

        {quickReplies.length > 0 ? (
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {quickReplies.map((reply) => (
              <Chip
                key={reply}
                label={reply}
                variant="outlined"
                clickable
                onClick={() => sendMessage(reply)}
              />
            ))}
          </Stack>
        ) : null}

        <Stack direction="row" spacing={1} alignItems="flex-end">
          <TextField
            fullWidth
            size="small"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask why this fits, how to swap lifts, or what to do first"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage(draft);
              }
            }}
          />
          <Button
            variant="contained"
            onClick={() => sendMessage(draft)}
            disabled={!draft.trim() || loading}
          >
            Send
          </Button>
        </Stack>
      </Stack>

      <Dialog
        open={Boolean(dislikeTarget)}
        onClose={() => {
          if (!submittingDislike) {
            setDislikeTarget(null);
            setDislikeExplanation("");
          }
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>What went wrong with this response?</DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ pt: 0.5 }}>
            <Typography sx={{ color: "text.secondary" }}>
              This note will be attached to the bug report along with the chat
              history.
            </Typography>
            <TextField
              autoFocus
              multiline
              minRows={4}
              fullWidth
              value={dislikeExplanation}
              onChange={(event) => setDislikeExplanation(event.target.value)}
              placeholder="Examples: it ignored my equipment, changed the wrong day, made up exercises, or didn’t schedule anything."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => {
              setDislikeTarget(null);
              setDislikeExplanation("");
            }}
            disabled={submittingDislike}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={submitDislikeFeedback}
            disabled={!dislikeExplanation.trim() || submittingDislike}
          >
            {submittingDislike ? "Submitting..." : "Submit feedback"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
