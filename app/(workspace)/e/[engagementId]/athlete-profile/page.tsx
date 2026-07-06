import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { AthleteProfilePanel } from './AthleteProfilePanel'
import type { AthleteProfile } from '@/lib/ai/visit-question-generator'

export default async function AthleteProfilePage({
  params,
}: {
  params: Promise<{ engagementId: string }>
}) {
  const { engagementId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const svc = createServiceClient()
  const { data: eng } = await svc
    .from('engagements')
    .select('name, client_name, athlete_profile')
    .eq('id', engagementId)
    .single()

  if (!eng) redirect('/engagements')

  const athleteName = eng.client_name ?? 'Athlete'
  const existingProfile = eng.athlete_profile as AthleteProfile | null

  return (
    <AthleteProfilePanel
      engagementId={engagementId}
      athleteName={athleteName}
      initialProfile={existingProfile}
    />
  )
}
