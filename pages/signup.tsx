"use client";

import React, { useState } from "react";
import { useRouter } from "next/router";
import NextLink from "next/link";
import { signIn } from "next-auth/react";
import Image from "next/image";
import {
  Box,
  Button,
  TextField,
  Typography,
  Link,
  CircularProgress,
} from "@mui/material";
import LoginIcon from "@mui/icons-material/Login";

const SignUp: React.FC = () => {
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSigningIn(true);
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });
      if (response.ok && result) {
        console.log("User registered successfully!");
        router.push("/user");
      } else {
        setIsSigningIn(false);
        setError("Error during registration: " + response.statusText);
      }
    } catch (error) {
      setIsSigningIn(false);
      setError("Error during registration.");
      console.error("Error during registration:", error);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        textAlign: "center",
        backgroundColor: "#f4f4f4",
        padding: 3,
      }}
    >
      {/* Hero Section */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          maxWidth: 500,
          padding: 4,
          borderRadius: 3,
          boxShadow: "0px 8px 20px rgba(0,0,0,0.1)",
          background: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(10px)",
        }}
      >
        {/* Logo with Glow Effect */}
        <Box
          sx={{
            width: 150,
            height: 150,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#fff",
            boxShadow: "0px 4px 10px rgba(0, 255, 100, 0.5)", // Subtle Glow Effect
            padding: 2,
            mb: 2,
          }}
        >
          <Image
            src="/liftlogic-logo.png"
            alt="LiftLogic Logo"
            width={130}
            height={130}
            style={{ borderRadius: "50%" }} // Make logo circular
          />
        </Box>

        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Welcome to LiftLogic
        </Typography>
        <Typography variant="body1" color="textSecondary" gutterBottom>
          The smartest way to track and optimize your fitness progress
        </Typography>
      </Box>

      {/* Sign-Up Form */}
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          width: "100%",
          maxWidth: 400,
          p: 3,
          mt: 3,
          boxShadow: 3,
          borderRadius: 2,
          border: "1px solid #ddd",
          backgroundColor: "white",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <TextField
          id="username"
          label="Username"
          variant="outlined"
          size="medium"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          fullWidth
        />

        <TextField
          id="password"
          label="Password"
          variant="outlined"
          size="medium"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
        />

        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={!username || !password || isSigningIn}
          sx={{
            height: 45,
            fontSize: "1rem",
            borderRadius: 2,
            textTransform: "none",
          }}
          startIcon={
            isSigningIn ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <LoginIcon />
            )
          }
        >
          {isSigningIn ? "Signing in" : "Sign up"}
        </Button>

        <NextLink href="/" passHref legacyBehavior>
          <Link variant="body2" align="center">
            Sign in
          </Link>
        </NextLink>

        {error && (
          <Typography variant="body2" color="error" align="center">
            {error}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default SignUp;
