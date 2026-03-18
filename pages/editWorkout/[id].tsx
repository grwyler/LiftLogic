import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Box, IconButton, Paper, Stack, Typography } from "@mui/material";
import { IoIosList } from "react-icons/io";
import { FaDumbbell } from "react-icons/fa";

const EditWorkoutPage = () => {
  const router = useRouter();
  const { id } = router.query;

  return (
    <Box sx={{ px: 2, py: 2.5 }}>
      <Paper
        elevation={0}
        sx={{
          maxWidth: 820,
          mx: "auto",
          p: 2,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <IconButton component={Link} href="/routines" aria-label="Back to workouts">
              <IoIosList />
            </IconButton>
            <IconButton
              component={Link}
              href={typeof id === "string" ? `/workout/${id}` : "/routines"}
              aria-label="Open workout"
            >
              <FaDumbbell />
            </IconButton>
          </Stack>
          <Typography variant="h4" sx={{ textAlign: "center" }}>
            Edit Workout with ID: {id}
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
};

export default EditWorkoutPage;
