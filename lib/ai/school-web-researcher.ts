import { getAnthropicClient, ANALYSIS_MODEL } from './client'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'

const SYSTEM_PROMPT = `You are a research assistant looking up current facts about a college baseball program using live web search.

Search for and report:
- The current head coach's name, and how many years he's been at this school
- The current hitting coach's name
- The team's win-loss record for the most recently completed season
- How far the team advanced in the postseason that year (e.g. missed the NCAA tournament, regional, super regional, College World Series)

Only report facts you can find in search results — if you can't confidently find something after searching, say "not found" for that field rather than guessing. Note which sources (site names) you used for each fact, and if sources disagree, say so rather than picking one silently.`

export async function researchSchoolViaWeb(schoolName: string): Promise<string> {
  const client = getAnthropicClient()
  const tools = [
    { type: 'web_search_20260209' as const, name: 'web_search' as const, max_uses: 5 },
  ]

  let messages: MessageParam[] = [
    {
      role: 'user',
      content: `Look up ${schoolName} college baseball program: current head coach, current hitting coach, last season's win-loss record, and postseason result.`,
    },
  ]

  let response = await client.messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    tools,
    messages,
  })

  // Server-side web search runs its own internal loop; if it hits the
  // default 10-iteration cap mid-search, resume rather than treat it as done.
  let guard = 0
  while (response.stop_reason === 'pause_turn' && guard < 3) {
    messages = [...messages, { role: 'assistant', content: response.content }]
    response = await client.messages.create({
      model: ANALYSIS_MODEL,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    })
    guard++
  }

  const text = response.content
    .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
    .map(b => b.text)
    .join('\n\n')

  if (!text.trim()) {
    throw new Error('Web search did not return a usable summary.')
  }

  return text
}
