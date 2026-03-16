import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { SerializedWorkItemQueueResult } from "../../server/orchestration/serialization";
import { orchestrationRoutes } from "../routes";
import { OrchestrationPageShell } from "../ui/OrchestrationPageShell";

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

const severityColor = (value?: string) => {
  switch (value) {
    case "high":
      return "error";
    case "medium":
      return "warning";
    case "low":
      return "success";
    default:
      return "default";
  }
};

export type Props = SerializedWorkItemQueueResult & {
  initialQuery: {
    project: string;
    type: string;
    severity: string;
    triageStatus: string;
    search: string;
    includeDuplicates: boolean;
    sortBy: string;
    sortDirection: string;
  };
};

export default function WorkItemsQueuePage({
  workItems,
  filters,
  initialQuery,
}: Props) {
  const router = useRouter();
  const [form, setForm] = useState(initialQuery);

  const applyFilters = () => {
    const nextQuery: Record<string, string> = {};

    Object.entries(form).forEach(([key, value]) => {
      if (typeof value === "boolean") {
        if (value) {
          nextQuery[key] = "true";
        }
        return;
      }

      if (value) {
        nextQuery[key] = value;
      }
    });

    router.push({
      pathname: orchestrationRoutes.queue,
      query: nextQuery,
    });
  };

  const clearFilters = () => {
    setForm({
      project: "",
      type: "",
      severity: "",
      triageStatus: "",
      search: "",
      includeDuplicates: false,
      sortBy: "updatedAt",
      sortDirection: "desc",
    });
    router.push(orchestrationRoutes.queue);
  };

  return (
    <OrchestrationPageShell
      title="Work Queue"
      description="Narrow canonical work items down quickly, hide duplicates by default, and review the mutable queue layer without touching raw signals."
    >
      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <TextField
            label="Search title, fingerprint, or description"
            value={form.search}
            onChange={(event) =>
              setForm((current) => ({ ...current, search: event.target.value }))
            }
            fullWidth
          />

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              select
              label="Project"
              value={form.project}
              onChange={(event) =>
                setForm((current) => ({ ...current, project: event.target.value }))
              }
              fullWidth
            >
              <MenuItem value="">All projects</MenuItem>
              {filters.projects.map((project) => (
                <MenuItem key={project.slug} value={project.slug}>
                  {project.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Type"
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({ ...current, type: event.target.value }))
              }
              fullWidth
            >
              <MenuItem value="">All types</MenuItem>
              {filters.types.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
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
              <MenuItem value="">All severities</MenuItem>
              {filters.severities.map((severity) => (
                <MenuItem key={severity} value={severity}>
                  {severity}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Status"
              value={form.triageStatus}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  triageStatus: event.target.value,
                }))
              }
              fullWidth
            >
              <MenuItem value="">All statuses</MenuItem>
              {filters.triageStatuses.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
            <TextField
              select
              label="Sort by"
              value={form.sortBy}
              onChange={(event) =>
                setForm((current) => ({ ...current, sortBy: event.target.value }))
              }
              sx={{ minWidth: 220 }}
            >
              <MenuItem value="updatedAt">Last updated</MenuItem>
              <MenuItem value="occurrenceCount">Occurrence count</MenuItem>
              <MenuItem value="severity">Severity</MenuItem>
            </TextField>
            <TextField
              select
              label="Direction"
              value={form.sortDirection}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  sortDirection: event.target.value,
                }))
              }
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="desc">Descending</MenuItem>
              <MenuItem value="asc">Ascending</MenuItem>
            </TextField>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.includeDuplicates}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      includeDuplicates: event.target.checked,
                    }))
                  }
                />
              }
              label="Include duplicates"
            />
            <Box sx={{ flexGrow: 1 }} />
            <Button variant="outlined" onClick={clearFilters}>
              Reset
            </Button>
            <Button variant="contained" onClick={applyFilters}>
              Apply
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ overflowX: "auto" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Project</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Occurrences</TableCell>
              <TableCell>Last Updated</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {workItems.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>
                  <Link
                    href={orchestrationRoutes.workItem(item.id)}
                    style={{ textDecoration: "none" }}
                  >
                    <Typography sx={{ fontWeight: 700, color: "text.primary" }}>
                      {item.title}
                    </Typography>
                  </Link>
                  {item.duplicateOfWorkItemId ? (
                    <Typography variant="body2" color="text.secondary">
                      Duplicate of {item.duplicateOfWorkItemId}
                    </Typography>
                  ) : null}
                </TableCell>
                <TableCell>
                  <Chip label={item.type} size="small" variant="outlined" />
                </TableCell>
                <TableCell>{item.projectName}</TableCell>
                <TableCell>
                  <Chip label={item.triageStatus} size="small" />
                </TableCell>
                <TableCell>
                  <Chip
                    label={item.severity || "unknown"}
                    size="small"
                    color={severityColor(item.severity) as any}
                  />
                </TableCell>
                <TableCell>{item.occurrenceCount}</TableCell>
                <TableCell>{formatDateTime(item.updatedAt)}</TableCell>
              </TableRow>
            ))}
            {workItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography color="text.secondary">
                    No work items match the current filters.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Paper>
    </OrchestrationPageShell>
  );
}
