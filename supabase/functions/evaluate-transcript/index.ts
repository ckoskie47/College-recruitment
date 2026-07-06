// Supabase Edge Function — evaluate-transcript
// Receives a trigger from /api/ai/evaluate-transcript, runs Claude evaluation
// in the background via EdgeRuntime.waitUntil, and writes results to Supabase.
// Deploy: supabase functions deploy evaluate-transcript --no-verify-jwt

import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js@2'

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SVC_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ANTHROPIC_KEY    = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const MODEL            = 'claude-sonnet-4-6'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// deno-lint-ignore no-explicit-any
type Svc = any

type CriterionScore = {
  criterion_id: string
  criterion_name: string
  suggested_score: number
  rationale: string
  evidence_quote: string | null
}

type PillarAnalysis = {
  pillar: string
  pillar_score: number
  criteria_scores: CriterionScore[]
}

type ProposalAnalysis = {
  vendor_name: string
  overall_summary: string
  advancement_recommendation?: string
  pillar_analyses: PillarAnalysis[]
  fiduciary_flags?: Array<{ title: string; explanation: string }>
  red_flags?: string[]
  compensation_disclosure: {
    has_dollar_quantification: boolean
    uses_may_receive_language: boolean
    notes: string
  }
}

type ExtractedCommitment = {
  timestamp_seconds: number | null
  timestamp_display: string | null
  quote: string
  summary: string
  pillar: string
  tags: string[]
  flag: string | null
  flag_severity: 'none' | 'info' | 'warning' | 'critical'
  cross_reference_status: 'aligned' | 'contradicts_rfp' | 'new_commitment' | 'unverified'
}

type PostMeetingScore = {
  criterion_id: string
  criterion_name: string
  pillar: string
  post_meeting_score: number
  delta: number
  rationale: string
  supporting_quotes: string[]
}

type EvaluationResult = {
  overall_impression: string
  contradiction_summary: string | null
  commitments: ExtractedCommitment[]
  post_meeting_scores: PostMeetingScore[]
  unaddressed_priority_questions: string[]
}

// ---------------------------------------------------------------------------
// Claude evaluation call
// ---------------------------------------------------------------------------

const MEETING_SYSTEM = `You are a senior fiduciary advisor evaluating a finalist vendor meeting transcript.

Your job:
1. Extract every specific commitment the vendor made — promises, guarantees, representations, and claims about what they will do.
2. Cross-reference each commitment against the original RFP analysis — does it align, contradict, or add something new?
3. Update the scoring for each criterion based on what was revealed in the meeting.
4. Flag contradictions and evasions with precision.

Standards:
- A "commitment" is a specific, verifiable statement — not a general claim.
- Score changes must be justified by specific transcript evidence.
- Contradictions are more important than confirmations.
- Evasion should be noted.`

const EMAIL_SYSTEM = `You are a senior fiduciary advisor reviewing post-meeting written follow-up correspondence from a vendor.

Your job:
1. Extract every specific commitment, clarification, or written representation — written statements carry more evidentiary weight than verbal ones.
2. Cross-reference each statement against the original RFP analysis — does it align, add new specificity, or contradict what was proposed?
3. Identify fee quantifications and compensation disclosures — dollar figures stated in writing are the standard.
4. Flag any commitments that are new (not in the RFP) or that contradict prior statements.
5. Update scoring for criteria where written evidence changes the picture.

Standards:
- "We will" in writing is a binding commitment. "We may" or "we can" is not.
- Dollar-quantified compensation stated in writing supersedes vague RFP language.
- A formal written response that dodges a specific question is an evasion — flag as warning.
- Written commitments that contradict verbal meeting content are critical flags.
- Timestamps are not applicable — leave timestamp fields null.`

