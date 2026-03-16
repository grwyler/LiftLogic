import React from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { alpha, keyframes } from "@mui/system";

const laneSweep = keyframes`
  0% {
    transform: translateX(-24%) scaleX(0.92);
    opacity: 0.42;
  }
  50% {
    transform: translateX(24%) scaleX(1.04);
    opacity: 1;
  }
  100% {
    transform: translateX(-24%) scaleX(0.92);
    opacity: 0.42;
  }
`;

const setRise = keyframes`
  0%,
  100% {
    transform: translateY(0px) scale(0.96);
    opacity: 0.45;
  }
  40% {
    transform: translateY(-12px) scale(1);
    opacity: 1;
  }
  70% {
    transform: translateY(-6px) scale(0.98);
    opacity: 0.8;
  }
`;

const haloPulse = keyframes`
  0%,
  100% {
    transform: scale(0.92);
    opacity: 0.28;
  }
  50% {
    transform: scale(1.06);
    opacity: 0.72;
  }
`;

const shimmerText = keyframes`
  0%,
  100% {
    opacity: 0.58;
    letter-spacing: 0.16em;
  }
  50% {
    opacity: 1;
    letter-spacing: 0.2em;
  }
`;

const LoadingIndicator = () => {
  const theme = useTheme();
  const darkMode = theme.palette.mode === "dark";
  const panelBackground = darkMode
    ? "linear-gradient(180deg, rgba(15,23,42,0.86) 0%, rgba(15,23,42,0.62) 100%)"
    : "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(248,250,252,0.86) 100%)";

  const setTint = darkMode
    ? alpha(theme.palette.primary.light, 0.82)
    : alpha(theme.palette.primary.main, 0.92);
  const accentTint = darkMode
    ? alpha(theme.palette.secondary.light, 0.62)
    : alpha(theme.palette.secondary.main, 0.34);

  return (
    <Box
      sx={{
        minHeight: "52vh",
        display: "grid",
        placeItems: "center",
        px: 2,
        py: 4,
      }}
    >
      <Box
        sx={{
          width: "min(100%, 360px)",
          p: { xs: 2.5, sm: 3 },
          borderRadius: 3,
          border: "1px solid",
          borderColor: darkMode
            ? "rgba(148,163,184,0.16)"
            : "rgba(15,23,42,0.08)",
          background: panelBackground,
          boxShadow: darkMode
            ? "0 22px 48px rgba(2,6,23,0.28)"
            : "0 22px 44px rgba(15,23,42,0.1)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: "10% 12%",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${alpha(
              theme.palette.primary.main,
              darkMode ? 0.18 : 0.14
            )} 0%, transparent 68%)`,
            animation: `${haloPulse} 2.8s ease-in-out infinite`,
            pointerEvents: "none",
          }}
        />

        <Typography
          variant="overline"
          sx={{
            display: "block",
            textAlign: "center",
            color: "text.secondary",
            letterSpacing: "0.18em",
            animation: `${shimmerText} 2.2s ease-in-out infinite`,
          }}
        >
          Building Today&apos;s Session
        </Typography>

        <Box
          sx={{
            mt: 2.5,
            position: "relative",
            height: 124,
            display: "grid",
            placeItems: "center",
          }}
        >
          <Box
            sx={{
              width: "82%",
              height: 14,
              borderRadius: 999,
              backgroundColor: darkMode
                ? "rgba(148,163,184,0.12)"
                : "rgba(148,163,184,0.16)",
              overflow: "hidden",
              position: "absolute",
              bottom: 18,
            }}
          >
            <Box
              sx={{
                width: "54%",
                height: "100%",
                marginInline: "auto",
                borderRadius: 999,
                background: `linear-gradient(90deg, ${accentTint} 0%, ${setTint} 50%, ${accentTint} 100%)`,
                animation: `${laneSweep} 1.9s ease-in-out infinite`,
                filter: "blur(0.2px)",
              }}
            />
          </Box>

          {[0, 1, 2].map((index) => (
            <Box
              key={index}
              sx={{
                position: "absolute",
                bottom: 26,
                left: `${22 + index * 22}%`,
                width: { xs: 42, sm: 48 },
                height: { xs: 56, sm: 64 },
                borderRadius: 2.25,
                border: "1px solid",
                borderColor: darkMode
                  ? "rgba(148,163,184,0.18)"
                  : "rgba(15,23,42,0.08)",
                background: darkMode
                  ? `linear-gradient(180deg, ${alpha(
                      theme.palette.primary.light,
                      0.16
                    )} 0%, rgba(15,23,42,0.92) 100%)`
                  : `linear-gradient(180deg, ${alpha(
                      theme.palette.primary.light,
                      0.2
                    )} 0%, rgba(255,255,255,0.98) 100%)`,
                boxShadow: `0 10px 24px ${alpha(
                  theme.palette.primary.main,
                  darkMode ? 0.18 : 0.1
                )}`,
                animation: `${setRise} 1.5s ease-in-out infinite`,
                animationDelay: `${index * 0.18}s`,
                display: "grid",
                placeItems: "center",
              }}
            >
              <Box
                sx={{
                  width: "54%",
                  height: 5,
                  borderRadius: 999,
                  backgroundColor: setTint,
                  boxShadow: `0 0 18px ${alpha(
                    theme.palette.primary.main,
                    darkMode ? 0.34 : 0.18
                  )}`,
                }}
              />
            </Box>
          ))}
        </Box>

        <Typography
          sx={{
            mt: 1.5,
            textAlign: "center",
            color: "text.secondary",
            maxWidth: 260,
            mx: "auto",
          }}
        >
          Syncing your plan, progress, and next lift.
        </Typography>
      </Box>
    </Box>
  );
};

export default LoadingIndicator;
