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
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '260px 1fr',
        minHeight: 'calc(100vh - 65px)',
      }}
    >
      <Sidebar
        engagementId={engagementId}
        engagementName={eng?.name}
        athleteName={eng?.client_name ?? undefined}
      />
      <main
        style={{
          background: 'var(--paper)',
          height: 'calc(100vh - 65px)',
          overflowY: 'auto',
        }}
      >
        <div style={{ maxWidth: 720, padding: '40px 32px 80px' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
