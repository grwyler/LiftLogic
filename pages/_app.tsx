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
import Head from "next/head";
import { Instrument_Sans, Manrope } from "next/font/google";
import { ToastContainer } from "react-toastify";
import DevBugRecorder from "../components/DevBugRecorder";
import AutomaticBugReporter from "../components/AutomaticBugReporter";
import AppVersionBadge from "../components/AppVersionBadge";
import {
  AppearanceDensity,
  InterfaceScale,
  getThemePreferenceMeta,
  isAppearanceDensity,
  isInterfaceScale,
  isThemePreference,
  ThemePreference,
} from "../utils/themePreferences";

const DESKTOP_BACKGROUND_ATTACHMENT_MEDIA_QUERY =
  "@media (min-width:900px) and (pointer:fine)";
const OVERLAY_KEYBOARD_OFFSET_CSS_VAR = "--liftlogic-keyboard-offset";
const STALE_ASSET_RECOVERY_KEY = "liftlogic-stale-asset-recovery-at";
const STALE_ASSET_RECOVERY_WINDOW_MS = 30_000;

const getAssetSourceFromEventTarget = (target: EventTarget | null) => {
  if (!target || typeof target !== "object") {
    return "";
  }

  const candidate = target as {
    src?: unknown;
    href?: unknown;
    currentSrc?: unknown;
    tagName?: unknown;
    getAttribute?: (name: string) => string | null;
  };

  return String(
    candidate.currentSrc ??
      candidate.src ??
      candidate.href ??
      candidate.getAttribute?.("src") ??
      candidate.getAttribute?.("href") ??
      ""
  );
};

const isStaleAssetLoadError = (value: unknown) => {
  if (!value) {
    return false;
  }

  const message =
    typeof value === "string"
      ? value
      : value instanceof Error
      ? value.message
      : typeof value === "object" && "message" in value
      ? String((value as { message?: unknown }).message ?? "")
      : "";

  const name =
    value instanceof Error
      ? value.name
      : typeof value === "object" && value && "name" in value
      ? String((value as { name?: unknown }).name ?? "")
      : "";

  const source =
    typeof value === "object" && value
      ? String(
          (value as { source?: unknown; filename?: unknown }).source ??
            (value as { source?: unknown; filename?: unknown }).filename ??
            ""
        )
      : "";

  return (
    name === "ChunkLoadError" ||
    message.includes("Loading chunk") ||
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Failed to load resource") ||
    source.includes("/_next/static/") ||
    message.includes("/_next/static/")
  );
};

const clearLiftLogicCaches = async () => {
  if (typeof window === "undefined" || !("caches" in window)) {
    return;
  }

  const cacheKeys = await window.caches.keys();
  await Promise.all(
    cacheKeys
      .filter((key) => key.startsWith("lift-logic-"))
      .map((key) => window.caches.delete(key))
  );
};

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});
const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
});

