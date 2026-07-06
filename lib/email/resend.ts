import { Resend } from 'resend'

let client: Resend | null = null

export function getResendClient(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set')
  }
  if (!client) {
    client = new Resend(process.env.RESEND_API_KEY)
  }
  return client
}

export const FROM_ADDRESS = 'Elevate Advisor Group <no-reply@updates.benefitsbyelevate.com>'
