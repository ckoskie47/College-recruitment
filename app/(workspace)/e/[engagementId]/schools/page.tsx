import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { SchoolsPanel } from './SchoolsPanel'
import type { SchoolWithDetails } from './SchoolsPanel'
import type { PipelineStage, PipelineStatus } from './constants'
import type { SchoolResearch } from '@/lib/ai/school-research-analyzer'
import type { ExitInterview } from '@/lib/ai/visit-question-generator'

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
    .select('id, client_name, exit_interview')
    .eq('id', engagementId)
    .single()

  if (!eng) redirect('/engagements')

  const athleteName = eng.client_name ?? 'Athlete'
  const exitInterview = eng.exit_interview as unknown as ExitInterview | null

  const [{ data: vendors }, { data: meetings }, { data: redFlags }, { data: questions }] = await Promise.all([
    svc.from('vendors')
      .select('id, school_id, name, contact_name, contact_email, pipeline_stage, pipeline_status, nil_offer_amount, nil_offer_notes, pt_estimate, decision_deadline, passed_reason, metadata')
      .eq('engagement_id', engagementId)
      .order('created_at', { ascending: true }),
    svc.from('meetings')
      .select('id, vendor_id, title, scheduled_at, duration_minutes, comm_type, topics, key_points, questions_asked, athlete_takeaway, energy_level, who_initiated, notes, attendees')
      .eq('engagement_id', engagementId)
      .order('scheduled_at', { ascending: false }),
    svc.from('red_flags')
      .select('id, vendor_id, source, flag, severity, status, resolution_notes, matches_exit_concern, created_at')
      .eq('engagement_id', engagementId)
      .order('created_at', { ascending: false }),
    svc.from('questions')
      .select('id, vendor_id, stage, source, factor, question, status, coach_answer, red_flag_identified, sort_order')
      .eq('engagement_id', engagementId)
      .order('sort_order', { ascending: true }),
  ])

  const meetingIds = (meetings ?? []).map(m => m.id)
  const transcriptsByMeeting: Record<string, SchoolWithDetails['communications'][number]['transcript']> = {}
  if (meetingIds.length > 0) {
    const { data: transcripts } = await svc
      .from('meeting_transcripts')
      .select('id, meeting_id, raw_text, source, uploaded_at')
      .in('meeting_id', meetingIds)
      .order('uploaded_at', { ascending: false })
    for (const t of transcripts ?? []) {
      if (transcriptsByMeeting[t.meeting_id]) continue // keep only the most recent per meeting
      transcriptsByMeeting[t.meeting_id] = { id: t.id, rawText: t.raw_text ?? '', source: t.source, uploadedAt: t.uploaded_at }
    }
  }

  const schoolIds = [...new Set((vendors ?? []).map(v => v.school_id).filter((id): id is string => !!id))]

  const schoolsById = new Map<string, { research_notes: string | null; research_structured: SchoolResearch | null }>()
  if (schoolIds.length > 0) {
    const { data: schoolRows } = await svc.from('schools').select('id, research_notes, research_structured').in('id', schoolIds)
    for (const s of schoolRows ?? []) {
      schoolsById.set(s.id, { research_notes: s.research_notes, research_structured: s.research_structured as unknown as SchoolResearch | null })
    }
  }

  // Historical rollup: red flags logged against the same shared school from OTHER engagements.
  const historicalFlagsBySchool: Record<string, { flag: string; severity: string }[]> = {}
  if (schoolIds.length > 0) {
    const { data: otherVendors } = await svc
      .from('vendors')
      .select('id, school_id')
      .in('school_id', schoolIds)
      .neq('engagement_id', engagementId)

    const vendorToSchool = new Map((otherVendors ?? []).map(v => [v.id, v.school_id as string]))
    const otherVendorIds = [...vendorToSchool.keys()]

    if (otherVendorIds.length > 0) {
      const { data: histFlags } = await svc.from('red_flags').select('flag, severity, vendor_id').in('vendor_id', otherVendorIds)
      for (const f of histFlags ?? []) {
        if (!f.vendor_id) continue
        const schoolId = vendorToSchool.get(f.vendor_id)
        if (!schoolId) continue
        if (!historicalFlagsBySchool[schoolId]) historicalFlagsBySchool[schoolId] = []
        historicalFlagsBySchool[schoolId].push({ flag: f.flag, severity: f.severity })
      }
    }
  }

  const meetingsByVendor: Record<string, SchoolWithDetails['communications']> = {}
  for (const m of meetings ?? []) {
    if (!m.vendor_id) continue
    if (!meetingsByVendor[m.vendor_id]) meetingsByVendor[m.vendor_id] = []
    meetingsByVendor[m.vendor_id].push({
      id: m.id,
      title: m.title ?? '',
      scheduled_at: m.scheduled_at ?? new Date().toISOString(),
      duration_minutes: m.duration_minutes,
      comm_type: m.comm_type,
      topics: m.topics ?? [],
      key_points: m.key_points ?? [],
      questions_asked: (m.questions_asked as SchoolWithDetails['communications'][number]['questions_asked']) ?? [],
      athlete_takeaway: m.athlete_takeaway,
      energy_level: m.energy_level,
      who_initiated: m.who_initiated,
      notes: m.notes,
      attendees: Array.isArray(m.attendees) ? m.attendees as string[] : null,
      transcript: transcriptsByMeeting[m.id] ?? null,
    })
  }

  const redFlagsByVendor: Record<string, SchoolWithDetails['redFlags']> = {}
  const exitInterviewFlags: SchoolWithDetails['redFlags'] = []
  for (const f of redFlags ?? []) {
    const entry = {
      id: f.id, source: f.source, flag: f.flag, severity: f.severity,
      status: f.status, resolution_notes: f.resolution_notes, matches_exit_concern: f.matches_exit_concern,
    }
    if (f.vendor_id) {
      if (!redFlagsByVendor[f.vendor_id]) redFlagsByVendor[f.vendor_id] = []
      redFlagsByVendor[f.vendor_id].push(entry)
    } else {
      exitInterviewFlags.push(entry)
    }
  }

  const questionsByVendor: Record<string, SchoolWithDetails['questions']> = {}
  const genericQuestions: SchoolWithDetails['questions'] = []
  for (const q of questions ?? []) {
    const entry = {
      id: q.id, stage: q.stage, source: q.source, factor: q.factor, question: q.question,
      status: q.status, coach_answer: q.coach_answer, red_flag_identified: q.red_flag_identified,
    }
    if (q.vendor_id) {
      if (!questionsByVendor[q.vendor_id]) questionsByVendor[q.vendor_id] = []
      questionsByVendor[q.vendor_id].push(entry)
    } else {
      genericQuestions.push(entry)
    }
  }

  const schools: SchoolWithDetails[] = (vendors ?? []).map(v => ({
    id: v.id,
    school_id: v.school_id,
    name: v.name,
    contact_name: v.contact_name,
    contact_email: v.contact_email,
    pipeline_stage: v.pipeline_stage as PipelineStage,
    pipeline_status: v.pipeline_status as PipelineStatus,
    nil_offer_amount: v.nil_offer_amount,
    nil_offer_notes: v.nil_offer_notes,
    pt_estimate: v.pt_estimate,
    decision_deadline: v.decision_deadline,
    passed_reason: v.passed_reason,
    metadata: v.metadata as { next_step?: string } | null,
    communications: meetingsByVendor[v.id] ?? [],
    redFlags: redFlagsByVendor[v.id] ?? [],
    historicalFlags: v.school_id ? (historicalFlagsBySchool[v.school_id] ?? []) : [],
    questions: [...genericQuestions, ...(questionsByVendor[v.id] ?? [])],
    researchNotes: v.school_id ? (schoolsById.get(v.school_id)?.research_notes ?? null) : null,
    researchStructured: v.school_id ? (schoolsById.get(v.school_id)?.research_structured ?? null) : null,
  }))

  return (
    <SchoolsPanel
      engagementId={engagementId}
      athleteName={athleteName}
      schools={schools}
      exitInterviewFlags={exitInterviewFlags}
      exitInterviewAvoid={exitInterview?.redFlagsToAvoid ?? null}
    />
  )
}
