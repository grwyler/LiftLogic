"use client";

import React, { useState } from "react";
import { useRouter } from "next/router";
import NextLink from "next/link";
import { signIn } from "next-auth/react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import FacebookIcon from "@mui/icons-material/Facebook";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import GoogleIcon from "@mui/icons-material/Google";
import { emitDevBugInteraction } from "../utils/devBugRecorder";

const SignUp: React.FC = () => {
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [oauthLoading, setOauthLoading] = useState<"" | "google" | "facebook">(
    ""
  );
  const hasGoogleAuth = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
  const hasFacebookAuth =
    process.env.NEXT_PUBLIC_FACEBOOK_AUTH_ENABLED === "true";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSigningIn(true);
      setError("");
      emitDevBugInteraction({
        type: "submit",
        kind: "semantic",
        label: `Create account for ${username || "user"}`,
        expected: "Account is created and the user is signed in.",
        actual: "Registration form was submitted.",
        status: "info",
      });
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        emitDevBugInteraction({
          type: "lifecycle",
          kind: "semantic",
          label: `Create account failed for ${username || "user"}`,
          expected: "Account is created and the user is signed in.",
          actual: data?.message || `Signup failed with ${response.status}.`,
          status: "failure",
        });
        setIsSigningIn(false);
        setError(
          data?.message
            ? `Error during registration: ${data.message}`
            : "Error during registration."
        );
        return;
      }

      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        emitDevBugInteraction({
          type: "lifecycle",
          kind: "semantic",
          label: `Auto sign-in failed after sign-up for ${username || "user"}`,
          expected: "Account is created and the user is signed in.",
          actual: "Registration succeeded but credentials sign-in failed.",
          status: "failure",
        });
        setIsSigningIn(false);
        setError("Account created, but automatic sign-in failed.");
        return;
      }

      emitDevBugInteraction({
        type: "navigation",
        kind: "semantic",
        label: `Created account for ${username || "user"}`,
        expected: "Account is created and the user is signed in.",
        actual: "Registration and automatic sign-in succeeded.",
        status: "success",
      });
      router.push("/routines");
    } catch (signupError) {
      setIsSigningIn(false);
      setError("Error during registration.");
      console.error("Error during registration:", signupError);
    }
  };

  const handleOAuthSignUp = async (provider: "google" | "facebook") => {
    setError("");
    setOauthLoading(provider);
    emitDevBugInteraction({
      type: "click",
      kind: "semantic",
      label: `Create account with ${provider}`,
      expected: "OAuth sign-up opens and returns to workouts.",
      actual: `Started ${provider} OAuth sign-up.`,
      status: "info",
    });
    try {
      await signIn(provider, { callbackUrl: "/routines" });
    } finally {
      setOauthLoading("");
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        px: { xs: 1.5, sm: 2.5 },
        py: { xs: 2, sm: 3 },
        display: "flex",
        alignItems: "center",
      }}
    >
      <Box
        sx={{
          maxWidth: 1040,
          mx: "auto",
          width: "100%",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 0.95fr" },
          gap: 2,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3.5 },
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 4,
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                display: "grid",
                placeItems: "center",
                backgroundColor: "text.primary",
                color: "background.paper",
              }}
            >
              <FitnessCenterIcon fontSize="small" />
            </Box>
            <Typography variant="overline" sx={{ letterSpacing: "0.14em" }}>
              Lift Logic
            </Typography>
          </Stack>

          <Typography variant="h3" sx={{ mt: 3, maxWidth: 460 }}>
            Set up your training profile in a minute.
          </Typography>
          <Typography sx={{ mt: 1.5, color: "text.secondary", maxWidth: 480 }}>
            Start simple. Create an account, pick your goal, and the app can
            begin adapting weights from what you actually log.
          </Typography>

          <Stack spacing={1.25} sx={{ mt: 4 }}>
            {[
              "Quick-add starts with smarter default weights.",
              "Completed workouts feed progress and recommendation signals.",
              "You can tune units, goal, and notes after sign-up.",
            ].map((item) => (
              <Box
                key={item}
                sx={{
                  px: 1.75,
                  py: 1.4,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 3,
                  backgroundColor: "rgba(255,255,255,0.36)",
                }}
              >
                <Typography sx={{ color: "text.secondary" }}>{item}</Typography>
              </Box>
            ))}
          </Stack>
        </Paper>

        <Paper
          elevation={0}
          component="form"
          onSubmit={handleSubmit}
          sx={{
            p: { xs: 2.5, sm: 3.5 },
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 4,
          }}
        >
          <Typography variant="overline" sx={{ letterSpacing: "0.14em" }}>
            Create Account
          </Typography>
          <Typography variant="h4" sx={{ mt: 1 }}>
            Join Lift Logic
          </Typography>
          <Typography sx={{ mt: 1, color: "text.secondary" }}>
            Use a social login for the smoothest start, or create a username and
            password if you prefer.
          </Typography>

          <Stack spacing={1.5} sx={{ mt: 3.5 }}>
            {(hasGoogleAuth || hasFacebookAuth) && (
              <>
                {hasGoogleAuth && (
                  <Button
                    variant="outlined"
                    startIcon={<GoogleIcon />}
                    onClick={() => handleOAuthSignUp("google")}
                    disabled={Boolean(oauthLoading) || isSigningIn}
                  >
                    {oauthLoading === "google"
                      ? "Opening Google..."
                      : "Continue with Google"}
                  </Button>
                )}

                {hasFacebookAuth && (
                  <Button
                    variant="outlined"
                    startIcon={<FacebookIcon />}
                    onClick={() => handleOAuthSignUp("facebook")}
                    disabled={Boolean(oauthLoading) || isSigningIn}
                  >
                    {oauthLoading === "facebook"
                      ? "Opening Facebook..."
                      : "Continue with Facebook"}
                  </Button>
                )}
              </>
            )}

            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
            />

            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
            />

            <Button
              type="submit"
              variant="contained"
              disabled={
                !username || !password || isSigningIn || Boolean(oauthLoading)
              }
              endIcon={
                isSigningIn ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <ArrowForwardIcon />
                )
              }
            >
              {isSigningIn ? "Creating account" : "Create account"}
            </Button>
          </Stack>

          <Typography sx={{ mt: 2.5, color: "text.secondary" }}>
            Already have an account?{" "}
            <NextLink href="/signin" passHref legacyBehavior>
              <Link underline="hover">Sign in</Link>
            </NextLink>
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mt: 2.5, borderRadius: 2.5 }}>
              {error}
            </Alert>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default SignUp;
