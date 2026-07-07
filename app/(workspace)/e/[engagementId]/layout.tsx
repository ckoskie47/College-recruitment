import { createServiceClient } from '@/lib/supabase/service'
import { Sidebar } from '@/components/workspace/Sidebar'

export default async function EngagementLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ engagementId: string }>
}) {
  const { engagementId } = await params
  const svc = createServiceClient()

  const { data: eng } = await svc
    .from('engagements')
    .select('name, client_name')
    .eq('id', engagementId)
    .single() as { data: { name: string; client_name: string | null } | null }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] md:min-h-[calc(100vh-65px)]">
      <Sidebar
        engagementId={engagementId}
        engagementName={eng?.name}
        athleteName={eng?.client_name ?? undefined}
      />
      <main className="md:h-[calc(100vh-65px)] md:overflow-y-auto" style={{ background: 'var(--paper)' }}>
        <div style={{ maxWidth: 720 }} className="px-4 py-8 sm:px-8 sm:py-10 sm:pb-20">
          {children}
        </div>
      </main>
    </div>
  )
}
