export const brandRadii = {
  panel: "28px",
  card: "24px",
  inset: "20px",
  button: "18px",
  chip: "999px",
} as const;

export const brandPalette = {
  signature: "#f97316",
  signatureStrong: "#ea580c",
  signatureDeep: "#c2410c",
  signatureSoft: "#ffedd5",
  power: "#16a34a",
  powerSoft: "#86efac",
  sky: "#38bdf8",
  slate: "#334155",
  ink: "#0f172a",
  mist: "#fff7ed",
} as const;

export const brandAccentUsage = {
  primaryActions:
    "Use the signature orange gradient for the main CTA, the next-step workout action, and hero emphasis.",
  structure:
    "Use slate, ink, and neutral surfaces for layout, borders, and low-emphasis structure instead of defaulting them to the accent.",
  semanticSupport:
    "Keep success, warning, and informational states distinct from the signature accent so progress and system feedback stay readable.",
} as const;

export const brandBackgrounds = {
  heroGlow:
    "radial-gradient(circle at top right, rgba(249,115,22,0.24) 0%, rgba(249,115,22,0) 46%), radial-gradient(circle at bottom left, rgba(34,197,94,0.18) 0%, rgba(34,197,94,0) 42%)",
  premiumPanel:
    "linear-gradient(145deg, rgba(255,247,237,0.96), rgba(255,255,255,0.99))",
  darkPremiumPanel:
    "linear-gradient(145deg, rgba(39,23,15,0.94), rgba(15,23,42,0.96))",
  accentBadge:
    "linear-gradient(135deg, rgba(249,115,22,0.96), rgba(34,197,94,0.88))",
  accentButton:
    "linear-gradient(135deg, rgba(249,115,22,0.98), rgba(234,88,12,0.94))",
  accentButtonHover:
    "linear-gradient(135deg, rgba(251,146,60,1), rgba(234,88,12,0.96))",
} as const;
