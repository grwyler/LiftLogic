export const brandRadii = {
  panel: "28px",
  card: "24px",
  inset: "20px",
  button: "18px",
  chip: "999px",
} as const;

export const brandPalette = {
  signature: "#f97316",
  signatureDeep: "#c2410c",
  power: "#16a34a",
  powerSoft: "#86efac",
  ink: "#0f172a",
  mist: "#fff7ed",
} as const;

export const brandBackgrounds = {
  heroGlow:
    "radial-gradient(circle at top right, rgba(249,115,22,0.24) 0%, rgba(249,115,22,0) 46%), radial-gradient(circle at bottom left, rgba(34,197,94,0.18) 0%, rgba(34,197,94,0) 42%)",
  premiumPanel:
    "linear-gradient(145deg, rgba(255,247,237,0.94), rgba(255,255,255,0.98))",
  darkPremiumPanel:
    "linear-gradient(145deg, rgba(30,22,17,0.94), rgba(15,23,42,0.96))",
  accentBadge:
    "linear-gradient(135deg, rgba(249,115,22,0.96), rgba(34,197,94,0.88))",
} as const;
