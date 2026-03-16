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
  onDeleteAll: () => void;
  targetDate: Date | string;
};

const DeleteDialog: React.FC<Props> = ({
  open,
  onClose,
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
      <DialogTitle>Delete this recurring schedule?</DialogTitle>

      <DialogContent>
        <p>
          This will stop scheduling this exercise on future <b>{weekDay}s</b>.
          If you only want to skip <b>{fullDate}</b>, use the dedicated skip
          action instead. Past logged history will stay the same.
        </p>
      </DialogContent>

      <DialogActions>
        <MUIButton variant="outlined" onClick={onClose}>
          Keep schedule
        </MUIButton>
        <MUIButton color="error" onClick={onDeleteAll}>
          Delete future {weekDay} repeats
        </MUIButton>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteDialog;
