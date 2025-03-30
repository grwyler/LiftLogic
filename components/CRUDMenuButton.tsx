import React from "react";
import { Box, IconButton } from "@mui/material";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import CRUDMenu from "./CRUDMenu";

type ExerciseMenuProps = {
  darkMode: boolean;
  handleDelete: () => void;
  handleUpdate: () => void;
  onClickMenuButton: () => void;
  show: boolean;
};

const CRUDMenuButton: React.FC<ExerciseMenuProps> = ({
  darkMode,
  handleDelete,
  handleUpdate,
  onClickMenuButton,
  show,
}) => {
  return (
    <Box position="relative">
      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation(); // Prevents parent click handlers from triggering
          onClickMenuButton();
        }}
        sx={{
          ml: 1,
          // Subtle background highlight only if menu is open or on hover
          backgroundColor: show
            ? darkMode
              ? "grey.700"
              : "grey.200"
            : "transparent",
          color: darkMode ? "#fff" : "inherit",
          "&:hover": {
            backgroundColor: darkMode ? "grey.700" : "grey.200",
          },
          transition: "background-color 0.2s",
        }}
      >
        <MoreHorizIcon />
      </IconButton>

      <CRUDMenu
        canRead={show}
        handleDelete={handleDelete}
        handleUpdate={handleUpdate}
      />
    </Box>
  );
};

export default CRUDMenuButton;