async function runEvaluation(
  transcriptText: string,
  vendorName: string,
  rfpAnalysis: ProposalAnalysis,
  source = 'meeting',
): Promise<EvaluationResult> {
  const client = new Anthropic({ apiKey: ANTHROPIC_KEY })
  const isEmail = source === 'email_followup'

  const criteriaContext = rfpAnalysis.pillar_analyses.map((pa: PillarAnalysis) =>
    pa.criteria_scores.map((cs: CriterionScore) =>
      `  [${pa.pillar}] ${cs.criterion_name} (criterion_id: ${cs.criterion_id}) — RFP score: ${cs.suggested_score}/5\n    RFP rationale: ${cs.rationale}`
    ).join('\n')
  ).join('\n')

  const fiduciaryFlagsContext = rfpAnalysis.fiduciary_flags && rfpAnalysis.fiduciary_flags.length > 0
    ? rfpAnalysis.fiduciary_flags.map((f: { title: string; explanation: string }) => `• ${f.title}: ${f.explanation}`).join('\n')
    : (rfpAnalysis.red_flags ?? []).map((f: string) => `• ${f}`).join('\n') || 'None identified'

  const systemContext = `
VENDOR: ${vendorName}
RFP ADVANCEMENT RECOMMENDATION: ${rfpAnalysis.advancement_recommendation ?? 'Not set'}
RFP OVERALL SUMMARY: ${rfpAnalysis.overall_summary}

RFP CRITERIA AND INITIAL SCORES:
${criteriaContext}

RFP FIDUCIARY FLAGS:
${fiduciaryFlagsContext}

COMPENSATION DISCLOSURE FROM RFP:
- Dollar quantification: ${rfpAnalysis.compensation_disclosure.has_dollar_quantification ? 'Yes' : 'No'}
- "May receive" language: ${rfpAnalysis.compensation_disclosure.uses_may_receive_language ? 'Yes' : 'No'}
- Notes: ${rfpAnalysis.compensation_disclosure.notes}
`.trim()

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: isEmail ? EMAIL_SYSTEM : MEETING_SYSTEM,
    tools: [
      {
        name: 'submit_transcript_evaluation',
        description: 'Submit the complete evaluation of the finalist meeting transcript',
        input_schema: {
          type: 'object',
          required: ['overall_impression', 'commitments', 'post_meeting_scores', 'unaddressed_priority_questions'],
          properties: {
            overall_impression: { type: 'string' },
            contradiction_summary: { type: ['string', 'null'] },
            commitments: {
              type: 'array',
              items: {
                type: 'object',
                required: ['quote', 'summary', 'pillar', 'tags', 'flag_severity', 'cross_reference_status'],
                properties: {
                  timestamp_seconds: { type: ['number', 'null'] },
                  timestamp_display: { type: ['string', 'null'] },
                  quote: { type: 'string' },
                  summary: { type: 'string' },
                  pillar: { type: 'string', enum: ['Compliance', 'Contract', 'Insurance', 'Experience'] },
                  tags: { type: 'array', items: { type: 'string' } },
                  flag: { type: ['string', 'null'] },
                  flag_severity: { type: 'string', enum: ['none', 'info', 'warning', 'critical'] },
                  cross_reference_status: { type: 'string', enum: ['aligned', 'contradicts_rfp', 'new_commitment', 'unverified'] },
                },
              },
            },
            post_meeting_scores: {
              type: 'array',
              items: {
                type: 'object',
                required: ['criterion_id', 'criterion_name', 'pillar', 'post_meeting_score', 'delta', 'rationale'],
                properties: {
                  criterion_id: { type: 'string' },
                  criterion_name: { type: 'string' },
                  pillar: { type: 'string' },
                  post_meeting_score: { type: 'number', minimum: 1, maximum: 5 },
                  delta: { type: 'number' },
                  rationale: { type: 'string' },
                  supporting_quotes: { type: 'array', items: { type: 'string' } },
                },
              },
            },
            unaddressed_priority_questions: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'submit_transcript_evaluation' },
    messages: [
      {
        role: 'user',
        content: isEmail
          ? `Review the following post-meeting written follow-up email from ${vendorName}.\n\nContext (RFP analysis):\n${systemContext}\n\n--- FOLLOW-UP EMAIL ---\n${transcriptText.substring(0, 60000)}\n--- END EMAIL ---\n\nExtract all written commitments, note fee quantifications, update scores where written evidence changes the picture, and flag any evasions or contradictions.`
          : `Evaluate the following finalist meeting transcript for ${vendorName}.\n\nContext (RFP analysis):\n${systemContext}\n\n--- TRANSCRIPT ---\n${transcriptText.substring(0, 60000)}\n--- END TRANSCRIPT ---\n\nExtract all commitments, update criterion scores, flag contradictions, and note unaddressed questions.`,
      },
    ],
  })

  console.log(`[evaluate-fn] stop_reason=${response.stop_reason} output_tokens=${response.usage.output_tokens}`)

  const toolBlock = response.content.find((b: { type: string }) => b.type === 'tool_use')
  if (!toolBlock || toolBlock.type !== 'tool_use') throw new Error('No tool call returned')

  // deno-lint-ignore no-explicit-any
  const raw = (toolBlock as any).input as EvaluationResult

  return {
    overall_impression: raw.overall_impression,
    contradiction_summary: raw.contradiction_summary ?? null,
    commitments: raw.commitments ?? [],
    post_meeting_scores: raw.post_meeting_scores ?? [],
    unaddressed_priority_questions: raw.unaddressed_priority_questions ?? [],
  }
}

// ---------------------------------------------------------------------------
// Main evaluation runner
// ---------------------------------------------------------------------------

async function runEvaluationForTranscript(svc: Svc, transcriptId: string, userId: string): Promise<void> {
  // Load transcript
  const { data: transcript } = await svc
    .from('meeting_transcripts')
    .select('id, raw_text, meeting_id, source')
    .eq('id', transcriptId)
    .single()

  if (!transcript || !transcript.raw_text) throw new Error('Transcript not found or empty')

  // Load meeting
  const { data: meeting } = await svc
    .from('meetings')
    .select('id, engagement_id, vendor_id')
    .eq('id', transcript.meeting_id)
    .single()

  if (!meeting) throw new Error('Meeting not found')

  // Load vendor
  const { data: vendor } = await svc
    .from('vendors')
    .select('id, name')
    .eq('id', meeting.vendor_id)
    .single()

  if (!vendor) throw new Error('Vendor not found')

  // Load RFP analysis
  const { data: docs } = await svc
    .from('documents')
    .select('ai_summary')
    .eq('engagement_id', meeting.engagement_id)
    .eq('vendor_id', vendor.id)
    .eq('document_type', 'proposal')
    .not('ai_summary', 'is', null)
    .order('ai_processed_at', { ascending: false })
    .limit(10)

  function hasPillarAnalyses(s: unknown): boolean {
    if (!s || typeof s !== 'object') return false
    const obj = s as Record<string, unknown>
    return !obj.ai_error && (Array.isArray(obj.pillar_analyses) || obj.overall_summary != null)
  }

  let analysisDoc = (docs ?? []).find((d: { ai_summary: unknown }) => hasPillarAnalyses(d.ai_summary))

  if (!analysisDoc) {
    const { data: fallback } = await svc
      .from('documents')
      .select('ai_summary')
      .eq('engagement_id', meeting.engagement_id)
      .eq('vendor_id', vendor.id)
      .not('ai_summary', 'is', null)
      .order('ai_processed_at', { ascending: false })
      .limit(10)
    analysisDoc = (fallback ?? []).find((d: { ai_summary: unknown }) => hasPillarAnalyses(d.ai_summary))
  }

  if (!analysisDoc) throw new Error(`No RFP analysis found for ${vendor.name}. Run analysis first.`)

  const rfpAnalysis = analysisDoc.ai_summary as ProposalAnalysis

  // Run Claude evaluation (email follow-ups use a different prompt)
  const evaluation = await runEvaluation(transcript.raw_text, vendor.name, rfpAnalysis, transcript.source ?? 'meeting')

  // Persist commitments
  if (evaluation.commitments.length > 0) {
    await svc.from('commitments').delete().eq('transcript_id', transcriptId)
    await svc.from('commitments').insert(
      evaluation.commitments.map((c: ExtractedCommitment) => ({
        meeting_id: meeting.id,
        transcript_id: transcriptId,
        timestamp_seconds: c.timestamp_seconds,
        timestamp_display: c.timestamp_display,
        quote: c.quote,
        summary: c.summary,
        tags: c.tags,
        pillar: c.pillar,
        flag: c.flag,
        flag_severity: c.flag_severity,
        cross_reference_status: c.cross_reference_status,
      }))
    )
  }

  // Store evaluation summary + mark as processed
  await svc
    .from('meeting_transcripts')
    .update({
      processed_at: new Date().toISOString(),
      evaluation_result: {
        overall_impression: evaluation.overall_impression,
        contradiction_summary: evaluation.contradiction_summary,
        unaddressed_priority_questions: evaluation.unaddressed_priority_questions,
        post_meeting_scores: evaluation.post_meeting_scores,
        evaluated_at: new Date().toISOString(),
      },
    })
    .eq('id', transcriptId)

  // Persist post_meeting scores
  const { data: stakeholder } = await svc
    .from('stakeholders')
    .select('id')
    .eq('engagement_id', meeting.engagement_id)
    .eq('user_id', userId)
    .single()

  if (stakeholder && evaluation.post_meeting_scores.length > 0) {
    for (const ps of evaluation.post_meeting_scores) {
      await svc
        .from('scores')
        .upsert({
          engagement_id: meeting.engagement_id,
          vendor_id: vendor.id,
          criterion_id: ps.criterion_id,
          stakeholder_id: stakeholder.id,
          phase: 'post_meeting',
          score: ps.post_meeting_score,
          note: ps.rationale,
        }, { onConflict: 'vendor_id,criterion_id,stakeholder_id,phase' })
    }
  }

  // Load org for audit
  const { data: eng } = await svc
    .from('engagements')
    .select('organization_id')
    .eq('id', meeting.engagement_id)
    .single()

  if (eng) {
    await svc.from('audit_events').insert({
      organization_id: eng.organization_id,
      engagement_id: meeting.engagement_id,
      actor_id: userId,
      action: 'transcript_evaluated',
      entity_type: 'meeting_transcript',
      description: `Transcript evaluated for ${vendor.name}: ${evaluation.commitments.length} commitments extracted`,
      metadata: {
        meeting_id: meeting.id,
        vendor_id: vendor.id,
        commitments_extracted: evaluation.commitments.length,
        scores_updated: evaluation.post_meeting_scores.length,
      },
    })
  }

  console.log(`[evaluate-fn] done: vendor=${vendor.name} commitments=${evaluation.commitments.length} scores=${evaluation.post_meeting_scores.length}`)
}

// ---------------------------------------------------------------------------
// HTTP handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } })
  }

  let transcriptId: string | undefined
  let userId: string | undefined

  try {
    const body = await req.json()
    transcriptId = body.transcriptId
    userId = body.userId
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  if (!transcriptId || !userId) {
    return new Response('Bad Request — transcriptId and userId required', { status: 400 })
  }

  const svc = createClient(SUPABASE_URL, SUPABASE_SVC_KEY, {
    auth: { persistSession: false },
  })

  EdgeRuntime.waitUntil(
    runEvaluationForTranscript(svc, transcriptId, userId)
      .catch(async (err: unknown) => {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error(`[evaluate-fn] evaluation failed: ${message}`)
        // Store error in evaluation_result so the poller can surface it
        try {
          await svc
            .from('meeting_transcripts')
            .update({
              processed_at: new Date().toISOString(),
              evaluation_result: { ai_error: message },
            })
            .eq('id', transcriptId!)
        } catch (writeErr) {
          console.error('[evaluate-fn] could not write error to DB:', writeErr)
        }
      })
  )

  return new Response(JSON.stringify({ status: 'accepted' }), {
    status: 202,
    headers: { 'Content-Type': 'application/json' },
  })
})
