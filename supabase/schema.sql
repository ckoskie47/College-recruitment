-- =====================================================================
-- Elevate Fiduciary Workspace — Initial Schema
-- =====================================================================
-- Multi-tenant procurement workspace for vendor RFPs.
-- Paste into Supabase SQL Editor (one migration), or save as
-- supabase/migrations/20260514000000_initial_schema.sql for CLI use.
--
-- Schema design notes:
--   - All tables have RLS enabled. Access is scoped to organization
--     membership via the is_org_member() helper function.
--   - The scoring model supports phased scoring (rfp_initial,
--     post_meeting, final) so the prototype's RFP-vs-post-meeting
--     delta view is preserved.
--   - audit_events captures every mutation that affects the fiduciary
--     record. Insert audit rows from your server code in the same
--     transaction as the mutation itself.
--   - Seeded data includes the 4-pillar Benefits Broker framework
--     with 25 criteria, matching the prototype.
-- =====================================================================

-- ---------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
create type org_role        as enum ('owner', 'admin', 'member', 'viewer');
create type engagement_status as enum ('draft', 'active', 'completed', 'archived');
create type vendor_type     as enum ('benefits_broker', 'it', 'legal', 'agency', 'consulting', 'construction', 'saas', 'professional_services', 'other');
create type stakeholder_role as enum ('finance', 'hr', 'compliance', 'operations', 'legal', 'executive', 'technical', 'procurement', 'consultant', 'other');
create type stakeholder_status as enum ('invited', 'active', 'declined');
create type ownership_type  as enum ('public', 'private', 'pe_backed', 'employee_owned', 'nonprofit', 'unknown');
create type proposal_status as enum ('invited', 'submitted', 'eliminated', 'finalist', 'selected', 'declined');
create type document_type   as enum ('rfp', 'proposal', 'attachment', 'contract', 'supporting', 'other');
create type score_phase     as enum ('rfp_initial', 'post_meeting', 'final');
create type meeting_status  as enum ('scheduled', 'in_progress', 'complete', 'cancelled');
create type transcript_source as enum ('otter', 'manual_paste', 'file_upload', 'recording_transcription');
create type flag_severity   as enum ('none', 'info', 'warning', 'critical');
create type cross_ref_status as enum ('aligned', 'contradicts_rfp', 'new_commitment', 'unverified');
create type recommendation_status as enum ('draft', 'under_review', 'approved', 'rejected', 'superseded');
create type deliverable_source as enum ('rfp_promise', 'meeting_commitment', 'sow_clause', 'manual');
create type deliverable_status as enum ('not_started', 'in_progress', 'complete', 'overdue', 'blocked', 'cancelled');
create type actor_type      as enum ('user', 'system', 'ai');

-- ---------------------------------------------------------------------
-- HELPER: timestamp trigger function
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- TABLE: profiles  (extends auth.users)
-- ---------------------------------------------------------------------
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text,
  email        text unique not null,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

