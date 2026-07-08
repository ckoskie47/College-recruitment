'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'
import type { Json } from '@/lib/supabase/types'
import { analyzeSchoolResearch, type SchoolResearch } from '@/lib/ai/school-research-analyzer'
import { researchSchoolViaWeb } from '@/lib/ai/school-web-researcher'
import {
  COMM_TYPES, STAGE_ORDER, STAGE_FOR_COMM,
  type PipelineStage, type PipelineStatus, type CommType, type EnergyLevel,
  type RedFlagSeverity, type RedFlagStatus, type QuestionAskedInput, type TranscriptSource,
} from './constants'

// ---------------------------------------------------------------------------

async function getCtx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return { user, svc: createServiceClient() }
}

async function findOrCreateSchool(
  svc: ReturnType<typeof createServiceClient>,
  organizationId: string,
  name: string,
): Promise<string> {
  const trimmed = name.trim()
  const { data: existing } = await svc
    .from('schools')
    .select('id')
    .eq('organization_id', organizationId)
    .ilike('name', trimmed)
    .maybeSingle()

  if (existing) return existing.id

  const { data: created, error } = await svc
    .from('schools')
    .insert({ organization_id: organizationId, name: trimmed })
    .select('id')
    .single()

  if (error || !created) throw new Error(error?.message ?? 'Failed to create school.')
  return created.id
}

// ---------------------------------------------------------------------------
// Add a school (creates/links the shared org-level school + a per-engagement vendor row)
// ---------------------------------------------------------------------------

export async function addSchool(
  engagementId: string,
  name: string,
  coachName: string,
  coachContact: string,
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getCtx()
  if (!ctx) return { success: false, error: 'Unauthorized' }
  if (!name.trim()) return { success: false, error: 'Enter a school name.' }

  const { data: eng } = await ctx.svc.from('engagements').select('organization_id').eq('id', engagementId).single()
  if (!eng) return { success: false, error: 'Engagement not found.' }

  let schoolId: string
  try {
    schoolId = await findOrCreateSchool(ctx.svc, eng.organization_id, name)
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to create school.' }
  }

  const { error } = await ctx.svc.from('vendors').insert({
    engagement_id: engagementId,
    school_id: schoolId,
    name: name.trim(),
    contact_name: coachName.trim() || null,
    contact_email: coachContact.trim() || null,
    metadata: { next_step: '' },
  })

  if (error) return { success: false, error: error.message }
  revalidatePath(`/e/${engagementId}/schools`)
  return { success: true }
}

// ---------------------------------------------------------------------------
// Pipeline stage / status / offer / next-step updates
// ---------------------------------------------------------------------------

export async function updateSchoolStage(
  vendorId: string, engagementId: string, stage: PipelineStage,
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getCtx()
  if (!ctx) return { success: false, error: 'Unauthorized' }
  const { error } = await ctx.svc.from('vendors').update({ pipeline_stage: stage }).eq('id', vendorId)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/e/${engagementId}/schools`)
  return { success: true }
}

export async function updateSchoolStatus(
  vendorId: string, engagementId: string, status: PipelineStatus, passedReason?: string,
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getCtx()
  if (!ctx) return { success: false, error: 'Unauthorized' }
  const { error } = await ctx.svc.from('vendors').update({
    pipeline_status: status,
    passed_reason: status === 'passed' ? (passedReason?.trim() || null) : null,
  }).eq('id', vendorId)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/e/${engagementId}/schools`)
  return { success: true }
}

