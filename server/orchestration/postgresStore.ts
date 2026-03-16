import fs from "fs";
import { Pool, QueryResult } from "pg";
import { v4 as uuidv4 } from "uuid";
import { OrchestrationPersistence } from "../../domain/orchestration/persistence";
import {
  ProjectDoc,
  ReviewActionDoc,
  SignalDoc,
  WorkItemDoc,
} from "../../domain/orchestration/types";
import {
  getOrchestrationPostgresSchemaPath,
  getOrchestrationPostgresUrl,
} from "./config";

type PostgresQueryable = {
  query: <T = any>(text: string, params?: unknown[]) => Promise<QueryResult<T>>;
};

type ProjectRow = {
  id: string;
  name: string;
  slug: string;
  created_at: Date | string;
};

type SignalRow = {
  id: string;
  project_id: string;
  work_item_id: string | null;
  source: string;
  type: string;
  title: string;
  description: string | null;
  severity: "low" | "medium" | "high" | null;
  environment: string | null;
  location: string | null;
  runtime_context: Record<string, unknown> | null;
  evidence: Record<string, unknown> | null;
  reporter: Record<string, unknown> | null;
  fingerprint: string;
  created_at: Date | string;
};

type WorkItemRow = {
  id: string;
  project_id: string;
  fingerprint: string;
  type: string;
  title: string;
  latest_description: string | null;
  triage_status: "new" | "reviewing" | "resolved";
  severity: "low" | "medium" | "high" | null;
  occurrence_count: number;
  latest_signal_id: string | null;
  duplicate_of_work_item_id: string | null;
  duplicate_reason: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type ReviewActionRow = {
  id: string;
  work_item_id: string;
  action_type: ReviewActionDoc["actionType"];
  actor_type: "system" | "human";
  actor_name: string;
  payload: Record<string, unknown>;
  created_at: Date | string;
};

type PostgresStoreOptions = {
  queryable: PostgresQueryable;
};

declare global {
  // eslint-disable-next-line no-var
  var __orchestrationPostgresPool__: Pool | undefined;
  // eslint-disable-next-line no-var
  var __orchestrationPostgresSchemaReady__: boolean | undefined;
}

const globalPool = global.__orchestrationPostgresPool__;

const mapProjectRow = (row: ProjectRow): ProjectDoc => ({
  _id: row.id as unknown as ProjectDoc["_id"],
  name: row.name,
  slug: row.slug,
  createdAt: new Date(row.created_at),
});

const mapSignalRow = (row: SignalRow): SignalDoc => ({
  _id: row.id as unknown as SignalDoc["_id"],
  projectId: row.project_id,
  workItemId: row.work_item_id || undefined,
  source: row.source,
  type: row.type,
  title: row.title,
  description: row.description || undefined,
  severity: row.severity || undefined,
  environment: row.environment || undefined,
  location: row.location || undefined,
  runtimeContext: row.runtime_context || undefined,
  evidence: row.evidence || undefined,
  reporter: row.reporter || undefined,
  fingerprint: row.fingerprint,
  createdAt: new Date(row.created_at),
});

const mapWorkItemRow = (row: WorkItemRow): WorkItemDoc => ({
  _id: row.id as unknown as WorkItemDoc["_id"],
  projectId: row.project_id,
  fingerprint: row.fingerprint,
  type: row.type,
  title: row.title,
  latestDescription: row.latest_description || undefined,
  triageStatus: row.triage_status,
  severity: row.severity || undefined,
  occurrenceCount: Number(row.occurrence_count || 0),
  latestSignalId: row.latest_signal_id || undefined,
  duplicateOfWorkItemId: row.duplicate_of_work_item_id || undefined,
  duplicateReason: row.duplicate_reason || undefined,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

const mapReviewActionRow = (row: ReviewActionRow): ReviewActionDoc => ({
  _id: row.id as unknown as ReviewActionDoc["_id"],
  workItemId: row.work_item_id,
  actionType: row.action_type,
  actor: {
    type: row.actor_type,
    name: row.actor_name,
  },
  payload: row.payload,
  createdAt: new Date(row.created_at),
});

let schemaSqlCache: string | null = null;

const readSchemaSql = async () => {
  if (schemaSqlCache) {
    return schemaSqlCache;
  }

  const schemaPath = getOrchestrationPostgresSchemaPath();

  try {
    schemaSqlCache = await fs.promises.readFile(schemaPath, "utf8");
  } catch (error) {
    throw new Error(
      `Unable to read orchestration Postgres schema at ${schemaPath}. ${error instanceof Error ? error.message : "Unknown file error."}`
    );
  }

  return schemaSqlCache;
};

export const ensurePostgresOrchestrationSchema = async (
  queryable: PostgresQueryable
) => {
  if (global.__orchestrationPostgresSchemaReady__) {
    return;
  }

  const sql = await readSchemaSql();
  try {
    await queryable.query(sql);
  } catch (error) {
    throw new Error(
      `Unable to initialize orchestration Postgres schema from ${getOrchestrationPostgresSchemaPath()}. ${error instanceof Error ? error.message : "Unknown database error."}`
    );
  }
  global.__orchestrationPostgresSchemaReady__ = true;
};

const nullable = (value: unknown) => (typeof value === "undefined" ? null : value);

const createWorkItemUpdateSql = (update: Partial<WorkItemDoc>) => {
  const fields: Array<[string, unknown]> = [];
  const fieldMap: Record<string, string> = {
    projectId: "project_id",
    fingerprint: "fingerprint",
    type: "type",
    title: "title",
    latestDescription: "latest_description",
    triageStatus: "triage_status",
    severity: "severity",
    occurrenceCount: "occurrence_count",
    latestSignalId: "latest_signal_id",
    duplicateOfWorkItemId: "duplicate_of_work_item_id",
    duplicateReason: "duplicate_reason",
    createdAt: "created_at",
    updatedAt: "updated_at",
  };

  Object.entries(update).forEach(([key, value]) => {
    const column = fieldMap[key];
    if (!column) {
      return;
    }

    fields.push([column, nullable(value)]);
  });

  const assignments = fields.map(([column], index) => `${column} = $${index + 2}`);

  return {
    sql: `
      update work_items
      set ${assignments.join(", ")}
      where id = $1
      returning
        id,
        project_id,
        fingerprint,
        type,
        title,
        latest_description,
        triage_status,
        severity,
        occurrence_count,
        latest_signal_id,
        duplicate_of_work_item_id,
        duplicate_reason,
        created_at,
        updated_at
    `,
    values: fields.map(([, value]) => value),
  };
};

export const createPostgresOrchestrationPersistence = ({
  queryable,
}: PostgresStoreOptions): OrchestrationPersistence => ({
  async findProjectBySlug(slug) {
    const result = await queryable.query<ProjectRow>(
      `
        select id, name, slug, created_at
        from projects
        where slug = $1
        limit 1
      `,
      [slug]
    );

    return result.rows[0] ? mapProjectRow(result.rows[0]) : null;
  },

  async listProjects() {
    const result = await queryable.query<ProjectRow>(
      `
        select id, name, slug, created_at
        from projects
        order by name asc
      `
    );

    return result.rows.map(mapProjectRow);
  },

  async createProject(project) {
    const id = String(project._id || uuidv4());
    const result = await queryable.query<ProjectRow>(
      `
        insert into projects (id, name, slug, created_at)
        values ($1, $2, $3, $4)
        returning id, name, slug, created_at
      `,
      [id, project.name, project.slug, project.createdAt]
    );

    return mapProjectRow(result.rows[0]);
  },

  async createSignal(signal) {
    const id = String(signal._id || uuidv4());
    const result = await queryable.query<SignalRow>(
      `
        insert into signals (
          id,
          project_id,
          work_item_id,
          source,
          type,
          title,
          description,
          severity,
          environment,
          location,
          runtime_context,
          evidence,
          reporter,
          fingerprint,
          created_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13::jsonb, $14, $15)
        returning
          id,
          project_id,
          work_item_id,
          source,
          type,
          title,
          description,
          severity,
          environment,
          location,
          runtime_context,
          evidence,
          reporter,
          fingerprint,
          created_at
      `,
      [
        id,
        String(signal.projectId),
        signal.workItemId ? String(signal.workItemId) : null,
        signal.source,
        signal.type,
        signal.title,
        nullable(signal.description),
        nullable(signal.severity),
        nullable(signal.environment),
        nullable(signal.location),
        JSON.stringify(signal.runtimeContext || null),
        JSON.stringify(signal.evidence || null),
        JSON.stringify(signal.reporter || null),
        signal.fingerprint,
        signal.createdAt,
      ]
    );

    return mapSignalRow(result.rows[0]);
  },

  async updateSignalWorkItemLink(signalId, workItemId) {
    await queryable.query(
      `
        update signals
        set work_item_id = $2
        where id = $1
      `,
      [signalId, workItemId]
    );
  },

  async listSignalsByWorkItemId(workItemId) {
    const result = await queryable.query<SignalRow>(
      `
        select
          id,
          project_id,
          work_item_id,
          source,
          type,
          title,
          description,
          severity,
          environment,
          location,
          runtime_context,
          evidence,
          reporter,
          fingerprint,
          created_at
        from signals
        where work_item_id = $1
        order by created_at desc
      `,
      [workItemId]
    );

    return result.rows.map(mapSignalRow);
  },

  async countSignals() {
    const result = await queryable.query<{ count: string }>(
      `select count(*)::text as count from signals`
    );
    return Number(result.rows[0]?.count || 0);
  },

  async findWorkItemById(id) {
    const result = await queryable.query<WorkItemRow>(
      `
        select
          id,
          project_id,
          fingerprint,
          type,
          title,
          latest_description,
          triage_status,
          severity,
          occurrence_count,
          latest_signal_id,
          duplicate_of_work_item_id,
          duplicate_reason,
          created_at,
          updated_at
        from work_items
        where id = $1
        limit 1
      `,
      [id]
    );

    return result.rows[0] ? mapWorkItemRow(result.rows[0]) : null;
  },

  async findWorkItemByFingerprint({ projectId, fingerprint }) {
    const result = await queryable.query<WorkItemRow>(
      `
        select
          id,
          project_id,
          fingerprint,
          type,
          title,
          latest_description,
          triage_status,
          severity,
          occurrence_count,
          latest_signal_id,
          duplicate_of_work_item_id,
          duplicate_reason,
          created_at,
          updated_at
        from work_items
        where project_id = $1 and fingerprint = $2
        limit 1
      `,
      [projectId, fingerprint]
    );

    return result.rows[0] ? mapWorkItemRow(result.rows[0]) : null;
  },

  async listWorkItems() {
    const result = await queryable.query<WorkItemRow>(
      `
        select
          id,
          project_id,
          fingerprint,
          type,
          title,
          latest_description,
          triage_status,
          severity,
          occurrence_count,
          latest_signal_id,
          duplicate_of_work_item_id,
          duplicate_reason,
          created_at,
          updated_at
        from work_items
      `
    );

    return result.rows.map(mapWorkItemRow);
  },

  async createWorkItem(workItem) {
    const id = String(workItem._id || uuidv4());
    const result = await queryable.query<WorkItemRow>(
      `
        insert into work_items (
          id,
          project_id,
          fingerprint,
          type,
          title,
          latest_description,
          triage_status,
          severity,
          occurrence_count,
          latest_signal_id,
          duplicate_of_work_item_id,
          duplicate_reason,
          created_at,
          updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        returning
          id,
          project_id,
          fingerprint,
          type,
          title,
          latest_description,
          triage_status,
          severity,
          occurrence_count,
          latest_signal_id,
          duplicate_of_work_item_id,
          duplicate_reason,
          created_at,
          updated_at
      `,
      [
        id,
        String(workItem.projectId),
        workItem.fingerprint,
        workItem.type,
        workItem.title,
        nullable(workItem.latestDescription),
        workItem.triageStatus,
        nullable(workItem.severity),
        workItem.occurrenceCount,
        workItem.latestSignalId ? String(workItem.latestSignalId) : null,
        workItem.duplicateOfWorkItemId ? String(workItem.duplicateOfWorkItemId) : null,
        nullable(workItem.duplicateReason),
        workItem.createdAt,
        workItem.updatedAt,
      ]
    );

    return mapWorkItemRow(result.rows[0]);
  },

  async updateWorkItem(id, update) {
    const { sql, values } = createWorkItemUpdateSql(update);
    const result = await queryable.query<WorkItemRow>(sql, [id, ...values]);

    if (!result.rows[0]) {
      throw new Error("Work item not found after update.");
    }

    return mapWorkItemRow(result.rows[0]);
  },

  async listDuplicateChildren(workItemId) {
    const result = await queryable.query<WorkItemRow>(
      `
        select
          id,
          project_id,
          fingerprint,
          type,
          title,
          latest_description,
          triage_status,
          severity,
          occurrence_count,
          latest_signal_id,
          duplicate_of_work_item_id,
          duplicate_reason,
          created_at,
          updated_at
        from work_items
        where duplicate_of_work_item_id = $1
        order by updated_at desc
      `,
      [workItemId]
    );

    return result.rows.map(mapWorkItemRow);
  },

  async countWorkItems() {
    const result = await queryable.query<{ count: string }>(
      `select count(*)::text as count from work_items`
    );
    return Number(result.rows[0]?.count || 0);
  },

  async createReviewActions(actions) {
    if (actions.length === 0) {
      return [];
    }

    const values: unknown[] = [];
    const groups = actions.map((action, index) => {
      const base = index * 7;
      const id = String(action._id || uuidv4());
      values.push(
        id,
        String(action.workItemId),
        action.actionType,
        action.actor.type,
        action.actor.name,
        JSON.stringify(action.payload),
        action.createdAt
      );

      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}::jsonb, $${base + 7})`;
    });

    const result = await queryable.query<ReviewActionRow>(
      `
        insert into review_actions (
          id,
          work_item_id,
          action_type,
          actor_type,
          actor_name,
          payload,
          created_at
        )
        values ${groups.join(", ")}
        returning
          id,
          work_item_id,
          action_type,
          actor_type,
          actor_name,
          payload,
          created_at
      `,
      values
    );

    return result.rows.map(mapReviewActionRow);
  },

  async listReviewActionsByWorkItemId(workItemId) {
    const result = await queryable.query<ReviewActionRow>(
      `
        select
          id,
          work_item_id,
          action_type,
          actor_type,
          actor_name,
          payload,
          created_at
        from review_actions
        where work_item_id = $1
        order by created_at desc
      `,
      [workItemId]
    );

    return result.rows.map(mapReviewActionRow);
  },

  async countReviewActions() {
    const result = await queryable.query<{ count: string }>(
      `select count(*)::text as count from review_actions`
    );
    return Number(result.rows[0]?.count || 0);
  },
});

export const getPostgresPool = () => {
  if (globalPool) {
    return globalPool;
  }

  const connectionString = getOrchestrationPostgresUrl();

  if (!connectionString) {
    throw new Error(
      "Postgres orchestration persistence is not configured. Set ORCHESTRATION_POSTGRES_URL or DATABASE_URL."
    );
  }

  const pool = new Pool({
    connectionString,
  });
  global.__orchestrationPostgresPool__ = pool;
  return pool;
};

export const getPostgresOrchestrationPersistence = async () => {
  const pool = getPostgresPool();
  try {
    await ensurePostgresOrchestrationSchema(pool);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "Unable to initialize Postgres orchestration persistence."
    );
  }
  return createPostgresOrchestrationPersistence({
    queryable: pool,
  });
};
