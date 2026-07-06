-- =====================================================================
-- Elevate Fiduciary Workspace — Storage RLS Policies
-- =====================================================================
-- Run this in the Supabase SQL Editor AFTER:
--   (1) the main schema.sql has been applied (creates is_org_member /
--       is_org_admin helper functions), and
--   (2) the three storage buckets have been created in the Dashboard:
--         engagement-documents, meeting-recordings, exports
--
-- Path convention enforced by these policies:
--   {organization_id}/{engagement_id}/{document_id}-{filename}
--
-- The first folder in the storage path is the organization UUID.
-- storage.foldername(name) returns a text[] of folder segments;
-- (storage.foldername(name))[1] is the first segment — we cast to uuid
-- and check membership via is_org_member().
--
-- Note: storage.objects already has RLS enabled by default in Supabase.
-- =====================================================================

-- ---------------------------------------------------------------------
-- BUCKET: engagement-documents
-- RFPs, proposals, attachments, contracts, supporting docs
-- ---------------------------------------------------------------------

create policy "engagement-documents: members can read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'engagement-documents'
  and is_org_member(((storage.foldername(name))[1])::uuid)
);

create policy "engagement-documents: members can upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'engagement-documents'
  and is_org_member(((storage.foldername(name))[1])::uuid)
);

create policy "engagement-documents: members can update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'engagement-documents'
  and is_org_member(((storage.foldername(name))[1])::uuid)
);

create policy "engagement-documents: admins can delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'engagement-documents'
  and is_org_admin(((storage.foldername(name))[1])::uuid)
);

-- ---------------------------------------------------------------------
-- BUCKET: meeting-recordings
-- Otter exports, recording files, transcript file uploads
-- ---------------------------------------------------------------------

create policy "meeting-recordings: members can read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'meeting-recordings'
  and is_org_member(((storage.foldername(name))[1])::uuid)
);

create policy "meeting-recordings: members can upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'meeting-recordings'
  and is_org_member(((storage.foldername(name))[1])::uuid)
);

create policy "meeting-recordings: members can update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'meeting-recordings'
  and is_org_member(((storage.foldername(name))[1])::uuid)
);

create policy "meeting-recordings: admins can delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'meeting-recordings'
  and is_org_admin(((storage.foldername(name))[1])::uuid)
);

-- ---------------------------------------------------------------------
-- BUCKET: exports
-- Generated PDFs (recommendation memos, audit trail exports, etc.)
-- ---------------------------------------------------------------------

create policy "exports: members can read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'exports'
  and is_org_member(((storage.foldername(name))[1])::uuid)
);

create policy "exports: members can upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'exports'
  and is_org_member(((storage.foldername(name))[1])::uuid)
);

create policy "exports: admins can delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'exports'
  and is_org_admin(((storage.foldername(name))[1])::uuid)
);

-- =====================================================================
-- VERIFY
-- =====================================================================
-- Quick sanity check that the policies are in place:
--   select policyname, cmd, qual
--   from pg_policies
--   where tablename = 'objects' and schemaname = 'storage';
--
-- You should see 11 policies (4 + 4 + 3).
--
-- True end-to-end verification happens when the upload code is built:
-- a user signed into Org A should be denied uploading to a path
-- starting with Org B's UUID. The Next.js app will enforce the path
-- convention via server-side helpers in lib/supabase/storage.ts.
-- =====================================================================
