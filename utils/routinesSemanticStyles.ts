type RoutineSemanticTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "premium"
  | "activeWorkout"
  | "primaryAction";

type RoutineSemanticSwatch = {
  solid: string;
  contrast: string;
  soft: string;
  border: string;
  text: string;
  darkSoft: string;
  darkBorder: string;
  darkText: string;
};

export const routinesSemanticColors: Record<
  RoutineSemanticTone,
  RoutineSemanticSwatch
> = {
  success: {
    solid: "#15803d",
    contrast: "#f0fdf4",
    soft: "#e9f9ef",
    border: "#93d3aa",
    text: "#166534",
    darkSoft: "rgba(34,197,94,0.16)",
    darkBorder: "rgba(74,222,128,0.28)",
    darkText: "#bbf7d0",
  },
  warning: {
    solid: "#b45309",
    contrast: "#fff7ed",
    soft: "#fff1df",
    border: "#f2bf7b",
    text: "#9a3412",
    darkSoft: "rgba(245,158,11,0.16)",
    darkBorder: "rgba(251,191,36,0.3)",
    darkText: "#fde68a",
  },
  danger: {
    solid: "#b91c1c",
    contrast: "#fef2f2",
    soft: "#fdecec",
    border: "#f1a4a4",
    text: "#991b1b",
    darkSoft: "rgba(239,68,68,0.16)",
    darkBorder: "rgba(248,113,113,0.3)",
    darkText: "#fecaca",
  },
  info: {
    solid: "#0f766e",
    contrast: "#ecfeff",
    soft: "#e4fbf8",
    border: "#86d8cf",
    text: "#115e59",
    darkSoft: "rgba(20,184,166,0.16)",
    darkBorder: "rgba(45,212,191,0.28)",
    darkText: "#99f6e4",
  },
  premium: {
    solid: "#b7791f",
    contrast: "#fff9eb",
    soft: "#fff4d8",
    border: "#e6be73",
    text: "#92400e",
    darkSoft: "rgba(245,158,11,0.18)",
    darkBorder: "rgba(251,191,36,0.32)",
    darkText: "#fde68a",
  },
  activeWorkout: {
    solid: "#2563eb",
    contrast: "#eff6ff",
    soft: "#e8f0ff",
    border: "#9ab9ff",
    text: "#1d4ed8",
    darkSoft: "rgba(59,130,246,0.2)",
    darkBorder: "rgba(96,165,250,0.34)",
    darkText: "#bfdbfe",
  },
  primaryAction: {
    solid: "#0f172a",
    contrast: "#f8fafc",
    soft: "#e8edf5",
    border: "#b7c4d8",
    text: "#0f172a",
    darkSoft: "rgba(148,163,184,0.14)",
    darkBorder: "rgba(148,163,184,0.28)",
    darkText: "#e2e8f0",
  },
};

const resolveSemanticColors = (tone: RoutineSemanticTone, darkMode = false) => {
  const swatch = routinesSemanticColors[tone];

  return {
    ...swatch,
    panel: darkMode ? swatch.darkSoft : swatch.soft,
    panelBorder: darkMode ? swatch.darkBorder : swatch.border,
    panelText: darkMode ? swatch.darkText : swatch.text,
  };
};

export const buildRoutineSemanticChipSx = (
  tone: RoutineSemanticTone,
  emphasis: "solid" | "outline" = "outline",
  darkMode = false
) => {
  const colors = resolveSemanticColors(tone, darkMode);

  if (emphasis === "solid") {
    return {
      backgroundColor: colors.solid,
      borderColor: colors.solid,
      color: colors.contrast,
      fontWeight: 700,
    };
  }

  return {
    backgroundColor: colors.panel,
    borderColor: colors.panelBorder,
    color: colors.panelText,
    fontWeight: 700,
  };
};

export const buildRoutineSemanticButtonSx = (
  tone: RoutineSemanticTone,
  variant: "contained" | "outlined" | "text" = "outlined",
  darkMode = false
) => {
  const colors = resolveSemanticColors(tone, darkMode);

  if (variant === "contained") {
    return {
      backgroundColor: colors.solid,
      color: colors.contrast,
      borderColor: colors.solid,
      "&:hover": {
        backgroundColor: colors.text,
        borderColor: colors.text,
      },
      "&.Mui-disabled": {
        backgroundColor: darkMode ? "rgba(148,163,184,0.16)" : "rgba(203,213,225,0.8)",
        color: darkMode ? "rgba(226,232,240,0.72)" : "rgba(71,85,105,0.75)",
      },
    };
  }

  if (variant === "text") {
    return {
      color: colors.solid,
      "&:hover": {
        backgroundColor: colors.panel,
      },
    };
  }

  return {
    color: colors.panelText,
    borderColor: colors.panelBorder,
    backgroundColor: colors.panel,
    "&:hover": {
      borderColor: colors.solid,
      backgroundColor: colors.panel,
    },
  };
};

export const buildRoutineSemanticPanelSx = (
  tone: RoutineSemanticTone,
  darkMode = false
) => {
  const colors = resolveSemanticColors(tone, darkMode);

  return {
    border: "1px solid",
    borderColor: colors.panelBorder,
    backgroundColor: colors.panel,
    color: colors.panelText,
  };
};

export const buildRoutineSemanticIconButtonSx = (
  tone: RoutineSemanticTone,
  active = true,
  darkMode = false
) => {
  const colors = resolveSemanticColors(tone, darkMode);

  return active
    ? {
        color: colors.solid,
        backgroundColor: colors.panel,
        "&:hover": {
          backgroundColor: colors.panel,
        },
      }
    : {
        color: darkMode ? "rgba(148,163,184,0.72)" : "rgba(100,116,139,0.86)",
      };
};

export const buildRoutineSemanticSelectableChipSx = (
  selected: boolean,
  darkMode = false
) =>
  selected
    ? buildRoutineSemanticChipSx("primaryAction", "solid", darkMode)
    : {
        fontWeight: 600,
        borderColor: darkMode
          ? "rgba(148,163,184,0.2)"
          : "rgba(148,163,184,0.48)",
        color: "text.primary",
        backgroundColor: darkMode
          ? "rgba(15,23,42,0.22)"
          : "rgba(255,255,255,0.9)",
      };

export const buildRoutineSemanticDotSx = (tone: RoutineSemanticTone) => ({
  width: 8,
  height: 8,
  borderRadius: "50%",
  backgroundColor: routinesSemanticColors[tone].solid,
});
