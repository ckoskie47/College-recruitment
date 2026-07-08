import { getAnthropicClient, ANALYSIS_MODEL } from './client'
import {
  EXIT_REASON_LABELS,
  formatBioLine,
  type AthleteProfile,
  type ExitInterview,
  type PriorityFactor,
} from './visit-question-generator'
import { PRIORITY_FACTOR_LABELS } from './visit-question-generator'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QuestionBankStage = 'intro_call' | 'deep_dive' | 'zoom' | 'visit'

export type GeneratedQuestion = {
  stage: QuestionBankStage
  factor: PriorityFactor | null
  question: string
}

const STAGE_CONFIG: Record<QuestionBankStage, { count: number; description: string; scope: string }> = {
  intro_call: {
    count: 4,
    description: 'brief, friendly questions for the very first call',
    scope: 'Surface-level rapport and interest only: initial recruiting interest, staff/roster basics, timeline. Do NOT ask pointed priority-driven questions here — those belong to the deep-dive stage.',
  },
  deep_dive: {
    count: 10,
    description: 'pointed questions for follow-up calls with the head coach / position coach',
    scope: 'This is the ONLY stage that owns substantive, priority-factor-driven questions (playing time, development plan, coaching philosophy, program direction, culture) and the exit-interview-driven questions. Cover each priority factor and exit-interview concern once, here, in depth.',
  },
  zoom: {
    count: 6,
    description: 'questions for a video call',
    scope: 'Practical/operational topics only, not already owned by deep-dive: facilities, academics, NIL structure, roster/depth chart specifics, logistics. Do not re-ask deep-dive\'s playing-time or coaching-philosophy questions.',
  },
  visit: {
    count: 6,
    description: 'questions for an in-person campus visit',
    scope: 'In-person gut-check and verification only: team chemistry observed in person, campus/town fit, and confirming what was promised on earlier calls (e.g. "You mentioned X earlier — can I see that in person?"). Do not repeat deep-dive or zoom questions verbatim or in substance.',
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sortedPriorityLabels(ranking: Record<PriorityFactor, number>): string[] {
  return (Object.entries(ranking) as [PriorityFactor, number][])
    .sort((a, b) => a[1] - b[1])
    .map(([k]) => PRIORITY_FACTOR_LABELS[k])
}

function exitInterviewSummary(exit: ExitInterview): string {
  if (exit.reasons.length === 0) return 'No exit interview reasons given.'
  const lines = exit.reasons.map(r => {
    const details = exit.details[r]
    const detailLines = details
      ? Object.values(details).filter(Boolean).map(v => `    - ${v}`).join('\n')
      : ''
    return `  - ${EXIT_REASON_LABELS[r]}${detailLines ? `\n${detailLines}` : ''}`
  })
  return `Reasons for entering the portal:\n${lines.join('\n')}\n\nRed flags to avoid next time: ${exit.redFlagsToAvoid || 'none stated'}`
}

// ---------------------------------------------------------------------------
// One stage at a time — smaller, faster calls run in parallel instead of a
// single ~35-question call that risked hitting the platform's request
// timeout under load.
// ---------------------------------------------------------------------------

async function generateStageQuestions(
  stage: QuestionBankStage,
  summary: string,
  athleteName: string,
): Promise<GeneratedQuestion[]> {
  const { count, description, scope } = STAGE_CONFIG[stage]

  const systemPrompt = `You are an experienced college baseball recruiting advisor building a reusable question bank for a Division I transfer portal athlete to use across every school he talks to. The full question bank is built from four separate stages (intro call, deep dive, zoom, visit); you are only generating THIS stage's questions.

Generate exactly ${count} ${description}. Scope for this stage: ${scope}

Two sources drive these questions:
1. The athlete's stated PRIORITIES — higher-ranked factors get more and harder questions (in the stage that owns them, per the scope above). Tag each such question with the priority factor that drove it.
2. The athlete's EXIT INTERVIEW — questions that directly probe whether the new school will repeat the specific problems that made him leave his last program. Reference only what's actually stated below — do not add specifics that aren't there.

STRICT ACCURACY RULE: Only use facts explicitly present in the ATHLETE summary given to you. Never invent biographical details, positions, stats, injuries, past incidents, or dialogue/quotes attributed to the athlete or a coach. If a question needs framing around something sensitive (e.g. playing time concerns), keep the framing generic and tied only to what's explicitly stated (e.g. "given that playing time was a factor in my decision to leave") — never fabricate a specific story, score, or characterization to make it sound more real.

NO DUPLICATES: Stay strictly within this stage's scope. Do not generate a question that restates, in different words, something better suited to another stage — trust that the other stages are covering their own lanes.

Questions must be specific and require verifiable answers (names, numbers, timelines) — not questions a coach can dodge with a sales pitch.`

  const client = getAnthropicClient()
  const response = await client.messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: 1500,
    system: systemPrompt,
    tools: [
      {
        name: 'produce_questions',
        description: `Produce the ${count} questions for this stage as structured JSON`,
        input_schema: {
          type: 'object' as const,
          required: ['questions'],
          properties: {
            questions: {
              type: 'array',
              items: {
                type: 'object',
                required: ['question'],
                properties: {
                  factor: {
                    type: ['string', 'null'],
                    enum: [...Object.keys(PRIORITY_FACTOR_LABELS), null],
                    description: 'Which priority factor drove this question, if any. Null for exit-interview-driven or generic logistics questions.',
                  },
                  question: { type: 'string', description: 'The verbatim question to ask' },
                },
              },
            },
          },
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'produce_questions' },
    messages: [
      {
        role: 'user',
        content: `Generate ${athleteName}'s ${stage.replace('_', ' ')} questions.\n\n${summary}`,
      },
    ],
  })

  const toolBlock = response.content.find((b) => b.type === 'tool_use')
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error(`Question generator did not return a tool call for stage "${stage}"`)
  }

  const raw = toolBlock.input as { questions: { factor?: PriorityFactor | null; question: string }[] }

  return (raw.questions ?? []).map(q => ({
    stage,
    factor: q.factor ?? null,
    question: q.question,
  }))
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

export async function generateQuestionBank(
  profile: AthleteProfile,
  exitInterview: ExitInterview,
  athleteName: string,
): Promise<GeneratedQuestion[]> {
  const priorities = sortedPriorityLabels(profile.priority_ranking)
  const bioLine = formatBioLine(profile.bio)

  const summary = `
ATHLETE: ${athleteName}${bioLine ? ` (${bioLine})` : ''}

PRIORITY RANKING (1 = most important):
${priorities.map((p, i) => `  ${i + 1}. ${p}`).join('\n')}

${exitInterviewSummary(exitInterview)}
`.trim()

  const stages: QuestionBankStage[] = ['intro_call', 'deep_dive', 'zoom', 'visit']
  const results = await Promise.all(stages.map(stage => generateStageQuestions(stage, summary, athleteName)))

  return results.flat()
}
