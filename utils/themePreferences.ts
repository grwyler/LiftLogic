import { brandBackgrounds, brandPalette } from "./brandSystem";

export const THEME_OPTIONS = [
  "light",
  "dawn",
  "night",
  "evergreen",
  "graphite",
  "ember",
  "citrus",
] as const;

export const APPEARANCE_DENSITY_OPTIONS = ["comfortable", "compact"] as const;
export const INTERFACE_SCALE_OPTIONS = ["normal", "large"] as const;

export type ThemePreference = (typeof THEME_OPTIONS)[number];
export type AppearanceDensity = (typeof APPEARANCE_DENSITY_OPTIONS)[number];
export type InterfaceScale = (typeof INTERFACE_SCALE_OPTIONS)[number];

export const isThemePreference = (value: unknown): value is ThemePreference =>
  typeof value === "string" &&
  (THEME_OPTIONS as readonly string[]).includes(value);

export const isAppearanceDensity = (value: unknown): value is AppearanceDensity =>
  typeof value === "string" &&
  (APPEARANCE_DENSITY_OPTIONS as readonly string[]).includes(value);

export const isInterfaceScale = (value: unknown): value is InterfaceScale =>
  typeof value === "string" &&
  (INTERFACE_SCALE_OPTIONS as readonly string[]).includes(value);

export const getThemePreferenceMeta = (themePreference: ThemePreference) => {
  switch (themePreference) {
    case "graphite":
      return {
        mode: "dark" as const,
        primaryMain: brandPalette.signature,
        primaryContrastText: "#fff7ed",
        secondaryMain: "#7dd3fc",
        backgroundDefault: "#101318",
        backgroundPaper: "rgba(20, 24, 31, 0.94)",
        textPrimary: "#f5f7fb",
        textSecondary: "#a9b4c3",
        divider: "rgba(148, 163, 184, 0.16)",
        bodyBackground:
          "radial-gradient(circle at top left, rgba(56, 189, 248, 0.14), transparent 24%), radial-gradient(circle at top right, rgba(249, 115, 22, 0.12), transparent 26%), linear-gradient(180deg, #0b1016 0%, #181e28 100%)",
        containedBackground: brandBackgrounds.accentButton,
        containedHoverBackground: brandBackgrounds.accentButtonHover,
      };
    case "ember":
      return {
        mode: "dark" as const,
        primaryMain: brandPalette.signature,
        primaryContrastText: "#fff7ed",
        secondaryMain: "#fb7185",
        backgroundDefault: "#1a0f0a",
        backgroundPaper: "rgba(34, 20, 14, 0.93)",
        textPrimary: "#fff7ed",
        textSecondary: "#fdba74",
        divider: "rgba(251, 146, 60, 0.16)",
        bodyBackground:
          "radial-gradient(circle at top left, rgba(249, 115, 22, 0.22), transparent 24%), radial-gradient(circle at top right, rgba(244, 63, 94, 0.14), transparent 24%), linear-gradient(180deg, #120804 0%, #26140d 100%)",
        containedBackground: brandBackgrounds.accentButton,
        containedHoverBackground: brandBackgrounds.accentButtonHover,
      };
    case "citrus":
      return {
        mode: "light" as const,
        primaryMain: brandPalette.signatureStrong,
        primaryContrastText: "#fff7ed",
        secondaryMain: "#65a30d",
        backgroundDefault: "#f8fde8",
        backgroundPaper: "rgba(251, 255, 240, 0.94)",
        textPrimary: "#1f2937",
        textSecondary: "#5f6b53",
        divider: "rgba(101, 163, 13, 0.14)",
        bodyBackground:
          "radial-gradient(circle at top left, rgba(163, 230, 53, 0.18), transparent 24%), radial-gradient(circle at top right, rgba(250, 204, 21, 0.16), transparent 26%), linear-gradient(180deg, #fbffe9 0%, #eef7d8 100%)",
        containedBackground:
          "linear-gradient(135deg, rgba(249, 115, 22, 0.96), rgba(132, 204, 22, 0.88))",
        containedHoverBackground:
          "linear-gradient(135deg, rgba(251, 146, 60, 0.98), rgba(101, 163, 13, 0.92))",
      };
    case "dawn":
      return {
        mode: "light" as const,
        primaryMain: brandPalette.signatureStrong,
        primaryContrastText: "#fff7ed",
        secondaryMain: "#b45309",
        backgroundDefault: "#fff8f1",
        backgroundPaper: "rgba(255, 251, 245, 0.94)",
        textPrimary: "#1f2937",
        textSecondary: "#7c6f64",
        divider: "rgba(124, 45, 18, 0.1)",
        bodyBackground:
          "radial-gradient(circle at top left, rgba(251, 191, 36, 0.18), transparent 24%), radial-gradient(circle at top right, rgba(251, 146, 60, 0.14), transparent 28%), linear-gradient(180deg, #fff8ef 0%, #f8ecdf 100%)",
        containedBackground:
          "linear-gradient(135deg, rgba(249, 115, 22, 0.96), rgba(180, 83, 9, 0.92))",
        containedHoverBackground:
          "linear-gradient(135deg, rgba(251, 146, 60, 0.98), rgba(194, 65, 12, 0.94))",
      };
    case "night":
      return {
        mode: "dark" as const,
        primaryMain: brandPalette.signature,
        primaryContrastText: "#fff7ed",
        secondaryMain: "#7dd3fc",
        backgroundDefault: "#0b1220",
        backgroundPaper: "rgba(12, 18, 30, 0.92)",
        textPrimary: "#f8fafc",
        textSecondary: "#94a3b8",
        divider: "rgba(148, 163, 184, 0.12)",
        bodyBackground:
          "radial-gradient(circle at top left, rgba(125, 211, 252, 0.16), transparent 26%), radial-gradient(circle at top right, rgba(129, 140, 248, 0.16), transparent 24%), linear-gradient(180deg, #07111f 0%, #111827 100%)",
        containedBackground: brandBackgrounds.accentButton,
        containedHoverBackground: brandBackgrounds.accentButtonHover,
      };
    case "evergreen":
      return {
        mode: "dark" as const,
        primaryMain: brandPalette.signature,
        primaryContrastText: "#fff7ed",
        secondaryMain: "#86efac",
        backgroundDefault: "#061612",
        backgroundPaper: "rgba(7, 24, 19, 0.92)",
        textPrimary: "#ecfdf5",
        textSecondary: "#9ad1be",
        divider: "rgba(110, 231, 183, 0.12)",
        bodyBackground:
          "radial-gradient(circle at top left, rgba(16, 185, 129, 0.18), transparent 24%), radial-gradient(circle at top right, rgba(45, 212, 191, 0.12), transparent 22%), linear-gradient(180deg, #03100d 0%, #0b1f18 100%)",
        containedBackground:
          "linear-gradient(135deg, rgba(249, 115, 22, 0.96), rgba(16, 185, 129, 0.86))",
        containedHoverBackground:
          "linear-gradient(135deg, rgba(251, 146, 60, 0.98), rgba(16, 185, 129, 0.9))",
      };
    case "light":
    default:
      return {
        mode: "light" as const,
        primaryMain: brandPalette.signatureStrong,
        primaryContrastText: "#ffffff",
        secondaryMain: brandPalette.sky,
        backgroundDefault: "#f7f1ea",
        backgroundPaper: "rgba(255, 255, 255, 0.97)",
        textPrimary: "#101828",
        textSecondary: "#475467",
        divider: "rgba(15, 23, 42, 0.14)",
        bodyBackground:
          "radial-gradient(circle at top left, rgba(249, 115, 22, 0.18), transparent 24%), radial-gradient(circle at top right, rgba(56, 189, 248, 0.14), transparent 28%), linear-gradient(180deg, #fffaf6 0%, #efe4d8 100%)",
        containedBackground: brandBackgrounds.accentButton,
        containedHoverBackground: brandBackgrounds.accentButtonHover,
      };
  }
};

