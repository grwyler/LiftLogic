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
      borderRadius: 8,
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
              ? "radial-gradient(circle at top, rgba(59, 130, 246, 0.1), transparent 28%), linear-gradient(180deg, #0b1220 0%, #111827 100%)"
              : "radial-gradient(circle at top, rgba(148, 163, 184, 0.12), transparent 26%), linear-gradient(180deg, #f8fbff 0%, #eef3f8 100%)",
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 8,
            paddingInline: 14,
            minHeight: 42,
            fontWeight: 700,
          },
          contained: {
            boxShadow: "none",
            backgroundImage: "none",
            backgroundColor: darkMode ? "#f8fafc" : "#111827",
            color: darkMode ? "#0f172a" : "#ffffff",
            "&:hover": {
              backgroundColor: darkMode ? "#e2e8f0" : "#1f2937",
              boxShadow: "none",
            },
          },
          outlined: {
            borderColor: darkMode
              ? "rgba(148, 163, 184, 0.18)"
              : "rgba(15, 23, 42, 0.12)",
            backgroundColor: darkMode
              ? "rgba(255,255,255,0.02)"
              : "rgba(255,255,255,0.55)",
            "&:hover": {
              borderColor: darkMode
                ? "rgba(148, 163, 184, 0.28)"
                : "rgba(15, 23, 42, 0.2)",
              backgroundColor: darkMode
                ? "rgba(255,255,255,0.04)"
                : "rgba(255,255,255,0.72)",
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
            borderRadius: 7,
            fontWeight: 700,
            backgroundColor: darkMode
              ? "rgba(255,255,255,0.05)"
              : "rgba(255,255,255,0.72)",
            color: darkMode ? "#f8fafc" : "#101828",
          },
          filledPrimary: {
            backgroundColor: darkMode ? "#f8fafc" : "#111827",
            color: darkMode ? "#0f172a" : "#ffffff",
          },
          outlinedPrimary: {
            borderColor: darkMode
              ? "rgba(248, 250, 252, 0.48)"
              : "rgba(17, 24, 39, 0.24)",
            color: darkMode ? "#f8fafc" : "#111827",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backdropFilter: "blur(18px)",
            boxShadow: darkMode
              ? "0 16px 44px rgba(2, 6, 23, 0.28)"
              : "0 18px 42px rgba(15, 23, 42, 0.08)",
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
              borderRadius: 8,
              backgroundColor: darkMode
                ? "rgba(255,255,255,0.03)"
                : "rgba(255,255,255,0.8)",
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
