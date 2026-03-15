const LANDING_CTA_STORAGE_KEY = "lift-logic:beta-funnel:landing-cta";
const LANDING_CTA_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const isBrowser = () => typeof window !== "undefined";

export const rememberLandingCta = (occurredAt = new Date()) => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(
    LANDING_CTA_STORAGE_KEY,
    occurredAt.toISOString()
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

  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) {
    window.localStorage.removeItem(LANDING_CTA_STORAGE_KEY);
    return null;
  }

  if (Date.now() - parsed.getTime() > LANDING_CTA_MAX_AGE_MS) {
    window.localStorage.removeItem(LANDING_CTA_STORAGE_KEY);
    return null;
  }

  return parsed.toISOString();
};

export const clearPendingLandingCta = () => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(LANDING_CTA_STORAGE_KEY);
};
