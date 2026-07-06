import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/engagements'

  if (code) {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && user) {
      // Link any pending stakeholder records for this email (handles invite flow)
      const svc = createServiceClient()
      const email = user.email?.toLowerCase() ?? ''

      if (email) {
        // Find pending stakeholder rows for this email with no user_id yet
        const { data: pending } = await svc
          .from('stakeholders')
          .select('id, engagement_id')
          .eq('email', email)
          .is('user_id', null)

        if (pending && (pending as { id: string; engagement_id: string }[]).length > 0) {
          const rows = pending as { id: string; engagement_id: string }[]

          // Link them all
          await svc
            .from('stakeholders')
            .update({
              user_id: user.id,
              status: 'active',
              joined_at: new Date().toISOString(),
            } as never)
            .eq('email', email)
            .is('user_id', null)

          // Ensure org membership for each engagement's org
          for (const row of rows) {
            const { data: eng } = await svc
              .from('engagements')
              .select('organization_id')
              .eq('id', row.engagement_id)
              .single()
            if (eng) {
              const { organization_id: orgId } = eng as { organization_id: string }
              await svc
                .from('organization_members')
                .upsert(
                  { organization_id: orgId, user_id: user.id, role: 'viewer' } as never,
                  { onConflict: 'organization_id,user_id', ignoreDuplicates: true }
                )
            }
          }
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
