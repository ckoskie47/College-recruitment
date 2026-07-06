'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft, Check } from 'lucide-react'

const STEPS = [
  { id: 'athlete-profile', label: 'Athlete Profile' },
  { id: 'schools',         label: 'School Tracker' },
  { id: 'recommendation',  label: 'Decision' },
] as const

type StepId = typeof STEPS[number]['id']

interface SidebarProps {
  engagementId: string
  engagementName?: string
  athleteName?: string
}

export function Sidebar({ engagementId, engagementName, athleteName }: SidebarProps) {
  const pathname = usePathname()

  const currentStepId = (STEPS.find((s) =>
    pathname.includes(`/${s.id}`)
  )?.id ?? STEPS[0].id) as StepId

  const currentIndex = STEPS.findIndex((s) => s.id === currentStepId)

  return (
    <aside
      style={{
        background: 'var(--cream)',
        borderRight: '1px solid var(--line)',
        position: 'sticky',
        top: 65,
        height: 'calc(100vh - 65px)',
        overflowY: 'auto',
        paddingTop: 36,
      }}
    >
      {/* Back */}
      <Link
        href="/engagements"
        style={{ color: 'var(--slate-soft)', textDecoration: 'none' }}
        className="flex items-center gap-2 px-7 pb-7 text-[11px] font-semibold tracking-[0.16em] uppercase hover:text-navy transition-colors"
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--navy)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--slate-soft)')}
      >
        <ArrowLeft size={11} strokeWidth={2.4} />
        All Searches
      </Link>

      {/* Engagement header */}
      <div style={{ borderBottom: '1px solid var(--line)', padding: '0 28px 24px' }}>
        <div style={{ fontFamily: 'var(--display)', color: 'var(--navy)' }} className="text-[22px] font-medium tracking-[-0.01em] mb-1">
          {engagementName ?? 'Portal Search'}
        </div>
        {athleteName && (
          <div style={{ color: 'var(--slate-soft)' }} className="text-[12px]">{athleteName}</div>
        )}
      </div>

      {/* Steps */}
      <nav style={{ paddingTop: 24, paddingBottom: 24 }} aria-label="Recruitment stages">
        {STEPS.map((step, i) => {
          const isActive = step.id === currentStepId
          const isDone = i < currentIndex

          return (
            <Link
              key={step.id}
              href={`/e/${engagementId}/${step.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: isActive ? '11px 28px 11px 25px' : '11px 28px',
                background: isActive ? 'var(--paper)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--gold)' : '3px solid transparent',
                textDecoration: 'none',
                transition: 'background 150ms ease',
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(184,150,83,0.07)' }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              aria-current={isActive ? 'step' : undefined}
            >
              <div
                style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 600, transition: 'all 200ms ease',
                  background: isActive ? 'var(--navy)' : isDone ? 'var(--green)' : 'var(--white)',
                  border: isActive ? '1px solid var(--navy)' : isDone ? '1px solid var(--green)' : '1px solid var(--line)',
                  color: isActive || isDone ? 'var(--cream)' : 'var(--slate)',
                }}
              >
                {isDone ? <Check size={12} strokeWidth={2.8} /> : String(i + 1).padStart(2, '0')}
              </div>
              <span style={{ fontSize: 13, color: isActive ? 'var(--navy)' : 'var(--ink-soft)', fontWeight: isActive ? 600 : 400, transition: 'color 150ms ease' }}>
                {step.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
