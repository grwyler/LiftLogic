import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Collapse,
  LinearProgress,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import TimerRoundedIcon from "@mui/icons-material/TimerRounded";
import CoffeeRoundedIcon from "@mui/icons-material/CoffeeRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import { formatTime } from "../utils/helpers";

type Props = {
  open: boolean;
  darkMode: boolean;
  exerciseName: string;
  initialSeconds: number;
  defaultRestSeconds: number;
  onClose: () => void;
  onSaveRest: (nextRest: number) => Promise<void>;
};

const RestTimerOverlay: React.FC<Props> = ({
  open,
  darkMode,
  exerciseName,
  initialSeconds,
  defaultRestSeconds,
  onClose,
  onSaveRest,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(initialSeconds > 0);
  const [restEditorValue, setRestEditorValue] = useState(
    String(defaultRestSeconds || 0)
  );
  const [savingRest, setSavingRest] = useState(false);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSecondsRemaining(initialSeconds);
    setIsActive(initialSeconds > 0);
    setRestEditorValue(String(defaultRestSeconds || 0));
    setShowAdvancedControls(false);
  }, [defaultRestSeconds, exerciseName, initialSeconds, open]);

  useEffect(() => {
    if (!open || !isActive || secondsRemaining <= 0) {
      return;
    }

    const interval = window.setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          setIsActive(false);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isActive, open, secondsRemaining]);

  const isFinished = secondsRemaining <= 0;
  const timerState = isFinished ? "finished" : isActive ? "running" : "paused";
  const progressValue =
    initialSeconds > 0
      ? Math.min(100, Math.max(0, (secondsRemaining / initialSeconds) * 100))
      : 0;

  const statePalette = {
    running: darkMode
      ? {
          accent: "#38bdf8",
          chipBg: "rgba(56,189,248,0.18)",
          chipColor: "#bae6fd",
          panelBg: "linear-gradient(135deg, rgba(8,47,73,0.96), rgba(15,23,42,0.96))",
          ring: "rgba(56,189,248,0.28)",
          track: "rgba(148,163,184,0.2)",
        }
      : {
          accent: "#0f766e",
          chipBg: "rgba(20,184,166,0.12)",
          chipColor: "#115e59",
          panelBg: "linear-gradient(135deg, rgba(240,253,250,0.98), rgba(236,253,245,0.98))",
          ring: "rgba(20,184,166,0.18)",
          track: "rgba(148,163,184,0.22)",
        },
    paused: darkMode
      ? {
          accent: "#f59e0b",
          chipBg: "rgba(245,158,11,0.18)",
          chipColor: "#fde68a",
          panelBg: "linear-gradient(135deg, rgba(69,26,3,0.92), rgba(15,23,42,0.96))",
          ring: "rgba(245,158,11,0.28)",
          track: "rgba(148,163,184,0.2)",
        }
      : {
          accent: "#b45309",
          chipBg: "rgba(245,158,11,0.12)",
          chipColor: "#92400e",
          panelBg: "linear-gradient(135deg, rgba(255,251,235,0.98), rgba(255,247,237,0.98))",
          ring: "rgba(245,158,11,0.18)",
          track: "rgba(148,163,184,0.22)",
        },
    finished: darkMode
      ? {
          accent: "#34d399",
          chipBg: "rgba(52,211,153,0.18)",
          chipColor: "#a7f3d0",
          panelBg: "linear-gradient(135deg, rgba(6,78,59,0.96), rgba(15,23,42,0.96))",
          ring: "rgba(52,211,153,0.28)",
          track: "rgba(148,163,184,0.2)",
        }
      : {
          accent: "#15803d",
          chipBg: "rgba(34,197,94,0.12)",
          chipColor: "#166534",
          panelBg: "linear-gradient(135deg, rgba(240,253,244,0.99), rgba(236,253,245,0.98))",
          ring: "rgba(34,197,94,0.18)",
          track: "rgba(148,163,184,0.22)",
        },
  }[timerState];

  const stateCopy = {
    running: {
      label: "Rest running",
      helper: "Recovery is in progress. Stay ready for the next lift.",
      icon: <TimerRoundedIcon sx={{ fontSize: 18 }} />,
    },
    paused: {
      label: "Rest paused",
      helper: "Timer is holding here until you resume it.",
      icon: <CoffeeRoundedIcon sx={{ fontSize: 18 }} />,
    },
    finished: {
      label: "Rest finished",
      helper: "You're cleared to lift again.",
      icon: <CheckCircleRoundedIcon sx={{ fontSize: 18 }} />,
    },
  }[timerState];

  const handlePause = () => setIsActive(false);

  const handleResume = () => {
    if (secondsRemaining > 0) {
      setIsActive(true);
    }
  };

  const handleAdjust = (delta: number) => {
    setSecondsRemaining((prev) => Math.max(0, prev + delta));
  };

  const handleSkip = () => {
    setIsActive(false);
    setSecondsRemaining(0);
    onClose();
  };

  const handleSaveRest = async () => {
    const nextRest = Math.max(0, Number(restEditorValue) || 0);

    try {
      setSavingRest(true);
      await onSaveRest(nextRest);
      setSecondsRemaining(nextRest);
      setIsActive(nextRest > 0);
    } finally {
      setSavingRest(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <Box
      sx={{
        position: "fixed",
        right: { xs: 12, sm: 20 },
        left: { xs: 12, sm: "auto" },
        bottom: {
          xs:
            "calc(86px + env(safe-area-inset-bottom, 0px) + var(--liftlogic-keyboard-offset, 0px))",
          sm: "calc(20px + env(safe-area-inset-bottom, 0px))",
        },
        zIndex: 1350,
        display: "flex",
        justifyContent: { xs: "stretch", sm: "flex-end" },
        pointerEvents: "none",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          pointerEvents: "auto",
          width: { xs: "100%", sm: 380 },
          p: { xs: 1.5, sm: 1.75 },
          borderRadius: 4,
          border: "1px solid",
          borderColor: darkMode
            ? "rgba(148,163,184,0.2)"
            : "rgba(15,23,42,0.1)",
          background: statePalette.panelBg,
          backdropFilter: "blur(18px)",
          boxShadow: darkMode
            ? "0 24px 54px rgba(2,6,23,0.5)"
            : "0 20px 48px rgba(15,23,42,0.18)",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Chip
            icon={stateCopy.icon}
            label={stateCopy.label}
            size="small"
            sx={{
              height: 30,
              borderRadius: 999,
              px: 0.75,
              fontWeight: 800,
              letterSpacing: "0.01em",
              backgroundColor: statePalette.chipBg,
              color: statePalette.chipColor,
              "& .MuiChip-icon": {
                color: statePalette.chipColor,
              },
            }}
          />

          <Button
            variant="text"
            size="small"
            startIcon={<TuneRoundedIcon />}
            onClick={() => setShowAdvancedControls((prev) => !prev)}
            sx={{
              flexShrink: 0,
              minWidth: "fit-content",
              color: darkMode ? "rgba(226,232,240,0.86)" : "rgba(15,23,42,0.72)",
            }}
          >
            {showAdvancedControls ? "Hide controls" : "Adjust rest"}
          </Button>
        </Box>

        <Box
          sx={{
            mt: 1.25,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "auto 1fr" },
            gap: 1.5,
            alignItems: "center",
          }}
        >
          <Box
            sx={{
              display: "grid",
              placeItems: "center",
              minWidth: { sm: 144 },
              minHeight: { xs: 110, sm: 132 },
              borderRadius: 3,
              border: "1px solid",
              borderColor: statePalette.ring,
              backgroundColor: darkMode
                ? "rgba(15,23,42,0.34)"
                : "rgba(255,255,255,0.66)",
              boxShadow: `inset 0 0 0 10px ${statePalette.ring}`,
            }}
          >
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: "3rem", sm: "3.5rem" },
                lineHeight: 0.95,
                letterSpacing: "-0.06em",
                fontWeight: 900,
                color: darkMode ? "#f8fafc" : "#0f172a",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatTime(secondsRemaining)}
            </Typography>
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="overline"
              sx={{
                color: darkMode
                  ? "rgba(191,219,254,0.76)"
                  : "rgba(15,23,42,0.58)",
                letterSpacing: "0.14em",
                fontWeight: 800,
              }}
            >
              Recovery HUD
            </Typography>
            <Typography
              variant="h6"
              sx={{
                mt: 0.35,
                lineHeight: 1.15,
                color: darkMode ? "#f8fafc" : "#0f172a",
              }}
            >
              {exerciseName}
            </Typography>
            <Typography
              sx={{
                mt: 0.6,
                color: darkMode
                  ? "rgba(226,232,240,0.82)"
                  : "rgba(15,23,42,0.7)",
                fontSize: "0.95rem",
              }}
            >
              {stateCopy.helper}
            </Typography>

            <LinearProgress
              variant="determinate"
              value={progressValue}
              sx={{
                mt: 1.25,
                height: 9,
                borderRadius: 999,
                backgroundColor: statePalette.track,
                "& .MuiLinearProgress-bar": {
                  borderRadius: 999,
                  backgroundColor: statePalette.accent,
                },
              }}
            />
          </Box>
        </Box>

        <Box
          sx={{
            mt: 1.5,
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          {isFinished ? (
            <Button
              variant="contained"
              startIcon={<CheckCircleRoundedIcon />}
              onClick={onClose}
              sx={{
                flexGrow: 1,
                minHeight: 44,
                fontWeight: 800,
                backgroundColor: statePalette.accent,
                color: "#f8fafc",
                "&:hover": {
                  backgroundColor: statePalette.accent,
                  opacity: 0.92,
                },
              }}
            >
              Continue to Next Set
            </Button>
          ) : isActive ? (
            <Button
              variant="contained"
              startIcon={<PauseIcon />}
              onClick={handlePause}
              sx={{
                flexGrow: 1,
                minHeight: 44,
                fontWeight: 800,
                backgroundColor: statePalette.accent,
                color: "#f8fafc",
                "&:hover": {
                  backgroundColor: statePalette.accent,
                  opacity: 0.92,
                },
              }}
            >
              Pause timer
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={handleResume}
              disabled={secondsRemaining <= 0}
              sx={{
                flexGrow: 1,
                minHeight: 44,
                fontWeight: 800,
                backgroundColor: statePalette.accent,
                color: "#f8fafc",
                "&:hover": {
                  backgroundColor: statePalette.accent,
                  opacity: 0.92,
                },
              }}
            >
              Resume timer
            </Button>
          )}

          <Button
            variant="text"
            startIcon={<SkipNextIcon />}
            onClick={handleSkip}
            sx={{
              minHeight: 44,
              color: darkMode ? "#e2e8f0" : "#0f172a",
            }}
          >
            Skip
          </Button>
        </Box>

        <Collapse in={showAdvancedControls}>
          <Box sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: 1.25 }}>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button
                variant="outlined"
                startIcon={<RemoveIcon />}
                onClick={() => handleAdjust(-15)}
                disabled={secondsRemaining <= 15}
              >
                15s
              </Button>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => handleAdjust(15)}
              >
                15s
              </Button>
            </Box>

            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 3,
                border: "1px solid",
                borderColor: darkMode
                  ? "rgba(148,163,184,0.14)"
                  : "rgba(17,24,39,0.08)",
                backgroundColor: darkMode
                  ? "rgba(15,23,42,0.58)"
                  : "rgba(255,255,255,0.72)",
              }}
            >
              <Typography
                variant="body2"
                sx={{ mb: 1, color: "text.secondary", fontWeight: 700 }}
              >
                Rest setting for this exercise
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr auto" },
                  gap: 1,
                  alignItems: "center",
                }}
              >
                <TextField
                  type="number"
                  label="Rest seconds"
                  value={restEditorValue}
                  onChange={(event) =>
                    setRestEditorValue(
                      String(Math.max(0, Number(event.target.value) || 0))
                    )
                  }
                  inputProps={{ min: 0, step: 5 }}
                />
                <Button
                  variant="outlined"
                  onClick={handleSaveRest}
                  disabled={savingRest}
                >
                  {savingRest ? "Saving..." : "Save Rest Time"}
                </Button>
              </Box>
            </Paper>
          </Box>
        </Collapse>
      </Paper>
    </Box>
  );
};

export default RestTimerOverlay;
