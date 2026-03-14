"use client";

import React, { useEffect, useMemo, useState } from "react";
import { askWorkoutCoach } from "../utils/helpers";
import { SetupFormValues } from "../utils/profileSetup";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  Paper,
  Portal,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";

type ChatMessage = {
  id: string;
  role: "coach" | "user";
  text: string;
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
    exercises: string[];
  }>;
};

const buildInitialMessages = (coachResponse: CoachResponse): ChatMessage[] => {
  const messages: ChatMessage[] = [];

  if (coachResponse.openingMessage) {
    messages.push({
      id: "opening",
      role: "coach",
      text: coachResponse.openingMessage,
    });
  }

  messages.push({
    id: "follow-up",
    role: "coach",
    text: "If you want, ask me why I chose this split, how to adjust it, or what to do first.",
  });

  return messages;
};

export default function CoachChatPanel({
  coachResponse,
  profile,
  onDismiss,
  primaryActionLabel,
  onPrimaryAction,
  onApplyProfilePatch,
  onCoachAction,
}: {
  coachResponse: CoachResponse;
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

  const planDays = useMemo(
    () => coachResponse.planSnapshot ?? [],
    [coachResponse.planSnapshot]
  );

  useEffect(() => {
    setMessages(buildInitialMessages(coachResponse));
    setDraft("");
    setLoading(false);
    setPlanExpanded(false);
    setMinimized(false);
    setQuickReplies(coachResponse.suggestedReplies ?? []);
  }, [coachResponse]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const nextHistory = [
      ...messages,
      { id: `user-${Date.now()}`, role: "user" as const, text: trimmed },
    ];

    setMessages(nextHistory);
    setDraft("");
    setLoading(true);

    try {
      const response = await askWorkoutCoach({
        message: trimmed,
        history: nextHistory.map(({ role, text: messageText }) => ({
          role,
          text: messageText,
        })),
        profile,
        coachResponse,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `coach-${Date.now()}`,
          role: "coach",
          text: response.reply,
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
        },
      ]);
    } finally {
      setLoading(false);
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
                        {day.exercises.join(", ")}
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
    </Paper>
  );
}
