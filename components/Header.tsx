import React from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { signOut } from "next-auth/react";
import { useRouter } from "next/router";

const Header = ({ user, setUser, setDarkMode, darkMode }) => {
  const router = useRouter();
  const { username } = user;

  const handleSignOut = async () => {
    try {
      setUser({ ...user, darkMode: false });
      await signOut({ redirect: true, callbackUrl: "/" });
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <Box
      sx={{
        mt: 2.75,
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        justifyContent: "space-between",
        alignItems: { xs: "stretch", sm: "center" },
        gap: 1.5,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 0.35,
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
            fontSize: "1rem",
            fontWeight: 700,
            "&:hover": {
              backgroundColor: "transparent",
              opacity: 0.78,
            },
          }}
        >
          {username}
        </Button>
      </Box>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
        <Button
          onClick={() => setDarkMode((prev) => !prev)}
          variant="outlined"
          startIcon={darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
          sx={{
            color: "text.primary",
          }}
        >
          {darkMode ? "Light" : "Dark"}
        </Button>
        <Button
          onClick={handleSignOut}
          variant="contained"
          startIcon={<LogoutIcon />}
        >
          Sign Out
        </Button>
      </Stack>
    </Box>
  );
};

export default Header;
