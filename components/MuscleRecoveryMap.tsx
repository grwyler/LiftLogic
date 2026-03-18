"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, Chip, Collapse, Paper, Stack, Typography } from "@mui/material";
import { fetchWorkoutEntriesRange } from "../utils/helpers";
import {
  buildRecoveryGuidance,
  buildMuscleRecoveryMap,
  getRecoveryFill,
  MuscleRegionId,
  muscleRegionLabels,
} from "../utils/muscleRecovery";

const musclePanelRadius = {
  shell: 2.25,
  section: 1.25,
  row: 1.1,
} as const;

type RecoveryRegion = {
  region: MuscleRegionId;
  label: string;
  inCurrentWorkout: boolean;
  lastTargetedAt: Date | null;
  hoursAgo: number | null;
  intensity: number;
};

const regionLabels: Record<MuscleRegionId, string> = muscleRegionLabels;

const regionGroups: Array<{
  title: string;
  description: string;
  ids: MuscleRegionId[];
}> = [
  {
    title: "Front Body",
    description: "Push and front-side muscle groups in today's workout.",
    ids: ["shoulders", "chest", "biceps", "core", "quads"],
  },
  {
    title: "Back Body",
    description: "Pull, posterior-chain, and support muscle groups.",
    ids: [
      "rear_delts",
      "upper_back",
      "lats",
      "triceps",
      "lower_back",
      "glutes",
      "hamstrings",
      "calves",
    ],
  },
];

const formatHoursAgo = (hoursAgo: number | null) => {
  if (hoursAgo === null) {
    return "Fresh target";
  }

  if (hoursAgo < 1) {
    return "Just trained";
  }

  return `${Math.round(hoursAgo)}h ago`;
};

const buildStatusTone = (hoursAgo: number | null) => {
  if (hoursAgo === null || hoursAgo > 48) {
    return {
      label: "Fresh target",
      chipColor: "default" as const,
      meterWidth: 20,
    };
  }

  return {
    label: hoursAgo < 1 ? "Recently trained" : "Trained recently",
    chipColor: "primary" as const,
    meterWidth: Math.max(24, Math.round((1 - Math.min(hoursAgo, 48) / 48) * 100)),
  };
};

