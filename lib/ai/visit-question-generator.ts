import { getAnthropicClient, ANALYSIS_MODEL } from './client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PriorityFactor =
  | 'player_development'
  | 'coaching_staff_fit'
  | 'winning_program'
  | 'playing_style_fit'
  | 'finances_nil'
  | 'culture_fit'
  | 'campus_fit'
  | 'academics_major'
  | 'location'

export const PRIORITY_FACTOR_LABELS: Record<PriorityFactor, string> = {
  player_development:  'Player Development',
  coaching_staff_fit:  'Coaching Staff Fit (Position Specific)',
  winning_program:     'Winning Program',
  playing_style_fit:   'Playing Style Fit',
  finances_nil:        'Finances / NIL',
  culture_fit:         'Culture Fit',
  campus_fit:          'Campus Fit',
  academics_major:     'Academics / Major Fit',
  location:            'Location',
}

export type DecisionProfileAnswer = { a: number; b: number; c: number; d: number }

export type SchoolYear =
  | 'freshman' | 'redshirt_freshman'
  | 'sophomore' | 'redshirt_sophomore'
  | 'junior' | 'redshirt_junior'
  | 'senior' | 'redshirt_senior'
  | 'graduate'

export const SCHOOL_YEAR_LABELS: Record<SchoolYear, string> = {
  freshman:            'Freshman',
  redshirt_freshman:   'Redshirt Freshman',
  sophomore:           'Sophomore',
  redshirt_sophomore:  'Redshirt Sophomore',
  junior:              'Junior',
  redshirt_junior:     'Redshirt Junior',
  senior:              'Senior',
  redshirt_senior:     'Redshirt Senior',
  graduate:            'Graduate / 5th Year',
}

export type AthleteBio = {
  age: string
  schoolYear: SchoolYear | ''
  sex: 'male' | 'female' | ''
  height: string
  weight: string
  sport: string
  position: string
}

export type AthleteProfile = {
  bio?: AthleteBio
  // Part 1: 1–9 ranking (1 = most important)
  priority_ranking: Record<PriorityFactor, number>
  // Part 2: Decision profile — rank A–D within each question (1 = most like you)
  q1_portal_reason:       DecisionProfileAnswer
  q2_goal_2027:           DecisionProfileAnswer
  q3_adversity:           DecisionProfileAnswer
  q4_playing_time:        DecisionProfileAnswer
  q5_success_definition:  DecisionProfileAnswer
}

// ---------------------------------------------------------------------------
// Part 3: Exit Interview
// ---------------------------------------------------------------------------

export type ExitReason =
  | 'not_getting_pt'
  | 'coaching_fit'
  | 'program_direction'
  | 'culture_fit'
  | 'staff_turnover'
  | 'personal_development'
  | 'location_family'
  | 'academic_fit'
  | 'nil_financial'

export const EXIT_REASON_LABELS: Record<ExitReason, string> = {
  not_getting_pt:        'Not getting PT / depth chart concerns',
  coaching_fit:          'Coaching fit / philosophy mismatch',
  program_direction:     'Program direction / lack of winning',
  culture_fit:           'Culture / team environment fit',
  staff_turnover:        'Coaching staff turnover / instability',
  personal_development:  'Personal development not happening',
  location_family:       'Location / family reasons',
  academic_fit:          'Academic/major fit',
  nil_financial:         'NIL / financial opportunity',
}

// Follow-up questions asked for the top 2-3 reasons selected, where the spec
// defines them. Reasons without an entry here have no structured follow-up.
export const EXIT_FOLLOWUPS: Partial<Record<ExitReason, { key: string; prompt: string }[]>> = {
  not_getting_pt: [
    { key: 'abs_games',        prompt: 'How many ABs/games did you get?' },
    { key: 'depth_or_pref',    prompt: 'Was it a depth chart issue or a coaching preference?' },
    { key: 'pt_guarantee',     prompt: 'What PT guarantee would make you stay?' },
  ],
  coaching_fit: [
    { key: 'specific_issues',  prompt: 'What specific issues? (philosophy, communication, development, expectations)' },
    { key: 'ideal_style',      prompt: 'What would ideal coaching style look like?' },
  ],
  program_direction: [
    { key: 'metrics',          prompt: "What metrics matter? (winning %, tournament, draft production)" },
    { key: 'evaluate_quality', prompt: 'How do you evaluate program quality?' },
  ],
  culture_fit: [
    { key: 'specific_issues',  prompt: 'What specific culture issues?' },
    { key: 'environment',      prompt: 'What team environment do you need?' },
  ],
}

