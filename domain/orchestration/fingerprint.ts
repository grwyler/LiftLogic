import crypto from "crypto";
import { NormalizedProjectInput, NormalizedSignalInput } from "./types";

const canonicalize = (value?: string) =>
  (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const buildSignalFingerprint = ({
  project,
  signal,
}: {
  project: NormalizedProjectInput;
  signal: NormalizedSignalInput;
}) => {
  const title = canonicalize(signal.title);
  const location = canonicalize(signal.location);
  const descriptionFallback = canonicalize(signal.description).slice(0, 96);
  const fingerprintBasis = [
    project.slug,
    signal.type,
    title,
    location || descriptionFallback,
  ].join("|");
  const digest = crypto
    .createHash("sha256")
    .update(fingerprintBasis)
    .digest("hex")
    .slice(0, 16);

  return `sig_${digest}`;
};
