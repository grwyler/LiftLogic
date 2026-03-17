import React from "react";
import { Box, Button, Chip, Paper, Typography } from "@mui/material";
import {
  formatWeight,
  fromCanonicalWeightLb,
} from "../../utils/weightUnits";
import { getPersonalRecordHighlights } from "../../utils/performance";

export const CompletedExercisePerformancePanel = ({
  currentExercise,
  darkMode,
  completedExerciseRadius,
  progressionRecommendationsEnabled,
  hasUnlockedProgressionRecommendation,
  onRequestPersonalRecordUpgradePrompt,
  onRequestProgressionUpgradePrompt,
  progressSummary,
  loadingRecommendation,
  preferredUnits,
}: any) => {
  if (currentExercise.type !== "weight" || !currentExercise.complete) {
    return null;
  }

  if (!progressionRecommendationsEnabled) {
    return (
      <Paper
        elevation={0}
        sx={{
          mt: 1.5,
          p: 1.5,
          borderRadius: completedExerciseRadius.section,
          border: "1px solid",
          borderColor: darkMode
            ? "rgba(148,163,184,0.12)"
            : "rgba(17,24,39,0.08)",
          backgroundColor: darkMode
            ? "rgba(17,24,39,0.72)"
            : "rgba(249,250,251,0.92)",
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Performance
        </Typography>
        <Typography sx={{ mt: 1, color: "text.secondary" }}>
          {hasUnlockedProgressionRecommendation
            ? "You unlocked performance trends and next-step recommendations from your recent logs."
            : "Keep logging clean weight sessions and Pro Beta will unlock performance trends and next-step recommendations here."}
        </Typography>
        {hasUnlockedProgressionRecommendation ? (
          <Button
            variant="outlined"
            size="small"
            sx={{ mt: 1.25 }}
            onClick={() => onRequestProgressionUpgradePrompt?.()}
          >
            See Pro Beta insights
          </Button>
        ) : null}
      </Paper>
    );
  }

  const latestEstimated1RM = progressSummary?.latestEstimated1RM ?? null;
  const previousEstimated1RM = progressSummary?.previousEstimated1RM ?? null;
  const heaviestWeightEver = progressSummary?.heaviestWeightEver ?? null;
  const delta =
    latestEstimated1RM !== null && previousEstimated1RM !== null
      ? Math.round(
          (fromCanonicalWeightLb(latestEstimated1RM, preferredUnits) -
            fromCanonicalWeightLb(previousEstimated1RM, preferredUnits)) *
            10
        ) / 10
      : null;
  const hasPriorBenchmark = previousEstimated1RM !== null;
  const personalRecordHighlights = getPersonalRecordHighlights(
    progressSummary,
    preferredUnits
  );
  const trendLabel =
    progressSummary?.latestWorkoutBrokePR && hasPriorBenchmark
      ? "PR"
      : delta === null
      ? "Logged"
      : delta > 0
      ? "Trending Up"
      : delta < 0
      ? "Trending Down"
      : "Steady";
  const trendColor =
    (progressSummary?.latestWorkoutBrokePR && hasPriorBenchmark) ||
    (delta !== null && delta > 0)
      ? "success"
      : delta !== null && delta < 0
      ? "warning"
      : "default";

  return (
    <Paper
      elevation={0}
      sx={{
        mt: 1.5,
        p: 1.5,
        borderRadius: completedExerciseRadius.section,
        border: "1px solid",
        borderColor: darkMode
          ? "rgba(148,163,184,0.12)"
          : "rgba(17,24,39,0.08)",
        backgroundColor: darkMode
          ? "rgba(17,24,39,0.72)"
          : "rgba(249,250,251,0.92)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Performance
        </Typography>
        <Chip
          size="small"
          label={trendLabel}
          color={trendColor as any}
          variant="outlined"
          sx={{ borderRadius: completedExerciseRadius.pill, fontWeight: 700 }}
        />
      </Box>

      {personalRecordHighlights.length > 0 ? (
        <Paper
          elevation={0}
          sx={{
            mt: 1,
            p: 1.25,
            borderRadius: completedExerciseRadius.section,
            border: "1px solid",
            borderColor: darkMode
              ? "rgba(74,222,128,0.25)"
              : "rgba(22,163,74,0.18)",
            backgroundColor: darkMode
              ? "rgba(20,83,45,0.3)"
              : "rgba(240,253,244,0.9)",
          }}
        >
          <Box sx={{ display: "grid", gap: 0.85 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 1,
                flexWrap: "wrap",
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                New personal record
              </Typography>
              <Chip
                size="small"
                color="success"
                variant="filled"
                label={`+${personalRecordHighlights.length} PR${
                  personalRecordHighlights.length === 1 ? "" : "s"
                }`}
                sx={{ borderRadius: completedExerciseRadius.pill, fontWeight: 700 }}
              />
            </Box>
            <Typography sx={{ color: "text.secondary" }}>
              You beat a prior benchmark on this lift. Lock it in while the effort is still
              fresh.
            </Typography>
            <Button
              variant="outlined"
              size="small"
              color="success"
              sx={{ justifySelf: "flex-start" }}
              onClick={() => onRequestPersonalRecordUpgradePrompt?.()}
            >
              Extend this PR with Pro Beta
            </Button>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {personalRecordHighlights.map((highlight: any) => (
                <Chip
                  key={`${highlight.category}-${highlight.detail}`}
                  label={`${highlight.label}: ${highlight.detail}`}
                  color="success"
                  variant="outlined"
                  sx={{ borderRadius: completedExerciseRadius.pill, fontWeight: 700 }}
                />
              ))}
            </Box>
          </Box>
        </Paper>
      ) : null}

      {loadingRecommendation ? (
        <Typography sx={{ mt: 1, color: "text.secondary" }}>
          Loading performance...
        </Typography>
      ) : latestEstimated1RM ? (
        <>
          <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Chip
              label={`Est. 1RM ${formatWeight(fromCanonicalWeightLb(latestEstimated1RM, preferredUnits), preferredUnits)}`}
              variant="outlined"
              sx={{ borderRadius: completedExerciseRadius.pill, fontWeight: 700 }}
            />
            {delta !== null ? (
              <Chip
                label={`${delta > 0 ? "+" : ""}${delta} vs last`}
                variant="outlined"
                sx={{ borderRadius: completedExerciseRadius.pill, fontWeight: 700 }}
              />
            ) : null}
            {heaviestWeightEver ? (
              <Chip
                label={`Best weight ${formatWeight(fromCanonicalWeightLb(heaviestWeightEver, preferredUnits), preferredUnits)}`}
                variant="outlined"
                sx={{ borderRadius: completedExerciseRadius.pill, fontWeight: 700 }}
              />
            ) : null}
          </Box>

          {progressSummary?.bestRepPerformance ? (
            <Typography sx={{ mt: 1, color: "text.secondary" }}>
              Best logged set:{" "}
              {formatWeight(
                fromCanonicalWeightLb(
                  progressSummary.bestRepPerformance.weight,
                  preferredUnits
                ),
                preferredUnits
              )}{" "}
              x {progressSummary.bestRepPerformance.reps}.
            </Typography>
          ) : null}
        </>
      ) : (
        <Typography sx={{ mt: 1, color: "text.secondary" }}>
          No weight-performance trend yet.
        </Typography>
      )}
    </Paper>
  );
};

export const ExerciseRecommendationPanel = ({
  progressionRecommendationsEnabled,
  currentExercise,
  darkMode,
  completedExerciseRadius,
  hasUnlockedProgressionRecommendation,
  onRequestProgressionUpgradePrompt,
  recommendation,
  preferredUnits,
  handleApplyRecommendation,
  applyingRecommendation,
}: any) => {
  if (!progressionRecommendationsEnabled && currentExercise.type === "weight") {
    return (
      <Paper
        elevation={0}
        sx={{
          mb: 1.5,
          p: 1.5,
          borderRadius: completedExerciseRadius.section,
          border: "1px solid",
          borderColor: darkMode
            ? "rgba(148,163,184,0.12)"
            : "rgba(17,24,39,0.08)",
          backgroundColor: darkMode
            ? "rgba(30,41,59,0.66)"
            : "rgba(248,250,252,0.92)",
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Recommended targets
        </Typography>
        <Typography sx={{ mt: 0.75, color: "text.secondary" }}>
          {hasUnlockedProgressionRecommendation
            ? "You unlocked a next-session recommendation from your recent logs."
            : "Finish a fully logged weight session for this lift to unlock a data-driven recommendation."}
        </Typography>
        {hasUnlockedProgressionRecommendation ? (
          <Button
            variant="outlined"
            size="small"
            sx={{ mt: 1.25 }}
            onClick={() => onRequestProgressionUpgradePrompt?.()}
          >
            See Pro Beta recommendation
          </Button>
        ) : null}
      </Paper>
    );
  }

  if (
    currentExercise.type !== "weight" ||
    currentExercise.complete ||
    !recommendation?.recommendedWeight ||
    !recommendation?.recommendedReps ||
    !recommendation?.recommendedSets
  ) {
    return null;
  }

  return (
    <Paper
      elevation={0}
      sx={{
        mb: 1.5,
        p: 1.5,
        borderRadius: completedExerciseRadius.section,
        border: "1px solid",
        borderColor: darkMode
          ? "rgba(148,163,184,0.12)"
          : "rgba(17,24,39,0.08)",
        backgroundColor: darkMode
          ? "rgba(30,41,59,0.66)"
          : "rgba(248,250,252,0.92)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 1,
          flexDirection: { xs: "column", sm: "row" },
        }}
      >
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Recommended targets
          </Typography>
          <Typography sx={{ mt: 0.4, color: "text.secondary" }}>
            Your planned sets stay unchanged until you apply this recommendation.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          onClick={handleApplyRecommendation}
          disabled={applyingRecommendation}
        >
          {applyingRecommendation ? "Applying..." : "Apply recommendation"}
        </Button>
      </Box>
      <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Chip
          label={`${recommendation.recommendedSets} set${
            recommendation.recommendedSets === 1 ? "" : "s"
          }`}
          variant="outlined"
        />
        <Chip
          label={formatWeight(
            recommendation.recommendedWeight,
            recommendation.weightUnit ?? preferredUnits
          )}
          variant="outlined"
        />
        <Chip
          label={`${recommendation.recommendedReps} reps`}
          variant="outlined"
        />
      </Box>
    </Paper>
  );
};
