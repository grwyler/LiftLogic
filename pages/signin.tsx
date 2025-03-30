"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import NextLink from "next/link";
import { signIn } from "next-auth/react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Link,
  CircularProgress,
} from "@mui/material";
import { FaSignInAlt } from "react-icons/fa";
import UserTable from "../components/UserTable";
import LoadingIndicator from "../components/LoadingIndicator";

const SignIn = () => {
  const [users, setUsers] = useState([]);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/user");
      const data = await response.json();
      if (data.users && Object.keys(data.users).length > 0) {
        setUsers(data.users);
      }
      setIsLoadingUsers(false);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Error fetching users");
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (theUsername?: string, thePassword?: string) => {
    setIsSigningIn(true);
    const myUsername = theUsername || username;
    const myPassword = thePassword || password;
    const result = await signIn("credentials", {
      username: myUsername,
      password: myPassword,
      redirect: false,
    });
    if (result.error) {
      setError("👀👀 we don't know you");
      setIsSigningIn(false);
    } else {
      router.push("/routines");
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        mt: 4,
        px: 2,
      }}
    >
      <Box
        component="form"
        sx={{ width: "50%", maxWidth: 400, justifyContent: "center" }}
      >
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          variant="outlined"
          size="small"
          placeholder="Enter your password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{ mb: 2 }}
        />

        <Button
          ref={submitButtonRef}
          disabled={!username || !password || isSigningIn}
          variant="contained"
          color="primary"
          onClick={() => handleSubmit()}
          sx={{ mb: 2 }}
          startIcon={
            isSigningIn ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <FaSignInAlt />
            )
          }
        >
          {isSigningIn ? "Signing in" : "Sign in"}
        </Button>

        <NextLink href="/signup" passHref legacyBehavior>
          <Link
            variant="body2"
            sx={{ display: "block", mt: 2, width: "100%" }}
            component="a"
          >
            Sign up
          </Link>
        </NextLink>

        {error && (
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </Box>

      {process.env.NEXT_PUBLIC_ENV === "local" && (
        <Box sx={{ mt: 3, width: "100%", maxWidth: 600 }}>
          <Typography variant="h6">Users</Typography>
          {isLoadingUsers ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mt: 2,
              }}
            >
              <LoadingIndicator />
            </Box>
          ) : (
            <>
              {users && users.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No Users
                </Typography>
              )}
              {users &&
                users.map((user) => (
                  <UserTable
                    key={`user-table-column-${user.username}`}
                    user={user}
                    setUsername={setUsername}
                    setPassword={setPassword}
                    handleSubmit={handleSubmit}
                    fetchUsers={fetchUsers}
                    setError={setError}
                  />
                ))}
            </>
          )}
        </Box>
      )}
    </Box>
  );
};

export default SignIn;
