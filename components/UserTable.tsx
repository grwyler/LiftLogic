import React, { useState } from "react";
import { Box, Button } from "@mui/material";
import { FaSignInAlt, FaTrash } from "react-icons/fa";
import LoadingIndicator from "./LoadingIndicator";

const UserTable = ({
  user,
  setUsername,
  setPassword,
  handleSubmit,
  fetchUsers,
  setError,
}) => {
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const handleDeleteUser = async (userId) => {
    try {
      setIsDeletingUser(true);
      await fetch(`/api/user?id=${userId}`, { method: "DELETE" });
      await fetchUsers();
      setIsDeletingUser(false);
    } catch (error) {
      console.error("Error deleting user:", error);
      setError(error);
      setIsDeletingUser(false);
    }
  };

  return (
    <Box
      key={user._id}
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        bgcolor: "grey.100",
        border: "1px solid",
        borderColor: "grey.300",
        p: 2,
        borderRadius: 1,
      }}
    >
      <Button
        variant="outlined"
        size="small"
        title="Sign in as this user"
        onClick={() => {
          setUsername(user.username);
          setPassword(user.password);
          handleSubmit(user.username, user.password);
        }}
        startIcon={<FaSignInAlt style={{ color: "blue" }} />}
      >
        {user.username}
      </Button>

      <Button
        variant="outlined"
        size="small"
        title="Delete this user"
        onClick={() => handleDeleteUser(user._id)}
      >
        {isDeletingUser ? (
          <LoadingIndicator />
        ) : (
          <FaTrash style={{ color: "red" }} />
        )}
      </Button>
    </Box>
  );
};

export default UserTable;
