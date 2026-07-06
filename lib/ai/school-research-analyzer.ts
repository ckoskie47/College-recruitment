import { getAnthropicClient, ANALYSIS_MODEL } from './client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RedFlagSeverity = 'low' | 'medium' | 'high'

export type SchoolResearch = {
  headCoach: {
    name: string | null
    yearsAtSchool: number | null
    background: string | null
    philosophy: string | null
    trackRecord: string | null
  }
  program: {
    summary: string | null
    draftHistory: string | null
    recruitingTrend: string | null
  }
  transferPortalHistory: {
    transfersIn: number | null
    transfersOut: number | null
    reasonsOut: string | null
    ptForTransfers: string | null
  }
  redFlags: { flag: string; severity: RedFlagSeverity; details: string | null }[]
  positives: { indicator: string; details: string | null }[]
}

export type ResearchHomeworkQuestion = {
  question: string
  refersToRedFlag: string | null
}

export type SchoolResearchResult = {
  research: SchoolResearch
  researchHomeworkQuestions: ResearchHomeworkQuestion[]
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

/**
 * Structures whatever the athlete/advisor pasted in (articles, roster pages,
 * past call notes, prior structured research) into the research schema,
 * detects red-flag patterns, and drafts "I did my homework" questions that
 * reference this school's specific red flags. Never fetches the web itself —
 * accuracy is tied to whatever real sources the human provides.
 */
export async function analyzeSchoolResearch(
  schoolName: string,
  rawNotes: string,
  priorResearch?: SchoolResearch | null,
): Promise<SchoolResearchResult> {
  const systemPrompt = `You are a college baseball recruiting analyst. You structure raw research notes about a school's program and coaching staff into a consistent schema, and flag recruiting red flags and positive indicators.

Rules:
- Only use facts present in the notes provided. Do not invent statistics, records, or names that aren't in the notes. If a field isn't covered by the notes, leave it null.
- Red flag patterns to watch for: a head coach in year 1-2 (program direction unclear), multiple position players transferring out, coaching staff turnover, limited playing time for recent transfers, declining recruiting class rank, any mentioned compliance/violation issues.
- Positive patterns: stable staff tenure (5+ years), strong position-specific development track record, transfers getting real playing time, winning/postseason history, strong academic support.
- Severity: "high" for patterns directly threatening the athlete's stated concerns (repeated transfers out, no PT for transfers), "medium" for real but explainable concerns (new HC, one-year dip in record), "low" for minor or speculative concerns.
- Draft 3-5 "research homework" questions the athlete can ask that show he did real homework — each should reference a SPECIFIC fact or red flag from the notes (e.g. naming the number of transfers, the coach's prior school, the recruiting rank trend), not a generic question.`

  const priorBlock = priorResearch
    ? `\n\nPRIOR STRUCTURED RESEARCH (merge/update rather than discard facts not contradicted by new notes):\n${JSON.stringify(priorResearch, null, 2)}`
    : ''

  const client = getAnthropicClient()
  const response = await client.messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    tools: [
      {
        name: 'produce_school_research',
        description: 'Produce the structured school research record as JSON',
        input_schema: {
          type: 'object' as const,
          required: ['research', 'researchHomeworkQuestions'],
          properties: {
            research: {
              type: 'object',
              required: ['headCoach', 'program', 'transferPortalHistory', 'redFlags', 'positives'],
              properties: {
                headCoach: {
                  type: 'object',
                  properties: {
                    name: { type: ['string', 'null'] },
                    yearsAtSchool: { type: ['number', 'null'] },
                    background: { type: ['string', 'null'] },
                    philosophy: { type: ['string', 'null'] },
                    trackRecord: { type: ['string', 'null'] },
                  },
                },
                program: {
                  type: 'object',
                  properties: {
                    summary: { type: ['string', 'null'], description: 'Win-loss / postseason summary as free text' },
                    draftHistory: { type: ['string', 'null'] },
                    recruitingTrend: { type: ['string', 'null'] },
                  },
                },
                transferPortalHistory: {
                  type: 'object',
                  properties: {
                    transfersIn: { type: ['number', 'null'] },
                    transfersOut: { type: ['number', 'null'] },
                    reasonsOut: { type: ['string', 'null'] },
                    ptForTransfers: { type: ['string', 'null'] },
                  },
                },
                redFlags: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['flag', 'severity'],
                    properties: {
                      flag: { type: 'string' },
                      severity: { type: 'string', enum: ['low', 'medium', 'high'] },
                      details: { type: ['string', 'null'] },
                    },
                  },
                },
                positives: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['indicator'],
                    properties: {
                      indicator: { type: 'string' },
                      details: { type: ['string', 'null'] },
                    },
                  },
                },
              },
            },
            researchHomeworkQuestions: {
              type: 'array',
              items: {
                type: 'object',
                required: ['question'],
                properties: {
                  question: { type: 'string' },
                  refersToRedFlag: { type: ['string', 'null'] },
                },
              },
            },
          },
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'produce_school_research' },
    messages: [
      {
        role: 'user',
        content: `School: ${schoolName}\n\nRaw research notes:\n${rawNotes}${priorBlock}`,
      },
    ],
  })

  const toolBlock = response.content.find((b) => b.type === 'tool_use')
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('School research analyzer did not return a tool call')
  }

  return toolBlock.input as SchoolResearchResult
}
