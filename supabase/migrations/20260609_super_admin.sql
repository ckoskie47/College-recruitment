-- Add super-admin flag to profiles.
-- Users with this flag bypass org-scoped RLS on the engagements list page
-- and can view all organizations' engagements from a single workspace.

alter table profiles
  add column if not exists is_super_admin boolean not null default false;

-- Grant Corey (Elevate) super-admin access at the platform level.
update profiles
  set is_super_admin = true
  where email = 'corey.koskie@benefitsbyelevate.com';