export async function updateSchoolOffer(
  vendorId: string,
  engagementId: string,
  fields: { nilAmount?: string; nilNotes?: string; ptEstimate?: string; decisionDeadline?: string },
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getCtx()
  if (!ctx) return { success: false, error: 'Unauthorized' }
  const { error } = await ctx.svc.from('vendors').update({
    ...(fields.nilAmount !== undefined && { nil_offer_amount: fields.nilAmount ? parseFloat(fields.nilAmount) : null }),
    ...(fields.nilNotes !== undefined && { nil_offer_notes: fields.nilNotes.trim() || null }),
    ...(fields.ptEstimate !== undefined && { pt_estimate: fields.ptEstimate.trim() || null }),
    ...(fields.decisionDeadline !== undefined && { decision_deadline: fields.decisionDeadline || null }),
  }).eq('id', vendorId)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/e/${engagementId}/schools`)
  return { success: true }
}

// ---------------------------------------------------------------------------
// Current standings — a lightweight, drag-to-reorder gut-feel ranking the
// athlete can update anytime, separate from the weighted-factor comparison
// on the Decision page. List position IS the rank.
// ---------------------------------------------------------------------------

export async function reorderSchoolRanking(
  engagementId: string,
  orderedVendorIds: string[],
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getCtx()
  if (!ctx) return { success: false, error: 'Unauthorized' }

  const updates = orderedVendorIds.map((id, i) =>
    ctx.svc.from('vendors').update({ overall_rank: i + 1 }).eq('id', id)
  )
  const results = await Promise.all(updates)
  const failed = results.find(r => r.error)
  if (failed?.error) return { success: false, error: failed.error.message }

  revalidatePath(`/e/${engagementId}/schools`)
  return { success: true }
}

export async function updateNextStep(
  vendorId: string, engagementId: string, nextStep: string,
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getCtx()
  if (!ctx) return { success: false, error: 'Unauthorized' }
  const { data: current } = await ctx.svc.from('vendors').select('metadata').eq('id', vendorId).single()
  const metadata = { ...(current?.metadata as object ?? {}), next_step: nextStep }
  const { error } = await ctx.svc.from('vendors').update({ metadata: metadata as Json }).eq('id', vendorId)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/e/${engagementId}/schools`)
  return { success: true }
}

// ---------------------------------------------------------------------------
// Log a structured communication — creates a meeting row and auto-advances
// the pipeline stage if this touchpoint represents further progress.
// ---------------------------------------------------------------------------

export async function logInteraction(
  engagementId: string,
  vendorId: string,
  fields: {
    commType: CommType
    date: string
    durationMinutes: string
    whoInitiated: string
    topics: string[]
    keyPoints: string[]
    questionsAsked: QuestionAskedInput[]
    athleteTakeaway: string
    energyLevel: EnergyLevel | ''
    notes: string
    participants: string[]
    npsScore: string
    npsReason: string
    parentNpsScore: string
    parentNpsReason: string
    bestThing: string
    concern: string
  },
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getCtx()
  if (!ctx) return { success: false, error: 'Unauthorized' }

  const title = COMM_TYPES.find(t => t.value === fields.commType)?.label ?? fields.commType

  const { error } = await ctx.svc.from('meetings').insert({
    engagement_id: engagementId,
    vendor_id: vendorId,
    title,
    scheduled_at: new Date(fields.date).toISOString(),
    status: 'complete',
    duration_minutes: fields.durationMinutes ? parseInt(fields.durationMinutes, 10) : null,
    attendees: fields.participants,
    notes: fields.notes.trim() || null,
    comm_type: fields.commType,
    topics: fields.topics.filter(Boolean),
    key_points: fields.keyPoints.filter(Boolean),
    questions_asked: fields.questionsAsked.filter(q => q.question.trim()) as unknown as Json,
    athlete_takeaway: fields.athleteTakeaway.trim() || null,
    energy_level: fields.energyLevel || null,
    who_initiated: fields.whoInitiated.trim() || null,
    nps_score: fields.npsScore ? parseInt(fields.npsScore, 10) : null,
    nps_reason: fields.npsReason.trim() || null,
    parent_nps_score: fields.parentNpsScore ? parseInt(fields.parentNpsScore, 10) : null,
    parent_nps_reason: fields.parentNpsReason.trim() || null,
    best_thing: fields.bestThing.trim() || null,
    concern: fields.concern.trim() || null,
    created_by: ctx.user.id,
  })

  if (error) return { success: false, error: error.message }

  const impliedStage = STAGE_FOR_COMM[fields.commType]
  if (impliedStage) {
    const { data: vendor } = await ctx.svc.from('vendors').select('pipeline_stage').eq('id', vendorId).single()
    if (vendor && STAGE_ORDER.indexOf(impliedStage) > STAGE_ORDER.indexOf(vendor.pipeline_stage)) {
      await ctx.svc.from('vendors').update({ pipeline_stage: impliedStage }).eq('id', vendorId)
    }
  }

  revalidatePath(`/e/${engagementId}/schools`)
  return { success: true }
}

