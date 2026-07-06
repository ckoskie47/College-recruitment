-- Migration: create deliverables table for post-hire accountability tracking
-- This table was defined in schema.sql but never had a standalone migration,
-- so it may not exist in databases built from migrations only.

-- Enum types (create if they don't already exist)
do $$ begin
  create type deliverable_source as enum ('rfp_promise', 'meeting_commitment', 'sow_clause', 'manual');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type deliverable_status as enum ('not_started', 'in_progress', 'complete', 'overdue', 'blocked', 'cancelled');
exception when duplicate_object then null;
end $$;

-- Main table
create table if not exists deliverables (
  id              uuid primary key default uuid_generate_v4(),
  engagement_id   uuid not null references engagements(id) on delete cascade,
  vendor_id       uuid references vendors(id) on delete set null,
  source_type     deliverable_source not null,
  source_ref_id   uuid,
  title           text not null,
  description     text,
  pillar          text,
  due_date        date,
  assigned_to     uuid references profiles(id),
  status          deliverable_status not null default 'not_started',
  completed_at    timestamptz,
  evidence_url    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Updated-at trigger (function already exists from schema.sql)
create trigger if not exists deliverables_updated_at
  before update on deliverables
  for each row execute function set_updated_at();

-- Indexes
create index if not exists deliverables_engagement_id_idx on deliverables (engagement_id);
create index if not exists deliverables_status_idx        on deliverables (status);
create index if not exists deliverables_due_date_idx      on deliverables (due_date);

-- RLS
alter table deliverables enable row level security;

drop policy if exists "engagement members can manage deliverables" on deliverables;
create policy "engagement members can manage deliverables" on deliverables
  for all
  using (is_engagement_member(engagement_id))
  with check (is_engagement_member(engagement_id));
