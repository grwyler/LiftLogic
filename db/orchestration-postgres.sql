create table if not exists projects (
  id uuid primary key,
  slug text not null unique,
  name text not null,
  created_at timestamptz not null
);

create table if not exists work_items (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  fingerprint text not null,
  type text not null,
  title text not null,
  latest_description text null,
  triage_status text not null check (triage_status in ('new', 'reviewing', 'resolved')),
  severity text null check (severity in ('low', 'medium', 'high')),
  occurrence_count integer not null default 1 check (occurrence_count >= 0),
  latest_signal_id uuid null,
  duplicate_of_work_item_id uuid null references work_items(id) on delete set null,
  duplicate_reason text null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (project_id, fingerprint)
);

create table if not exists signals (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  work_item_id uuid null references work_items(id) on delete set null,
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

create table if not exists review_actions (
  id uuid primary key,
  work_item_id uuid not null references work_items(id) on delete cascade,
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

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'work_items_latest_signal_id_fkey'
  ) then
    alter table work_items
      add constraint work_items_latest_signal_id_fkey
      foreign key (latest_signal_id) references signals(id) on delete set null;
  end if;
end $$;

create index if not exists projects_slug_idx on projects (slug);
create index if not exists signals_project_created_idx on signals (project_id, created_at desc);
create index if not exists signals_work_item_created_idx on signals (work_item_id, created_at desc);
create index if not exists signals_fingerprint_idx on signals (fingerprint, created_at desc);
create index if not exists work_items_updated_idx on work_items (updated_at desc);
create index if not exists work_items_occurrence_idx on work_items (occurrence_count desc, updated_at desc);
create index if not exists work_items_duplicate_idx on work_items (duplicate_of_work_item_id, updated_at desc);
create index if not exists review_actions_work_item_created_idx on review_actions (work_item_id, created_at desc);
