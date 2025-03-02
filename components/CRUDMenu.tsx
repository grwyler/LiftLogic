import React, { Fragment } from "react";
import { Button } from "react-bootstrap";
import { FaEdit, FaPlus, FaTrash } from "react-icons/fa";

const CRUDMenu = ({
  handleCreate = undefined,
  canRead,
  handleUpdate = undefined,
  handleDelete = undefined,
}) => {
  return (
    <Fragment>
      {canRead && (
        <div
          className="rounded d-flex justify-content-center align-items-center"
          style={{
            position: "absolute",
            zIndex: 3,
            backgroundColor: "white",
            boxShadow: "0px 8px 16px 0px rgba(0,0,0,0.2)",
          }}
        >
          {handleCreate && (
            <Fragment>
              <Button variant="white text-success" onClick={handleCreate}>
                <FaPlus />
              </Button>
              <hr />
            </Fragment>
          )}
          {handleUpdate && (
            <Button variant="white" onClick={handleUpdate}>
              <FaEdit />
            </Button>
          )}
          {handleDelete && (
            <Fragment>
              <hr />
              <Button variant="white text-danger" onClick={handleDelete}>
                <FaTrash />
              </Button>
            </Fragment>
          )}
        </div>
      )}
    </Fragment>
  );
};

export default CRUDMenu;
