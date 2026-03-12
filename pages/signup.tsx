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
  Card,
  CardContent,
  InputAdornment,
  IconButton,
} from "@mui/material";
import LoginIcon from "@mui/icons-material/Login";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

const SignUp: React.FC = () => {
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSigningIn(true);
      setError("");
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setIsSigningIn(false);
        setError(data?.message ? `Error during registration: ${data.message}` : "Error during registration.");
        return;
      }
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });
      if (!result?.error) {
        console.log("User registered successfully!");
        router.push("/user");
      } else {
        setIsSigningIn(false);
        setError("Account created, but automatic sign-in failed.");
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
      {/* Sign-Up Form */}(
      <Card
        elevation={4}
        sx={{
          width: "100%",
          maxWidth: 420,
          mx: "auto",
          mt: 6,
          borderRadius: 3,
        }}
      >
        <CardContent
          component="form"
          onSubmit={handleSubmit}
          sx={{
            p: { xs: 3, sm: 4 },
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          {/* header */}
          <Typography variant="h5" fontWeight={600} textAlign="center">
            Create your account
          </Typography>

          {/* username */}
          <TextField
            id="username"
            label="Username or Email"
            variant="outlined"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailOutlinedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          {/* password w/ toggle */}
          <TextField
            id="password"
            label="Password"
            variant="outlined"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    onClick={() => setShowPassword((p) => !p)}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* CTA */}
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={!username || !password || isSigningIn}
            sx={{
              textTransform: "none",
              height: 48,
              fontSize: "1rem",
              borderRadius: 2,
            }}
            startIcon={
              isSigningIn ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <LoginIcon />
              )
            }
          >
            {isSigningIn ? "Signing up…" : "Sign up"}
          </Button>

          {/* footer */}
          <Typography variant="body2" textAlign="center" color="text.secondary">
            Already have an account?{" "}
            <NextLink href="/" passHref legacyBehavior>
              <Link underline="hover">Sign in</Link>
            </NextLink>
          </Typography>

          {error && (
            <Typography variant="body2" color="error" textAlign="center">
              {error}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default SignUp;
