'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CreateEngagementModal } from './CreateEngagementModal'

export type OrgOption = { id: string; name: string }

export type EngagementSummary = {
  id: string
  name: string
  client_name: string | null
  status: string
  decision_due_at: string | null
  schoolCount: number
  interactionCount: number
  orgName?: string | null
}

function formatDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function EngagementCard({ eng }: { eng: EngagementSummary }) {
  const dueDate = formatDate(eng.decision_due_at)

  return (
    <Link
      href={`/e/${eng.id}/athlete-profile`}
      style={{
        background: 'var(--white)', border: '1px solid var(--line)', borderRadius: 4,
        padding: '28px 32px', display: 'block', textDecoration: 'none',
        position: 'relative', overflow: 'hidden',
        transition: 'border-color 200ms ease, box-shadow 200ms ease',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLAnchorElement
        el.style.borderColor = 'var(--navy)'
        el.style.boxShadow = '0 4px 16px rgba(15,42,71,0.10)'
        const bar = el.querySelector<HTMLElement>('[data-top-bar]')
        if (bar) bar.style.transform = 'scaleX(1)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLAnchorElement
        el.style.borderColor = 'var(--line)'
        el.style.boxShadow = 'none'
        const bar = el.querySelector<HTMLElement>('[data-top-bar]')
        if (bar) bar.style.transform = 'scaleX(0)'
      }}
    >
      <div data-top-bar style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--gold)', transform: 'scaleX(0)', transformOrigin: 'left', transition: 'transform 300ms ease' }} />

      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p style={{ color: 'var(--gold)', fontFamily: 'var(--sans)' }} className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-1">
            Transfer Portal Search
          </p>
          <h3 style={{ fontFamily: 'var(--display)', color: 'var(--navy)', lineHeight: 1.2 }} className="text-[22px] font-medium tracking-tight">
            {eng.name}
          </h3>
          {eng.client_name && (
            <p style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)' }} className="text-[13px] mt-0.5">
              {eng.client_name}
            </p>
          )}
        </div>
        {eng.orgName && (
          <span style={{ background: 'var(--cream-deep)', color: 'var(--slate)', fontFamily: 'var(--sans)', border: '1px solid var(--line)', whiteSpace: 'nowrap' }} className="px-2.5 py-1 text-[11px] font-medium rounded-sm shrink-0">
            {eng.orgName}
          </span>
        )}
      </div>

      <div className="flex items-center gap-6 mt-4">
        <div style={{ fontFamily: 'var(--sans)' }}>
          <span style={{ color: 'var(--navy)', fontWeight: 700 }} className="text-[20px] font-mono">{eng.schoolCount}</span>
          <span style={{ color: 'var(--slate-soft)' }} className="text-[12px] ml-1.5">schools</span>
        </div>
        <div style={{ fontFamily: 'var(--sans)' }}>
          <span style={{ color: 'var(--navy)', fontWeight: 700 }} className="text-[20px] font-mono">{eng.interactionCount}</span>
          <span style={{ color: 'var(--slate-soft)' }} className="text-[12px] ml-1.5">interactions</span>
        </div>
        {dueDate && (
          <div style={{ fontFamily: 'var(--sans)', marginLeft: 'auto' }}>
            <span style={{ color: 'var(--slate-soft)' }} className="text-[12px]">Decision by </span>
            <span style={{ color: 'var(--ink)', fontWeight: 600 }} className="text-[12px]">{dueDate}</span>
          </div>
        )}
      </div>
    </Link>
  )
}

export function EngagementsPageClient({
  engagements,
  isSuperAdmin,
  orgOptions,
}: {
  engagements: EngagementSummary[]
  isSuperAdmin: boolean
  orgOptions: OrgOption[]
}) {
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '56px 32px 80px' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <p style={{ color: 'var(--gold)', fontFamily: 'var(--sans)' }} className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-2">
            College Baseball
          </p>
          <h1 style={{ fontFamily: 'var(--display)', color: 'var(--navy)' }} className="text-[38px] font-medium tracking-tight leading-tight mb-1">
            Recruitment Portal
          </h1>
          <p style={{ color: 'var(--ink-soft)', fontFamily: 'var(--sans)' }} className="text-[14px]">
            {engagements.length === 0
              ? 'Start your first portal search.'
              : `${engagements.length} active search${engagements.length !== 1 ? 'es' : ''}`
            }
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            background: 'var(--navy)', color: 'var(--cream)', fontFamily: 'var(--sans)',
            border: 'none', cursor: 'pointer', flexShrink: 0,
          }}
          className="px-6 py-3 text-[12px] font-semibold tracking-[0.08em] uppercase mt-2"
        >
          + New search
        </button>
      </div>

      {/* Cards */}
      {engagements.length === 0 ? (
        <div style={{ background: 'var(--white)', border: '1px solid var(--line)', padding: '60px 40px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--display)', color: 'var(--navy)' }} className="text-[22px] font-medium mb-2">
            No searches yet
          </p>
          <p style={{ color: 'var(--ink-soft)', fontFamily: 'var(--sans)' }} className="text-[14px] mb-8">
            Create a portal search for each athlete you&apos;re helping evaluate schools.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            style={{ background: 'var(--navy)', color: 'var(--cream)', fontFamily: 'var(--sans)', border: 'none', cursor: 'pointer' }}
            className="px-8 py-3 text-[12px] font-semibold tracking-[0.08em] uppercase"
          >
            Start first search
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {engagements.map(eng => <EngagementCard key={eng.id} eng={eng} />)}
        </div>
      )}

      {showCreate && (
        <CreateEngagementModal
          onClose={() => setShowCreate(false)}
          orgOptions={isSuperAdmin ? orgOptions : []}
        />
      )}
    </div>
  )
}
