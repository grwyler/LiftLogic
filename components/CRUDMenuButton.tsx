import React from "react";
import { Button } from "react-bootstrap";
import { FaEllipsisH } from "react-icons/fa";
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
    <div>
      <Button
        size="sm"
        variant={
          show
            ? "outline-dark"
            : darkMode
            ? "bg-custom-dark text-white"
            : "white"
        }
        className="ms-2 p-2"
        onClick={(e) => {
          e.stopPropagation(); // Prevents parent click handlers from triggering
          onClickMenuButton();
        }}
      >
        <FaEllipsisH />
      </Button>
      <CRUDMenu
        canRead={show}
        handleDelete={handleDelete}
        handleUpdate={handleUpdate}
      />
    </div>
  );
};

export default CRUDMenuButton;
