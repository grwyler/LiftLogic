import React from "react";
import { Box, Button, Chip, Stack } from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
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
        mt: 2.5,
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
          alignItems: "center",
          justifyContent: { xs: "space-between", sm: "flex-start" },
          gap: 1.25,
          flexWrap: "wrap",
        }}
      >
        <Chip
          icon={<FitnessCenterIcon />}
          label="Active Plan"
          sx={{
            borderRadius: "999px",
            backgroundColor: darkMode
              ? "rgba(96,165,250,0.16)"
              : "rgba(59,130,246,0.1)",
            color: "text.primary",
            border: "1px solid",
            borderColor: darkMode
              ? "rgba(125,211,252,0.24)"
              : "rgba(59,130,246,0.18)",
          }}
        />
        <Button
          onClick={() => router.push("/user")}
          variant="text"
          sx={{
            justifyContent: "flex-start",
            color: "text.primary",
            px: 1,
            "&:hover": {
              backgroundColor: "transparent",
              opacity: 0.75,
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
            borderColor: "divider",
            color: "text.primary",
            backgroundColor: darkMode
              ? "rgba(255,255,255,0.04)"
              : "rgba(255,255,255,0.52)",
          }}
        >
          {darkMode ? "Light" : "Dark"}
        </Button>
        <Button
          onClick={handleSignOut}
          variant="contained"
          startIcon={<LogoutIcon />}
          sx={{
            background:
              "linear-gradient(135deg, rgba(37,99,235,1) 0%, rgba(14,165,233,1) 100%)",
            color: "#eff6ff",
            "&:hover": {
              background:
                "linear-gradient(135deg, rgba(29,78,216,1) 0%, rgba(2,132,199,1) 100%)",
            },
          }}
        >
          Sign Out
        </Button>
      </Stack>
    </Box>
  );
};

export default Header;
