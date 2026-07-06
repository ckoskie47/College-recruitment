-- New document type enum values
alter type document_type add value if not exists 'rfp_questionnaire';
alter type document_type add value if not exists 'data_file';
alter type document_type add value if not exists 'plan_document';
alter type document_type add value if not exists 'timeline';
alter type document_type add value if not exists 'background';

-- Timeline milestones table
create table engagement_milestones (
  id              uuid primary key default uuid_generate_v4(),
  engagement_id   uuid not null references engagements(id) on delete cascade,
  label           text not null,
  milestone_type  text not null,
  due_at          timestamptz not null,
  completed_at    timestamptz,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);
create index on engagement_milestones (engagement_id, sort_order);
alter table engagement_milestones enable row level security;
create policy "engagement members can manage milestones" on engagement_milestones
  for all using (is_engagement_member(engagement_id))
  with check (is_engagement_member(engagement_id));
