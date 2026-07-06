// Supabase Edge Function — analyze-proposal
// Receives a trigger from /api/ai/analyze-proposal, runs the Claude analysis
// in the background via EdgeRuntime.waitUntil, and writes results to Supabase.
// Deploy: supabase functions deploy analyze-proposal --no-verify-jwt

import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js@2'

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SVC_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ANTHROPIC_KEY    = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const ANALYSIS_MODEL   = 'claude-sonnet-4-6'
const SIGNED_URL_TTL   = 300 // 5 minutes

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Svc = ReturnType<typeof createClient>

type PreparedFile =
  | { kind: 'url';  url: string;  fileName: string }
  | { kind: 'text'; text: string; fileName: string }
  | { kind: 'skip'; reason: string; fileName: string }

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

type FiduciaryFlag = {
  title: string
  explanation: string
}

type ProposalAnalysis = {
  analyzed_at: string
  vendor_name: string
  proposed_fee: { amount: number | null; structure: string }
  overall_summary: string
  advancement_recommendation: 'ADVANCE' | 'HOLD FOR CLARIFICATION' | 'DO NOT ADVANCE'
  pillar_analyses: PillarAnalysis[]
  fiduciary_flags: FiduciaryFlag[]
  red_flags: string[]
  compensation_disclosure: {
    has_dollar_quantification: boolean
    uses_may_receive_language: boolean
    notes: string
  }
}

type DbCriterionRow = { id: string; pillar: string; name: string; sort_order: number }

// ---------------------------------------------------------------------------
// Scoring rubric
// ---------------------------------------------------------------------------

const CRITERIA_BY_PILLAR = [
  {
    pillar: 'Contract',
    criteria: [
      'Provision-level vendor contract review methodology',
      'Payment Integrity and Shared Savings audit position',
      'Unilateral amendment monitoring',
      'Centralized contract repository and service agreement terms',
      'Insurance coverage with quantified limits',
    ],
  },
  {
    pillar: 'Compliance',
    criteria: [
      'MHPAEA and NQTL comparative analysis under 2024 Final Rule',
      'CAA gag clause prohibition and GCPCA attestation methodology',
      'ERISA §3(21) or §3(38) co-fiduciary acceptance',
      'ERISA welfare fiduciary framework articulation',
      'Annual compliance calendar with sample work product',
    ],
  },
  {
    pillar: 'Insurance',
    criteria: [
      'Stop-loss Claims Paid definition audit',
      'Stop-loss rate strategy with named carriers and rate caps',
      'Independent clinical review of high-cost claimants',
      'First-year cost containment with quantified opportunities',
      'PBM and payment integrity audit with named findings',
    ],
  },
  {
    pillar: 'Experience',
    criteria: [
      'Local market team composition with named individuals',
      'Open enrollment delivery for multi-state employers',
      'HR consulting hours quantified with named owner and scope',
      'Service KPIs with actual numbers',
      'Most recent lost client disclosure',
    ],
  },
]

// ---------------------------------------------------------------------------
// File preparation
// ---------------------------------------------------------------------------

async function prepareFileFromPath(
  svc: Svc,
  storagePath: string,
  mimeType: string | null,
  fileName: string,
): Promise<PreparedFile> {
  const isPdf  = mimeType === 'application/pdf'  || fileName.toLowerCase().endsWith('.pdf')
  const isText = mimeType === 'text/plain'        || fileName.toLowerCase().endsWith('.txt')

  if (isPdf) {
    const { data, error } = await svc.storage
      .from('engagement-documents')
      .createSignedUrl(storagePath, SIGNED_URL_TTL)
    if (error || !data?.signedUrl) return { kind: 'skip', reason: 'Could not generate signed URL', fileName }
    return { kind: 'url', url: data.signedUrl, fileName }
  }

  if (isText) {
    const { data: blob, error } = await svc.storage.from('engagement-documents').download(storagePath)
    if (error || !blob) return { kind: 'skip', reason: 'Download failed', fileName }
    const text = new TextDecoder('utf-8').decode(await (blob as Blob).arrayBuffer()).slice(0, 100_000)
    return { kind: 'text', text, fileName }
  }

  return { kind: 'skip', reason: `Unsupported type: ${mimeType ?? 'unknown'}`, fileName }
}