export const getThemePreferenceLabel = (themePreference: ThemePreference) => {
  switch (themePreference) {
    case "dawn":
      return "Dawn";
    case "graphite":
      return "Graphite";
    case "ember":
      return "Ember";
    case "citrus":
      return "Citrus";
    case "night":
      return "Night";
    case "evergreen":
      return "Evergreen";
    case "light":
    default:
      return "Light";
  }
};

export const getThemePreferenceDescription = (
  themePreference: ThemePreference
) => {
  switch (themePreference) {
    case "dawn":
      return "A warm sunrise mood with Lift Logic's shared action color and softer copper surfaces.";
    case "graphite":
      return "A steel-dark preset with cooler surfaces and the same clear coaching hierarchy.";
    case "ember":
      return "A firelit dark preset that keeps warm energy without turning the UI into a novelty skin.";
    case "citrus":
      return "A brighter training-day palette with citrus energy and a shared Lift Logic accent.";
    case "night":
      return "The core dark preset: high contrast, steady neutrals, and obvious action emphasis.";
    case "evergreen":
      return "A calmer forest-toned dark preset with the same action grammar and recovery-friendly depth.";
    case "light":
    default:
      return "The default Lift Logic look with a warmer athletic accent and cleaner action hierarchy.";
  }
};

export const getAppearanceDensityLabel = (density: AppearanceDensity) =>
  density === "compact" ? "Compact" : "Comfortable";

export const getAppearanceDensityDescription = (density: AppearanceDensity) =>
  density === "compact"
    ? "Tighter spacing so more of each workout fits on screen."
    : "Roomier spacing for easier scanning and less visual pressure.";

export const getInterfaceScaleLabel = (scale: InterfaceScale) =>
  scale === "large" ? "Large text" : "Standard text";

export const getInterfaceScaleDescription = (scale: InterfaceScale) =>
  scale === "large"
    ? "Slightly larger text and controls for easier reading during workouts."
    : "The default balance of information density and readability.";
