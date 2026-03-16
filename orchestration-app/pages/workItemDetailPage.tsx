import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { SerializedWorkItemDetail } from "../../server/orchestration/serialization";
import { orchestrationRoutes } from "../routes";
import { OrchestrationPageShell } from "../ui/OrchestrationPageShell";

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

export type Props = {
  detail: SerializedWorkItemDetail | null;
};

export default function WorkItemDetailPage({ detail }: Props) {
  const [currentDetail, setCurrentDetail] = useState(detail);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [duplicateTargetId, setDuplicateTargetId] = useState("");
  const [form, setForm] = useState({
    triageStatus: detail?.workItem.triageStatus || "new",
    severity: detail?.workItem.severity || "",
    type: detail?.workItem.type || "",
    title: detail?.workItem.title || "",
    latestDescription: detail?.workItem.latestDescription || "",
  });

  useEffect(() => {
    setCurrentDetail(detail);
    setForm({
      triageStatus: detail?.workItem.triageStatus || "new",
      severity: detail?.workItem.severity || "",
      type: detail?.workItem.type || "",
      title: detail?.workItem.title || "",
      latestDescription: detail?.workItem.latestDescription || "",
    });
  }, [detail]);

  if (!currentDetail) {
    return null;
  }

  const workItemId = currentDetail.workItem.id;
  const latestSignal = currentDetail.signals[0];

  const refreshDetail = async () => {
    const response = await fetch(orchestrationRoutes.api.workItem(workItemId));
    if (!response.ok) {
      throw new Error(`Unable to refresh work item (${response.status})`);
    }

    const nextDetail = (await response.json()) as SerializedWorkItemDetail;
    setCurrentDetail(nextDetail);
    setForm({
      triageStatus: nextDetail.workItem.triageStatus,
      severity: nextDetail.workItem.severity || "",
      type: nextDetail.workItem.type,
      title: nextDetail.workItem.title,
      latestDescription: nextDetail.workItem.latestDescription || "",
    });
  };

  const runAction = async (callback: () => Promise<void>, successMessage: string) => {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      await callback();
      await refreshDetail();
      setMessage(successMessage);
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  };

  const saveChanges = async () => {
    await runAction(async () => {
      const response = await fetch(orchestrationRoutes.api.workItem(workItemId), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          actor: {
            type: "human",
            name: "Reviewer",
          },
          updates: {
            triageStatus: form.triageStatus,
            severity: form.severity || null,
            type: form.type,
            title: form.title,
            latestDescription: form.latestDescription,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || "Unable to save work item changes.");
      }
    }, "Work item updated.");
  };

  const addNote = async () => {
    await runAction(async () => {
      const response = await fetch(orchestrationRoutes.api.workItem(workItemId), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          actor: {
            type: "human",
            name: "Reviewer",
          },
          note,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || "Unable to add note.");
      }

      setNote("");
    }, "Note added.");
  };

  const markDuplicate = async () => {
    await runAction(async () => {
      const response = await fetch(orchestrationRoutes.api.duplicate(workItemId), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          actor: {
            type: "human",
            name: "Reviewer",
          },
          targetWorkItemId: duplicateTargetId,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || "Unable to mark duplicate.");
      }

      setDuplicateTargetId("");
    }, "Duplicate link added.");
  };

  const removeDuplicate = async () => {
    await runAction(async () => {
      const response = await fetch(orchestrationRoutes.api.duplicate(workItemId), {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          actor: {
            type: "human",
            name: "Reviewer",
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || "Unable to remove duplicate link.");
      }
    }, "Duplicate link removed.");
  };

  return (
    <OrchestrationPageShell
      title={currentDetail.workItem.title}
      backHref={orchestrationRoutes.queue}
      backLabel="Back to work queue"
    >
      {message ? <Alert severity="success">{message}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Box>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip label={currentDetail.workItem.type} variant="outlined" />
          <Chip label={currentDetail.project.name} variant="outlined" />
          <Chip label={currentDetail.workItem.triageStatus} />
          <Chip label={currentDetail.workItem.severity || "unknown severity"} />
          <Chip label={`${currentDetail.workItem.occurrenceCount} occurrences`} />
        </Stack>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Triage controls</Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              select
              label="Status"
              value={form.triageStatus}
              onChange={(event) =>
                setForm((current) => ({ ...current, triageStatus: event.target.value }))
              }
              fullWidth
            >
              <MenuItem value="new">new</MenuItem>
              <MenuItem value="reviewing">reviewing</MenuItem>
              <MenuItem value="resolved">resolved</MenuItem>
            </TextField>
            <TextField
              select
              label="Severity"
              value={form.severity}
              onChange={(event) =>
                setForm((current) => ({ ...current, severity: event.target.value }))
              }
              fullWidth
            >
              <MenuItem value="">unknown</MenuItem>
              <MenuItem value="low">low</MenuItem>
              <MenuItem value="medium">medium</MenuItem>
              <MenuItem value="high">high</MenuItem>
            </TextField>
            <TextField
              label="Type"
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({ ...current, type: event.target.value }))
              }
              fullWidth
            />
          </Stack>
          <TextField
            label="Title"
            value={form.title}
            onChange={(event) =>
              setForm((current) => ({ ...current, title: event.target.value }))
            }
            fullWidth
          />
          <TextField
            label="Latest description"
            value={form.latestDescription}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                latestDescription: event.target.value,
              }))
            }
            multiline
            minRows={3}
            fullWidth
          />
          <Box>
            <Button variant="contained" onClick={saveChanges} disabled={saving}>
              Save changes
            </Button>
          </Box>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Duplicate management</Typography>
          {currentDetail.duplicateParent ? (
            <>
              <Typography>
                This work item is marked as a duplicate of{" "}
                <Link
                  href={orchestrationRoutes.workItem(currentDetail.duplicateParent.id)}
                  style={{ textDecoration: "none" }}
                >
                  {currentDetail.duplicateParent.title}
                </Link>
                .
              </Typography>
              <Button variant="outlined" onClick={removeDuplicate} disabled={saving}>
                Remove duplicate link
              </Button>
            </>
          ) : (
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Canonical work item ID"
                value={duplicateTargetId}
                onChange={(event) => setDuplicateTargetId(event.target.value)}
                fullWidth
              />
              <Button variant="outlined" onClick={markDuplicate} disabled={saving}>
                Mark as duplicate
              </Button>
            </Stack>
          )}

          {currentDetail.duplicateChildren.length > 0 ? (
            <Box>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>Linked duplicates</Typography>
              <Stack spacing={1}>
                {currentDetail.duplicateChildren.map((child) => (
                  <Link
                    key={child.id}
                    href={orchestrationRoutes.workItem(child.id)}
                    style={{ textDecoration: "none" }}
                  >
                    <Typography color="text.primary">
                      {child.title} ({child.id})
                    </Typography>
                  </Link>
                ))}
              </Stack>
            </Box>
          ) : null}
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Review history</Typography>
          <TextField
            label="Add review note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
          <Box>
            <Button variant="outlined" onClick={addNote} disabled={saving || !note.trim()}>
              Add note
            </Button>
          </Box>
          <Stack spacing={1.5} divider={<Divider flexItem />}>
            {currentDetail.reviewActions.map((action) => (
              <Box key={action.id}>
                <Typography sx={{ fontWeight: 700 }}>
                  {action.actionType.replace(/_/g, " ")}
                </Typography>
                <Typography color="text.secondary">
                  {action.actor.name} ({action.actor.type}) on{" "}
                  {formatDateTime(action.createdAt)}
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    mt: 1,
                    p: 1.5,
                    borderRadius: 2,
                    overflowX: "auto",
                    bgcolor: "rgba(15, 23, 42, 0.06)",
                    fontSize: 12,
                  }}
                >
                  {JSON.stringify(action.payload, null, 2)}
                </Box>
              </Box>
            ))}
            {currentDetail.reviewActions.length === 0 ? (
              <Typography color="text.secondary">
                No review actions recorded yet.
              </Typography>
            ) : null}
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Normalized fields</Typography>
          <Typography>
            <strong>Project:</strong> {currentDetail.project.name} ({currentDetail.project.slug})
          </Typography>
          <Typography>
            <strong>Fingerprint:</strong> {currentDetail.workItem.fingerprint}
          </Typography>
          <Typography>
            <strong>Created:</strong> {formatDateTime(currentDetail.workItem.createdAt)}
          </Typography>
          <Typography>
            <strong>Updated:</strong> {formatDateTime(currentDetail.workItem.updatedAt)}
          </Typography>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Latest evidence</Typography>
          {latestSignal ? (
            <>
              <Typography>
                <strong>Source:</strong> {latestSignal.source}
              </Typography>
              <Typography>
                <strong>Signal time:</strong> {formatDateTime(latestSignal.createdAt)}
              </Typography>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 2,
                  borderRadius: 2,
                  overflowX: "auto",
                  bgcolor: "rgba(15, 23, 42, 0.08)",
                  color: "text.primary",
                  fontSize: 13,
                }}
              >
                {JSON.stringify(latestSignal.evidence || {}, null, 2)}
              </Box>
            </>
          ) : (
            <Typography color="text.secondary">No evidence attached yet.</Typography>
          )}
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2} divider={<Divider flexItem />}>
          <Typography variant="h6">Linked signals</Typography>
          {currentDetail.signals.map((signal) => (
            <Box key={signal.id}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                justifyContent="space-between"
              >
                <Typography sx={{ fontWeight: 700 }}>{signal.title}</Typography>
                <Typography color="text.secondary">
                  {formatDateTime(signal.createdAt)}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                <Chip label={signal.source} size="small" variant="outlined" />
                <Chip label={signal.type} size="small" variant="outlined" />
                <Chip label={signal.severity || "unknown"} size="small" />
                {signal.environment ? (
                  <Chip label={signal.environment} size="small" variant="outlined" />
                ) : null}
              </Stack>
              <Typography sx={{ mt: 1, color: "text.secondary" }}>
                {signal.description || "No description"}
              </Typography>
              <Typography sx={{ mt: 1 }}>
                <strong>Fingerprint:</strong> {signal.fingerprint}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Paper>
    </OrchestrationPageShell>
  );
}
