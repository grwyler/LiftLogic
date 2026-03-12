import React, { useState } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import LoginIcon from "@mui/icons-material/Login";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

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
      const response = await fetch(`/api/user?id=${userId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Failed to delete user ${userId}`);
      }
      await fetchUsers();
      setIsDeletingUser(false);
    } catch (deleteError) {
      console.error("Error deleting user:", deleteError);
      setError(deleteError instanceof Error ? deleteError.message : String(deleteError));
      setIsDeletingUser(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 1,
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "rgba(255,255,255,0.42)",
        p: 1.25,
        borderRadius: 2.5,
      }}
    >
      <Box>
        <Typography sx={{ fontWeight: 700 }}>{user.username}</Typography>
        <Typography variant="body2" color="text.secondary">
          Local test account
        </Typography>
      </Box>

      <Box sx={{ display: "flex", gap: 1 }}>
        <Button
          variant="outlined"
          size="small"
          title="Sign in as this user"
          onClick={() => {
            setUsername(user.username);
            setPassword(user.password);
            handleSubmit(user.username, user.password);
          }}
          startIcon={<LoginIcon fontSize="small" />}
        >
          Use
        </Button>

        <Button
          variant="outlined"
          color="error"
          size="small"
          title="Delete this user"
          onClick={() => handleDeleteUser(user._id)}
          startIcon={
            isDeletingUser ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <DeleteOutlineIcon fontSize="small" />
            )
          }
        >
          Delete
        </Button>
      </Box>
    </Box>
  );
};

export default UserTable;
