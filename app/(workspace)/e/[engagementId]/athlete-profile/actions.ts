'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { generateVisitQuestions } from '@/lib/ai/visit-question-generator'
import type { AthleteProfile, VisitQuestionBooklet } from '@/lib/ai/visit-question-generator'
import type { Json } from '@/lib/supabase/types'
import { sendOrgInvite } from '@/lib/invite/sendOrgInvite'
import { renderAthleteInviteEmail } from '@/lib/email/templates/athleteInvite'

export async function saveAthleteProfile(
  engagementId: string,
  profile: AthleteProfile,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const svc = createServiceClient()
  const { error } = await svc
    .from('engagements')
    .update({ athlete_profile: profile as unknown as Json })
    .eq('id', engagementId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function generateVisitQuestionsAction(
  engagementId: string,
  schoolName: string,
  athleteName: string,
): Promise<{ success: boolean; booklet?: VisitQuestionBooklet; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const svc = createServiceClient()
  const { data: eng } = await svc
    .from('engagements')
    .select('athlete_profile')
    .eq('id', engagementId)
    .single()

  if (!eng?.athlete_profile) {
    return { success: false, error: 'Complete the athlete profile first.' }
  }

  try {
    const booklet = await generateVisitQuestions(
      eng.athlete_profile as unknown as AthleteProfile,
      schoolName,
      athleteName,
    )
    return { success: true, booklet }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to generate questions.' }
  }
}

// ---------------------------------------------------------------------------
// Invite athlete — sends the questionnaire link directly to the athlete
// ---------------------------------------------------------------------------

export async function inviteAthlete(
  engagementId: string,
  athleteEmail: string,
  athleteName: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const svc = createServiceClient()
  const { data: eng } = await svc
    .from('engagements')
    .select('name, organization_id')
    .eq('id', engagementId)
    .single()

  if (!eng) return { success: false, error: 'Engagement not found.' }

  const redirectPath = `/e/${engagementId}/athlete-profile`

  const emailContent = renderAthleteInviteEmail({
    athleteName,
    engagementName: eng.name,
    profileUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/auth/confirm?next=${encodeURIComponent(redirectPath)}`,
    invitedByName: user.email ?? undefined,
  })

  const result = await sendOrgInvite({
    email: athleteEmail,
    orgId: eng.organization_id,
    orgName: eng.name,
    role: 'member',
    invitedByEmail: user.email,
    redirectPath,
    emailOverride: emailContent,
  })

  return result
}

// ---------------------------------------------------------------------------
// Invite advisor — standard org invite landing on the engagement
// ---------------------------------------------------------------------------

export async function inviteAdvisor(
  engagementId: string,
  advisorEmail: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const svc = createServiceClient()
  const { data: eng } = await svc
    .from('engagements')
    .select('name, organization_id')
    .eq('id', engagementId)
    .single()

  if (!eng) return { success: false, error: 'Engagement not found.' }

  return sendOrgInvite({
    email: advisorEmail,
    orgId: eng.organization_id,
    orgName: eng.name,
    role: 'admin',
    invitedByEmail: user.email,
    redirectPath: `/e/${engagementId}/athlete-profile`,
  })
}
