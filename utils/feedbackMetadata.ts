import packageJson from "../package.json";

const ADMIN_USERNAME = "grwyler";
const ADMIN_EMAIL = "grwyler@gmail.com";

const sanitizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const trimCommitSha = (value: string) => value.slice(0, 40);

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
