import { UserMenu } from './UserMenu'

interface TopbarProps {
  userEmail?: string
  isSuperAdmin?: boolean
}

export function Topbar({ userEmail, isSuperAdmin = false }: TopbarProps) {
  return (
    <header
      style={{ background: 'var(--navy)', borderBottom: '1px solid var(--navy-deep)' }}
      className="flex items-center justify-between px-6 h-[65px] shrink-0"
    >
      {/* Brand mark */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {/* Baseball icon */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M4.93 4.93c4.08 4.08 4.08 10.06 0 14.14"/>
            <path d="M19.07 4.93c-4.08 4.08-4.08 10.06 0 14.14"/>
          </svg>
          <span style={{ fontFamily: 'var(--display)', color: 'var(--gold-soft)' }} className="text-[18px] font-medium tracking-[-0.01em]">
            Recruit
          </span>
          <span style={{ fontFamily: 'var(--display)', color: 'rgba(255,255,255,0.85)' }} className="text-[18px] font-medium tracking-[-0.01em]">
            Portal
          </span>
        </div>

        <span style={{ background: 'rgba(255,255,255,0.18)', width: 1, height: 18, display: 'inline-block' }} aria-hidden />

        <span style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--sans)' }} className="text-[11px] font-medium tracking-[0.16em] uppercase">
          College Baseball
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-5">
        {userEmail && <UserMenu email={userEmail} isSuperAdmin={isSuperAdmin} />}
      </div>
    </header>
  )
}
