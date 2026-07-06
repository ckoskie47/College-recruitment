import { redirect } from 'next/navigation'
import { Topbar } from '@/components/brand/Topbar'

async function getUserWithRole() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null
  }
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const { checkSuperAdmin } = await import('@/lib/auth/permissions')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const isSuperAdmin = await checkSuperAdmin(user.id)
    return { user, isSuperAdmin }
  } catch {
    return null
  }
}

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabaseConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseConfigured) {
    const result = await getUserWithRole()
    if (!result) {
      redirect('/login')
    }

    return (
      <div className="flex flex-col min-h-screen" style={{ background: 'var(--paper)' }}>
        <Topbar userEmail={result.user.email} isSuperAdmin={result.isSuperAdmin} />
        <main className="flex-1">{children}</main>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--paper)' }}>
      <Topbar userEmail={undefined} isSuperAdmin={false} />
      <main className="flex-1">{children}</main>
    </div>
  )
}
