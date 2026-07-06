import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkSuperAdmin } from '@/lib/auth/permissions'
import { EngagementsPageClient, type EngagementSummary } from '@/components/engagements/EngagementsPageClient'

export default async function EngagementsPage() {
  const supabase = await createClient()
  const svc = createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const isSuperAdmin = await checkSuperAdmin(user.id)
  let allOrgs: { id: string; name: string }[] = []

  let engs: { id: string; name: string; client_name: string | null; status: string; decision_due_at: string | null; organization_id: string }[] = []
  const orgNamesById = new Map<string, string>()

  if (isSuperAdmin) {
    const [engResult, orgsResult] = await Promise.all([
      svc.from('engagements').select('id, name, client_name, status, decision_due_at, organization_id').order('created_at', { ascending: false }),
      svc.from('organizations').select('id, name').order('name'),
    ])
    engs = (engResult.data ?? []) as typeof engs
    allOrgs = (orgsResult.data ?? []) as typeof allOrgs
    for (const org of allOrgs) orgNamesById.set(org.id, org.name)
  } else {
    const { data: membershipData } = await svc
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
    const orgIds = (membershipData ?? []).map(m => (m as { organization_id: string }).organization_id)
    if (orgIds.length > 0) {
      const { data: engData } = await svc
        .from('engagements')
        .select('id, name, client_name, status, decision_due_at, organization_id')
        .in('organization_id', orgIds)
        .order('created_at', { ascending: false })
      engs = (engData ?? []) as typeof engs
    }
  }

  const ids = engs.map(e => e.id)
  const [schools, interactions] = ids.length > 0
    ? await Promise.all([
        svc.from('vendors').select('engagement_id').in('engagement_id', ids),
        svc.from('meetings').select('engagement_id').in('engagement_id', ids),
      ])
    : [{ data: [] }, { data: [] }]

  const schoolCountById: Record<string, number> = {}
  for (const row of schools.data ?? []) {
    const id = (row as { engagement_id: string }).engagement_id
    schoolCountById[id] = (schoolCountById[id] ?? 0) + 1
  }
  const interactionCountById: Record<string, number> = {}
  for (const row of interactions.data ?? []) {
    const id = (row as { engagement_id: string }).engagement_id
    interactionCountById[id] = (interactionCountById[id] ?? 0) + 1
  }

  const engagements: EngagementSummary[] = engs.map(eng => ({
    id: eng.id,
    name: eng.name,
    client_name: eng.client_name,
    status: eng.status,
    decision_due_at: eng.decision_due_at,
    schoolCount: schoolCountById[eng.id] ?? 0,
    interactionCount: interactionCountById[eng.id] ?? 0,
    orgName: orgNamesById.get(eng.organization_id) ?? null,
  }))

  return <EngagementsPageClient engagements={engagements} isSuperAdmin={isSuperAdmin} orgOptions={allOrgs} />
}
