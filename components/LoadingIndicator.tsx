import React from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { keyframes } from "@mui/system";
import { FaDumbbell } from "react-icons/fa";

// Keyframe for the dumbbell: rotates and scales at 50% (doesn't need theme values)
const spinAndScale = keyframes`
  0% {
    transform: rotate(0deg) scale(1);
  }
  50% {
    transform: rotate(180deg) scale(1.2);
  }
  100% {
    transform: rotate(360deg) scale(1);
  }
`;

const LoadingIndicator = () => {
  const theme = useTheme();

  // Define keyframe for the text animation using theme values via template literals.
  const textAnimation = keyframes`
    0% {
      color: ${theme.palette.primary.main};
      transform: scale(1);
    }
    50% {
      color: ${theme.palette.secondary.main};
      transform: scale(1.1);
    }
    100% {
      color: ${theme.palette.primary.main};
      transform: scale(1);
    }
  `;

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      p={5}
      height="100%"
    >
      <Typography
        variant="h6"
        mb={2}
        sx={{
          animation: `${textAnimation} 2s ease-in-out infinite`,
        }}
      >
        Loading...
      </Typography>
      <Box
        component={FaDumbbell}
        sx={{
          fontSize: "3rem",
          animation: `${spinAndScale} 1.5s ease-in-out infinite`,
          color: "primary.main",
        }}
      />
    </Box>
  );
};

export default LoadingIndicator;
