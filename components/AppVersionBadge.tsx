import React from "react";
import { Box, Tooltip, Typography } from "@mui/material";

const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || "0.0.0";
const commitSha = process.env.NEXT_PUBLIC_COMMIT_SHA || "";
const environment = process.env.NEXT_PUBLIC_ENV || "development";
const shortCommitSha = commitSha ? commitSha.slice(0, 7) : "";

const AppVersionBadge = () => {
  const detail = [`Version ${appVersion}`, environment];

  if (shortCommitSha) {
    detail.push(`Commit ${shortCommitSha}`);
  }

  return (
    <Tooltip title={detail.join(" • ")} arrow>
      <Box
        sx={{
          position: "fixed",
          left: { xs: 12, sm: 18 },
          bottom: { xs: 12, sm: 18 },
          zIndex: 1300,
          px: 1.1,
          py: 0.7,
          borderRadius: 999,
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.paper",
          color: "text.secondary",
          backdropFilter: "blur(14px)",
          boxShadow: (theme) =>
            theme.palette.mode === "dark"
              ? "0 10px 30px rgba(2, 6, 23, 0.32)"
              : "0 10px 26px rgba(15, 23, 42, 0.12)",
          pointerEvents: "auto",
        }}
      >
        <Typography
          variant="caption"
          sx={{
            display: "block",
            fontWeight: 700,
            letterSpacing: "0.08em",
            lineHeight: 1,
          }}
        >
          v{appVersion}
        </Typography>
      </Box>
    </Tooltip>
  );
};

export default AppVersionBadge;
