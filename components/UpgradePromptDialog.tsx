import React, { useEffect } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";

type UpgradePromptDialogProps = {
  open: boolean;
  title: string;
  description: string;
  benefits: string[];
  onClose: () => void;
  onRemindLater?: () => void;
  onUpgrade: () => void;
  continueLabel?: string;
  upgradeLabel?: string;
  remindLaterLabel?: string;
  eyebrow?: string;
  onView?: () => void;
};

export default function UpgradePromptDialog({
  open,
  title,
  description,
  benefits,
  onClose,
  onRemindLater,
  onUpgrade,
  continueLabel = "Keep tracking free",
  upgradeLabel = "View Pro",
  remindLaterLabel = "Remind me later",
  eyebrow = "Pro",
  onView,
}: UpgradePromptDialogProps) {
  useEffect(() => {
    if (open) {
      onView?.();
    }
    // Track a view once per open state transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1 }}>
        <Stack spacing={0.5}>
          <Typography variant="overline" sx={{ color: "text.secondary" }}>
            {eyebrow}
          </Typography>
          <Typography variant="h6" component="span">
            {title}
          </Typography>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={1.5}>
          <Typography sx={{ color: "text.secondary" }}>{description}</Typography>
          <List disablePadding>
            {benefits.map((benefit) => (
              <ListItem key={benefit} disableGutters sx={{ py: 0.5 }}>
                <ListItemText primary={benefit} />
              </ListItem>
            ))}
          </List>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        {onRemindLater ? <Button onClick={onRemindLater}>{remindLaterLabel}</Button> : null}
        <Button onClick={onClose}>{continueLabel}</Button>
        <Button variant="contained" onClick={onUpgrade}>
          {upgradeLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
