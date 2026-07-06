import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Auth callback for Supabase invite emails.
 * Supabase redirects here after the invited user clicks their email link:
 *   /auth/confirm?token_hash=<hash>&type=invite&next=/engagements
 *
 * On success: creates the org membership using organization_id from user metadata,
 * then redirects to /engagements (or the `next` param).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/engagements'

  if (tokenHash && type) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })

    if (!error && data.user) {
      const orgId = data.user.user_metadata?.organization_id as string | undefined
      const role = ((data.user.user_metadata?.role as string | undefined) ?? 'member') as 'owner' | 'admin' | 'member' | 'viewer'

      if (orgId) {
        const svc = createServiceClient()
        await svc
          .from('organization_members')
          .upsert(
            { organization_id: orgId, user_id: data.user.id, role },
            { onConflict: 'organization_id,user_id', ignoreDuplicates: true },
          )
      }

      // For new invites, send to password setup before the workspace
      if (type === 'invite') {
        return NextResponse.redirect(new URL(`/auth/set-password?next=${encodeURIComponent(next)}`, origin))
      }

      return NextResponse.redirect(new URL(next, origin))
    }
  }

  return NextResponse.redirect(new URL('/login?error=invalid_invite', origin))
}
