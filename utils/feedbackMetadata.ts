import packageJson from "../package.json";
import { FeedbackDeviceType } from "./types";

const ADMIN_USERNAME = "grwyler";
const ADMIN_EMAIL = "grwyler@gmail.com";

const sanitizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const trimCommitSha = (value: string) => value.slice(0, 40);

const FOLDABLE_USER_AGENT_PATTERN =
  /\b(fold|pixel fold|sm-f9|surface duo|razr)\b/i;
const TABLET_USER_AGENT_PATTERN =
  /\b(ipad|tablet|nexus 7|nexus 9|sm-t|lenovo tab|kindle|silk)\b/i;

const isLikelyTouchDevice = ({
  touchPoints,
  userAgent,
}: {
  touchPoints?: number;
  userAgent?: string;
}) =>
  typeof touchPoints === "number"
    ? touchPoints > 0
    : /\b(android|iphone|ipad|mobile|tablet|touch)\b/i.test(userAgent || "");

export const classifyClientDeviceType = ({
  width,
  userAgent,
  touchPoints,
}: {
  width?: number;
  userAgent?: string;
  touchPoints?: number;
}): FeedbackDeviceType => {
  const normalizedUserAgent = sanitizeText(userAgent);
  const normalizedWidth = Number.isFinite(width) ? Number(width) : 0;
  const isTouchDevice = isLikelyTouchDevice({
    touchPoints,
    userAgent: normalizedUserAgent,
  });
  const isAndroidDevice = /\bandroid\b/i.test(normalizedUserAgent);

  if (FOLDABLE_USER_AGENT_PATTERN.test(normalizedUserAgent)) {
    return "foldable";
  }

  if (TABLET_USER_AGENT_PATTERN.test(normalizedUserAgent)) {
    return "tablet";
  }

  if (
    isAndroidDevice &&
    isTouchDevice &&
    normalizedWidth >= 600 &&
    normalizedWidth < 1280
  ) {
    return "tablet";
  }

  if (
    /\b(iphone|ipod|mobile)\b/i.test(normalizedUserAgent) ||
    (isTouchDevice && normalizedWidth > 0 && normalizedWidth < 600)
  ) {
    return "mobile";
  }

  if (normalizedWidth >= 1280 && !isTouchDevice) {
    return "desktop";
  }

  if (normalizedWidth >= 768 && isTouchDevice) {
    return "tablet";
  }

  if (normalizedWidth >= 600) {
    return "desktop";
  }

  if (normalizedWidth > 0) {
    return "mobile";
  }

  return "unknown";
};

export const getReporterRole = ({
  username,
  email,
}: {
  username?: string;
  email?: string;
}) => {
  const normalizedUsername = sanitizeText(username).toLowerCase();
  const normalizedEmail = sanitizeText(email).toLowerCase();

  if (
    normalizedUsername === ADMIN_USERNAME ||
    normalizedEmail === ADMIN_EMAIL
  ) {
    return "admin" as const;
  }

  if (normalizedUsername || normalizedEmail) {
    return "user" as const;
  }

  return undefined;
};

export const getAppBuildMetadata = () => {
  const appVersion =
    sanitizeText(process.env.NEXT_PUBLIC_APP_VERSION) ||
    sanitizeText(packageJson.version);
  const commitSha = trimCommitSha(
    sanitizeText(
      process.env.NEXT_PUBLIC_COMMIT_SHA ||
        process.env.VERCEL_GIT_COMMIT_SHA ||
        process.env.GIT_COMMIT_SHA
    )
  );
  const environment = sanitizeText(
    process.env.NEXT_PUBLIC_ENV || process.env.NODE_ENV
  );

  return {
    appVersion: appVersion || undefined,
    commitSha: commitSha || undefined,
    environment: environment || undefined,
  };
};

export const getClientRuntimeContext = (route?: string) => {
  const currentRoute =
    sanitizeText(route) ||
    (typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : "");
  const viewport =
    typeof window !== "undefined" &&
    Number.isFinite(window.innerWidth) &&
    Number.isFinite(window.innerHeight)
      ? {
          width: window.innerWidth,
          height: window.innerHeight,
        }
      : undefined;
  const userAgent =
    typeof navigator !== "undefined" ? sanitizeText(navigator.userAgent) : "";
  const online =
    typeof navigator !== "undefined" &&
    typeof navigator.onLine === "boolean"
      ? navigator.onLine
      : undefined;

  return {
    ...getAppBuildMetadata(),
    route: currentRoute || undefined,
    userAgent: userAgent || undefined,
    viewport,
    online,
  };
};

export const getClientDeviceType = () =>
  classifyClientDeviceType({
    width: typeof window !== "undefined" ? window.innerWidth : undefined,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    touchPoints:
      typeof navigator !== "undefined" ? navigator.maxTouchPoints : undefined,
  });