function MyApp({ Component, pageProps }: AppProps) {
  const [themePreference, setThemePreference] = useState<ThemePreference>("light");
  const [appearanceDensity, setAppearanceDensity] =
    useState<AppearanceDensity>("comfortable");
  const [interfaceScale, setInterfaceScale] = useState<InterfaceScale>("normal");
  const themeMeta = getThemePreferenceMeta(themePreference);
  const darkMode = themeMeta.mode === "dark";
  const densityScale = appearanceDensity === "compact" ? 0.9 : 1;
  const interfaceScaleFactor = interfaceScale === "large" ? 1.08 : 1;
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

  const applyAppearanceDensity = useCallback(
    (
      value:
        | AppearanceDensity
        | ((previous: AppearanceDensity) => AppearanceDensity)
    ) => {
      setAppearanceDensity((previous) => {
        const nextValue = typeof value === "function" ? value(previous) : value;
        return isAppearanceDensity(nextValue) ? nextValue : previous;
      });
    },
    []
  );

  const applyInterfaceScale = useCallback(
    (value: InterfaceScale | ((previous: InterfaceScale) => InterfaceScale)) => {
      setInterfaceScale((previous) => {
        const nextValue = typeof value === "function" ? value(previous) : value;
        return isInterfaceScale(nextValue) ? nextValue : previous;
      });
    },
    []
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
            fontFamily: 'var(--font-body), "Instrument Sans", sans-serif',
            fontSize: 14 * interfaceScaleFactor,
            h3: {
              fontFamily: 'var(--font-display), "Manrope", sans-serif',
              fontWeight: 800,
            letterSpacing: "-0.05em",
          },
          h4: {
            fontFamily: 'var(--font-display), "Manrope", sans-serif',
            fontWeight: 800,
            letterSpacing: "-0.04em",
          },
          h5: {
            fontFamily: 'var(--font-display), "Manrope", sans-serif',
            fontWeight: 800,
            letterSpacing: "-0.03em",
          },
          h6: {
            fontFamily: 'var(--font-display), "Manrope", sans-serif',
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
                paddingInline: 14 * interfaceScaleFactor,
                minHeight: Math.round(42 * interfaceScaleFactor * densityScale),
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
                padding: 4 * densityScale,
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
                paddingInline: 16 * interfaceScaleFactor,
                minHeight: Math.round(44 * interfaceScaleFactor * densityScale),
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
                  minHeight: Math.round(56 * interfaceScaleFactor * densityScale),
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
    [
      darkMode,
      densityScale,
      interfaceScaleFactor,
      softShadow,
      softSurface,
      softSurfaceHover,
      surfaceBorder,
      themeMeta,
    ]
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

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV === "test") {
      return;
    }

    const isSecureContextLike =
      window.location.protocol === "https:" || window.location.hostname === "localhost";

    if (!isSecureContextLike) {
      return;
    }

    const registerServiceWorker = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
      } catch (error) {
        console.error("Service worker registration failed:", error);
      }
    };

    void registerServiceWorker();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let cleanupTimer: number | null = window.setTimeout(() => {
      window.sessionStorage.removeItem(STALE_ASSET_RECOVERY_KEY);
    }, STALE_ASSET_RECOVERY_WINDOW_MS);

    const recoverFromStaleAssets = async () => {
      const previousAttempt = Number(
        window.sessionStorage.getItem(STALE_ASSET_RECOVERY_KEY) ?? "0"
      );
      const now = Date.now();

      if (Number.isFinite(previousAttempt) && now - previousAttempt < STALE_ASSET_RECOVERY_WINDOW_MS) {
        return;
      }

      window.sessionStorage.setItem(STALE_ASSET_RECOVERY_KEY, String(now));

      try {
        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.update()));
        }

        await clearLiftLogicCaches();
      } catch (error) {
        console.error("Failed to prepare stale-asset recovery:", error);
      }

      window.location.reload();
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isStaleAssetLoadError(event.reason)) {
        event.preventDefault();
        void recoverFromStaleAssets();
      }
    };

    const handleResourceLoadError = (event: Event) => {
      const target = event.target;
      const assetSource = getAssetSourceFromEventTarget(target);

      if (
        isStaleAssetLoadError(event) ||
        ((target instanceof HTMLScriptElement ||
          target instanceof HTMLLinkElement ||
          (typeof target === "object" &&
            target !== null &&
            "tagName" in target &&
            ["SCRIPT", "LINK"].includes(
              String((target as { tagName?: unknown }).tagName ?? "").toUpperCase()
            ))) &&
          assetSource.includes("/_next/static/"))
      ) {
        void recoverFromStaleAssets();
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleResourceLoadError, true);

    return () => {
      if (cleanupTimer) {
        window.clearTimeout(cleanupTimer);
        cleanupTimer = null;
      }

      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleResourceLoadError, true);
    };
  }, []);

  return (
    <SessionProvider session={pageProps.session}>
      <ThemeProvider theme={theme}>
        <div className={`${instrumentSans.variable} ${manrope.variable}`}>
        <Head>
          <title>Lift Logic</title>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, viewport-fit=cover"
          />
          <meta
            name="description"
            content="Adaptive workout planning and tracking with resilient Android home-screen support."
          />
          <meta name="theme-color" content={themeMeta.primaryMain} />
        </Head>
        <CssBaseline />
        <Component
          {...pageProps}
          darkMode={darkMode}
          setDarkMode={applyDarkMode}
          themePreference={themePreference}
          setThemePreference={applyThemePreference}
          appearanceDensity={appearanceDensity}
          setAppearanceDensity={applyAppearanceDensity}
          interfaceScale={interfaceScale}
          setInterfaceScale={applyInterfaceScale}
        />
        <AutomaticBugReporter />
        <AppVersionBadge />
        <ToastContainer
          position="bottom-center"
          autoClose={2500}
          toastClassName="liftlogic-toast"
        />
        {process.env.NODE_ENV !== "production" ? <DevBugRecorder /> : null}
        </div>
      </ThemeProvider>
    </SessionProvider>
  );
}

export default MyApp;