// deno-lint-ignore no-explicit-any
function toContentBlock(file: PreparedFile, role: string): any[] {
  if (file.kind === 'url') {
    return [{ type: 'document', title: `${role}: ${file.fileName}`, source: { type: 'url', url: file.url } }]
  }
  if (file.kind === 'text') {
    return [{ type: 'document', title: `${role}: ${file.fileName}`, source: { type: 'text', media_type: 'text/plain', data: file.text } }]
  }
  return [{ type: 'text', text: `[${role} — ${file.fileName}: ${file.reason}]` }]
}

// ---------------------------------------------------------------------------
// Claude analysis call
// ---------------------------------------------------------------------------

async function analyzeProposal(
  engagementName: string,
  clientName: string,
  vendorType: string,
  description: string | null,
  rfpFiles: PreparedFile[],
  vendorName: string,
  proposalFiles: PreparedFile[],
  criteriaByName: Map<string, DbCriterionRow>,
): Promise<ProposalAnalysis> {
  const criteriaList = CRITERIA_BY_PILLAR.map(({ pillar, criteria }) =>
    `${pillar}:\n${criteria.map((c, i) => `  ${i + 1}. ${c}`).join('\n')}`
  ).join('\n\n')

  const systemPrompt =
    'You are a senior RFP response evaluator for employee benefits brokerage and consulting engagements. ' +
    'You read written RFP responses on behalf of a plan sponsor (typically a self-funded mid-market employer, 500–10,000 employees).\n\n' +
    'CRITICAL POSTURE\n' +
    '- Assume RFP responses are written to win, not to disclose. Find what is missing, what is hedged, and what is structurally different from the marketing language.\n' +
    '- Do not soften critiques to be helpful. The plan sponsor\'s interest is in seeing the response clearly, not generously.\n' +
    '- Never paraphrase when a direct quote is available — pull the actual language with page reference and question number.\n' +
    '- Catch yourself when persuaded by length, polish, or named-drop frequency. Substance and structure matter more than presentation quality.'

  const instructionText =
    `ENGAGEMENT: ${engagementName}${clientName ? ` (Client: ${clientName})` : ''}
VENDOR TYPE: ${vendorType.replace(/_/g, ' ')}
${description ? `DESCRIPTION: ${description}\n` : ''}VENDOR BEING EVALUATED: ${vendorName}

WHAT YOU ARE MEASURING
1. Responsiveness — Did the vendor answer the question, partially address it, deflect to an adjacent topic, omit it entirely, or declare it out of scope?
2. Substantive Quality — Are answers quantified, specific, evidence-backed, and aligned with plan sponsor fiduciary obligations under current ERISA standards?
3. Follow-Through — If clarifying questions were sent, did the vendor respond completely, partially, or not at all?

CRITERIA — score each 1–5:
  1 = Inadequate; structural failure, unanswered, or evasive
  2 = Weak; generic and qualitative, no specifics
  3 = Adequate; baseline met but unexceptional
  4 = Strong; specific, quantified, evidence-backed
  5 = Exceptional; specific, quantified, fiduciary-aligned, includes sample work product

${criteriaList}

CRITICAL LENS — COMPENSATION TRANSPARENCY
- Search for "may receive" language. Flag every instance — it indicates fiduciary disclosure failure.
- Identify ALL compensation streams: stated fee, commissions, overrides, contingencies, supplemental, bonuses, vendor-side procurement fees.
- Watch for fees outside the stated SOW (e.g., PBM procurement fees paid by the winning bidder).
- A "hard cap" that excludes vendor-paid procurement fees is not a hard cap.

CRITICAL LENS — FIDUCIARY POSTURE
- Does the response affirmatively offer §3(21) or §3(38) status? Implied "no" is still a no.
- Test articulation of welfare vs. pension ERISA framework. Any "it's different in healthcare" language indicates the firm has not adapted to post-Lewandowski standards.
- Check for awareness of recent ERISA broker litigation: Lewandowski v. Johnson & Johnson, Navarro v. Wells Fargo, Knudsen v. Wells Fargo, the Schlichter Bogard PBM cluster, Tiara Yachts v. BCBSM. Absence is itself a finding.
- Confirm Fiduciary Liability insurance coverage with specific sublimits (HIPAA/HITECH, PPACA, §4975, §502(c)).

CRITICAL LENS — INDEPENDENCE
- Test the "independent broker" claim against the actual book of business. Carrier concentration above 80% Big Four (BCBS, UnitedHealthcare, Cigna, Aetna) is a structural constraint.
- When the response names "independent TPAs," verify each: UMR is United-owned. Meritain is Aetna/CVS-owned. Trustmark, HealthEZ, HealthSmart, BAS, Allegiance are genuinely independent.
- Identify leadership backgrounds. Former carrier executives create both institutional knowledge AND structural conflicts of interest.

PATTERN RECOGNITION RED FLAGS
- "Industry standard" → deflection from quantification
- "We may receive" → fiduciary disclosure failure
- "Termination is the ultimate performance guarantee" → no real accountability mechanism
- "We coordinate with the carrier" on compliance → shifts liability that cannot be shifted
- "Comprehensive" + qualitative framing → no numbers
- Generic case studies without named clients → no track record
- Aspirational savings claims without audit methodology, baseline, or peer comparison

ADVANCEMENT THRESHOLDS
- ADVANCE: score ≥ 3.5, no structural disqualification, no more than 2 critical fiduciary flags
- HOLD FOR CLARIFICATION: score 2.5–3.4, OR structural concerns potentially resolvable with written clarification
- DO NOT ADVANCE: score < 2.5, OR structural disqualification (declined fiduciary status, refused compensation disclosure, major RFP sections unanswered)

FIDUCIARY FLAGS FORMAT
For each material concern provide:
- title: UPPERCASE TYPE — EM DASH — QUALIFIER (e.g., "CARRIER OVERRIDE PARTICIPATION — DISCLOSED CONFLICT")
- explanation: 2–4 sentences with verbatim quotes where available, the specific regulatory framework implicated, and the consequence to the plan sponsor.

Use the record_proposal_analysis tool to submit your findings. Keep criterion rationale to 1–2 sentences each. Pull direct quotes with page references wherever possible.`

  // deno-lint-ignore no-explicit-any
  const content: any[] = []

  if (rfpFiles.length > 0) {
    content.push({ type: 'text', text: '=== RFP MATERIALS ===' })
    for (const f of rfpFiles) content.push(...toContentBlock(f, 'RFP'))
  } else {
    content.push({ type: 'text', text: '[No RFP materials — score based on proposal content only]' })
  }

  content.push({ type: 'text', text: `\n=== VENDOR PROPOSAL: ${vendorName} ===` })
  for (const f of proposalFiles) content.push(...toContentBlock(f, 'Proposal'))
  content.push({ type: 'text', text: instructionText })

  const toolSchema = {
    name: 'record_proposal_analysis',
    description: 'Submit structured analysis of a vendor proposal',
    input_schema: {
      type: 'object' as const,
      required: ['vendor_name', 'proposed_fee', 'overall_summary', 'advancement_recommendation', 'pillar_analyses', 'fiduciary_flags', 'red_flags', 'compensation_disclosure'],
      properties: {
        vendor_name:     { type: 'string' },
        proposed_fee: {
          type: 'object',
          required: ['amount', 'structure'],
          properties: {
            amount:    { type: ['number', 'null'] },
            structure: { type: 'string' },
          },
        },
        overall_summary: { type: 'string' },
        advancement_recommendation: {
          type: 'string',
          enum: ['ADVANCE', 'HOLD FOR CLARIFICATION', 'DO NOT ADVANCE'],
        },
        pillar_analyses: {
          type: 'array',
          items: {
            type: 'object',
            required: ['pillar', 'pillar_score', 'criteria_scores'],
            properties: {
              pillar:       { type: 'string', enum: ['Contract', 'Compliance', 'Insurance', 'Experience'] },
              pillar_score: { type: 'number' },
              criteria_scores: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['criterion_name', 'suggested_score', 'rationale'],
                  properties: {
                    criterion_name:  { type: 'string' },
                    suggested_score: { type: 'integer', minimum: 1, maximum: 5 },
                    rationale:       { type: 'string' },
                    evidence_quote:  { type: ['string', 'null'] },
                  },
                },
              },
            },
          },
        },
        fiduciary_flags: {
          type: 'array',
          items: {
            type: 'object',
            required: ['title', 'explanation'],
            properties: {
              title:       { type: 'string' },
              explanation: { type: 'string' },
            },
          },
        },
        red_flags: { type: 'array', items: { type: 'string' } },
        compensation_disclosure: {
          type: 'object',
          required: ['has_dollar_quantification', 'uses_may_receive_language', 'notes'],
          properties: {
            has_dollar_quantification: { type: 'boolean' },
            uses_may_receive_language: { type: 'boolean' },
            notes:                     { type: 'string' },
          },
        },
      },
    },
  }

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY })
  const response = await anthropic.beta.messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: 8192,
    system: systemPrompt,
    tools: [toolSchema],
    tool_choice: { type: 'any' },
    betas: ['pdfs-2024-09-25'],
    messages: [{ role: 'user', content }],
  })

  console.log(`[analyze-fn] stop_reason=${response.stop_reason} input_tokens=${response.usage.input_tokens} output_tokens=${response.usage.output_tokens}`)

  const toolUse = response.content.find((c) => c.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    const textContent = response.content.find((c) => c.type === 'text')
    // deno-lint-ignore no-explicit-any
    throw new Error(`Claude did not return tool use. stop_reason=${response.stop_reason} text=${(textContent as any)?.text?.slice(0, 200) ?? 'none'}`)
  }

  // deno-lint-ignore no-explicit-any
  const raw = toolUse.input as any

  console.log(`[analyze-fn] raw keys: ${Object.keys(raw).join(', ')}`)

  if (!Array.isArray(raw.pillar_analyses)) {
    throw new Error(`pillar_analyses missing or not an array. raw keys: ${Object.keys(raw).join(', ')}`)
  }

  return {
    analyzed_at: new Date().toISOString(),
    vendor_name: raw.vendor_name ?? '',
    proposed_fee: raw.proposed_fee ?? { amount: null, structure: '' },
    overall_summary: raw.overall_summary ?? '',
    advancement_recommendation: raw.advancement_recommendation ?? 'HOLD FOR CLARIFICATION',
    pillar_analyses: (raw.pillar_analyses as Array<{
      pillar: string; pillar_score: number
      criteria_scores: Array<{ criterion_name: string; suggested_score: number; rationale: string; evidence_quote: string | null }>
    }>).map((pa) => ({
      pillar: pa.pillar,
      pillar_score: pa.pillar_score,
      criteria_scores: (pa.criteria_scores ?? []).map((cs) => ({
        criterion_id:    criteriaByName.get(cs.criterion_name)?.id ?? '',
        criterion_name:  cs.criterion_name,
        suggested_score: Math.max(1, Math.min(5, Math.round(cs.suggested_score))),
        rationale:       cs.rationale,
        evidence_quote:  cs.evidence_quote ?? null,
      })),
    })),
    fiduciary_flags: raw.fiduciary_flags ?? [],
    red_flags: raw.red_flags ?? [],
    compensation_disclosure: raw.compensation_disclosure ?? { has_dollar_quantification: false, uses_may_receive_language: false, notes: '' },
  }
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

