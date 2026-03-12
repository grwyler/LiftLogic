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
        main: darkMode ? "#7cc4ff" : "#2563eb",
      },
      secondary: {
        main: darkMode ? "#9ccfd8" : "#0f766e",
      },
      background: {
        default: darkMode ? "#0b1220" : "#edf3fb",
        paper: darkMode ? "rgba(15, 23, 42, 0.86)" : "rgba(255, 255, 255, 0.82)",
      },
      text: {
        primary: darkMode ? "#e5eefc" : "#0f172a",
        secondary: darkMode ? "#9fb0cc" : "#475569",
      },
      divider: darkMode ? "rgba(148,163,184,0.2)" : "rgba(148,163,184,0.22)",
    },
    shape: {
      borderRadius: 18,
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
              ? "radial-gradient(circle at top, rgba(59, 130, 246, 0.22), transparent 24%), linear-gradient(180deg, #0b1220 0%, #0f172a 100%)"
              : "radial-gradient(circle at top, rgba(96, 165, 250, 0.26), transparent 28%), linear-gradient(180deg, #f8fbff 0%, #edf3fb 52%, #e2ebf8 100%)",
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
            borderRadius: 999,
            paddingInline: 16,
          },
          contained: {
            boxShadow: "0 12px 28px rgba(0,0,0,0.14)",
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
