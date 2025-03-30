import React from "react";
import { Box, Button, Divider } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

type CRUDMenuProps = {
  darkMode?: boolean;
  handleCreate?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  canRead: boolean;
  handleUpdate?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  handleDelete?: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

const CRUDMenu: React.FC<CRUDMenuProps> = ({
  handleCreate,
  canRead,
  handleUpdate,
  handleDelete,
}) => {
  const myHandleCreate = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (handleCreate) {
      e.stopPropagation();
      handleCreate(e);
    }
  };

  const myHandleUpdate = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (handleUpdate) {
      e.stopPropagation();
      handleUpdate(e);
    }
  };

  const myHandleDelete = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (handleDelete) {
      e.stopPropagation();
      handleDelete(e);
    }
  };

  return (
    <Box sx={{ position: "relative", display: "inline-block" }}>
      {canRead && (
        <Box
          sx={{
            position: "absolute",
            top: 20,
            right: 0,
            zIndex: 3,
            backgroundColor: "white",
            boxShadow: "0px 8px 16px 0px rgba(0,0,0,0.2)",
            p: 1,
            borderRadius: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {handleCreate && (
            <>
              <Button
                onClick={myHandleCreate}
                sx={{
                  color: "green",
                  minWidth: "auto",
                  p: 0.5,
                }}
              >
                <AddIcon />
              </Button>
              <Divider sx={{ width: "100%", my: 0.5 }} />
            </>
          )}
          {handleUpdate && (
            <Button
              onClick={myHandleUpdate}
              sx={{
                color: "inherit",
                minWidth: "auto",
                p: 0.5,
              }}
            >
              <EditIcon />
            </Button>
          )}
          {handleDelete && (
            <>
              <Divider sx={{ width: "100%", my: 0.5 }} />
              <Button
                onClick={myHandleDelete}
                sx={{
                  color: "red",
                  minWidth: "auto",
                  p: 0.5,
                }}
              >
                <DeleteIcon />
              </Button>
            </>
          )}
        </Box>
      )}
    </Box>
  );
};

export default CRUDMenu;
