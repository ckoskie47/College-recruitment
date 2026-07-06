-- Attachment categorization vocabulary
create type attachment_category as enum (
  'engagement_specific_analysis',
  'direct_questionnaire_answer',
  'generic_product_brochure',
  'case_study_other_client',
  'firm_boilerplate',
  'other_supporting'
);

alter table documents
  add column attachment_category attachment_category,
  add column page_count integer,
  add column substance_note text,
  add column is_primary_response boolean not null default false;

-- Only one document per vendor can be the primary RFP response at a time.
create unique index idx_one_primary_per_vendor
  on documents (vendor_id)
  where is_primary_response = true and vendor_id is not null;
