import React, { useEffect, useState } from "react";
import { Box, Button, Paper, TextField, Typography } from "@mui/material";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
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
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSecondsRemaining(initialSeconds);
    setIsActive(initialSeconds > 0);
    setRestEditorValue(String(defaultRestSeconds || 0));
    setIsExpanded(false);
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
          window.setTimeout(() => onClose(), 0);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isActive, onClose, open, secondsRemaining]);

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
        bottom:
          "calc(12px + env(safe-area-inset-bottom, 0px) + var(--liftlogic-keyboard-offset, 0px))",
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
          width: { xs: "100%", sm: isExpanded ? 380 : 312 },
          p: 1.5,
          borderRadius: 4,
          border: "1px solid",
          borderColor: darkMode
            ? "rgba(148,163,184,0.18)"
            : "rgba(15,23,42,0.1)",
          backgroundColor: darkMode
            ? "rgba(2,6,23,0.94)"
            : "rgba(255,255,255,0.96)",
          backgroundImage: darkMode
            ? "radial-gradient(circle at top, rgba(59,130,246,0.18), transparent 42%)"
            : "radial-gradient(circle at top, rgba(37,99,235,0.1), transparent 38%)",
          backdropFilter: "blur(18px)",
          boxShadow: darkMode
            ? "0 20px 44px rgba(2,6,23,0.48)"
            : "0 18px 40px rgba(15,23,42,0.18)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="overline"
              sx={{ color: "text.secondary", letterSpacing: "0.14em" }}
            >
              Rest Timer
            </Typography>
            <Typography variant="h6" sx={{ mt: 0.2, lineHeight: 1.1 }}>
              {formatTime(secondsRemaining)}
            </Typography>
            <Typography
              sx={{
                mt: 0.35,
                color: "text.secondary",
                fontSize: "0.92rem",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {exerciseName}
            </Typography>
          </Box>

          <Button
            variant="text"
            size="small"
            onClick={() => setIsExpanded((prev) => !prev)}
            endIcon={
              isExpanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowUpIcon />
            }
            sx={{ flexShrink: 0, minWidth: "fit-content" }}
          >
            {isExpanded ? "Minimize" : "Expand"}
          </Button>
        </Box>

        <Box
          sx={{
            mt: 1.2,
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          {isActive ? (
            <Button variant="outlined" startIcon={<PauseIcon />} onClick={handlePause}>
              Pause
            </Button>
          ) : (
            <Button
              variant="outlined"
              startIcon={<PlayArrowIcon />}
              onClick={handleResume}
              disabled={secondsRemaining <= 0}
            >
              Resume
            </Button>
          )}
          <Button variant="text" startIcon={<SkipNextIcon />} onClick={handleSkip}>
            Skip
          </Button>
        </Box>

        {isExpanded ? (
          <Box sx={{ mt: 1.4, display: "flex", flexDirection: "column", gap: 1.25 }}>
            <Typography sx={{ color: "text.secondary", fontSize: "0.95rem" }}>
              Keep moving through the workout while the countdown runs. Expand this
              view anytime you want a bigger timer and full controls.
            </Typography>

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
                  ? "rgba(15,23,42,0.76)"
                  : "rgba(248,250,252,0.9)",
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
                  variant="contained"
                  onClick={handleSaveRest}
                  disabled={savingRest}
                >
                  {savingRest ? "Saving..." : "Save Rest Time"}
                </Button>
              </Box>
            </Paper>

            <Button variant="contained" color="success" onClick={handleSkip}>
              Continue to Next Set
            </Button>
          </Box>
        ) : null}
      </Paper>
    </Box>
  );
};

export default RestTimerOverlay;
