-- Stage 1 refactor: documents.label, engagement_milestones.note, questionnaire_items

-- Optional category label on documents (used for data file categorization)
alter table documents add column if not exists label text;

-- Optional note on milestone rows (inline annotation)
alter table engagement_milestones add column if not exists note text;

-- Questionnaire items — scaffolded for future Section C (not yet surfaced in UI)
create table if not exists questionnaire_items (
  id              uuid primary key default uuid_generate_v4(),
  engagement_id   uuid not null references engagements(id) on delete cascade,
  document_id     uuid references documents(id) on delete set null,
  question_number text,
  question_text   text not null,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger questionnaire_items_updated_at before update on questionnaire_items
  for each row execute function set_updated_at();

create index on questionnaire_items (engagement_id, sort_order);
alter table questionnaire_items enable row level security;

create policy "engagement members can manage questionnaire items" on questionnaire_items
  for all using (is_engagement_member(engagement_id))
  with check (is_engagement_member(engagement_id));
