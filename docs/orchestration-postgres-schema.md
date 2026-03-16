# Orchestration Postgres Schema Plan

This document defines the relational shape expected by the orchestration persistence interface in `domain/orchestration/persistence.ts`.

## Goals

- Preserve immutable raw `signals`
- Keep mutable/actionable state in `work_items`
- Record human/system review actions explicitly in `review_actions`
- Support multiple projects and flexible evidence payloads
- Stay compatible with the current API/UI behavior

## Tables

### `projects`

```sql
create table projects (
  id uuid primary key,
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);
```

Indexes:

- `unique index projects_slug_idx on projects (slug)`

### `signals`

Signals are immutable raw evidence. The only allowed mutable field after insert should be `work_item_id`, which links the signal to a canonical work item.

```sql
create table signals (
  id uuid primary key,
  project_id uuid not null references projects(id),
  work_item_id uuid null references work_items(id),
  source text not null,
  type text not null,
  title text not null,
  description text null,
  severity text null check (severity in ('low', 'medium', 'high')),
  environment text null,
  location text null,
  runtime_context jsonb null,
  evidence jsonb null,
  reporter jsonb null,
  fingerprint text not null,
  created_at timestamptz not null
);
```

Indexes:

- `index signals_project_created_idx on signals (project_id, created_at desc)`
- `index signals_work_item_created_idx on signals (work_item_id, created_at desc)`
- `index signals_fingerprint_idx on signals (fingerprint, created_at desc)`
- Optional text search index:
  `gin(to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,'')))`

### `work_items`

```sql
create table work_items (
  id uuid primary key,
  project_id uuid not null references projects(id),
  fingerprint text not null,
  type text not null,
  title text not null,
  latest_description text null,
  triage_status text not null check (triage_status in ('new', 'reviewing', 'resolved')),
  severity text null check (severity in ('low', 'medium', 'high')),
  occurrence_count integer not null default 1,
  latest_signal_id uuid null references signals(id),
  duplicate_of_work_item_id uuid null references work_items(id),
  duplicate_reason text null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (project_id, fingerprint)
);
```

Indexes:

- `index work_items_updated_idx on work_items (updated_at desc)`
- `index work_items_occurrence_idx on work_items (occurrence_count desc, updated_at desc)`
- `index work_items_duplicate_idx on work_items (duplicate_of_work_item_id, updated_at desc)`
- Optional text search index:
  `gin(to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(latest_description,'') || ' ' || coalesce(fingerprint,'')))`

### `review_actions`

```sql
create table review_actions (
  id uuid primary key,
  work_item_id uuid not null references work_items(id),
  action_type text not null check (
    action_type in (
      'status_changed',
      'severity_changed',
      'type_changed',
      'title_changed',
      'description_changed',
      'marked_duplicate',
      'duplicate_link_removed',
      'note_added'
    )
  ),
  actor_type text not null check (actor_type in ('system', 'human')),
  actor_name text not null,
  payload jsonb not null,
  created_at timestamptz not null
);
```

Indexes:

- `index review_actions_work_item_created_idx on review_actions (work_item_id, created_at desc)`

### `fix_packets`

Not introduced in the current codebase. If added later, it should reference `work_items(id)` and keep execution/output state separate from both `signals` and `review_actions`.

Suggested future shape:

```sql
create table fix_packets (
  id uuid primary key,
  work_item_id uuid not null references work_items(id),
  status text not null,
  packet jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);
```

## Mapping Notes

- `runtime_context`, `evidence`, `reporter`, and review `payload` should use `jsonb`
- The persistence interface expects IDs as strings; adapters are responsible for mapping between string IDs and DB-native types
- The current service layer expects `listWorkItems`, `listProjects`, `listSignalsByWorkItemId`, and `listReviewActionsByWorkItemId` to return enough data for in-memory filtering and detail assembly
- A production Postgres adapter can later optimize queue filtering/search/sorting in SQL without changing the service or API contracts

## Adapter Readiness

The code is now ready for a real Postgres adapter at the interface boundary:

- Implement `OrchestrationPersistence`
- Map UUIDs to string IDs in the adapter
- Use the schema above
- Optionally push filtering/search/sorting into SQL while preserving returned shapes