// ---------------------------------------------------------------------------
// Red flags
// ---------------------------------------------------------------------------

export async function addRedFlag(
  engagementId: string,
  vendorId: string | null,
  flag: string,
  severity: RedFlagSeverity,
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getCtx()
  if (!ctx) return { success: false, error: 'Unauthorized' }
  if (!flag.trim()) return { success: false, error: 'Enter a red flag.' }

  const { error } = await ctx.svc.from('red_flags').insert({
    engagement_id: engagementId,
    vendor_id: vendorId,
    source: 'athlete_logged',
    flag: flag.trim(),
    severity,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath(`/e/${engagementId}/schools`)
  return { success: true }
}

export async function updateRedFlagStatus(
  redFlagId: string,
  engagementId: string,
  status: RedFlagStatus,
  resolutionNotes?: string,
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getCtx()
  if (!ctx) return { success: false, error: 'Unauthorized' }
  const { error } = await ctx.svc.from('red_flags').update({
    status,
    ...(resolutionNotes !== undefined && { resolution_notes: resolutionNotes.trim() || null }),
  }).eq('id', redFlagId)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/e/${engagementId}/schools`)
  return { success: true }
}

// ---------------------------------------------------------------------------
// School research — AI-structures pasted notes, files detected red flags,
// and drafts research-homework questions for this specific school.
// ---------------------------------------------------------------------------

export async function saveSchoolResearch(
  engagementId: string,
  vendorId: string,
  schoolId: string,
  rawNotes: string,
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getCtx()
  if (!ctx) return { success: false, error: 'Unauthorized' }
  if (!rawNotes.trim()) return { success: false, error: 'Paste in some research notes first.' }

  const [{ data: school }, { data: vendor }] = await Promise.all([
    ctx.svc.from('schools').select('research_structured').eq('id', schoolId).single(),
    ctx.svc.from('vendors').select('name').eq('id', vendorId).single(),
  ])
  const prior = (school?.research_structured as unknown as SchoolResearch | null) ?? null

  let result
  try {
    result = await analyzeSchoolResearch(vendor?.name ?? 'this school', rawNotes, prior)
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to analyze research.' }
  }

  const { error: schoolErr } = await ctx.svc.from('schools').update({
    research_notes: rawNotes,
    research_structured: result.research as unknown as Json,
    updated_at: new Date().toISOString(),
  }).eq('id', schoolId)
  if (schoolErr) return { success: false, error: schoolErr.message }

  // Re-analysis replaces the previous research-derived flags/questions rather than piling up duplicates.
  await ctx.svc.from('red_flags').delete().eq('engagement_id', engagementId).eq('vendor_id', vendorId).eq('source', 'research')
  await ctx.svc.from('questions').delete().eq('engagement_id', engagementId).eq('vendor_id', vendorId).eq('stage', 'research_homework')

  if (result.research.redFlags.length > 0) {
    await ctx.svc.from('red_flags').insert(
      result.research.redFlags.map(f => ({
        engagement_id: engagementId,
        vendor_id: vendorId,
        source: 'research' as const,
        flag: f.flag,
        severity: f.severity,
        resolution_notes: f.details,
      })),
    )
  }

  if (result.researchHomeworkQuestions.length > 0) {
    await ctx.svc.from('questions').insert(
      result.researchHomeworkQuestions.map((q, i) => ({
        engagement_id: engagementId,
        vendor_id: vendorId,
        stage: 'research_homework' as const,
        source: 'research' as const,
        question: q.question,
        sort_order: i,
      })),
    )
  }

  revalidatePath(`/e/${engagementId}/schools`)
  return { success: true }
}

// ---------------------------------------------------------------------------
// Auto-research a school via live web search (head coach, hitting coach,
// last season's record, postseason result), then run it through the same
// structuring/red-flag pipeline as pasted research notes above.
// ---------------------------------------------------------------------------

export async function autoResearchSchool(
  engagementId: string,
  vendorId: string,
  schoolId: string,
): Promise<{ success: boolean; error?: string; summary?: string }> {
  const ctx = await getCtx()
  if (!ctx) return { success: false, error: 'Unauthorized' }

  const { data: vendor } = await ctx.svc.from('vendors').select('name').eq('id', vendorId).single()

  let summary: string
  try {
    summary = await researchSchoolViaWeb(vendor?.name ?? 'this school')
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to research via web search.' }
  }

  const result = await saveSchoolResearch(engagementId, vendorId, schoolId, summary)
  return { ...result, summary }
}

// ---------------------------------------------------------------------------
// Mark a question asked / record the coach's answer
// ---------------------------------------------------------------------------

export async function markQuestionAsked(
  questionId: string,
  engagementId: string,
  coachAnswer: string,
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getCtx()
  if (!ctx) return { success: false, error: 'Unauthorized' }
  const { error } = await ctx.svc.from('questions').update({
    status: 'asked',
    coach_answer: coachAnswer.trim() || null,
  }).eq('id', questionId)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/e/${engagementId}/schools`)
  return { success: true }
}

// ---------------------------------------------------------------------------
// Call transcripts — pasted text or a text-based file (Otter/Zoom export)
// read client-side, attached to an already-logged communication.
// ---------------------------------------------------------------------------

export async function saveTranscript(
  engagementId: string,
  meetingId: string,
  rawText: string,
  source: TranscriptSource,
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getCtx()
  if (!ctx) return { success: false, error: 'Unauthorized' }
  if (!rawText.trim()) return { success: false, error: 'Paste or upload a transcript first.' }

  const { error } = await ctx.svc.from('meeting_transcripts').insert({
    meeting_id: meetingId,
    raw_text: rawText,
    source,
    uploaded_by: ctx.user.id,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath(`/e/${engagementId}/schools`)
  return { success: true }
}

// ---------------------------------------------------------------------------
// Edit the note on an already-logged touchpoint (timeline entries aren't
// write-once — new information often comes in after the fact).
// ---------------------------------------------------------------------------

export async function updateCommunicationNote(
  engagementId: string,
  meetingId: string,
  notes: string,
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getCtx()
  if (!ctx) return { success: false, error: 'Unauthorized' }

  const { error } = await ctx.svc.from('meetings').update({
    notes: notes.trim() || null,
  }).eq('id', meetingId)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/e/${engagementId}/schools`)
  return { success: true }
}

export async function updateCommunicationNps(
  engagementId: string,
  meetingId: string,
  npsScore: string,
  npsReason: string,
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getCtx()
  if (!ctx) return { success: false, error: 'Unauthorized' }

  const { error } = await ctx.svc.from('meetings').update({
    nps_score: npsScore ? parseInt(npsScore, 10) : null,
    nps_reason: npsReason.trim() || null,
  }).eq('id', meetingId)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/e/${engagementId}/schools`)
  return { success: true }
}

export async function updateCommunicationParentNps(
  engagementId: string,
  meetingId: string,
  parentNpsScore: string,
  parentNpsReason: string,
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getCtx()
  if (!ctx) return { success: false, error: 'Unauthorized' }

  const { error } = await ctx.svc.from('meetings').update({
    parent_nps_score: parentNpsScore ? parseInt(parentNpsScore, 10) : null,
    parent_nps_reason: parentNpsReason.trim() || null,
  }).eq('id', meetingId)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/e/${engagementId}/schools`)
  return { success: true }
}

export async function updateCommunicationVisitImpressions(
  engagementId: string,
  meetingId: string,
  bestThing: string,
  concern: string,
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getCtx()
  if (!ctx) return { success: false, error: 'Unauthorized' }

  const { error } = await ctx.svc.from('meetings').update({
    best_thing: bestThing.trim() || null,
    concern: concern.trim() || null,
  }).eq('id', meetingId)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/e/${engagementId}/schools`)
  return { success: true }
}
