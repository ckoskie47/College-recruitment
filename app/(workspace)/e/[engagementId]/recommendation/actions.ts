'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/lib/supabase/types'

type PriorityFactor = Database['public']['Enums']['priority_factor']

export async function saveFactorScore(
  engagementId: string,
  vendorId: string,
  factor: PriorityFactor,
  score: number,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const svc = createServiceClient()
  const { error } = await svc.from('factor_scores').upsert(
    { engagement_id: engagementId, vendor_id: vendorId, factor, score },
    { onConflict: 'vendor_id,factor' },
  )
  if (error) return { success: false, error: error.message }
  revalidatePath(`/e/${engagementId}/recommendation`)
  return { success: true }
}
