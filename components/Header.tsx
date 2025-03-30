import React from "react";
import { Box, Button } from "@mui/material";
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
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      gap={2}
      margin={2}
    >
      <Button
        onClick={() => router.push("/user")}
        variant="contained"
        sx={{
          textTransform: "none",
          backgroundColor: darkMode ? "grey.900" : "grey.100",
          color: darkMode ? "white" : "black",
          transition: "background-color 0.3s ease, transform 0.3s ease",
          "&:hover": {
            backgroundColor: darkMode ? "grey.800" : "grey.200",
            transform: "scale(1.05)",
          },
        }}
      >
        {username}
      </Button>
      <Button
        onClick={handleSignOut}
        variant="contained"
        startIcon={<LogoutIcon />}
        sx={{
          textTransform: "none",
          backgroundColor: darkMode ? "grey.900" : "grey.100",
          color: darkMode ? "white" : "black",
          transition: "background-color 0.3s ease, transform 0.3s ease",
          "&:hover": {
            backgroundColor: darkMode ? "grey.800" : "grey.200",
            transform: "scale(1.05)",
          },
        }}
      >
        Sign Out
      </Button>
      <Button
        onClick={() => setDarkMode((prev) => !prev)}
        variant="contained"
        startIcon={darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
        sx={{
          textTransform: "none",
          backgroundColor: darkMode ? "grey.900" : "grey.100",
          color: darkMode ? "white" : "black",
          transition: "background-color 0.3s ease, transform 0.3s ease",
          "&:hover": {
            backgroundColor: darkMode ? "grey.800" : "grey.200",
            transform: "scale(1.05)",
          },
        }}
      >
        {darkMode ? "Light Mode" : "Dark Mode"}
      </Button>
    </Box>
  );
};

export default Header;
