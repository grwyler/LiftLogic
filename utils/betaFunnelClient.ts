const LANDING_CTA_STORAGE_KEY = "lift-logic:beta-funnel:landing-cta";
const LANDING_CTA_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const ANONYMOUS_FUNNEL_ID_STORAGE_KEY = "lift-logic:beta-funnel:anonymous-id";
const ANONYMOUS_FUNNEL_COOKIE_KEY = "liftlogic_funnel_id";
const MERGED_FUNNEL_ID_STORAGE_KEY = "lift-logic:beta-funnel:merged-id";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

type PendingLandingCta = {
  occurredAt: string;
  source?: string;
  anonymousFunnelId?: string;
};

const isBrowser = () => typeof window !== "undefined";

const persistCookie = (value: string) => {
  if (!isBrowser()) {
    return;
  }

  document.cookie = `${ANONYMOUS_FUNNEL_COOKIE_KEY}=${encodeURIComponent(
    value
  )}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
};

const generateAnonymousFunnelId = () =>
  `anon_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;

export const getOrCreateAnonymousFunnelId = () => {
  if (!isBrowser()) {
    return "";
  }

  const existing = window.localStorage.getItem(ANONYMOUS_FUNNEL_ID_STORAGE_KEY)?.trim();
  if (existing) {
    persistCookie(existing);
    return existing;
  }

  const nextId = generateAnonymousFunnelId();
  window.localStorage.setItem(ANONYMOUS_FUNNEL_ID_STORAGE_KEY, nextId);
  persistCookie(nextId);
  return nextId;
};

export const readAnonymousFunnelId = () => {
  if (!isBrowser()) {
    return "";
  }

  const storedValue = window.localStorage
    .getItem(ANONYMOUS_FUNNEL_ID_STORAGE_KEY)
    ?.trim();

  if (storedValue) {
    persistCookie(storedValue);
    return storedValue;
  }

  return "";
};

export const rememberAnonymousFunnelMerged = (anonymousFunnelId: string) => {
  if (!isBrowser() || !anonymousFunnelId.trim()) {
    return;
  }

  window.localStorage.setItem(MERGED_FUNNEL_ID_STORAGE_KEY, anonymousFunnelId.trim());
};

export const shouldMergeAnonymousFunnel = () => {
  if (!isBrowser()) {
    return false;
  }

  const anonymousFunnelId = window.localStorage
    .getItem(ANONYMOUS_FUNNEL_ID_STORAGE_KEY)
    ?.trim();
  const mergedFunnelId = window.localStorage
    .getItem(MERGED_FUNNEL_ID_STORAGE_KEY)
    ?.trim();

  return Boolean(anonymousFunnelId && anonymousFunnelId !== mergedFunnelId);
};

export const rememberLandingCta = (
  occurredAt = new Date(),
  source = "landing_cta"
) => {
  if (!isBrowser()) {
    return;
  }

  const anonymousFunnelId = getOrCreateAnonymousFunnelId();
  window.localStorage.setItem(
    LANDING_CTA_STORAGE_KEY,
    JSON.stringify({
      occurredAt: occurredAt.toISOString(),
      source,
      anonymousFunnelId,
    } satisfies PendingLandingCta)
  );
};

export const readPendingLandingCta = () => {
  if (!isBrowser()) {
    return null;
  }

  const rawValue = window.localStorage.getItem(LANDING_CTA_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as PendingLandingCta;
    const parsedDate = new Date(parsedValue.occurredAt);
    if (Number.isNaN(parsedDate.getTime())) {
      window.localStorage.removeItem(LANDING_CTA_STORAGE_KEY);
      return null;
    }

    if (Date.now() - parsedDate.getTime() > LANDING_CTA_MAX_AGE_MS) {
      window.localStorage.removeItem(LANDING_CTA_STORAGE_KEY);
      return null;
    }

    return {
      occurredAt: parsedDate.toISOString(),
      source: typeof parsedValue.source === "string" ? parsedValue.source : undefined,
      anonymousFunnelId:
        typeof parsedValue.anonymousFunnelId === "string"
          ? parsedValue.anonymousFunnelId.trim() || undefined
          : undefined,
    };
  } catch {
    const parsedDate = new Date(rawValue);
    if (Number.isNaN(parsedDate.getTime())) {
      window.localStorage.removeItem(LANDING_CTA_STORAGE_KEY);
      return null;
    }

    return {
      occurredAt: parsedDate.toISOString(),
      source: undefined,
      anonymousFunnelId: undefined,
    };
  }
};

export const clearPendingLandingCta = () => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(LANDING_CTA_STORAGE_KEY);
};
