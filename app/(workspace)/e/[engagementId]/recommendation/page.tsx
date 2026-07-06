import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { RecommendationPanel } from './RecommendationPanel'
import type { AthleteProfile, PriorityFactor } from '@/lib/ai/visit-question-generator'

export default async function RecommendationPage({
  params,
}: {
  params: Promise<{ engagementId: string }>
}) {
  const { engagementId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const svc = createServiceClient()
  const { data: eng } = await svc.from('engagements').select('athlete_profile').eq('id', engagementId).single()
  if (!eng) redirect('/engagements')

  const [{ data: vendors }, { data: scores }, { data: redFlags }] = await Promise.all([
    svc.from('vendors').select('id, name, pipeline_status').eq('engagement_id', engagementId).order('created_at', { ascending: true }),
    svc.from('factor_scores').select('vendor_id, factor, score').eq('engagement_id', engagementId),
    svc.from('red_flags').select('vendor_id, status').eq('engagement_id', engagementId),
  ])

  const scoresByVendor: Record<string, Partial<Record<PriorityFactor, number>>> = {}
  for (const s of scores ?? []) {
    if (!scoresByVendor[s.vendor_id]) scoresByVendor[s.vendor_id] = {}
    scoresByVendor[s.vendor_id][s.factor as PriorityFactor] = s.score
  }

  const flagCountByVendor: Record<string, number> = {}
  for (const f of redFlags ?? []) {
    if (!f.vendor_id || f.status === 'resolved') continue
    flagCountByVendor[f.vendor_id] = (flagCountByVendor[f.vendor_id] ?? 0) + 1
  }

  const schools = (vendors ?? []).map(v => ({
    id: v.id,
    name: v.name,
    pipelineStatus: v.pipeline_status,
    scores: scoresByVendor[v.id] ?? {},
    activeRedFlagCount: flagCountByVendor[v.id] ?? 0,
  }))

  const priorityRanking = (eng.athlete_profile as unknown as AthleteProfile | null)?.priority_ranking ?? null

  return (
    <RecommendationPanel
      engagementId={engagementId}
      schools={schools}
      priorityRanking={priorityRanking}
    />
  )
}
