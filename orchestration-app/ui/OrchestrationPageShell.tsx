import { Box, Container, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { ReactNode } from "react";
import { orchestrationAppConfig } from "../../utils/orchestrationAppConfig";

type Props = {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  children: ReactNode;
};

export const OrchestrationPageShell = ({
  title,
  description,
  backHref,
  backLabel,
  children,
}: Props) => {
  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Stack spacing={3}>
        <Box>
          {backHref && backLabel ? (
            <Link href={backHref} style={{ textDecoration: "none" }}>
              <Typography color="text.secondary">{backLabel}</Typography>
            </Link>
          ) : null}
          <Typography variant="overline" color="text.secondary">
            {orchestrationAppConfig.platformName}
          </Typography>
          <Typography variant="h4">{title}</Typography>
          {description ? (
            <Typography sx={{ mt: 1, color: "text.secondary", maxWidth: 720 }}>
              {description}
            </Typography>
          ) : null}
        </Box>
        {children}
      </Stack>
    </Container>
  );
};
