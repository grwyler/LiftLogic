import React, { useState } from "react";
import { Button } from "react-bootstrap";
import { FaSignInAlt, FaSpinner, FaTrash } from "react-icons/fa";

const UserTable = ({
  user,
  setUsername,
  setPassword,
  handleSubmit,
  fetchUsers,
  setError,
}) => {
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const handleDeleteUser = async (userId: string) => {
    try {
      setIsDeletingUser(true);
      await fetch(`/api/user?id=${userId}`, {
        method: "DELETE",
      });

      // Fetch updated user list after deletion
      await fetchUsers();
      setIsDeletingUser(false);
    } catch (error) {
      console.error("Error deleting user:", error);
      setError(error);
      setIsDeletingUser(false);
    }
  };
  return (
    <div
      className="d-flex justify-content-between bg-light border border-white p-3"
      key={user._id}
    >
      <Button
        size="sm"
        variant="light"
        title="signin as this pussy"
        onClick={() => {
          setUsername(user.username);
          setPassword(user.password);
          handleSubmit(user.username, user.password);
        }}
      >
        <FaSignInAlt className="text-primary" /> {user.username}
      </Button>

      <Button
        size="sm"
        variant="light"
        title="delete this pussy"
        onClick={() => handleDeleteUser(user._id)}
      >
        {isDeletingUser ? (
          <div className="spinning">
            <FaSpinner />
          </div>
        ) : (
          <FaTrash className="text-danger" />
        )}
      </Button>
    </div>
  );
};

export default UserTable;
