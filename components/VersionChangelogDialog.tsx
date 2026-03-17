import React from "react";
import {
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { getChangelogEntry } from "../utils/appChangelog";

const VersionChangelogDialog = ({
  open,
  version,
  onClose,
}: {
  open: boolean;
  version?: string | null;
  onClose: () => void;
}) => {
  const entry = getChangelogEntry(version);
  const normalizedVersion = String(version || "").trim().replace(/^v/i, "");

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {normalizedVersion ? `Version ${normalizedVersion}` : "Version details"}
      </DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 2, pt: 1.5 }}>
        {entry ? (
          <>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip size="small" label={`Released ${entry.releasedAt}`} variant="outlined" />
              <Chip size="small" label={`${entry.changes.length} updates`} variant="outlined" />
            </Stack>
            <Typography color="text.secondary">{entry.summary}</Typography>
            <Stack spacing={1}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                What changed
              </Typography>
              {entry.changes.map((change) => (
                <Typography key={change} variant="body2">
                  - {change}
                </Typography>
              ))}
            </Stack>
            <Stack spacing={1}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                What to test
              </Typography>
              {entry.testFocus.map((item) => (
                <Typography key={item} variant="body2">
                  - {item}
                </Typography>
              ))}
            </Stack>
          </>
        ) : (
          <Typography color="text.secondary">
            No changelog entry is recorded for this version yet. Add one in
            `utils/appChangelog.ts` when the release scope is known.
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VersionChangelogDialog;
