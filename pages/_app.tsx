// pages/_app.tsx
import "bootstrap/dist/css/bootstrap.min.css";
import { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import "../styles/global.css";
import "react-datepicker/dist/react-datepicker.css";
import "react-toastify/dist/ReactToastify.css";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { ToastContainer } from "react-toastify";
import DevBugRecorder from "../components/DevBugRecorder";
import AutomaticBugReporter from "../components/AutomaticBugReporter";
import AppVersionBadge from "../components/AppVersionBadge";
import {
  getThemePreferenceMeta,
  isThemePreference,
  ThemePreference,
} from "../utils/themePreferences";

const DESKTOP_BACKGROUND_ATTACHMENT_MEDIA_QUERY =
  "@media (min-width:900px) and (pointer:fine)";
const OVERLAY_KEYBOARD_OFFSET_CSS_VAR = "--liftlogic-keyboard-offset";

function MyApp({ Component, pageProps }: AppProps) {
  const [themePreference, setThemePreference] = useState<ThemePreference>("light");
  const themeMeta = getThemePreferenceMeta(themePreference);
  const darkMode = themeMeta.mode === "dark";
  const surfaceBorder = darkMode
    ? "rgba(148, 163, 184, 0.18)"
    : "rgba(15, 23, 42, 0.08)";
  const softSurface = darkMode
    ? "rgba(15, 23, 42, 0.72)"
    : "rgba(255, 255, 255, 0.9)";
  const softSurfaceHover = darkMode
    ? "rgba(30, 41, 59, 0.9)"
    : "rgba(255, 255, 255, 0.98)";
  const softShadow = darkMode
    ? "0 16px 36px rgba(2, 6, 23, 0.26)"
    : "0 12px 28px rgba(15, 23, 42, 0.08)";

  const applyThemePreference = useCallback(
    (value: ThemePreference | ((previous: ThemePreference) => ThemePreference)) => {
      setThemePreference((previous) => {
        const nextValue = typeof value === "function" ? value(previous) : value;
        return isThemePreference(nextValue) ? nextValue : previous;
      });
    },
    []
  );

  const applyDarkMode = useCallback(
    (value: boolean | ((previous: boolean) => boolean)) => {
      const nextDarkMode = typeof value === "function" ? value(darkMode) : value;
      applyThemePreference(nextDarkMode ? "night" : "light");
    },
    [applyThemePreference, darkMode]
  );

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: themeMeta.mode,
          primary: {
            main: themeMeta.primaryMain,
            contrastText: themeMeta.primaryContrastText,
          },
          secondary: {
            main: themeMeta.secondaryMain,
          },
          background: {
            default: themeMeta.backgroundDefault,
            paper: themeMeta.backgroundPaper,
          },
          text: {
            primary: themeMeta.textPrimary,
            secondary: themeMeta.textSecondary,
          },
          divider: themeMeta.divider,
        },
        shape: {
          borderRadius: 18,
        },
        typography: {
          fontFamily: '"Instrument Sans", sans-serif',
          h3: {
            fontFamily: '"Manrope", sans-serif',
            fontWeight: 800,
            letterSpacing: "-0.05em",
          },
          h4: {
            fontFamily: '"Manrope", sans-serif',
            fontWeight: 800,
            letterSpacing: "-0.04em",
          },
          h5: {
            fontFamily: '"Manrope", sans-serif',
            fontWeight: 800,
            letterSpacing: "-0.03em",
          },
          h6: {
            fontFamily: '"Manrope", sans-serif',
            fontWeight: 700,
            letterSpacing: "-0.02em",
          },
          button: {
            fontWeight: 700,
            textTransform: "none",
          },
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                backgroundImage: themeMeta.bodyBackground,
                backgroundAttachment: "scroll",
                [DESKTOP_BACKGROUND_ATTACHMENT_MEDIA_QUERY]: {
                  backgroundAttachment: "fixed",
                },
              },
            },
          },
          MuiButton: {
            defaultProps: {
              disableElevation: true,
            },
            styleOverrides: {
              root: {
                borderRadius: 16,
                paddingInline: 14,
                minHeight: 42,
                fontWeight: 700,
              },
              contained: {
                boxShadow: softShadow,
                backgroundImage: themeMeta.containedBackground,
                color: themeMeta.primaryContrastText,
                border: `1px solid ${surfaceBorder}`,
                "&:hover": {
                  backgroundImage: themeMeta.containedHoverBackground,
                  boxShadow: softShadow,
                },
              },
              outlined: {
                borderColor: surfaceBorder,
                backgroundColor: softSurface,
                "&:hover": {
                  borderColor: darkMode
                    ? "rgba(255, 255, 255, 0.22)"
                    : "rgba(15, 23, 42, 0.16)",
                  backgroundColor: softSurfaceHover,
                },
              },
              text: {
                "&:hover": {
                  backgroundColor: darkMode
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(15,23,42,0.04)",
                },
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                borderRadius: 999,
                fontWeight: 700,
                color: darkMode ? "#f8fafc" : "#101828",
                border: `1px solid ${surfaceBorder}`,
                backgroundColor: softSurface,
              },
              filledPrimary: {
                backgroundImage: darkMode
                  ? "linear-gradient(135deg, rgba(248, 250, 252, 0.98), rgba(226, 232, 240, 0.92))"
                  : "linear-gradient(135deg, rgba(17, 24, 39, 0.96), rgba(51, 65, 85, 0.9))",
                color: darkMode ? "#0f172a" : "#ffffff",
              },
              outlinedPrimary: {
                borderColor: surfaceBorder,
                color: darkMode ? "#f8fafc" : "#111827",
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: "none",
              },
            },
          },
          MuiToggleButtonGroup: {
            styleOverrides: {
              root: {
                padding: 4,
                borderRadius: 18,
                border: `1px solid ${surfaceBorder}`,
                backgroundColor: softSurface,
              },
              grouped: {
                margin: 0,
                border: 0,
              },
            },
          },
          MuiToggleButton: {
            styleOverrides: {
              root: {
                borderRadius: 14,
                paddingInline: 16,
                minHeight: 44,
                color: darkMode ? "#cbd5e1" : "#334155",
                "&.Mui-selected": {
                  color: darkMode ? "#f8fafc" : "#0f172a",
                  backgroundImage: darkMode
                    ? "linear-gradient(135deg, rgba(59, 130, 246, 0.18), rgba(255, 255, 255, 0.08))"
                    : "linear-gradient(135deg, rgba(255, 255, 255, 0.82), rgba(191, 219, 254, 0.58))",
                  boxShadow: "none",
                },
                "&.Mui-selected:hover": {
                  backgroundImage: darkMode
                    ? "linear-gradient(135deg, rgba(59, 130, 246, 0.24), rgba(255, 255, 255, 0.1))"
                    : "linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(191, 219, 254, 0.68))",
                },
              },
            },
          },
          MuiTextField: {
            defaultProps: {
              variant: "outlined",
            },
            styleOverrides: {
              root: {
                "& .MuiOutlinedInput-root": {
                  borderRadius: 16,
                  backgroundColor: softSurface,
                  "& fieldset": {
                    borderColor: surfaceBorder,
                  },
                  "&:hover fieldset": {
                    borderColor: darkMode
                      ? "rgba(255, 255, 255, 0.26)"
                      : "rgba(15, 23, 42, 0.16)",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: darkMode ? "rgba(125, 211, 252, 0.82)" : "#60a5fa",
                  },
                },
              },
            },
          },
        },
      }),
    [darkMode, softShadow, softSurface, softSurfaceHover, surfaceBorder, themeMeta]
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const rootStyle = document.documentElement.style;

    const updateKeyboardOffset = () => {
      const layoutViewportHeight = window.innerHeight || 0;
      const visualViewport = window.visualViewport;
      const visibleViewportHeight = visualViewport?.height ?? layoutViewportHeight;
      const viewportOffsetTop = visualViewport?.offsetTop ?? 0;
      const keyboardOffset = Math.max(
        0,
        Math.round(layoutViewportHeight - (visibleViewportHeight + viewportOffsetTop))
      );

      rootStyle.setProperty(OVERLAY_KEYBOARD_OFFSET_CSS_VAR, `${keyboardOffset}px`);
    };

    updateKeyboardOffset();
    window.addEventListener("resize", updateKeyboardOffset);
    window.visualViewport?.addEventListener("resize", updateKeyboardOffset);
    window.visualViewport?.addEventListener("scroll", updateKeyboardOffset);

    return () => {
      window.removeEventListener("resize", updateKeyboardOffset);
      window.visualViewport?.removeEventListener("resize", updateKeyboardOffset);
      window.visualViewport?.removeEventListener("scroll", updateKeyboardOffset);
      rootStyle.setProperty(OVERLAY_KEYBOARD_OFFSET_CSS_VAR, "0px");
    };
  }, []);

  return (
    <SessionProvider session={pageProps.session}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Component
          {...pageProps}
          darkMode={darkMode}
          setDarkMode={applyDarkMode}
          themePreference={themePreference}
          setThemePreference={applyThemePreference}
        />
        <AutomaticBugReporter />
        <AppVersionBadge />
        <ToastContainer
          position="bottom-center"
          autoClose={2500}
          toastClassName="liftlogic-toast"
        />
        {process.env.NODE_ENV !== "production" ? <DevBugRecorder /> : null}
      </ThemeProvider>
    </SessionProvider>
  );
}

export default MyApp;
