import React, { useState } from "react";
import { Box, ButtonBase, Tooltip, Typography } from "@mui/material";
import packageJson from "../package.json";
import VersionChangelogDialog from "./VersionChangelogDialog";

const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || packageJson.version || "0.0.0";
const commitSha = process.env.NEXT_PUBLIC_COMMIT_SHA || "";
const environment = process.env.NEXT_PUBLIC_ENV || "development";
const shortCommitSha = commitSha ? commitSha.slice(0, 7) : "";
const mobileBottomOffset =
  process.env.NODE_ENV === "production"
    ? "calc(12px + var(--liftlogic-overlay-bottom-offset, 0px))"
    : "calc(72px + var(--liftlogic-overlay-bottom-offset, 0px))";

const AppVersionBadge = () => {
  const [open, setOpen] = useState(false);
  const detail = [`Version ${appVersion}`, environment];

  if (shortCommitSha) {
    detail.push(`Commit ${shortCommitSha}`);
  }

  return (
    <>
      <Tooltip title={`${detail.join(" | ")} | Click for changelog`} arrow>
        <ButtonBase
          onClick={() => setOpen(true)}
          aria-label={`Open changelog for version ${appVersion}`}
          sx={{
            position: "fixed",
            right: { xs: 12, sm: 18 },
            bottom: {
              xs: mobileBottomOffset,
              sm: "calc(18px + var(--liftlogic-overlay-bottom-offset, 0px))",
            },
            zIndex: 1300,
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
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
        </ButtonBase>
      </Tooltip>
      <VersionChangelogDialog
        open={open}
        version={appVersion}
        onClose={() => setOpen(false)}
      />
    </>
  );
};

export default AppVersionBadge;
