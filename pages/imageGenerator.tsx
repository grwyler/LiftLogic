import React, { useState } from "react";
import { Alert, Box, Button, CircularProgress, Paper, Stack, TextField } from "@mui/material";
import { getImageFromOpenAI } from "../utils/helpers";

const ImageGeneratorHome = () => {
  const [userPrompt, setUserPrompt] = useState("");
  const [image, setImage] = useState("/images/image.jpg");
  const [loading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerateImage = async () => {
    await getImageFromOpenAI(setImage, setIsLoading, userPrompt, setError);
  };

  return (
    <Box sx={{ px: 2, py: 2.5 }}>
      <Paper
        elevation={0}
        sx={{
          maxWidth: 960,
          mx: "auto",
          p: 2,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
            <TextField
              fullWidth
              label="Describe the image"
              value={userPrompt}
              onChange={(event) => {
                setUserPrompt(event.target.value);
                if (error) {
                  setError("");
                }
              }}
            />
            <Button
              variant="contained"
              disabled={userPrompt === "" || loading}
              onClick={handleGenerateImage}
              sx={{ minWidth: { sm: 160 } }}
            >
              {loading ? "Generating..." : "Generate"}
            </Button>
          </Stack>

          {error ? <Alert severity="error">{error}</Alert> : null}

          {loading ? (
            <Box sx={{ display: "grid", placeItems: "center", minHeight: 220 }}>
              <CircularProgress />
            </Box>
          ) : image ? (
            <Box
              component="img"
              src={image}
              alt="Generated result"
              sx={{
                width: "100%",
                borderRadius: 2.5,
                border: "1px solid",
                borderColor: "divider",
              }}
            />
          ) : null}
        </Stack>
      </Paper>
    </Box>
  );
};

export default ImageGeneratorHome;
