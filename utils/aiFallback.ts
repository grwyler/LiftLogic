export type AIFallbackReason =
  | "quota_exhausted"
  | "unavailable"
  | "not_configured"
  | "unknown";

export type AIResponseSourceDetail = AIFallbackReason | "rule_based";

const buildErrorSummary = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const status = Number((error as { status?: unknown })?.status ?? 0);
  const code = String(
    (error as { code?: unknown })?.code ??
      (error as { error?: { code?: unknown } })?.error?.code ??
      ""
  );

  return {
    message: `${code} ${message}`.trim(),
    status,
  };
};

export const inferAIFallbackReason = (
  error: unknown,
  hasAIConfig: boolean
): AIFallbackReason => {
  if (!hasAIConfig) {
    return "not_configured";
  }

  const { message, status } = buildErrorSummary(error);

  if (
    status === 429 ||
    /quota|rate limit|insufficient_quota|too many requests/i.test(message)
  ) {
    return "quota_exhausted";
  }

  if (
    status >= 500 ||
    /temporarily unavailable|timeout|timed out|overloaded|network|ECONNRESET|ECONNREFUSED/i.test(
      message
    )
  ) {
    return "unavailable";
  }

  return "unknown";
};

export const getAIFallbackNotice = ({
  experience,
  sourceDetail,
}: {
  experience: "plan" | "coach";
  sourceDetail?: AIResponseSourceDetail;
}) => {
  const isCoach = experience === "coach";

  switch (sourceDetail) {
    case "quota_exhausted":
      return isCoach
        ? "The AI coach hit a quota limit, so this reply came from a simpler fallback assistant."
        : "AI workout generation hit a quota limit, so Lift Logic built a simpler fallback plan instead.";
    case "unavailable":
      return isCoach
        ? "The AI coach is temporarily unavailable, so this reply came from a simpler fallback assistant."
        : "AI workout generation is temporarily unavailable, so Lift Logic built a simpler fallback plan instead.";
    case "not_configured":
      return isCoach
        ? "AI coach responses are not configured right now, so this reply came from a simpler fallback assistant."
        : "AI workout generation is not configured right now, so Lift Logic built a simpler fallback plan instead.";
    case "unknown":
      return isCoach
        ? "The AI coach could not answer just now, so this reply came from a simpler fallback assistant."
        : "AI workout generation could not complete just now, so Lift Logic built a simpler fallback plan instead.";
    default:
      return "";
  }
};
