// pages/_app.tsx
import "bootstrap/dist/css/bootstrap.min.css";
import { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import "../styles/global.css";
import "react-datepicker/dist/react-datepicker.css";
import "react-toastify/dist/ReactToastify.css";

import { useState } from "react";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { ToastContainer } from "react-toastify";
import DevBugRecorder from "../components/DevBugRecorder";
import AutomaticBugReporter from "../components/AutomaticBugReporter";
import AppVersionBadge from "../components/AppVersionBadge";

function MyApp({ Component, pageProps }: AppProps) {
  const [darkMode, setDarkMode] = useState(false);
  const glassBorder = darkMode
    ? "rgba(255, 255, 255, 0.14)"
    : "rgba(255, 255, 255, 0.72)";
  const glassSurface = darkMode
    ? "linear-gradient(135deg, rgba(20, 27, 45, 0.84), rgba(10, 16, 29, 0.68))"
    : "linear-gradient(135deg, rgba(255, 255, 255, 0.74), rgba(246, 250, 255, 0.54))";
  const glassSurfaceHover = darkMode
    ? "linear-gradient(135deg, rgba(25, 34, 56, 0.9), rgba(13, 20, 37, 0.76))"
    : "linear-gradient(135deg, rgba(255, 255, 255, 0.82), rgba(248, 251, 255, 0.64))";
  const glassInsetShadow = darkMode
    ? "inset 0 1px 0 rgba(255, 255, 255, 0.08)"
    : "inset 0 1px 0 rgba(255, 255, 255, 0.82)";
  const glassShadow = darkMode
    ? "0 22px 48px rgba(2, 6, 23, 0.34)"
    : "0 22px 48px rgba(148, 163, 184, 0.18)";

  const theme = createTheme({
    palette: {
      mode: darkMode ? "dark" : "light",
      primary: {
        main: darkMode ? "#f8fafc" : "#111827",
        contrastText: darkMode ? "#0f172a" : "#ffffff",
      },
      secondary: {
        main: darkMode ? "#94a3b8" : "#6b7280",
      },
      background: {
        default: darkMode ? "#0b1220" : "#f4f7fb",
        paper: darkMode ? "rgba(12, 18, 30, 0.92)" : "rgba(255, 255, 255, 0.94)",
      },
      text: {
        primary: darkMode ? "#f8fafc" : "#101828",
        secondary: darkMode ? "#94a3b8" : "#667085",
      },
      divider: darkMode ? "rgba(148, 163, 184, 0.12)" : "rgba(15, 23, 42, 0.08)",
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
            backgroundImage: darkMode
              ? "radial-gradient(circle at top left, rgba(125, 211, 252, 0.16), transparent 26%), radial-gradient(circle at top right, rgba(129, 140, 248, 0.16), transparent 24%), linear-gradient(180deg, #07111f 0%, #111827 100%)"
              : "radial-gradient(circle at top left, rgba(125, 211, 252, 0.18), transparent 24%), radial-gradient(circle at top right, rgba(255, 255, 255, 0.92), transparent 32%), linear-gradient(180deg, #f8fbff 0%, #eaf1f8 100%)",
            backgroundAttachment: "fixed",
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
            boxShadow: glassShadow,
            backgroundImage: darkMode
              ? "linear-gradient(135deg, rgba(248, 250, 252, 0.98), rgba(226, 232, 240, 0.92))"
              : "linear-gradient(135deg, rgba(17, 24, 39, 0.96), rgba(51, 65, 85, 0.92))",
            color: darkMode ? "#0f172a" : "#ffffff",
            border: `1px solid ${glassBorder}`,
            "&:hover": {
              backgroundImage: darkMode
                ? "linear-gradient(135deg, rgba(255, 255, 255, 1), rgba(226, 232, 240, 0.94))"
                : "linear-gradient(135deg, rgba(31, 41, 55, 0.98), rgba(51, 65, 85, 0.96))",
              boxShadow: glassShadow,
            },
          },
          outlined: {
            borderColor: glassBorder,
            backgroundImage: glassSurface,
            boxShadow: `${glassInsetShadow}, ${glassShadow}`,
            backdropFilter: "blur(20px) saturate(160%)",
            "&:hover": {
              borderColor: darkMode
                ? "rgba(255, 255, 255, 0.22)"
                : "rgba(255, 255, 255, 0.86)",
              backgroundImage: glassSurfaceHover,
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
            backgroundImage: glassSurface,
            backdropFilter: "blur(20px) saturate(150%)",
            boxShadow: `${glassInsetShadow}, 0 12px 30px rgba(15, 23, 42, ${
              darkMode ? "0.26" : "0.08"
            })`,
            color: darkMode ? "#f8fafc" : "#101828",
            border: `1px solid ${glassBorder}`,
          },
          filledPrimary: {
            backgroundImage: darkMode
              ? "linear-gradient(135deg, rgba(248, 250, 252, 0.98), rgba(226, 232, 240, 0.92))"
              : "linear-gradient(135deg, rgba(17, 24, 39, 0.96), rgba(51, 65, 85, 0.9))",
            color: darkMode ? "#0f172a" : "#ffffff",
          },
          outlinedPrimary: {
            borderColor: glassBorder,
            color: darkMode ? "#f8fafc" : "#111827",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: glassSurface,
            border: `1px solid ${glassBorder}`,
            backdropFilter: "blur(24px) saturate(170%)",
            boxShadow: `${glassInsetShadow}, ${glassShadow}`,
            position: "relative",
            overflow: "hidden",
          },
        },
      },
      MuiToggleButtonGroup: {
        styleOverrides: {
          root: {
            padding: 4,
            borderRadius: 18,
            border: `1px solid ${glassBorder}`,
            backgroundImage: glassSurface,
            backdropFilter: "blur(22px) saturate(160%)",
            boxShadow: `${glassInsetShadow}, ${glassShadow}`,
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
              boxShadow: glassInsetShadow,
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
              backgroundImage: glassSurface,
              backdropFilter: "blur(22px) saturate(165%)",
              boxShadow: `${glassInsetShadow}, 0 14px 34px rgba(15, 23, 42, ${
                darkMode ? "0.26" : "0.08"
              })`,
              "& fieldset": {
                borderColor: glassBorder,
              },
              "&:hover fieldset": {
                borderColor: darkMode
                  ? "rgba(255, 255, 255, 0.26)"
                  : "rgba(255, 255, 255, 0.86)",
              },
              "&.Mui-focused fieldset": {
                borderColor: darkMode ? "rgba(125, 211, 252, 0.82)" : "#60a5fa",
              },
            },
          },
        },
      },
    },
  });

  return (
    <SessionProvider session={pageProps.session}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Component
          {...pageProps}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />
        <AutomaticBugReporter />
        <AppVersionBadge />
        <ToastContainer position="bottom-center" autoClose={2500} />
        {process.env.NODE_ENV !== "production" ? <DevBugRecorder /> : null}
      </ThemeProvider>
    </SessionProvider>
  );
}

export default MyApp;
