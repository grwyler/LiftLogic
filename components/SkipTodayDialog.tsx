import React from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button as MUIButton,
} from "@mui/material";
import { format, isValid } from "date-fns";

type Props = {
  open: boolean;
  onClose: () => void;
  onSkipToday: () => void;
  targetDate: Date | string;
  isRepeating?: boolean;
};

const SkipTodayDialog: React.FC<Props> = ({
  open,
  onClose,
  onSkipToday,
  targetDate,
  isRepeating = false,
}) => {
  const dateObj = targetDate instanceof Date ? targetDate : new Date(targetDate);
  const isDateValid = isValid(dateObj);
  const fullDate = isDateValid ? format(dateObj, "PPP") : "this day";
  const shortDate = isDateValid ? format(dateObj, "MMM d") : "today";

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Skip this exercise for today?</DialogTitle>

      <DialogContent>
        <p>
          Skip this exercise for <b>{fullDate}</b> without deleting it from your
          workout history
          {isRepeating ? " or changing the recurring schedule." : "."}
        </p>
      </DialogContent>

      <DialogActions>
        <MUIButton variant="outlined" onClick={onClose}>
          Keep it scheduled
        </MUIButton>
        <MUIButton variant="contained" onClick={onSkipToday}>
          Skip for {shortDate}
        </MUIButton>
      </DialogActions>
    </Dialog>
  );
};

export default SkipTodayDialog;
