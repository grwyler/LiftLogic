import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button as MUIButton,
} from "@mui/material";
import { format, isValid } from "date-fns";

type Props = {
  open: boolean;
  onClose: () => void;
  onDeleteToday: () => void;
  onDeleteAll: () => void;
  targetDate: Date | string;
};

const DeleteDialog: React.FC<Props> = ({
  open,
  onClose,
  onDeleteToday,
  onDeleteAll,
  targetDate,
}) => {
  const dateObj =
    targetDate instanceof Date ? targetDate : new Date(targetDate);
  const isDateValid = isValid(dateObj);
  const fullDate = isDateValid ? format(dateObj, "PPP") : "this day";
  const weekDay = isDateValid ? format(dateObj, "EEEE") : "this weekday";
  const shortDate = isDateValid ? format(dateObj, "MMM d") : "this day";

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Remove this exercise?</DialogTitle>

      <DialogContent>
        <p>
          Remove this exercise only from <b>{fullDate}</b>, or stop scheduling
          it on future <b>{weekDay}s</b>? Past logged history will stay the
          same.
        </p>
      </DialogContent>

      <DialogActions>
        <MUIButton variant="outlined" onClick={onDeleteToday}>
          Remove only for {shortDate}
        </MUIButton>
        <MUIButton color="error" onClick={onDeleteAll}>
          Stop future {weekDay} repeats
        </MUIButton>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteDialog;
