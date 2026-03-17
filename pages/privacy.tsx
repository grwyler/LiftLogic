import React from "react";
import { Box, Container, Divider, Paper, Stack, Typography } from "@mui/material";

const sections = [
  {
    title: "Information We Collect",
    body: [
      "Lift Logic collects the account and training information you provide to run the app. This can include a username, password, email address, name, workout preferences, training goals, equipment access, workout schedule, workout logs, notes, limitations, and feedback you choose to submit.",
      "If you use optional billing features, we store subscription metadata such as billing plan, subscription status, Stripe customer identifiers, and related purchase state. Payment card details are handled by Stripe and are not stored directly by Lift Logic.",
      "If you use optional AI-powered features, prompts and related workout context may be sent to OpenAI or a configured AI gateway so the app can generate workout plans, coach replies, or image results.",
      "We may also store device and diagnostic context when you submit feedback or when bug reporting is enabled, including page route, app version, viewport size, user agent, and error details.",
    ],
  },
  {
    title: "How We Use Information",
    body: [
      "We use your information to create and secure your account, save your workout plan and logs, provide coaching and planning features, process subscriptions, respond to feedback, improve product quality, and troubleshoot problems.",
      "We do not use your training data to sell advertising profiles.",
    ],
  },
  {
    title: "Sharing",
    body: [
      "We share information only as needed to operate the service. This includes service providers such as MongoDB for data storage, Stripe for billing, Google or Facebook for optional social sign-in if enabled, and OpenAI or a configured AI gateway for AI features.",
      "We may also disclose information if required to comply with law, enforce our terms, or protect users and the service.",
    ],
  },
  {
    title: "Retention",
    body: [
      "We keep account, workout, and billing-related records for as long as your account remains active and as reasonably necessary to operate the service, comply with legal obligations, resolve disputes, and enforce agreements.",
    ],
  },
  {
    title: "Security",
    body: [
      "We use reasonable administrative, technical, and organizational safeguards designed to protect information in transit and at rest. No method of storage or transmission is completely secure, so we cannot guarantee absolute security.",
    ],
  },
  {
    title: "Your Choices",
    body: [
      "You can update much of your workout profile information inside the app. If you want to request account or data deletion, contact us using the email address below.",
    ],
  },
  {
    title: "Contact",
    body: [
      "For privacy questions or deletion requests, contact: grwyler@gmail.com",
    ],
  },
];

const PrivacyPage: React.FC = () => {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, sm: 6 } }}>
      <Paper elevation={0} sx={{ p: { xs: 3, sm: 4 }, border: "1px solid", borderColor: "divider" }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="overline" sx={{ letterSpacing: "0.14em" }}>
              Lift Logic
            </Typography>
            <Typography variant="h3" sx={{ mt: 1 }}>
              Privacy Policy
            </Typography>
            <Typography sx={{ mt: 1.5, color: "text.secondary" }}>
              Effective date: March 16, 2026
            </Typography>
            <Typography sx={{ mt: 1.5, color: "text.secondary", lineHeight: 1.75 }}>
              This policy describes what information Lift Logic collects, how it is
              used, and the choices available to users of the service.
            </Typography>
          </Box>

          <Divider />

          {sections.map((section) => (
            <Stack key={section.title} spacing={1.25}>
              <Typography variant="h5">{section.title}</Typography>
              {section.body.map((paragraph) => (
                <Typography key={paragraph} sx={{ color: "text.secondary", lineHeight: 1.75 }}>
                  {paragraph}
                </Typography>
              ))}
            </Stack>
          ))}
        </Stack>
      </Paper>
    </Container>
  );
};

export default PrivacyPage;
