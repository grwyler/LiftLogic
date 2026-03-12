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

function MyApp({ Component, pageProps }: AppProps) {
  // Keep darkMode in state so it can be toggled globally
  const [darkMode, setDarkMode] = useState(false);

  // Create a theme that adapts to dark or light mode
  const theme = createTheme({
    palette: {
      mode: darkMode ? "dark" : "light",
      primary: {
        main: darkMode ? "#dbe7f5" : "#1f2937",
      },
      secondary: {
        main: darkMode ? "#94a3b8" : "#475569",
      },
      background: {
        default: darkMode ? "#0f1720" : "#f3f5f7",
        paper: darkMode ? "rgba(20, 27, 36, 0.92)" : "rgba(255, 255, 255, 0.94)",
      },
      text: {
        primary: darkMode ? "#e7edf4" : "#111827",
        secondary: darkMode ? "#95a3b8" : "#6b7280",
      },
      divider: darkMode ? "rgba(148,163,184,0.12)" : "rgba(17,24,39,0.08)",
    },
    shape: {
      borderRadius: 12,
    },
    typography: {
      fontFamily: '"Instrument Sans", sans-serif',
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
              ? "radial-gradient(circle at top, rgba(148, 163, 184, 0.08), transparent 24%), linear-gradient(180deg, #0f1720 0%, #111827 100%)"
              : "radial-gradient(circle at top, rgba(148, 163, 184, 0.08), transparent 26%), linear-gradient(180deg, #f7f7f6 0%, #eef1f4 100%)",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backdropFilter: "blur(18px)",
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 10,
            paddingInline: 14,
            minHeight: 40,
          },
          contained: {
            boxShadow: "none",
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            fontWeight: 600,
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: "outlined",
        },
      },
    },
  });

  return (
    <SessionProvider session={pageProps.session}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {/* Pass darkMode and setDarkMode as props to your pages */}
        <Component
          {...pageProps}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />
      </ThemeProvider>
    </SessionProvider>
  );
}

export default MyApp;
