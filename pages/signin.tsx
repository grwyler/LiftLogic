"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/router";
import NextLink from "next/link";
import { signIn } from "next-auth/react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import GoogleIcon from "@mui/icons-material/Google";
import FacebookIcon from "@mui/icons-material/Facebook";
import { emitDevBugInteraction } from "../utils/devBugRecorder";

const SignIn = () => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState("");
  const [oauthLoading, setOauthLoading] = useState<"" | "google" | "facebook">(
    ""
  );
  const router = useRouter();
  const hasGoogleAuth = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
  const hasFacebookAuth =
    process.env.NEXT_PUBLIC_FACEBOOK_AUTH_ENABLED === "true";

  const handleSubmit = async (theUsername?: string, thePassword?: string) => {
    setIsSigningIn(true);
    setError("");
    const myUsername = theUsername || username;
    const myPassword = thePassword || password;
    emitDevBugInteraction({
      type: "submit",
      kind: "semantic",
      label: `Sign in as ${myUsername || "user"}`,
      expected: "User is authenticated and routed to workouts.",
      actual: "Credentials sign-in was submitted.",
      status: "info",
    });
    const result = await signIn("credentials", {
      username: myUsername,
      password: myPassword,
      redirect: false,
    });

    if (result?.error) {
      emitDevBugInteraction({
        type: "lifecycle",
        kind: "semantic",
        label: `Sign in failed for ${myUsername || "user"}`,
        expected: "User is authenticated and routed to workouts.",
        actual: "Credentials were rejected.",
        status: "failure",
      });
      setError("We couldn't sign you in with those credentials.");
      setIsSigningIn(false);
      submitButtonRef.current?.focus();
      return;
    }

    emitDevBugInteraction({
      type: "navigation",
      kind: "semantic",
      label: `Signed in as ${myUsername || "user"}`,
      expected: "User is authenticated and routed to workouts.",
      actual: "Credentials sign-in succeeded.",
      status: "success",
    });
    router.push("/routines");
  };

  const handleOAuthSignIn = async (provider: "google" | "facebook") => {
    setError("");
    setOauthLoading(provider);
    emitDevBugInteraction({
      type: "click",
      kind: "semantic",
      label: `Continue with ${provider}`,
      expected: "OAuth sign-in opens and returns to workouts.",
      actual: `Started ${provider} OAuth sign-in.`,
      status: "info",
    });
    try {
      await signIn(provider, { callbackUrl: "/routines?welcome=1" });
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
      }}
    >
      <Box
        sx={{
          maxWidth: 1080,
          mx: "auto",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1.05fr 0.95fr" },
          gap: 2,
          alignItems: "stretch",
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3.5 },
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 4,
            display: { xs: "none", md: "flex" },
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: { md: 640 },
          }}
        >
          <Box>
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

            <Typography variant="h3" sx={{ mt: 3, maxWidth: 420 }}>
              Train with a cleaner, smarter flow.
            </Typography>
            <Typography
              sx={{
                mt: 1.5,
                maxWidth: 470,
                color: "text.secondary",
                fontSize: "1rem",
              }}
            >
              Open the day, follow the next set, log what actually happened, and
              let the app adapt from there.
            </Typography>
          </Box>

          <Stack spacing={1.25} sx={{ mt: 4 }}>
            {[
              "Planned workouts stay simple and focused.",
              "Completed work turns into progress signals automatically.",
              "Recommendations update from what you really lifted.",
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
          sx={{
            p: { xs: 2.5, sm: 3.5 },
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 4,
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ display: { xs: "flex", md: "none" }, mb: 2 }}
          >
            <Box
              sx={{
                width: 34,
                height: 34,
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

          <Typography variant="overline" sx={{ letterSpacing: "0.14em" }}>
            Sign In
          </Typography>
          <Typography variant="h4" sx={{ mt: 1 }}>
            Welcome back
          </Typography>
          <Typography sx={{ mt: 1, color: "text.secondary" }}>
            Sign in to open your workouts and keep your progression moving.
          </Typography>

          <Box component="form" sx={{ mt: 3.5 }}>
            <Stack spacing={1.5}>
              {(hasGoogleAuth || hasFacebookAuth) && (
                <>
                  {hasGoogleAuth && (
                    <Button
                      variant="outlined"
                      startIcon={<GoogleIcon />}
                      onClick={() => handleOAuthSignIn("google")}
                      disabled={Boolean(oauthLoading)}
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
                      onClick={() => handleOAuthSignIn("facebook")}
                      disabled={Boolean(oauthLoading)}
                    >
                      {oauthLoading === "facebook"
                        ? "Opening Facebook..."
                        : "Continue with Facebook"}
                    </Button>
                  )}

                  <Divider flexItem>or use your username</Divider>
                </>
              )}

              <TextField
                fullWidth
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />

              <TextField
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <Button
                ref={submitButtonRef}
                disabled={!username || !password || isSigningIn}
                variant="contained"
                onClick={() => handleSubmit()}
                endIcon={
                  isSigningIn ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <ArrowForwardIcon />
                  )
                }
                sx={{ mt: 0.5 }}
              >
                {isSigningIn ? "Signing in" : "Open workouts"}
              </Button>
            </Stack>

            <Typography sx={{ mt: 2.5, color: "text.secondary" }}>
              New here?{" "}
              <NextLink href="/signup" passHref legacyBehavior>
                <Link component="a" underline="hover">
                  Create an account
                </Link>
              </NextLink>
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mt: 2.5, borderRadius: 2.5 }}>
                {error}
              </Alert>
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default SignIn;
