import Anthropic from '@anthropic-ai/sdk'

export const ANALYSIS_MODEL = 'claude-sonnet-4-6' as const

// Lazy-initialized so a missing key doesn't crash the module at import time.
// The first call to getAnthropicClient() in a request handler will throw a
// meaningful JSON error rather than an HTML 500.
export function getAnthropicClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    throw new Error(
      'ANTHROPIC_API_KEY is not configured. Add it to your Netlify environment variables.'
    )
  }
  return new Anthropic({ apiKey: key })
}