async function runAnalysisForVendor(
  svc: Svc,
  engagementId: string,
  vendorId: string,
  userId: string,
  docIds?: string[],
): Promise<void> {
  console.log(`[analyze-fn] start engagement=${engagementId} vendor=${vendorId}`)

  const { data: engRow, error: engErr } = await svc
    .from('engagements')
    .select('id, organization_id, name, client_name, description, vendor_type, scoring_framework_id')
    .eq('id', engagementId)
    .single()

  if (engErr || !engRow) throw new Error('Engagement not found')

  const eng = engRow as {
    id: string; organization_id: string; name: string; client_name: string | null
    description: string | null; vendor_type: string; scoring_framework_id: string | null
  }

  const frameworkId = eng.scoring_framework_id ?? '00000000-0000-0000-0000-000000000001'
  const { data: criteriaData } = await svc
    .from('criteria')
    .select('id, pillar, name, sort_order')
    .eq('scoring_framework_id', frameworkId)
    .order('sort_order')

  const criteriaByName = new Map(
    ((criteriaData ?? []) as DbCriterionRow[]).map((c) => [c.name, c])
  )

  const { data: rfpDocMeta } = await svc
    .from('documents')
    .select('storage_path, file_name, mime_type')
    .eq('engagement_id', engagementId)
    .is('vendor_id', null)
    .in('document_type', ['rfp', 'rfp_questionnaire', 'background', 'plan_document'])

  const rfpFiles: PreparedFile[] = []
  for (const doc of rfpDocMeta ?? []) {
    const f = await prepareFileFromPath(svc, doc.storage_path, doc.mime_type ?? null, doc.file_name)
    if (f.kind !== 'skip') rfpFiles.push(f)
  }

  const { data: vendor } = await svc.from('vendors').select('id, name').eq('id', vendorId).single()
  if (!vendor) throw new Error('Vendor not found')
  const vendorName = (vendor as { id: string; name: string }).name

  // Build proposal doc query — filtered to selected docIds if provided
  const propQuery = svc
    .from('documents')
    .select('id, storage_path, file_name, mime_type, is_primary_response')
    .eq('engagement_id', engagementId)
    .eq('vendor_id', vendorId)
    .eq('document_type', 'proposal')
    .order('is_primary_response', { ascending: false })
    .order('uploaded_at', { ascending: false })

  const { data: propDocs } = docIds && docIds.length > 0
    ? await propQuery.in('id', docIds)
    : await propQuery

  if (!propDocs || propDocs.length === 0) throw new Error('No proposal documents found')

  const proposalFiles: PreparedFile[] = []
  for (const doc of propDocs as Array<{ id: string; storage_path: string; file_name: string; mime_type: string | null; is_primary_response: boolean }>) {
    const f = await prepareFileFromPath(svc, doc.storage_path, doc.mime_type ?? null, doc.file_name)
    if (f.kind !== 'skip') proposalFiles.push(f)
  }

  if (proposalFiles.length === 0) throw new Error('No readable proposal documents')

  const targetDoc = (propDocs as Array<{ id: string; is_primary_response: boolean }>).find((d) => d.is_primary_response)
    ?? propDocs[0] as { id: string }

  const analysis = await analyzeProposal(
    eng.name, eng.client_name ?? '', eng.vendor_type, eng.description,
    rfpFiles, vendorName, proposalFiles, criteriaByName,
  )

  await svc
    .from('documents')
    .update({ ai_summary: analysis, ai_processed_at: new Date().toISOString() })
    .eq('id', targetDoc.id)

  if (analysis.proposed_fee.amount !== null || analysis.proposed_fee.structure) {
    await svc
      .from('vendors')
      .update({
        proposed_fee_amount:    analysis.proposed_fee.amount,
        proposed_fee_structure: analysis.proposed_fee.structure || null,
      })
      .eq('id', vendorId)
  }

  await svc.from('audit_events').insert({
    organization_id: eng.organization_id,
    engagement_id:   engagementId,
    actor_id:        userId,
    actor_type:      'user',
    action:          'proposal.analyzed',
    entity_type:     'document',
    entity_id:       targetDoc.id,
    description:     `AI analysis completed for ${vendorName}`,
    metadata:        { vendor_id: vendorId, vendor_name: vendorName },
  })

  console.log(`[analyze-fn] complete vendor=${vendorId}`)
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  console.log('[analyze-fn] invoked')
  console.log(`[analyze-fn] env check — anthropic=${!!ANTHROPIC_KEY} supabase_url=${!!SUPABASE_URL} svc_key=${!!SUPABASE_SVC_KEY}`)

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // No auth check — function URL is internal only, not publicly advertised

  let engagementId: string | undefined
  let vendorId: string | undefined
  let userId: string | undefined
  let docIds: string[] | undefined

  try {
    const body = await req.json() as { engagementId?: string; vendorId?: string; userId?: string; docIds?: string[] }
    engagementId = body.engagementId
    vendorId     = body.vendorId
    userId       = body.userId
    docIds       = body.docIds
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  if (!engagementId || !vendorId || !userId) {
    return new Response('Bad Request', { status: 400 })
  }

  const svc = createClient(SUPABASE_URL, SUPABASE_SVC_KEY, {
    auth: { persistSession: false },
  })

  // Run analysis in background — return 202 immediately
  EdgeRuntime.waitUntil(
    runAnalysisForVendor(svc, engagementId, vendorId, userId, docIds)
      .catch(async (err: unknown) => {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error(`[analyze-fn] analysis failed: ${message}`)

        try {
          const { data: docs } = await svc
            .from('documents')
            .select('id')
            .eq('engagement_id', engagementId!)
            .eq('vendor_id', vendorId!)
            .eq('document_type', 'proposal')
            .order('uploaded_at', { ascending: false })
            .limit(1)

          const targetId = (docIds && docIds.length > 0)
            ? docIds[0]
            : (docs as Array<{ id: string }> | null)?.[0]?.id

          if (targetId) {
            await svc
              .from('documents')
              .update({ ai_summary: { ai_error: message }, ai_processed_at: new Date().toISOString() })
              .eq('id', targetId)
          }
        } catch (writeErr) {
          console.error('[analyze-fn] could not write error to DB:', writeErr)
        }
      })
  )

  return new Response(JSON.stringify({ status: 'accepted' }), {
    status: 202,
    headers: { 'Content-Type': 'application/json' },
  })
})
