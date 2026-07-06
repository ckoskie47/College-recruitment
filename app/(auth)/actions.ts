'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getResendClient, FROM_ADDRESS } from '@/lib/email/resend'
import { renderMagicLinkEmail } from '@/lib/email/templates/magicLink'
import { redirect } from 'next/navigation'

export type SignInState = {
  error?: string
  sent?: boolean
} | null

export async function signInWithEmail(
  _prevState: SignInState,
  formData: FormData
): Promise<SignInState> {
  const email    = (formData.get('email') as string | null)?.trim()
  const password = (formData.get('password') as string | null)

  if (!email || !email.includes('@')) {
    return { error: 'Enter a valid email address.' }
  }
  if (!password || password.length < 6) {
    return { error: 'Enter your password.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  redirect('/engagements')
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export type MagicLinkState = { error?: string; sent?: boolean } | null

export async function sendMagicLinkEmail(
  _prevState: MagicLinkState,
  formData: FormData,
): Promise<MagicLinkState> {
  const email = (formData.get('email') as string | null)?.trim()
  if (!email || !email.includes('@')) return { error: 'Enter a valid email address.' }

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const svc = createServiceClient()

  const { data, error: genError } = await svc.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${siteUrl}/auth/confirm?next=/engagements` },
  })

  if (genError || !data?.properties?.hashed_token) {
    return { error: genError?.message ?? 'Failed to generate sign-in link.' }
  }

  // Use hashed_token to build a direct link to our confirm route so the token
  // isn't consumed by Supabase's /auth/v1/verify before we can create the session.
  const signInUrl = `${siteUrl}/auth/confirm?token_hash=${data.properties.hashed_token}&type=magiclink&next=/engagements`

  const { subject, html, text } = renderMagicLinkEmail({ signInUrl })

  const { error: emailError } = await getResendClient().emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject,
    html,
    text,
  })

  if (emailError) return { error: emailError.message }

  return { sent: true }
}
