'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'

export type CreateEngagementState = { error?: string } | null

export async function createEngagement(
  _prevState: CreateEngagementState,
  formData: FormData
): Promise<CreateEngagementState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const name = (formData.get('name') as string | null)?.trim()
  const athleteName = (formData.get('athlete_name') as string | null)?.trim() || null
  const decisionDue = (formData.get('decision_due_at') as string | null)?.trim() || null
  const explicitOrgId = (formData.get('organization_id') as string | null)?.trim() || null

  if (!name) return { error: 'A name for this search is required.' }

  const service = createServiceClient()

  let orgId: string

  if (explicitOrgId) {
    orgId = explicitOrgId
  } else {
    const { data: memberRow } = await service
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .order('organization_id')
      .limit(1)
      .single() as { data: { organization_id: string } | null }

    if (memberRow) {
      orgId = memberRow.organization_id
    } else {
      // Bootstrap org from user profile
      const { data: profile } = await service
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single() as { data: { full_name: string | null; email: string } | null }

      const orgName = profile?.full_name ?? profile?.email ?? 'My Organization'
      const baseSlug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const slug = `${baseSlug}-${Date.now().toString(36)}`

      const { data: newOrg, error: orgErr } = await service
        .from('organizations')
        .insert({ name: orgName, slug })
        .select('id')
        .single() as { data: { id: string } | null; error: { message: string } | null }

      if (orgErr || !newOrg) return { error: 'Could not create organization.' }
      orgId = newOrg.id

      await service.from('organization_members').insert({
        organization_id: orgId,
        user_id: user.id,
        role: 'owner',
      })
    }
  }

  const { data: engagement, error: engErr } = await service
    .from('engagements')
    .insert({
      organization_id: orgId,
      name,
      client_name: athleteName,
      vendor_type: 'college_recruitment',
      decision_due_at: decisionDue || null,
      created_by: user.id,
      status: 'draft',
    })
    .select('id')
    .single() as { data: { id: string } | null; error: { message: string } | null }

  if (engErr || !engagement) return { error: engErr?.message ?? 'Could not create search.' }

  redirect(`/e/${engagement.id}/athlete-profile`)
}
