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
        main: darkMode ? "#f0b35f" : "#b86a1f",
      },
      secondary: {
        main: darkMode ? "#8fb8ff" : "#315ea8",
      },
      background: {
        default: darkMode ? "#1b1612" : "#ece7de",
        paper: darkMode ? "rgba(38, 33, 28, 0.9)" : "rgba(255, 252, 247, 0.88)",
      },
      text: {
        primary: darkMode ? "#f8f3ec" : "#241b14",
        secondary: darkMode ? "#cbbcae" : "#69594a",
      },
      divider: darkMode ? "rgba(255,255,255,0.1)" : "rgba(73,54,36,0.12)",
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
              ? "radial-gradient(circle at top, rgba(240, 179, 95, 0.18), transparent 24%), linear-gradient(180deg, #1b1612 0%, #17120f 100%)"
              : "radial-gradient(circle at top, rgba(243, 156, 18, 0.2), transparent 30%), linear-gradient(180deg, #f5efe3 0%, #ece7de 48%, #e3dfd8 100%)",
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
