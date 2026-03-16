export const THEME_OPTIONS = ["light", "dawn", "night", "evergreen"] as const;

export type ThemePreference = (typeof THEME_OPTIONS)[number];

export const isThemePreference = (value: unknown): value is ThemePreference =>
  typeof value === "string" &&
  (THEME_OPTIONS as readonly string[]).includes(value);

export const getThemePreferenceMeta = (themePreference: ThemePreference) => {
  switch (themePreference) {
    case "dawn":
      return {
        mode: "light" as const,
        primaryMain: "#7c2d12",
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
          "linear-gradient(135deg, rgba(124, 45, 18, 0.96), rgba(180, 83, 9, 0.92))",
        containedHoverBackground:
          "linear-gradient(135deg, rgba(146, 64, 14, 0.98), rgba(194, 65, 12, 0.94))",
      };
    case "night":
      return {
        mode: "dark" as const,
        primaryMain: "#f8fafc",
        primaryContrastText: "#0f172a",
        secondaryMain: "#94a3b8",
        backgroundDefault: "#0b1220",
        backgroundPaper: "rgba(12, 18, 30, 0.92)",
        textPrimary: "#f8fafc",
        textSecondary: "#94a3b8",
        divider: "rgba(148, 163, 184, 0.12)",
        bodyBackground:
          "radial-gradient(circle at top left, rgba(125, 211, 252, 0.16), transparent 26%), radial-gradient(circle at top right, rgba(129, 140, 248, 0.16), transparent 24%), linear-gradient(180deg, #07111f 0%, #111827 100%)",
        containedBackground:
          "linear-gradient(135deg, rgba(248, 250, 252, 0.98), rgba(226, 232, 240, 0.94))",
        containedHoverBackground:
          "linear-gradient(135deg, rgba(255, 255, 255, 1), rgba(226, 232, 240, 0.94))",
      };
    case "evergreen":
      return {
        mode: "dark" as const,
        primaryMain: "#ecfdf5",
        primaryContrastText: "#022c22",
        secondaryMain: "#86efac",
        backgroundDefault: "#061612",
        backgroundPaper: "rgba(7, 24, 19, 0.92)",
        textPrimary: "#ecfdf5",
        textSecondary: "#9ad1be",
        divider: "rgba(110, 231, 183, 0.12)",
        bodyBackground:
          "radial-gradient(circle at top left, rgba(16, 185, 129, 0.18), transparent 24%), radial-gradient(circle at top right, rgba(45, 212, 191, 0.12), transparent 22%), linear-gradient(180deg, #03100d 0%, #0b1f18 100%)",
        containedBackground:
          "linear-gradient(135deg, rgba(236, 253, 245, 0.98), rgba(167, 243, 208, 0.92))",
        containedHoverBackground:
          "linear-gradient(135deg, rgba(255, 255, 255, 1), rgba(167, 243, 208, 0.94))",
      };
    case "light":
    default:
      return {
        mode: "light" as const,
        primaryMain: "#111827",
        primaryContrastText: "#ffffff",
        secondaryMain: "#6b7280",
        backgroundDefault: "#f4f7fb",
        backgroundPaper: "rgba(255, 255, 255, 0.94)",
        textPrimary: "#101828",
        textSecondary: "#667085",
        divider: "rgba(15, 23, 42, 0.08)",
        bodyBackground:
          "radial-gradient(circle at top left, rgba(125, 211, 252, 0.18), transparent 24%), radial-gradient(circle at top right, rgba(255, 255, 255, 0.92), transparent 32%), linear-gradient(180deg, #f8fbff 0%, #eaf1f8 100%)",
        containedBackground:
          "linear-gradient(135deg, rgba(17, 24, 39, 0.96), rgba(31, 41, 55, 0.94))",
        containedHoverBackground:
          "linear-gradient(135deg, rgba(31, 41, 55, 0.98), rgba(51, 65, 85, 0.96))",
      };
  }
};

export const getThemePreferenceLabel = (themePreference: ThemePreference) => {
  switch (themePreference) {
    case "dawn":
      return "Dawn";
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
      return "Warm glass highlights with a softer sunrise palette.";
    case "night":
      return "High-contrast dark surfaces with cool landing-page depth.";
    case "evergreen":
      return "A darker forest tone with calmer green accents.";
    case "light":
    default:
      return "The clean bright default with subtle sky-blue lift.";
  }
};
