import React from "react";
import { Box, Button, Chip, Paper, Typography } from "@mui/material";
import {
  formatWeight,
  fromCanonicalWeightLb,
} from "../../utils/weightUnits";
import { getPersonalRecordHighlights } from "../../utils/performance";
import { getExerciseExecutionGuidance } from "../../utils/workoutGuidance";

const metricDefinitionRows = [
  {
    label: "Estimated 1RM",
    detail:
      "A calculated max from your best logged weight and reps, not a true one-rep test.",
  },
  {
    label: "Volume load",
    detail: "Weight times reps across completed sets. It shows total work, not just the top set.",
  },
  {
    label: "PR",
    detail:
      "A PR can mean estimated 1RM, heaviest weight, or best rep performance depending on what you beat.",
  },
] as const;

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
  onOpenHistory,
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
            ? "Your recent logs are building a real trend line. You already have usable progress signals from this lift."
            : "Keep logging clean weight sessions and this panel will keep turning raw sets into visible progress signals."}
        </Typography>
        {hasUnlockedProgressionRecommendation && progressSummary?.latestEstimated1RM ? (
          <Typography sx={{ mt: 0.85, color: "text.secondary" }}>
            Latest visible benchmark:{" "}
            {formatWeight(
              fromCanonicalWeightLb(progressSummary.latestEstimated1RM, preferredUnits),
              preferredUnits
            )}{" "}
            estimated 1RM.
          </Typography>
        ) : null}
        {hasUnlockedProgressionRecommendation ? (
          <Button
            variant="outlined"
            size="small"
            sx={{ mt: 1.25 }}
            onClick={() => onRequestProgressionUpgradePrompt?.()}
          >
            See deeper coaching insights
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
  const latestBestRep = progressSummary?.bestRepPerformance ?? null;
  const previousBestRep = progressSummary?.previousBestRepPerformance ?? null;
  const visibleLoadDelta =
    latestBestRep?.weight && previousBestRep?.weight
      ? Math.round(
          (fromCanonicalWeightLb(latestBestRep.weight, preferredUnits) -
            fromCanonicalWeightLb(previousBestRep.weight, preferredUnits)) *
            10
        ) / 10
      : null;
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
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Chip
            size="small"
            label={trendLabel}
            color={trendColor as any}
            variant="outlined"
            sx={{ borderRadius: completedExerciseRadius.pill, fontWeight: 700 }}
          />
          <Button variant="outlined" size="small" onClick={onOpenHistory}>
            View history
          </Button>
        </Box>
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
              Explore the coaching follow-up
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
          {latestBestRep ? (
            <Typography sx={{ mt: 0.8, color: "text.secondary" }}>
              {previousBestRep
                ? `Last comparable set ${formatWeight(
                    fromCanonicalWeightLb(previousBestRep.weight, preferredUnits),
                    preferredUnits
                  )} x ${previousBestRep.reps}, today ${formatWeight(
                    fromCanonicalWeightLb(latestBestRep.weight, preferredUnits),
                    preferredUnits
                  )} x ${latestBestRep.reps}${
                    visibleLoadDelta !== null
                      ? `, ${visibleLoadDelta > 0 ? "+" : ""}${visibleLoadDelta} ${preferredUnits}`
                      : ""
                  }.`
                : "This session set the first comparable benchmark for this lift."}
            </Typography>
          ) : null}
          <Paper
            elevation={0}
            sx={{
              mt: 1.1,
              p: 1.1,
              borderRadius: completedExerciseRadius.section,
              border: "1px solid",
              borderColor: "divider",
              backgroundColor: darkMode ? "rgba(15,23,42,0.5)" : "rgba(255,255,255,0.88)",
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Metric guide
            </Typography>
            <Box sx={{ mt: 0.8, display: "grid", gap: 0.65 }}>
              {metricDefinitionRows.map((row) => (
                <Typography key={row.label} sx={{ color: "text.secondary" }}>
                  <strong>{row.label}:</strong> {row.detail}
                </Typography>
              ))}
            </Box>
          </Paper>
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
  progressSummary,
  latestFeedback,
  preferredUnits,
  handleApplyRecommendation,
  applyingRecommendation,
  onOpenHistory,
  onRecommendationFeedback,
  savingRecommendationFeedback,
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
            ? "Your logs are ready for a next-session suggestion. Free still shows the progress you earned first."
            : "Finish a fully logged weight session for this lift to build a data-driven next-step suggestion."}
        </Typography>
        {hasUnlockedProgressionRecommendation ? (
          <Button
            variant="outlined"
            size="small"
            sx={{ mt: 1.25 }}
            onClick={() => onRequestProgressionUpgradePrompt?.()}
          >
            See the coaching recommendation
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

  const recommendedWeight = recommendation.recommendedWeight;
  const recommendedReps = recommendation.recommendedReps;
  const recommendedSets = recommendation.recommendedSets;
  const weightChange =
    recommendation?.basedOn?.topSetWeight && recommendedWeight
      ? Math.round((recommendedWeight - recommendation.basedOn.topSetWeight) * 10) / 10
      : null;
  const repChange =
    recommendation?.basedOn?.topSetReps && recommendedReps
      ? recommendedReps - recommendation.basedOn.topSetReps
      : null;
  const setChange =
    recommendation?.basedOn?.setsCompleted && recommendedSets
      ? recommendedSets - recommendation.basedOn.setsCompleted
      : null;
  const primaryChangeSummary =
    weightChange && Math.abs(weightChange) > 0
      ? weightChange > 0
        ? "Progressing load"
        : "Reducing load"
      : repChange && Math.abs(repChange) > 0
      ? repChange > 0
        ? "Adding reps"
        : "Reducing reps"
      : setChange && Math.abs(setChange) > 0
      ? setChange > 0
        ? "Adding volume"
        : "Reducing volume"
      : "Holding steady";

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
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button variant="outlined" onClick={onOpenHistory}>
            View history
          </Button>
          <Button
            variant="outlined"
            onClick={handleApplyRecommendation}
            disabled={applyingRecommendation}
          >
            {applyingRecommendation ? "Applying..." : "Apply recommendation"}
          </Button>
        </Box>
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
        {recommendation.comparison?.deltaWeight !== null ? (
          <Chip
            label={`${recommendation.comparison.deltaWeight > 0 ? "+" : ""}${
              recommendation.comparison.deltaWeight
            } ${recommendation.weightUnit ?? preferredUnits} vs last`}
            color={recommendation.comparison.deltaWeight > 0 ? "success" : "warning"}
            variant="outlined"
          />
        ) : null}
      </Box>
      <Typography sx={{ mt: 0.85, color: "text.secondary" }}>
        {recommendation.comparison?.summary ??
          "Log this workout cleanly to unlock a clearer session-to-session comparison."}
      </Typography>

      <Paper
        elevation={0}
        sx={{
          mt: 1.1,
          p: 1.1,
          borderRadius: completedExerciseRadius.section,
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: darkMode ? "rgba(15,23,42,0.5)" : "rgba(255,255,255,0.88)",
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Why the app picked this
        </Typography>
        <Box sx={{ mt: 0.8, display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Chip size="small" label={primaryChangeSummary} variant="outlined" />
          {recommendation.daysSinceLastWorkout !== null ? (
            <Chip
              size="small"
              label={`${recommendation.daysSinceLastWorkout} day gap`}
              variant="outlined"
            />
          ) : null}
          {recommendation.basedOn?.date ? (
            <Chip
              size="small"
              label={`Benchmark ${recommendation.basedOn.date}`}
              variant="outlined"
            />
          ) : null}
        </Box>
        <Typography sx={{ mt: 0.8, color: "text.secondary" }}>
          {recommendation.reason}
        </Typography>
        {recommendation.basedOn ? (
          <Typography sx={{ mt: 0.8, color: "text.secondary" }}>
            Based on your last benchmark of{" "}
            {formatWeight(
              recommendation.basedOn.topSetWeight,
              recommendation.weightUnit ?? preferredUnits
            )}{" "}
            x {recommendation.basedOn.topSetReps}, averaging{" "}
            {formatWeight(
              recommendation.basedOn.averageWeight,
              recommendation.weightUnit ?? preferredUnits
            )}{" "}
            for {recommendation.basedOn.averageReps} reps across{" "}
            {recommendation.basedOn.setsCompleted} completed sets.
          </Typography>
        ) : null}
        {progressSummary?.latestEstimated1RM ? (
          <Typography sx={{ mt: 0.8, color: "text.secondary" }}>
            Current estimated strength:{" "}
            {formatWeight(
              fromCanonicalWeightLb(
                progressSummary.latestEstimated1RM,
                recommendation.weightUnit ?? preferredUnits
              ),
              recommendation.weightUnit ?? preferredUnits
            )}
            .
          </Typography>
        ) : null}
        <Paper
          elevation={0}
          sx={{
            mt: 1,
            p: 1,
            borderRadius: completedExerciseRadius.section,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: darkMode ? "rgba(30,41,59,0.52)" : "rgba(248,250,252,0.92)",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Metric guide
          </Typography>
          <Box sx={{ mt: 0.5, display: "grid", gap: 0.45 }}>
            {metricDefinitionRows.map((row) => (
              <Typography key={row.label} sx={{ color: "text.secondary" }}>
                <strong>{row.label}:</strong> {row.detail}
              </Typography>
            ))}
          </Box>
        </Paper>
      </Paper>

      {recommendation.fatigue ? (
        <Paper
          elevation={0}
          sx={{
            mt: 1.1,
            p: 1.1,
            borderRadius: completedExerciseRadius.section,
            border: "1px solid",
            borderColor:
              recommendation.fatigue.state === "deload"
                ? darkMode
                  ? "rgba(250,204,21,0.24)"
                  : "rgba(202,138,4,0.24)"
                : "divider",
            backgroundColor:
              recommendation.fatigue.state === "deload"
                ? darkMode
                  ? "rgba(69,26,3,0.34)"
                  : "rgba(255,251,235,0.92)"
                : darkMode
                ? "rgba(15,23,42,0.5)"
                : "rgba(255,255,255,0.88)",
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Recovery and fatigue
          </Typography>
          <Typography sx={{ mt: 0.65, color: "text.secondary" }}>
            {recommendation.fatigue.state === "deload"
              ? "Fatigue stayed elevated across multiple sessions, so Lift Logic prescribed a lighter deload exposure."
              : recommendation.fatigue.state === "high"
              ? "Recent sessions show elevated fatigue, so this target is slightly more conservative."
              : recommendation.fatigue.state === "building"
              ? "A mild fatigue signal is building, but progression is still moving."
              : "Recent sessions do not show a strong fatigue warning."}
          </Typography>
          {recommendation.fatigue.signalReasons?.length ? (
            <Box sx={{ mt: 0.75, display: "grid", gap: 0.4 }}>
              {recommendation.fatigue.signalReasons.map((reason: string) => (
                <Typography key={reason} sx={{ color: "text.secondary" }}>
                  {`\u2022 ${reason}`}
                </Typography>
              ))}
            </Box>
          ) : null}
        </Paper>
      ) : null}

      <Paper
        elevation={0}
        sx={{
          mt: 1.1,
          p: 1.1,
          borderRadius: completedExerciseRadius.section,
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: darkMode ? "rgba(15,23,42,0.5)" : "rgba(255,255,255,0.88)",
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          How did this recommendation feel?
        </Typography>
        <Box sx={{ mt: 0.8, display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button
            variant={latestFeedback?.feedback === "too_easy" ? "contained" : "outlined"}
            size="small"
            onClick={() => onRecommendationFeedback?.("too_easy")}
            disabled={savingRecommendationFeedback}
          >
            Too easy
          </Button>
          <Button
            variant={latestFeedback?.feedback === "about_right" ? "contained" : "outlined"}
            size="small"
            onClick={() => onRecommendationFeedback?.("about_right")}
            disabled={savingRecommendationFeedback}
          >
            About right
          </Button>
          <Button
            variant={latestFeedback?.feedback === "too_hard" ? "contained" : "outlined"}
            size="small"
            onClick={() => onRecommendationFeedback?.("too_hard")}
            disabled={savingRecommendationFeedback}
          >
            Too hard
          </Button>
        </Box>
        <Typography sx={{ mt: 0.8, color: "text.secondary" }}>
          You can still override the set, rep, or load target manually. The original recommendation stays visible here for comparison.
        </Typography>
        {latestFeedback ? (
          <Typography sx={{ mt: 0.8, color: "text.secondary" }}>
            Latest feedback on this lift:{" "}
            {latestFeedback.feedback === "too_easy"
              ? "too easy"
              : latestFeedback.feedback === "too_hard"
              ? "too hard"
              : "about right"}
            .
          </Typography>
        ) : null}
      </Paper>
    </Paper>
  );
};

export const ExerciseExecutionPanel = ({
  currentExercise,
  darkMode,
  completedExerciseRadius,
}: any) => {
  const guidance = getExerciseExecutionGuidance(currentExercise?.name ?? "");

  if (!guidance) {
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
          ? "rgba(15,23,42,0.68)"
          : "rgba(248,250,252,0.92)",
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {guidance.title}
      </Typography>
      <Box sx={{ mt: 1, display: "grid", gap: 0.65 }}>
        {guidance.cues.map((cue) => (
          <Typography key={cue} sx={{ color: "text.secondary" }}>
            {`\u2022 ${cue}`}
          </Typography>
        ))}
      </Box>
      {guidance.warmup ? (
        <Paper
          elevation={0}
          sx={{
            mt: 1.15,
            p: 1.1,
            borderRadius: completedExerciseRadius.section,
            border: "1px solid",
            borderColor: darkMode
              ? "rgba(250,204,21,0.2)"
              : "rgba(202,138,4,0.18)",
            backgroundColor: darkMode
              ? "rgba(51,65,85,0.5)"
              : "rgba(255,251,235,0.92)",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {guidance.warmup.title}
          </Typography>
          <Box sx={{ mt: 0.6, display: "grid", gap: 0.55 }}>
            {guidance.warmup.steps.map((step) => (
              <Typography key={step} sx={{ color: "text.secondary" }}>
                {`\u2022 ${step}`}
              </Typography>
            ))}
          </Box>
          <Box sx={{ mt: 0.85, display: "grid", gap: 0.45 }}>
            {guidance.warmup.rampSets.map((rampSet) => (
              <Typography key={rampSet} sx={{ color: "text.secondary" }}>
                {`\u2022 ${rampSet}`}
              </Typography>
            ))}
          </Box>
        </Paper>
      ) : null}
      {guidance.regression ? (
        <Paper
          elevation={0}
          sx={{
            mt: 1.15,
            p: 1.1,
            borderRadius: completedExerciseRadius.section,
            border: "1px solid",
            borderColor: darkMode
              ? "rgba(96,165,250,0.18)"
              : "rgba(37,99,235,0.14)",
            backgroundColor: darkMode
              ? "rgba(30,41,59,0.66)"
              : "rgba(255,255,255,0.88)",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Beginner regression
          </Typography>
          <Typography sx={{ mt: 0.3, fontWeight: 700 }}>
            {guidance.regression.name}
          </Typography>
          <Typography sx={{ mt: 0.35, color: "text.secondary" }}>
            {guidance.regression.reason}
          </Typography>
        </Paper>
      ) : null}
    </Paper>
  );
};
