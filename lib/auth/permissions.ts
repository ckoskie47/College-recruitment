import { createServiceClient } from '@/lib/supabase/service'

export type OrgAccess = {
  isMember: boolean
  isAdmin: boolean
  isSuperAdmin: boolean
}

export async function checkSuperAdmin(userId: string): Promise<boolean> {
  const svc = createServiceClient()
  const { data } = await svc
    .from('profiles')
    .select('is_super_admin')
    .eq('id', userId)
    .single()
  return (data as { is_super_admin?: boolean } | null)?.is_super_admin ?? false
}

/**
 * Check whether a user has access to an organization.
 * Super admins implicitly pass all checks regardless of explicit membership.
 */
export async function checkOrgAccess(
  userId: string,
  organizationId: string,
): Promise<OrgAccess> {
  const svc = createServiceClient()

  const [memberResult, profileResult] = await Promise.all([
    svc
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle(),
    svc
      .from('profiles')
      .select('is_super_admin')
      .eq('id', userId)
      .single(),
  ])

  const isSuperAdmin =
    (profileResult.data as { is_super_admin?: boolean } | null)?.is_super_admin ?? false
  const role = (memberResult.data as { role?: string } | null)?.role

  return {
    isMember: isSuperAdmin || !!role,
    isAdmin: isSuperAdmin || role === 'owner' || role === 'admin',
    isSuperAdmin,
  }
}
