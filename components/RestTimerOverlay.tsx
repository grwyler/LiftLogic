import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";
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
  const [restEditorValue, setRestEditorValue] = useState(String(defaultRestSeconds || 0));
  const [savingRest, setSavingRest] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSecondsRemaining(initialSeconds);
    setIsActive(initialSeconds > 0);
    setRestEditorValue(String(defaultRestSeconds || 0));
  }, [defaultRestSeconds, initialSeconds, open, exerciseName]);

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

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={() => {}}
      PaperProps={{
        sx: {
          backgroundColor: darkMode ? "#020617" : "#f8fafc",
          color: darkMode ? "#f8fafc" : "#111827",
          backgroundImage: darkMode
            ? "radial-gradient(circle at top, rgba(59,130,246,0.18), transparent 38%)"
            : "radial-gradient(circle at top, rgba(37,99,235,0.1), transparent 34%)",
        },
      }}
    >
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          px: 2.5,
          py: 4,
          textAlign: "center",
        }}
      >
        <Typography
          variant="overline"
          sx={{ color: "text.secondary", letterSpacing: "0.16em" }}
        >
          Rest Between Sets
        </Typography>
        <Typography variant="h5" sx={{ mt: 1 }}>
          {exerciseName}
        </Typography>
        <Typography
          variant="h2"
          sx={{
            mt: 1,
            fontWeight: 800,
            letterSpacing: "-0.06em",
            fontSize: { xs: "4rem", sm: "5.5rem" },
          }}
        >
          {formatTime(secondsRemaining)}
        </Typography>
        <Typography
          sx={{
            mt: 1.25,
            maxWidth: 420,
            color: "text.secondary",
            fontSize: { xs: "1rem", sm: "1.05rem" },
          }}
        >
          Catch your breath before the next set. You can adjust the rest target
          for this exercise right here.
        </Typography>

        <Box
          sx={{
            mt: 3.5,
            width: "100%",
            maxWidth: 420,
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
          }}
        >
          <Box sx={{ display: "flex", gap: 1, justifyContent: "center", flexWrap: "wrap" }}>
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
          </Box>

          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 4,
              border: "1px solid",
              borderColor: darkMode
                ? "rgba(148,163,184,0.14)"
                : "rgba(17,24,39,0.08)",
              backgroundColor: darkMode
                ? "rgba(15,23,42,0.78)"
                : "rgba(255,255,255,0.88)",
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

          <Box sx={{ display: "flex", gap: 1, justifyContent: "center", flexWrap: "wrap" }}>
            <Button variant="text" startIcon={<SkipNextIcon />} onClick={handleSkip}>
              Skip Rest
            </Button>
            <Button variant="contained" color="success" onClick={handleSkip}>
              Continue to Next Set
            </Button>
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
};

export default RestTimerOverlay;
