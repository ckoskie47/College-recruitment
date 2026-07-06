import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { SchoolsPanel } from './SchoolsPanel'
import type { SchoolWithInteractions } from './SchoolsPanel'
import type { SchoolStatus } from './actions'

export default async function SchoolsPage({
  params,
}: {
  params: Promise<{ engagementId: string }>
}) {
  const { engagementId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const svc = createServiceClient()

  const { data: eng } = await svc
    .from('engagements')
    .select('id')
    .eq('id', engagementId)
    .single()

  if (!eng) redirect('/engagements')

  // Load all vendors (schools) for this engagement
  const { data: vendors } = await svc
    .from('vendors')
    .select('id, name, contact_name, contact_email, proposed_fee_amount, proposal_status, metadata')
    .eq('engagement_id', engagementId)
    .order('created_at', { ascending: true })

  // Load all meetings (interactions) for this engagement, sorted newest-first
  const { data: meetings } = await svc
    .from('meetings')
    .select('id, vendor_id, title, scheduled_at, location, notes, attendees')
    .eq('engagement_id', engagementId)
    .order('scheduled_at', { ascending: false })

  // Group meetings by vendor
  const interactionsByVendor: Record<string, SchoolWithInteractions['interactions']> = {}
  for (const m of meetings ?? []) {
    if (!m.vendor_id) continue
    if (!interactionsByVendor[m.vendor_id]) interactionsByVendor[m.vendor_id] = []
    interactionsByVendor[m.vendor_id].push({
      id: m.id,
      title: m.title ?? '',
      scheduled_at: m.scheduled_at ?? new Date().toISOString(),
      location: m.location,
      notes: m.notes ?? null,
      attendees: Array.isArray(m.attendees) ? m.attendees as string[] : null,
    })
  }

  const schools: SchoolWithInteractions[] = (vendors ?? []).map(v => ({
    id: v.id,
    name: v.name,
    contact_name: v.contact_name,
    contact_email: v.contact_email,
    proposed_fee_amount: v.proposed_fee_amount,
    proposal_status: (v.proposal_status ?? 'invited') as SchoolStatus,
    metadata: v.metadata as { next_step?: string } | null,
    interactions: interactionsByVendor[v.id] ?? [],
  }))

  return <SchoolsPanel engagementId={engagementId} schools={schools} />
}
