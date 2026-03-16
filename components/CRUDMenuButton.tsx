import React, { useState } from "react";
import {
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
} from "@mui/material";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SkipNextOutlinedIcon from "@mui/icons-material/SkipNextOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

type ExerciseMenuProps = {
  darkMode: boolean;
  handleDelete: () => void;
  handleSkipToday?: () => void;
  handleUpdate: () => void;
  deleteLabel?: string;
  onClickMenuButton?: () => void;
  skipLabel?: string;
  show?: boolean;
};

const CRUDMenuButton: React.FC<ExerciseMenuProps> = ({
  darkMode,
  handleDelete,
  handleSkipToday,
  handleUpdate,
  deleteLabel = "Delete exercise",
  onClickMenuButton,
  skipLabel = "Skip for today",
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    onClickMenuButton?.();
  };

  const handleClose = (event?: React.SyntheticEvent) => {
    event?.stopPropagation?.();
    setAnchorEl(null);
  };

  const handleEdit = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    handleClose();
    handleUpdate();
  };

  const handleDeleteClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    handleClose();
    handleDelete();
  };

  const handleSkipClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    handleClose();
    handleSkipToday?.();
  };

  return (
    <>
      <IconButton
        size="small"
        onClick={handleOpen}
        sx={{
          ml: 1,
          border: "1px solid",
          borderColor: open ? "divider" : "transparent",
          backgroundColor: open
            ? darkMode
              ? "rgba(255,255,255,0.06)"
              : "rgba(15,23,42,0.05)"
            : "transparent",
          color: darkMode ? "#fff" : "inherit",
          "&:hover": {
            backgroundColor: darkMode
              ? "rgba(255,255,255,0.08)"
              : "rgba(15,23,42,0.06)",
          },
          transition: "background-color 0.2s ease, border-color 0.2s ease",
        }}
      >
        <MoreHorizIcon fontSize="small" />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          elevation: 0,
          sx: {
            mt: 0.75,
            minWidth: 180,
            borderRadius: 2.5,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: darkMode
              ? "0 16px 40px rgba(0,0,0,0.28)"
              : "0 16px 36px rgba(15,23,42,0.12)",
            overflow: "hidden",
          },
        }}
        MenuListProps={{
          dense: true,
          onClick: (event) => event.stopPropagation(),
        }}
      >
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit exercise</ListItemText>
        </MenuItem>

        {handleSkipToday ? (
          <MenuItem onClick={handleSkipClick}>
            <ListItemIcon>
              <SkipNextOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{skipLabel}</ListItemText>
          </MenuItem>
        ) : null}

        <MenuItem
          onClick={handleDeleteClick}
          sx={{ color: "error.main" }}
        >
          <ListItemIcon sx={{ color: "error.main" }}>
            <DeleteOutlineIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{deleteLabel}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default CRUDMenuButton;
