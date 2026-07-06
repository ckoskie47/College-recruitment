import { getAnthropicClient, ANALYSIS_MODEL } from './client'
import {
  EXIT_REASON_LABELS,
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

const STAGE_CONFIG: Record<QuestionBankStage, { count: number; description: string }> = {
  intro_call: {
    count: 6,
    description: 'short, friendly questions for the very first call (show interest, get basics)',
  },
  deep_dive: {
    count: 12,
    description: 'pointed questions for follow-up calls with the head coach / position coach — split across playing time, coaching/development, and program/culture',
  },
  zoom: {
    count: 8,
    description: 'questions for a video call focused on facilities, culture/integration, and logistics',
  },
  visit: {
    count: 10,
    description: 'questions for an in-person campus visit — team/culture, gut-check, and program/town questions',
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
  const { count, description } = STAGE_CONFIG[stage]

  const systemPrompt = `You are an experienced college baseball recruiting advisor building a reusable question bank for a Division I transfer portal athlete to use across every school he talks to.

Generate exactly ${count} ${description}

Two sources drive these questions:
1. The athlete's stated PRIORITIES — higher-ranked factors get more and harder questions. Tag each such question with the priority factor that drove it.
2. The athlete's EXIT INTERVIEW — questions that directly probe whether the new school will repeat the specific problems that made him leave his last program. These should reference the athlete's actual stated reasons, not generic phrasing.

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

  const summary = `
ATHLETE: ${athleteName}

PRIORITY RANKING (1 = most important):
${priorities.map((p, i) => `  ${i + 1}. ${p}`).join('\n')}

${exitInterviewSummary(exitInterview)}
`.trim()

  const stages: QuestionBankStage[] = ['intro_call', 'deep_dive', 'zoom', 'visit']
  const results = await Promise.all(stages.map(stage => generateStageQuestions(stage, summary, athleteName)))

  return results.flat()
}
