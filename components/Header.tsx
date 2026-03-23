import React from "react";
import { Button, Stack, Typography } from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import { signOut } from "next-auth/react";
import { useRouter } from "next/router";

const routinesHeaderRadius = {
  button: "18px",
} as const;

const Header = ({ user, darkMode }) => {
  const router = useRouter();
  const { username } = user;

  const handleSignOut = async () => {
    try {
      await signOut({ redirect: true, callbackUrl: "/" });
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <Stack
      sx={{
        mt: 2.5,
        gap: 1.15,
        alignItems: "stretch",
        width: "100%",
        minWidth: 0,
      }}
    >
      <Stack
        spacing={0.45}
        sx={{
          px: { xs: 0.1, sm: 0.25 },
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Signed in as
        </Typography>
        <Button
          onClick={() => router.push("/user")}
          variant="text"
          sx={{
            justifyContent: "flex-start",
            color: "text.primary",
            px: 0,
            minWidth: 0,
            maxWidth: "100%",
            fontSize: "1rem",
            fontWeight: 700,
            overflowWrap: "anywhere",
            wordBreak: "break-word",
            "&:hover": {
              backgroundColor: "transparent",
              opacity: 0.78,
            },
          }}
        >
          {username}
        </Button>
      </Stack>
      <Stack direction="column" spacing={1}>
        <Button
          onClick={() => router.push("/feedback")}
          variant="outlined"
          startIcon={<CampaignOutlinedIcon />}
          sx={{
            color: "text.primary",
            justifyContent: "center",
            borderRadius: routinesHeaderRadius.button,
          }}
        >
          Feedback
        </Button>
        <Button
          onClick={handleSignOut}
          variant="contained"
          startIcon={<LogoutIcon />}
          sx={{ borderRadius: routinesHeaderRadius.button }}
        >
          Sign Out
        </Button>
      </Stack>
    </Stack>
  );
};

export default Header;
