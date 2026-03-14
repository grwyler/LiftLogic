"use client";

import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { submitFeedback } from "../utils/helpers";

type AutoBugReporterProps = {
  enabled?: boolean;
};

const MAX_AUTO_REPORTS = 8;
const DEDUPE_WINDOW_MS = 5 * 60 * 1000;
const OCCURRENCE_WINDOW_MS = 30 * 60 * 1000;

const stringifyDetail = (value: unknown): string | undefined => {
  if (value == null) {
    return undefined;
  }

  if (typeof value === "string") {
    return value.trim() || undefined;
  }

  if (value instanceof Error) {
    return [value.message, value.stack].filter(Boolean).join("\n");
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const truncate = (value: string, max = 4000) =>
  value.length <= max ? value : `${value.slice(0, max - 1)}...`;

const sanitizeTitle = (prefix: string, message: string) => {
  const normalized = message.replace(/\s+/g, " ").trim();
  return `${prefix}: ${normalized || "Unknown error"}`.slice(0, 180);
};

export default function AutomaticBugReporter({
  enabled = true,
}: AutoBugReporterProps) {
  const { data: session } = useSession() as {
    data:
      | {
          user?: { _id?: string; username?: string; email?: string };
          token?: { user?: { _id?: string; username?: string; email?: string } };
        }
      | null;
  };
  const router = useRouter();
  const inFlightRef = useRef(false);
  const sentFingerprintsRef = useRef<Map<string, number>>(new Map());
  const recentOccurrencesRef = useRef<Map<string, number[]>>(new Map());
  const sentCountRef = useRef(0);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    const userId =
      session?.user?._id || session?.token?.user?._id || "";
    const username =
      session?.user?.username || session?.token?.user?.username || "";
    const email = session?.user?.email || session?.token?.user?.email || "";

    if (!userId) {
      return;
    }

    const submitAutoBug = async ({
      titlePrefix,
      message,
      detail,
      severity = "medium",
      extraLines = [],
      minimumOccurrences = 1,
    }: {
      titlePrefix: string;
      message: string;
      detail?: string;
      severity?: "low" | "medium" | "high";
      extraLines?: string[];
      minimumOccurrences?: number;
    }) => {
      const normalizedMessage = (message || "Unknown error").trim();
      const fingerprint = `${titlePrefix}::${normalizedMessage}::${router.asPath}`;
      const now = Date.now();
      const previousOccurrences =
        recentOccurrencesRef.current.get(fingerprint)?.filter(
          (timestamp) => now - timestamp < OCCURRENCE_WINDOW_MS
        ) || [];
      const nextOccurrences = [...previousOccurrences, now];
      recentOccurrencesRef.current.set(fingerprint, nextOccurrences);

      if (nextOccurrences.length < minimumOccurrences) {
        return;
      }

      const previous = sentFingerprintsRef.current.get(fingerprint);

      if (
        previous &&
        now - previous < DEDUPE_WINDOW_MS
      ) {
        return;
      }

      if (inFlightRef.current || sentCountRef.current >= MAX_AUTO_REPORTS) {
        return;
      }

      sentFingerprintsRef.current.set(fingerprint, now);
      sentCountRef.current += 1;
      inFlightRef.current = true;

      try {
        const viewport =
          typeof window !== "undefined"
            ? `${window.innerWidth}x${window.innerHeight}`
            : "unknown";
        const description = truncate(
          [
            normalizedMessage,
            ...extraLines,
            detail ? `\nDetails\n${detail}` : "",
            `\nPath: ${router.asPath || window.location.pathname}`,
            `Viewport: ${viewport}`,
            `User agent: ${navigator.userAgent}`,
            `Online: ${navigator.onLine ? "yes" : "no"}`,
          ]
            .filter(Boolean)
            .join("\n")
        );

        await submitFeedback({
          userId,
          username: username || undefined,
          email: email || undefined,
          type: "bug",
          title: sanitizeTitle(titlePrefix, normalizedMessage),
          description,
          severity,
          page: router.asPath || window.location.pathname,
          deviceType: window.innerWidth < 900 ? "mobile" : "desktop",
        });
      } catch (error) {
        // Avoid recursive reporting loops.
        console.warn("Automatic bug reporter failed to submit feedback.", error);
      } finally {
        inFlightRef.current = false;
      }
    };

    const handleWindowError = (event: ErrorEvent) => {
      const target = event.target as HTMLElement | null;
      const resourceSource =
        target instanceof HTMLScriptElement
          ? target.src
          : target instanceof HTMLLinkElement
          ? target.href
          : target instanceof HTMLImageElement
          ? target.src
          : "";

      if (resourceSource) {
        void submitAutoBug({
          titlePrefix: "Resource load failure",
          message: `Failed to load resource: ${resourceSource}`,
          detail: stringifyDetail({
            tagName: target?.tagName,
            source: resourceSource,
            baseURI: document.baseURI,
          }),
          severity: "high",
          extraLines: ["This looks like a script or asset path failure."],
        });
        return;
      }

      const message = event.message || "Unhandled window error";
      void submitAutoBug({
        titlePrefix: "Unhandled client error",
        message,
        detail: stringifyDetail({
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
        }),
        severity: "high",
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        (reason instanceof Error && reason.message) ||
        (typeof reason === "string" ? reason : "Unhandled promise rejection");

      void submitAutoBug({
        titlePrefix: "Unhandled promise rejection",
        message,
        detail: stringifyDetail(reason),
        severity: "high",
      });
    };

    const shouldCaptureConsoleErrors = process.env.NODE_ENV !== "production";
    const originalConsoleError = console.error;

    if (shouldCaptureConsoleErrors) {
      console.error = (...args: unknown[]) => {
        originalConsoleError(...args);

        const message = args
          .map((arg) =>
            typeof arg === "string"
              ? arg
              : arg instanceof Error
              ? `${arg.message}\n${arg.stack || ""}`
              : stringifyDetail(arg) || ""
          )
          .filter(Boolean)
          .join(" ");

        if (
          !message ||
          /Automatic bug reporter failed to submit feedback|submitFeedback|\/api\/feedback|Feedback API error/i.test(
            message
          )
        ) {
          return;
        }

        void submitAutoBug({
          titlePrefix: "Console error",
          message: message.slice(0, 300),
          detail: message,
          severity: "medium",
          minimumOccurrences: 2,
        });
      };
    }

    window.addEventListener("error", handleWindowError, true);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      console.error = originalConsoleError;
      window.removeEventListener("error", handleWindowError, true);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, [enabled, router.asPath, session]);

  return null;
}