export type ExitInterview = {
  reasons: ExitReason[]
  // reason -> { followup key -> free-text answer }
  details: Partial<Record<ExitReason, Record<string, string>>>
  redFlagsToAvoid: string
}

export type VisitQuestion = {
  pillar: string
  question: string
  why_it_matters: string
  listen_for: string
  priority_driver: string
}

export type VisitQuestionBooklet = {
  school_name: string
  athlete_name: string
  generated_at: string
  top_priorities: string[]
  questions: VisitQuestion[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sortedPriorities(ranking: Record<PriorityFactor, number>): string[] {
  return (Object.entries(ranking) as [PriorityFactor, number][])
    .sort((a, b) => a[1] - b[1])
    .map(([k]) => PRIORITY_FACTOR_LABELS[k])
}

export function formatBioLine(bio: AthleteBio | undefined): string {
  if (!bio) return ''
  const parts: string[] = []
  if (bio.sport) parts.push(bio.sport)
  if (bio.position) parts.push(bio.position)
  if (bio.schoolYear) parts.push(SCHOOL_YEAR_LABELS[bio.schoolYear])
  if (bio.age) parts.push(`age ${bio.age}`)
  if (bio.height) parts.push(bio.height)
  if (bio.weight) parts.push(`${bio.weight} lbs`)
  return parts.join(', ')
}

function topDecisionChoice(answer: DecisionProfileAnswer): string {
  const opts: Array<keyof DecisionProfileAnswer> = ['a', 'b', 'c', 'd']
  return opts.slice().sort((x, y) => answer[x] - answer[y])[0].toUpperCase()
}

const Q1_OPTIONS = {
  a: 'Playing time / need to be a starter',
  b: 'Compete against better pitching / test myself',
  c: 'Pursue individual stats / dominance',
  d: 'Best overall opportunity (money, fit, program)',
}
const Q2_OPTIONS = {
  a: 'Get drafted in ANY round',
  b: 'Be a top-100 prospect',
  c: 'Help my team win / make tournament',
  d: 'Hit .350+ and 25+ HRs',
}
const Q3_OPTIONS = {
  a: 'Own it and work to improve',
  b: 'Ask coaches for help immediately',
  c: 'Get frustrated / blame circumstances',
  d: 'Regret the decision / second-guess',
}
const Q4_OPTIONS = {
  a: 'Need to be the starter day one',
  b: "Fine competing; best man plays",
  c: 'Just give me consistent ABs',
  d: 'Playing time as long as NIL is right',
}
const Q5_OPTIONS = {
  a: "Drafted higher than I would've been at Indiana",
  b: 'Helped my team win and made an impact',
  c: 'Dominated statistically no matter what',
  d: 'Healthier, more developed, ready for pro ball',
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

export async function generateVisitQuestions(
  profile: AthleteProfile,
  schoolName: string,
  athleteName: string,
): Promise<VisitQuestionBooklet> {
  const priorities = sortedPriorities(profile.priority_ranking)

  const bioLine = formatBioLine(profile.bio)

  const profileSummary = `
ATHLETE: ${athleteName}${bioLine ? ` (${bioLine})` : ''}
SCHOOL BEING VISITED: ${schoolName}

PRIORITY RANKING (1 = most important):
${priorities.map((p, i) => `  ${i + 1}. ${p}`).join('\n')}

DECISION PROFILE:
Q1 — Why did you enter the portal? Top answer: ${Q1_OPTIONS[topDecisionChoice(profile.q1_portal_reason) as keyof typeof Q1_OPTIONS]}
  Full ranking: A(${profile.q1_portal_reason.a}) B(${profile.q1_portal_reason.b}) C(${profile.q1_portal_reason.c}) D(${profile.q1_portal_reason.d})

Q2 — Biggest goal for 2027: Top answer: ${Q2_OPTIONS[topDecisionChoice(profile.q2_goal_2027) as keyof typeof Q2_OPTIONS]}
  Full ranking: A(${profile.q2_goal_2027.a}) B(${profile.q2_goal_2027.b}) C(${profile.q2_goal_2027.c}) D(${profile.q2_goal_2027.d})

Q3 — When things don't go well: Top answer: ${Q3_OPTIONS[topDecisionChoice(profile.q3_adversity) as keyof typeof Q3_OPTIONS]}
  Full ranking: A(${profile.q3_adversity.a}) B(${profile.q3_adversity.b}) C(${profile.q3_adversity.c}) D(${profile.q3_adversity.d})

Q4 — Playing time reality: Top answer: ${Q4_OPTIONS[topDecisionChoice(profile.q4_playing_time) as keyof typeof Q4_OPTIONS]}
  Full ranking: A(${profile.q4_playing_time.a}) B(${profile.q4_playing_time.b}) C(${profile.q4_playing_time.c}) D(${profile.q4_playing_time.d})

Q5 — Success definition: Top answer: ${Q5_OPTIONS[topDecisionChoice(profile.q5_success_definition) as keyof typeof Q5_OPTIONS]}
  Full ranking: A(${profile.q5_success_definition.a}) B(${profile.q5_success_definition.b}) C(${profile.q5_success_definition.c}) D(${profile.q5_success_definition.d})
`.trim()

  const systemPrompt = `You are an experienced college baseball recruiting advisor preparing a campus visit question guide for a Division I transfer portal athlete.

Your job: generate 15–20 specific, pointed questions the athlete (and his family) should ask during the visit. Questions must be calibrated to this athlete's stated priorities — higher-priority factors get more questions and harder follow-ups.

Question principles:
- Specific, not generic. "What's your plan for my development?" is weak. "Who specifically would work with me on plate discipline, and how often?" is strong.
- Require verifiable answers, not sales pitches. A coach can say anything. Push for specifics, timelines, names, numbers.
- Some questions should be asked of COACHES. Some should be asked of CURRENT PLAYERS (separately, without coaches present).
- Flag the high-stakes questions — the ones where a vague answer is itself a red flag.
- Don't ask questions the school's materials already answered clearly.

Organize by pillar: Athletic Program, Playing Time, Financial Package, Academic Fit, Campus & Life Fit.
Lead with the athlete's top priorities.`

  const client = getAnthropicClient()
  const response = await client.messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    tools: [
      {
        name: 'produce_visit_question_booklet',
        description: 'Produce the campus visit question guide as structured JSON',
        input_schema: {
          type: 'object' as const,
          required: ['questions', 'top_priorities'],
          properties: {
            top_priorities: {
              type: 'array',
              description: 'Top 3 priority factors distilled from the profile, in plain language',
              items: { type: 'string' },
            },
            questions: {
              type: 'array',
              items: {
                type: 'object',
                required: ['pillar', 'question', 'why_it_matters', 'listen_for', 'priority_driver'],
                properties: {
                  pillar: {
                    type: 'string',
                    enum: ['Athletic Program', 'Playing Time', 'Financial Package', 'Academic Fit', 'Campus & Life Fit'],
                  },
                  question: { type: 'string', description: 'The verbatim question to ask' },
                  why_it_matters: { type: 'string', description: 'One sentence on why this question matters for this specific athlete' },
                  listen_for: { type: 'string', description: 'What a good vs. bad answer sounds like — what to listen for' },
                  priority_driver: { type: 'string', description: 'Which of the athlete\'s stated priorities drove this question' },
                },
              },
            },
          },
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'produce_visit_question_booklet' },
    messages: [
      {
        role: 'user',
        content: `Generate the campus visit question guide for ${athleteName}'s visit to ${schoolName}.\n\n${profileSummary}`,
      },
    ],
  })

  const toolBlock = response.content.find((b) => b.type === 'tool_use')
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('Question generator did not return a tool call')
  }

  const raw = toolBlock.input as { questions: VisitQuestion[]; top_priorities: string[] }

  return {
    school_name: schoolName,
    athlete_name: athleteName,
    generated_at: new Date().toISOString(),
    top_priorities: raw.top_priorities ?? [],
    questions: raw.questions ?? [],
  }
}
