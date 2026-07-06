import { createServiceClient } from '@/lib/supabase/service'
import { getResendClient, FROM_ADDRESS } from '@/lib/email/resend'
import { renderInviteEmail } from '@/lib/email/templates/invite'

type InviteRole = 'owner' | 'admin' | 'member'

type SendOrgInviteOptions = {
  email: string
  orgId: string
  orgName: string
  role: InviteRole
  invitedByEmail?: string | null
  redirectPath?: string
  emailOverride?: { subject: string; html: string; text: string }
}

type SendOrgInviteResult = { success: boolean; error?: string }

/**
 * Generate an invite or magic-link for the given email address and send it
 * via Resend with the branded Elevate template.
 *
 * For new users: generates a Supabase invite link (sets org metadata so
 * /auth/confirm can create the membership on first sign-in).
 * For existing users: upserts the org membership directly, then sends a
 * magic-link so they can sign in without resetting a password.
 */
export async function sendOrgInvite({
  email,
  orgId,
  orgName,
  role,
  invitedByEmail,
  redirectPath = '/engagements',
  emailOverride,
}: SendOrgInviteOptions): Promise<SendOrgInviteResult> {
  const svc = createServiceClient()
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const next = redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`

  let inviteUrl: string

  const { data: linkData, error: linkError } = await svc.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      redirectTo: `${siteUrl}/auth/confirm?next=${encodeURIComponent(next)}`,
      data: { organization_id: orgId, org_name: orgName, role },
    },
  })

  if (linkData?.properties?.action_link) {
    inviteUrl = linkData.properties.action_link
  } else if (
    linkError?.message?.toLowerCase().includes('already been registered') ||
    linkError?.message?.toLowerCase().includes('already registered')
  ) {
    // User exists — upsert membership and send a magic link instead
    const { data: existingProfile } = await svc
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle() as { data: { id: string } | null }

    if (existingProfile?.id) {
      await svc.from('organization_members').upsert(
        { organization_id: orgId, user_id: existingProfile.id, role },
        { onConflict: 'organization_id,user_id', ignoreDuplicates: true },
      )
    }

    const { data: magicData, error: magicError } = await svc.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${siteUrl}/auth/confirm?next=${encodeURIComponent(next)}` },
    })

    if (magicError || !magicData?.properties?.hashed_token) {
      return { success: false, error: magicError?.message ?? 'Failed to generate sign-in link.' }
    }

    inviteUrl = `${siteUrl}/auth/confirm?token_hash=${magicData.properties.hashed_token}&type=magiclink&next=${encodeURIComponent(next)}`
  } else {
    return { success: false, error: linkError?.message ?? 'Failed to generate invite link.' }
  }

  const { subject, html, text } = emailOverride ?? renderInviteEmail({
    orgName,
    inviteUrl,
    invitedByEmail: invitedByEmail ?? undefined,
  })

  try {
    const { error: emailError } = await getResendClient().emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject,
      html,
      text,
    })

    if (emailError) return { success: false, error: emailError.message }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to send invite email.' }
  }

  return { success: true }
}
