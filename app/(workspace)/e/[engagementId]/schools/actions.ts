'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'
import type { Database, Json } from '@/lib/supabase/types'

// Use real DB enum values — just relabeled in the UI
export type SchoolStatus = Database['public']['Enums']['proposal_status']

export const SCHOOL_STATUS_LABELS: Record<SchoolStatus, string> = {
  invited:    'Tracking',
  submitted:  'Offered',
  finalist:   'Top Choice',
  selected:   'Committed',
  eliminated: 'Declined',
  declined:   'Declined',
}

export const INTERACTION_TYPES = [
  { value: 'phone_call',         label: 'Phone call' },
  { value: 'video_call',         label: 'Video call' },
  { value: 'unofficial_visit',   label: 'Unofficial visit' },
  { value: 'official_visit',     label: 'Official visit' },
  { value: 'text_exchange',      label: 'Text / email' },
  { value: 'coaches_home_visit', label: "Coach's home visit" },
  { value: 'other',              label: 'Other' },
] as const

export type InteractionType = typeof INTERACTION_TYPES[number]['value']

// ---------------------------------------------------------------------------

async function getCtx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return { user, svc: createServiceClient() }
}

// ---------------------------------------------------------------------------
// Add a school (vendor)
// ---------------------------------------------------------------------------

export async function addSchool(
  engagementId: string,
  name: string,
  coachName: string,
  coachContact: string,
  scholarshipPct: string,
  status: SchoolStatus,
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getCtx()
  if (!ctx) return { success: false, error: 'Unauthorized' }

  const pct = scholarshipPct ? parseFloat(scholarshipPct) : null
  const { error } = await ctx.svc
    .from('vendors')
    .insert({
      engagement_id: engagementId,
      name: name.trim(),
      contact_name: coachName.trim() || null,
      contact_email: coachContact.trim() || null,
      proposed_fee_amount: pct,
      proposal_status: status,
      metadata: { next_step: '' },
    })

  if (error) return { success: false, error: error.message }
  revalidatePath(`/e/${engagementId}/schools`)
  return { success: true }
}

// ---------------------------------------------------------------------------
// Update school status, offer, coach info, or next step
// ---------------------------------------------------------------------------

export async function updateSchool(
  vendorId: string,
  engagementId: string,
  fields: {
    status?: SchoolStatus
    scholarshipPct?: string
    coachName?: string
    coachContact?: string
    nextStep?: string
  },
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getCtx()
  if (!ctx) return { success: false, error: 'Unauthorized' }

  let metadata: object | undefined
  if (fields.nextStep !== undefined) {
    const { data: current } = await ctx.svc
      .from('vendors').select('metadata').eq('id', vendorId).single()
    metadata = { ...(current?.metadata as object ?? {}), next_step: fields.nextStep }
  }

  const { error } = await ctx.svc
    .from('vendors')
    .update({
      ...(fields.status !== undefined && { proposal_status: fields.status }),
      ...(fields.scholarshipPct !== undefined && { proposed_fee_amount: fields.scholarshipPct ? parseFloat(fields.scholarshipPct) : null }),
      ...(fields.coachName !== undefined && { contact_name: fields.coachName.trim() || null }),
      ...(fields.coachContact !== undefined && { contact_email: fields.coachContact.trim() || null }),
      ...(metadata !== undefined && { metadata: metadata as Json }),
    })
    .eq('id', vendorId)

  if (error) return { success: false, error: error.message }
  revalidatePath(`/e/${engagementId}/schools`)
  return { success: true }
}

// ---------------------------------------------------------------------------
// Log an interaction (creates a meeting row with notes)
// ---------------------------------------------------------------------------

export async function logInteraction(
  engagementId: string,
  vendorId: string,
  type: InteractionType,
  date: string,
  summary: string,
  notes: string,
  participants: string[],
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getCtx()
  if (!ctx) return { success: false, error: 'Unauthorized' }

  const label = INTERACTION_TYPES.find(t => t.value === type)?.label ?? type
  const title = `${label}${summary ? ` · ${summary}` : ''}`

  const { data: meeting, error: meetingErr } = await ctx.svc
    .from('meetings')
    .insert({
      engagement_id: engagementId,
      vendor_id: vendorId,
      title,
      scheduled_at: new Date(date).toISOString(),
      status: 'complete',
      location: type,
      attendees: participants,
      notes: notes.trim() || null,
      created_by: ctx.user.id,
    })
    .select('id')
    .single()

  if (meetingErr || !meeting) return { success: false, error: meetingErr?.message ?? 'Failed to log interaction.' }

  revalidatePath(`/e/${engagementId}/schools`)
  return { success: true }
}
