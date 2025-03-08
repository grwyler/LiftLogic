import React, { Fragment } from "react";
import { Button } from "react-bootstrap";
import { FaEdit, FaPlus, FaTrash } from "react-icons/fa";

const CRUDMenu = ({
  handleCreate = undefined,
  canRead,
  handleUpdate = undefined,
  handleDelete = undefined,
}) => {
  const myHandleCreate = (e) => {
    if (handleCreate) {
      e.stopPropagation();
      handleCreate(e);
    }
  };
  const myHandleUpdate = (e) => {
    if (handleUpdate) {
      e.stopPropagation();
      handleUpdate(e);
    }
  };
  const myHandleDelete = (e) => {
    if (handleDelete) {
      e.stopPropagation();
      handleDelete(e);
    }
  };
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {canRead && (
        <div
          className="rounded d-flex flex-column align-items-center mt-4"
          style={{
            position: "absolute",
            top: "0", // Adjust as needed
            right: "0", // Align to the right of the parent
            zIndex: 3,
            backgroundColor: "white",
            boxShadow: "0px 8px 16px 0px rgba(0,0,0,0.2)",
            padding: "8px",
            borderRadius: "6px",
          }}
        >
          {handleCreate && (
            <>
              <Button variant="white text-success" onClick={myHandleCreate}>
                <FaPlus />
              </Button>
              <hr className="w-100 my-1" />
            </>
          )}
          {handleUpdate && (
            <Button variant="white" onClick={myHandleUpdate}>
              <FaEdit />
            </Button>
          )}
          {handleDelete && (
            <>
              <hr className="w-100 my-1" />
              <Button variant="white text-danger" onClick={myHandleDelete}>
                <FaTrash />
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CRUDMenu;
