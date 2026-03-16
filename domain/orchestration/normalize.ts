import {
  IngestSignalRequest,
  NormalizedProjectInput,
  NormalizedSignalInput,
  SignalReporter,
  SignalSeverity,
} from "./types";

const sanitizeText = (value: unknown) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const toTitleCase = (value: string) =>
  value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const normalizeSeverity = (value: unknown): SignalSeverity | undefined => {
  const normalized = sanitizeText(value).toLowerCase();

  if (normalized === "low" || normalized === "medium" || normalized === "high") {
    return normalized;
  }

  return undefined;
};

const normalizeReporter = (value: unknown): SignalReporter | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const reporter = value as Record<string, unknown>;
  const normalized = {
    id: sanitizeText(reporter.id) || undefined,
    name: sanitizeText(reporter.name) || undefined,
    email: sanitizeText(reporter.email) || undefined,
    type: sanitizeText(reporter.type) || undefined,
  };

  return Object.values(normalized).some(Boolean) ? normalized : undefined;
};

const normalizeCreatedAt = (value: unknown) => {
  const parsed = value ? new Date(value as string | Date) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

export const normalizeProjectInput = (
  request: IngestSignalRequest
): NormalizedProjectInput => {
  const slugSource =
    sanitizeText(request.project?.slug) || sanitizeText(request.project?.name);
  const slug = slugify(slugSource);

  if (!slug) {
    throw new Error("A project slug or name is required.");
  }

  const providedName = sanitizeText(request.project?.name);

  return {
    slug,
    name: providedName || toTitleCase(slug),
  };
};

export const normalizeSignalInput = (
  request: IngestSignalRequest
): NormalizedSignalInput => {
  const signal = request.signal ?? {};
  const source = sanitizeText(signal.source).toLowerCase();
  const type = slugify(sanitizeText(signal.type));
  const title = sanitizeText(signal.title);
  const description = sanitizeText(signal.description) || undefined;
  const runtimeContext =
    signal.runtimeContext && typeof signal.runtimeContext === "object"
      ? { ...signal.runtimeContext }
      : undefined;
  const normalizedEnvironment =
    sanitizeText(signal.environment) ||
    sanitizeText(runtimeContext?.environment) ||
    undefined;
  const evidence =
    signal.evidence && typeof signal.evidence === "object"
      ? { ...signal.evidence }
      : {};

  if (!source) {
    throw new Error("Signal source is required.");
  }

  if (!type) {
    throw new Error("Signal type is required.");
  }

  if (!title) {
    throw new Error("Signal title is required.");
  }

  return {
    source,
    type,
    title,
    description,
    severity: normalizeSeverity(signal.severity),
    environment: normalizedEnvironment,
    location: sanitizeText(signal.location) || undefined,
    runtimeContext: runtimeContext
      ? {
          ...runtimeContext,
          environment: normalizedEnvironment,
        }
      : normalizedEnvironment
      ? { environment: normalizedEnvironment }
      : undefined,
    evidence,
    reporter: normalizeReporter(signal.reporter),
    createdAt: normalizeCreatedAt(signal.createdAt),
  };
};
