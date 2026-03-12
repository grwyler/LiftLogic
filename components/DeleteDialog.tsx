import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button as MUIButton,
} from "@mui/material";
import { format, formatISO, isValid } from "date-fns";

type Props = {
  open: boolean;
  onClose: () => void;
  onDeleteToday: () => void;
  onDeleteAll: () => void;
  /** The calendar day the user is viewing. Can be a Date or any parse‑able string. */
  targetDate: Date | string;
};

const DeleteDialog: React.FC<Props> = ({
  open,
  onClose,
  onDeleteToday,
  onDeleteAll,
  targetDate,
}) => {
  /* -------------------------------------------------------------- */
  /* Normalise + format dates                                       */
  /* -------------------------------------------------------------- */
  const dateObj =
    targetDate instanceof Date ? targetDate : new Date(targetDate);

  const isDateValid = isValid(dateObj);
  const fullDate = isDateValid ? format(dateObj, "PPP") : "this day"; // e.g. "Jul 22 2025"
  const weekDay = isDateValid ? format(dateObj, "EEEE") : "this weekday"; // e.g. "Tuesday"

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Remove this exercise?</DialogTitle>

      <DialogContent>
        <p>
          Do you want to remove it only from <b>{fullDate}</b> or from{" "}
          <b>every {weekDay}</b>?
        </p>
      </DialogContent>

      <DialogActions>
        <MUIButton variant="outlined" onClick={onDeleteToday}>
          Only {fullDate}
        </MUIButton>
        <MUIButton color="error" onClick={onDeleteAll}>
          All {weekDay}s
        </MUIButton>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteDialog;