-- Auto-create profile when a user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------
-- TABLE: organizations
-- ---------------------------------------------------------------------
create table organizations (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  slug          text unique not null,
  logo_url      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger organizations_updated_at before update on organizations
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- TABLE: organization_members
-- ---------------------------------------------------------------------
create table organization_members (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  role            org_role not null default 'member',
  joined_at       timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index on organization_members (user_id);
create index on organization_members (organization_id);

-- ---------------------------------------------------------------------
-- HELPER: is_org_member — used in RLS policies everywhere
-- ---------------------------------------------------------------------
create or replace function is_org_member(org_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from organization_members
    where organization_id = org_id
      and user_id = auth.uid()
  );
$$;

create or replace function is_org_admin(org_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from organization_members
    where organization_id = org_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

-- ---------------------------------------------------------------------
-- TABLE: engagements
-- ---------------------------------------------------------------------
create table engagements (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  client_name     text,                        -- name of the sponsor/client (may differ from org)
  description     text,
  vendor_type     vendor_type not null default 'benefits_broker',
  status          engagement_status not null default 'draft',
  decision_due_at date,
  scoring_framework_id uuid,                   -- FK added after scoring_frameworks created
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger engagements_updated_at before update on engagements
  for each row execute function set_updated_at();
create index on engagements (organization_id);
create index on engagements (status);

-- ---------------------------------------------------------------------
-- TABLE: stakeholders (committee members per engagement)
-- ---------------------------------------------------------------------
create table stakeholders (
  id              uuid primary key default uuid_generate_v4(),
  engagement_id   uuid not null references engagements(id) on delete cascade,
  user_id         uuid references profiles(id),
  email           text not null,
  name            text,
  role_title      text,                        -- free text: "VP HR", "Director of Finance"
  role_category   stakeholder_role not null default 'other',
  priority_weights jsonb,                      -- per-pillar weighting overrides; null = default
  status          stakeholder_status not null default 'invited',
  invitation_token text unique,                -- hashed; for pending invites
  invitation_expires_at timestamptz,
  invited_at      timestamptz not null default now(),
  joined_at       timestamptz,
  unique (engagement_id, email)
);
create index on stakeholders (engagement_id);
create index on stakeholders (user_id);
create index on stakeholders (invitation_token);

-- ---------------------------------------------------------------------
-- TABLE: vendors (the respondents being evaluated)
-- ---------------------------------------------------------------------
create table vendors (
  id              uuid primary key default uuid_generate_v4(),
  engagement_id   uuid not null references engagements(id) on delete cascade,
  name            text not null,
  parent_company  text,
  ownership_type  ownership_type not null default 'unknown',
  proposal_status proposal_status not null default 'invited',
  proposed_fee_amount numeric(12,2),
  proposed_fee_structure text,
  contact_name    text,
  contact_email   text,
  metadata        jsonb default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger vendors_updated_at before update on vendors
  for each row execute function set_updated_at();
create index on vendors (engagement_id);

-- ---------------------------------------------------------------------
-- TABLE: documents
-- ---------------------------------------------------------------------
create table documents (
  id              uuid primary key default uuid_generate_v4(),
  engagement_id   uuid not null references engagements(id) on delete cascade,
  vendor_id       uuid references vendors(id) on delete set null,
  document_type   document_type not null default 'other',
  file_name       text not null,
  storage_path    text not null,               -- path in Supabase Storage
  file_size       bigint,
  mime_type       text,
  uploaded_by     uuid references profiles(id),
  uploaded_at     timestamptz not null default now(),
  ai_processed_at timestamptz,
  ai_summary      jsonb                         -- structured AI analysis output
);
create index on documents (engagement_id);
create index on documents (vendor_id);

-- ---------------------------------------------------------------------
-- TABLE: scoring_frameworks (rubric definitions)
-- ---------------------------------------------------------------------
create table scoring_frameworks (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,  -- null for system-provided
  name            text not null,
  description     text,
  is_system       boolean not null default false,
  is_default      boolean not null default false,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger scoring_frameworks_updated_at before update on scoring_frameworks
  for each row execute function set_updated_at();
create index on scoring_frameworks (organization_id);

-- Add the deferred FK from engagements
alter table engagements
  add constraint engagements_scoring_framework_fk
  foreign key (scoring_framework_id) references scoring_frameworks(id);

-- ---------------------------------------------------------------------
-- TABLE: criteria (rubric items)
-- ---------------------------------------------------------------------
create table criteria (
  id              uuid primary key default uuid_generate_v4(),
  scoring_framework_id uuid not null references scoring_frameworks(id) on delete cascade,
  pillar          text not null,
  name            text not null,
  description     text,
  weight_percent  numeric(5,2) not null default 4.00,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);
create index on criteria (scoring_framework_id);
create index on criteria (pillar);

-- ---------------------------------------------------------------------
-- TABLE: scores (the collaborative scoring surface)
-- One row per (stakeholder, vendor, criterion, phase).
-- ---------------------------------------------------------------------
create table scores (
  id              uuid primary key default uuid_generate_v4(),
  engagement_id   uuid not null references engagements(id) on delete cascade,
  vendor_id       uuid not null references vendors(id) on delete cascade,
  criterion_id    uuid not null references criteria(id) on delete cascade,
  stakeholder_id  uuid not null references stakeholders(id) on delete cascade,
  phase           score_phase not null default 'rfp_initial',
  score           integer not null check (score between 1 and 5),
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (vendor_id, criterion_id, stakeholder_id, phase)
);
create trigger scores_updated_at before update on scores
  for each row execute function set_updated_at();
create index on scores (engagement_id);
create index on scores (vendor_id, criterion_id);
create index on scores (stakeholder_id);

-- ---------------------------------------------------------------------
-- TABLE: meetings
-- ---------------------------------------------------------------------
create table meetings (
  id              uuid primary key default uuid_generate_v4(),
  engagement_id   uuid not null references engagements(id) on delete cascade,
  vendor_id       uuid not null references vendors(id) on delete cascade,
  title           text,
  scheduled_at    timestamptz not null,
  duration_minutes integer,
  status          meeting_status not null default 'scheduled',
  location        text,
  attendees       jsonb default '[]'::jsonb,    -- array of {name, email, role}
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger meetings_updated_at before update on meetings
  for each row execute function set_updated_at();
create index on meetings (engagement_id);
create index on meetings (vendor_id);

-- ---------------------------------------------------------------------
-- TABLE: meeting_transcripts
-- ---------------------------------------------------------------------
create table meeting_transcripts (
  id              uuid primary key default uuid_generate_v4(),
  meeting_id      uuid not null references meetings(id) on delete cascade,
  source          transcript_source not null,
  raw_text        text,
  storage_path    text,                          -- for uploaded transcript files
  processed_at    timestamptz,
  uploaded_by     uuid references profiles(id),
  uploaded_at     timestamptz not null default now()
);
create index on meeting_transcripts (meeting_id);

-- ---------------------------------------------------------------------
-- TABLE: commitments (AI-extracted from transcripts)
-- ---------------------------------------------------------------------
create table commitments (
  id                  uuid primary key default uuid_generate_v4(),
  meeting_id          uuid not null references meetings(id) on delete cascade,
  transcript_id       uuid references meeting_transcripts(id) on delete set null,
  timestamp_seconds   integer,                     -- offset within transcript
  timestamp_display   text,                        -- "01:05:54" for UI
  quote               text not null,
  summary             text,
  tags                text[] default '{}',
  pillar              text,
  flag                text,
  flag_severity       flag_severity not null default 'none',
  cross_reference_status cross_ref_status not null default 'unverified',
  created_at          timestamptz not null default now()
);
create index on commitments (meeting_id);
create index on commitments (flag_severity);

-- ---------------------------------------------------------------------
-- TABLE: recommendations
-- ---------------------------------------------------------------------
create table recommendations (
  id                   uuid primary key default uuid_generate_v4(),
  engagement_id        uuid not null references engagements(id) on delete cascade,
  recommended_vendor_id uuid references vendors(id) on delete set null,
  memo_content         text,                       -- markdown
  rationale_summary    text,
  status               recommendation_status not null default 'draft',
  drafted_by           uuid references profiles(id),
  drafted_at           timestamptz not null default now(),
  approved_at          timestamptz,
  approved_by          uuid references profiles(id)
);
create index on recommendations (engagement_id);

-- ---------------------------------------------------------------------
-- TABLE: deliverables (post-hire accountability)
-- ---------------------------------------------------------------------
create table deliverables (
  id              uuid primary key default uuid_generate_v4(),
  engagement_id   uuid not null references engagements(id) on delete cascade,
  vendor_id       uuid references vendors(id) on delete set null,   -- the hired vendor
  source_type     deliverable_source not null,
  source_ref_id   uuid,                            -- commitment_id, document_id, etc.
  title           text not null,
  description     text,
  pillar          text,
  due_date        date,
  assigned_to     uuid references profiles(id),   -- internal owner
  status          deliverable_status not null default 'not_started',
  completed_at    timestamptz,
  evidence_url    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger deliverables_updated_at before update on deliverables
  for each row execute function set_updated_at();
create index on deliverables (engagement_id);
create index on deliverables (status);
create index on deliverables (due_date);

-- ---------------------------------------------------------------------
-- TABLE: audit_events (immutable fiduciary log)
-- ---------------------------------------------------------------------
create table audit_events (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  engagement_id   uuid references engagements(id) on delete cascade,
  actor_id        uuid references profiles(id),
  actor_type      actor_type not null default 'user',
  actor_display   text,                            -- snapshot of actor name at time of event
  action          text not null,                   -- "uploaded_document", "scored_criterion", etc.
  entity_type     text,
  entity_id       uuid,
  description     text,                            -- human-readable narrative
  metadata        jsonb default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
create index on audit_events (organization_id, created_at desc);
create index on audit_events (engagement_id, created_at desc);

-- Audit events are append-only — block updates and deletes
revoke update, delete on audit_events from public;
create policy "audit_events are append-only" on audit_events
  for update using (false);
create policy "audit_events cannot be deleted" on audit_events
  for delete using (false);

-- =====================================================================
-- ROW-LEVEL SECURITY
-- =====================================================================
-- Enable on every table.
alter table profiles                enable row level security;
alter table organizations           enable row level security;
alter table organization_members    enable row level security;
alter table engagements             enable row level security;
alter table stakeholders            enable row level security;
alter table vendors                 enable row level security;
alter table documents               enable row level security;
alter table scoring_frameworks      enable row level security;
alter table criteria                enable row level security;
alter table scores                  enable row level security;
alter table meetings                enable row level security;
alter table meeting_transcripts     enable row level security;
alter table commitments             enable row level security;
alter table recommendations         enable row level security;
alter table deliverables            enable row level security;
alter table audit_events            enable row level security;

-- ---------- profiles
create policy "users can read own profile" on profiles
  for select using (auth.uid() = id);
create policy "users can read profiles in shared orgs" on profiles
  for select using (
    exists (
      select 1 from organization_members om1
      join organization_members om2 on om1.organization_id = om2.organization_id
      where om1.user_id = auth.uid() and om2.user_id = profiles.id
    )
  );
create policy "users can update own profile" on profiles
  for update using (auth.uid() = id);

-- ---------- organizations
create policy "members can read their organizations" on organizations
  for select using (is_org_member(id));
create policy "authenticated users can create organizations" on organizations
  for insert with check (auth.uid() is not null);
create policy "admins can update organizations" on organizations
  for update using (is_org_admin(id));

-- ---------- organization_members
create policy "members can read membership rows in their orgs" on organization_members
  for select using (is_org_member(organization_id));
create policy "admins can manage members" on organization_members
  for all using (is_org_admin(organization_id))
  with check (is_org_admin(organization_id));

-- ---------- engagements
create policy "members can read engagements" on engagements
  for select using (is_org_member(organization_id));
create policy "members can create engagements" on engagements
  for insert with check (is_org_member(organization_id));
create policy "members can update engagements" on engagements
  for update using (is_org_member(organization_id));
create policy "admins can delete engagements" on engagements
  for delete using (is_org_admin(organization_id));

-- ---------- stakeholders
create policy "org members can manage stakeholders" on stakeholders
  for all using (
    is_org_member((select organization_id from engagements where id = stakeholders.engagement_id))
  ) with check (
    is_org_member((select organization_id from engagements where id = stakeholders.engagement_id))
  );

-- ---------- vendors, documents, meetings, transcripts, commitments,
--            recommendations, deliverables — same pattern
-- Helper: function to check engagement access
create or replace function is_engagement_member(eng_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from engagements e
    where e.id = eng_id
      and is_org_member(e.organization_id)
  );
$$;

create policy "engagement members can manage vendors" on vendors
  for all using (is_engagement_member(engagement_id))
  with check (is_engagement_member(engagement_id));

create policy "engagement members can manage documents" on documents
  for all using (is_engagement_member(engagement_id))
  with check (is_engagement_member(engagement_id));

create policy "engagement members can manage meetings" on meetings
  for all using (is_engagement_member(engagement_id))
  with check (is_engagement_member(engagement_id));

create policy "engagement members can manage transcripts" on meeting_transcripts
  for all using (
    is_engagement_member((select engagement_id from meetings where id = meeting_transcripts.meeting_id))
  ) with check (
    is_engagement_member((select engagement_id from meetings where id = meeting_transcripts.meeting_id))
  );

create policy "engagement members can manage commitments" on commitments
  for all using (
    is_engagement_member((select engagement_id from meetings where id = commitments.meeting_id))
  ) with check (
    is_engagement_member((select engagement_id from meetings where id = commitments.meeting_id))
  );

create policy "engagement members can manage recommendations" on recommendations
  for all using (is_engagement_member(engagement_id))
  with check (is_engagement_member(engagement_id));

create policy "engagement members can manage deliverables" on deliverables
  for all using (is_engagement_member(engagement_id))
  with check (is_engagement_member(engagement_id));

-- ---------- scoring_frameworks
create policy "anyone can read system frameworks" on scoring_frameworks
  for select using (is_system = true);
create policy "members can read org frameworks" on scoring_frameworks
  for select using (organization_id is not null and is_org_member(organization_id));
create policy "members can create org frameworks" on scoring_frameworks
  for insert with check (organization_id is not null and is_org_member(organization_id));
create policy "members can update org frameworks" on scoring_frameworks
  for update using (organization_id is not null and is_org_member(organization_id));

-- ---------- criteria
create policy "criteria readable if framework readable" on criteria
  for select using (
    exists (
      select 1 from scoring_frameworks sf
      where sf.id = criteria.scoring_framework_id
        and (sf.is_system = true or is_org_member(sf.organization_id))
    )
  );
create policy "members can edit criteria in their org frameworks" on criteria
  for all using (
    exists (
      select 1 from scoring_frameworks sf
      where sf.id = criteria.scoring_framework_id
        and sf.organization_id is not null
        and is_org_member(sf.organization_id)
    )
  ) with check (
    exists (
      select 1 from scoring_frameworks sf
      where sf.id = criteria.scoring_framework_id
        and sf.organization_id is not null
        and is_org_member(sf.organization_id)
    )
  );

-- ---------- scores
create policy "engagement members can read all scores" on scores
  for select using (is_engagement_member(engagement_id));
create policy "stakeholders can manage their own scores" on scores
  for insert with check (
    is_engagement_member(engagement_id) and
    exists (
      select 1 from stakeholders s
      where s.id = scores.stakeholder_id
        and (s.user_id = auth.uid() or is_org_admin((select organization_id from engagements where id = scores.engagement_id)))
    )
  );
create policy "stakeholders can update their own scores" on scores
  for update using (
    exists (
      select 1 from stakeholders s
      where s.id = scores.stakeholder_id
        and (s.user_id = auth.uid() or is_org_admin((select organization_id from engagements where id = scores.engagement_id)))
    )
  );

-- ---------- audit_events
create policy "members can read audit events for their org" on audit_events
  for select using (is_org_member(organization_id));
create policy "members can insert audit events" on audit_events
  for insert with check (is_org_member(organization_id));

-- =====================================================================
-- STORAGE BUCKETS (run separately in Supabase Dashboard or via API)
-- =====================================================================
-- Create three buckets in Supabase Storage:
--   1. engagement-documents  (private)  — RFPs, proposals, attachments
--   2. meeting-recordings    (private)  — audio/video transcripts
--   3. exports               (private)  — generated PDFs
--
-- Storage path convention:
--   {organization_id}/{engagement_id}/{document_id}-{filename}
--
-- Storage RLS policy (apply to each bucket):
--   create policy "members can read their org's files"
--   on storage.objects for select
--   using (
--     bucket_id = 'engagement-documents'
--     and is_org_member((storage.foldername(name))[1]::uuid)
--   );
--   -- repeat for insert/update/delete with similar pattern

-- =====================================================================
-- SEED: System default scoring framework — Benefits Broker (4 pillars)
-- =====================================================================
insert into scoring_frameworks (id, organization_id, name, description, is_system, is_default)
values (
  '00000000-0000-0000-0000-000000000001',
  null,
  'Benefits Broker — Four Pillar Framework',
  'Standard rubric for evaluating benefits broker / advisor responses across Compliance, Contracts, Insurance, and Experience. 25 sub-criteria at 4% each plus a 20% RFP Compliance & Responsiveness section.',
  true,
  true
);

-- Pillar 1: RFP Compliance & Responsiveness (20%)
insert into criteria (scoring_framework_id, pillar, name, weight_percent, sort_order) values
('00000000-0000-0000-0000-000000000001', 'RFP Compliance & Responsiveness', 'Every numbered RFP question answered in order', 4.00, 1),
('00000000-0000-0000-0000-000000000001', 'RFP Compliance & Responsiveness', 'All required attachments provided',             4.00, 2),
('00000000-0000-0000-0000-000000000001', 'RFP Compliance & Responsiveness', 'Format and submission deadline met',           4.00, 3),
('00000000-0000-0000-0000-000000000001', 'RFP Compliance & Responsiveness', 'Responses specific to client, not boilerplate', 4.00, 4),
('00000000-0000-0000-0000-000000000001', 'RFP Compliance & Responsiveness', 'Pricing transparent, complete, no "may receive"', 4.00, 5);

-- Pillar 2: Contract (20%)
insert into criteria (scoring_framework_id, pillar, name, weight_percent, sort_order) values
('00000000-0000-0000-0000-000000000001', 'Contract', 'Provision-level review of TPA, PBM, stop-loss, network', 4.00, 6),
('00000000-0000-0000-0000-000000000001', 'Contract', 'Identification of gag clauses & revenue retention',      4.00, 7),
('00000000-0000-0000-0000-000000000001', 'Contract', 'Centralized vendor contract repository',                 4.00, 8),
('00000000-0000-0000-0000-000000000001', 'Contract', 'Active monitoring of unilateral amendments',             4.00, 9),
('00000000-0000-0000-0000-000000000001', 'Contract', 'Quality of broker''s own engagement letter',             4.00, 10);

-- Pillar 3: Compliance (20%)
insert into criteria (scoring_framework_id, pillar, name, weight_percent, sort_order) values
('00000000-0000-0000-0000-000000000001', 'Compliance', 'Written 408(b)(2) disclosure in actual dollars',         4.00, 11),
('00000000-0000-0000-0000-000000000001', 'Compliance', 'GCPCA attestation support — active gag-clause identification', 4.00, 12),
('00000000-0000-0000-0000-000000000001', 'Compliance', 'Willingness to accept ERISA §3(21)/§3(38) status',      4.00, 13),
('00000000-0000-0000-0000-000000000001', 'Compliance', 'Active ERISA litigation exposure on compensation',      4.00, 14),
('00000000-0000-0000-0000-000000000001', 'Compliance', 'ACA, RxDC, HIPAA, plan documents, testing',             4.00, 15);

-- Pillar 4: Insurance (20%)
insert into criteria (scoring_framework_id, pillar, name, weight_percent, sort_order) values
('00000000-0000-0000-0000-000000000001', 'Insurance', 'Stop-loss attachment & Claims-Paid definition audit',    4.00, 16),
('00000000-0000-0000-0000-000000000001', 'Insurance', 'Response to recent rate increases / renewal posture',    4.00, 17),
('00000000-0000-0000-0000-000000000001', 'Insurance', 'Renewal track record & cost-containment specificity',    4.00, 18),
('00000000-0000-0000-0000-000000000001', 'Insurance', 'Independent clinical review of high-cost claimants',     4.00, 19),
('00000000-0000-0000-0000-000000000001', 'Insurance', 'PBM audit + Payment Integrity audit',                    4.00, 20);

-- Pillar 5: Experience (20%)
insert into criteria (scoring_framework_id, pillar, name, weight_percent, sort_order) values
('00000000-0000-0000-0000-000000000001', 'Experience', 'Dedicated, named, locally-based team with backup',      4.00, 21),
('00000000-0000-0000-0000-000000000001', 'Experience', 'Open enrollment — meetings, materials, bilingual',      4.00, 22),
('00000000-0000-0000-0000-000000000001', 'Experience', 'Year-round HR support — handbook, training, hours',     4.00, 23),
('00000000-0000-0000-0000-000000000001', 'Experience', 'Service KPIs — SLA, retention rate, NPS',               4.00, 24),
('00000000-0000-0000-0000-000000000001', 'Experience', 'Employee-facing technology & member advocacy',          4.00, 25);

-- =====================================================================
-- DONE
-- =====================================================================
-- After running this migration:
--   1. Create the three Storage buckets in Supabase Dashboard
--      (or via the management API) and apply Storage RLS.
--   2. Generate TypeScript types:
--        supabase gen types typescript --linked > lib/supabase/types.ts
--   3. Verify RLS by signing in as a user and confirming
--      cross-org reads are denied.
-- =====================================================================