const RegionRow = ({
  region,
  darkMode,
}: {
  region: RecoveryRegion;
  darkMode: boolean;
}) => {
  const tone = buildStatusTone(region.hoursAgo);

  return (
    <Box
      sx={{
        p: 1.15,
        borderRadius: musclePanelRadius.row,
        border: "1px solid",
        borderColor:
          tone.chipColor === "primary"
            ? "rgba(37,99,235,0.18)"
            : "rgba(148,163,184,0.18)",
        backgroundColor:
          tone.chipColor === "primary"
            ? "rgba(37,99,235,0.06)"
            : darkMode
            ? "rgba(255,255,255,0.02)"
            : "rgba(248,250,252,0.9)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700 }}>
            {regionLabels[region.region] || region.label}
          </Typography>
          <Typography sx={{ mt: 0.25, color: "text.secondary", fontSize: 13 }}>
            {formatHoursAgo(region.hoursAgo)}
          </Typography>
        </Box>
        <Chip
          size="small"
          label={tone.label}
          color={tone.chipColor}
          variant="outlined"
        />
      </Box>

      <Box
        sx={{
          mt: 1,
          height: 8,
          borderRadius: 999,
          overflow: "hidden",
          backgroundColor: darkMode
            ? "rgba(148,163,184,0.12)"
            : "rgba(148,163,184,0.14)",
        }}
      >
        <Box
          sx={{
            width: `${tone.meterWidth}%`,
            height: "100%",
            borderRadius: 999,
            background: getRecoveryFill(region.intensity ?? 0, true),
          }}
        />
      </Box>
    </Box>
  );
};

export default function MuscleRecoveryMap({
  exercises,
  userId,
  currentDate,
  darkMode,
}: {
  exercises: any[];
  userId: string;
  sex?: string;
  currentDate: Date;
  darkMode: boolean;
}) {
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const anchor = new Date(currentDate);
    const isToday = anchor.toDateString() === new Date().toDateString();
    if (isToday) {
      anchor.setHours(new Date().getHours(), new Date().getMinutes(), 0, 0);
    } else {
      anchor.setHours(23, 59, 59, 999);
    }

    const start = new Date(anchor);
    start.setHours(start.getHours() - 48);

    fetchWorkoutEntriesRange(userId, start, anchor)
      .then((entries) => setRecentEntries(entries))
      .catch((error) => {
        console.error("Error loading recent workout entries for muscle groups:", error);
        setRecentEntries([]);
      });
  }, [currentDate, userId]);

  const recovery = useMemo(
    () =>
      buildMuscleRecoveryMap({
        exercises,
        recentEntries,
        anchorDate:
          currentDate.toDateString() === new Date().toDateString()
            ? new Date()
            : new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                currentDate.getDate(),
                23,
                59,
                59,
                999
              ),
      }),
    [currentDate, exercises, recentEntries]
  );

  const activeRegions = useMemo(
    () =>
      Object.values(recovery).sort((a, b) => {
        const aHours = a.hoursAgo ?? Number.POSITIVE_INFINITY;
        const bHours = b.hoursAgo ?? Number.POSITIVE_INFINITY;
        return aHours - bHours;
      }) as RecoveryRegion[],
    [recovery]
  );

  const freshTargetCount = activeRegions.filter(
    (region) => region.hoursAgo === null || region.hoursAgo > 48
  ).length;
  const recentlyTrainedCount = activeRegions.length - freshTargetCount;
  const topRegions = activeRegions.slice(0, 3).map((region) => regionLabels[region.region]);

  const groupedRegions = useMemo(
    () =>
      regionGroups.map((group) => ({
        ...group,
        regions: group.ids
          .map((id) => recovery[id])
          .filter((region): region is RecoveryRegion => Boolean(region)),
      })),
    [recovery]
  );
  const recoveryGuidance = useMemo(
    () =>
      buildRecoveryGuidance(
        activeRegions.map((region) => ({
          label: region.label,
          hoursAgo: region.hoursAgo,
        }))
      ),
    [activeRegions]
  );

  if (!exercises.length) {
    return null;
  }

  return (
    <Paper
      elevation={0}
      sx={{
        mt: 2,
        p: 1.75,
        borderRadius: musclePanelRadius.shell,
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: darkMode
          ? "rgba(17,24,39,0.72)"
          : "rgba(255,255,255,0.9)",
      }}
    >
      <Stack spacing={1.75}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            gap: 1.25,
            flexDirection: { xs: "column", sm: "row" },
          }}
        >
          <Box>
            <Typography
              variant="overline"
              sx={{ color: "text.secondary", letterSpacing: "0.12em" }}
            >
              Muscle Groups
            </Typography>
            <Typography variant="h6">What today&apos;s workout is hitting</Typography>
            <Typography sx={{ mt: 0.35, color: "text.secondary" }}>
              See the muscle groups in today&apos;s plan and how recently each one was trained.
            </Typography>
          </Box>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ xs: "stretch", sm: "center" }}
          >
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip size="small" label={`${freshTargetCount} fresh`} variant="outlined" />
              <Chip
                size="small"
                label={`${recentlyTrainedCount} recently trained`}
                color="primary"
                variant="outlined"
              />
            </Stack>
            <Button
              variant={isOpen ? "outlined" : "contained"}
              size="small"
              onClick={() => setIsOpen((prev) => !prev)}
            >
              {isOpen ? "Hide muscle groups" : "Open muscle groups"}
            </Button>
          </Stack>
        </Box>

        {recoveryGuidance ? (
          <Paper
            elevation={0}
            sx={{
              p: 1.2,
              borderRadius: musclePanelRadius.section,
              border: "1px solid",
              borderColor:
                recoveryGuidance.tone === "push"
                  ? "rgba(34,197,94,0.22)"
                  : recoveryGuidance.tone === "rest"
                  ? "rgba(249,115,22,0.22)"
                  : "divider",
              backgroundColor: darkMode
                ? "rgba(15,23,42,0.52)"
                : "rgba(248,250,252,0.92)",
            }}
          >
            <Stack spacing={0.45}>
              <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.1em" }}>
                Recovery guidance
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>{recoveryGuidance.headline}</Typography>
              <Typography sx={{ color: "text.secondary" }}>
                {recoveryGuidance.supportingCopy}
              </Typography>
            </Stack>
          </Paper>
        ) : null}

        <Collapse in={isOpen} timeout="auto" unmountOnExit>
          <Stack spacing={1.75}>
            {topRegions.length > 0 ? (
              <Box
                sx={{
                  pt: 0.35,
                  pb: 1,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.1em" }}>
                  Primary Emphasis
                </Typography>
                <Typography sx={{ mt: 0.55 }}>
                  {topRegions.join(", ")}
                </Typography>
              </Box>
            ) : null}

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
                gap: 1.5,
              }}
              >
              {groupedRegions.map((group) => (
                <Box
                  key={group.title}
                  sx={{
                    p: 0,
                  }}
                >
                  <Box
                    sx={{
                      pb: 0.9,
                      mb: 1,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Typography
                      variant="overline"
                      sx={{ color: "text.secondary", letterSpacing: "0.1em" }}
                    >
                      {group.title}
                    </Typography>
                    <Typography sx={{ mt: 0.35, color: "text.secondary" }}>
                      {group.description}
                    </Typography>
                  </Box>

                  <Stack spacing={1}>
                    {group.regions.length > 0 ? (
                      group.regions.map((region) => (
                        <RegionRow
                          key={region.region}
                          region={region}
                          darkMode={darkMode}
                        />
                      ))
                    ) : (
                      <Typography sx={{ color: "text.secondary" }}>
                        No muscle groups from this section are emphasized in today&apos;s plan.
                      </Typography>
                    )}
                  </Stack>
                </Box>
              ))}
            </Box>
          </Stack>
        </Collapse>
      </Stack>
    </Paper>
  );
}
