'use client'

import { useActionState, useEffect, useRef } from 'react'
import { createEngagement, type CreateEngagementState } from '@/app/(workspace)/engagements/actions'
import type { OrgOption } from './EngagementsPageClient'

export function CreateEngagementModal({
  onClose,
  orgOptions = [],
}: {
  onClose: () => void
  orgOptions?: OrgOption[]
}) {
  const [state, formAction, isPending] = useActionState<CreateEngagementState, FormData>(
    createEngagement,
    null
  )
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const inputStyle = {
    border: '1px solid var(--line)',
    background: 'var(--paper)',
    color: 'var(--ink)',
    fontFamily: 'var(--sans)',
    outline: 'none',
    width: '100%',
    fontSize: 16,
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(8, 26, 46, 0.55)', zIndex: 40 }} onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 50, background: 'var(--white)',
          border: '1px solid var(--line)',
          boxShadow: '0 24px 64px rgba(8,26,46,0.18)',
          width: 'calc(100% - 32px)', maxWidth: 500,
          maxHeight: '90vh', overflowY: 'auto',
        }}
        className="px-6 py-8 sm:px-10 sm:py-9"
      >
        <div className="flex items-start justify-between mb-8">
          <div>
            <p style={{ color: 'var(--gold)', fontFamily: 'var(--sans)' }} className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-2">
              New search
            </p>
            <h2 id="modal-title" style={{ fontFamily: 'var(--display)', color: 'var(--navy)' }} className="text-[26px] font-medium tracking-[-0.01em]">
              Start a portal search
            </h2>
          </div>
          <button type="button" onClick={onClose} style={{ color: 'var(--slate-soft)' }} className="mt-1 hover:opacity-60 transition-opacity" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form action={formAction}>
          <div className="mb-5">
            <label htmlFor="eng-name" style={{ color: 'var(--ink)', fontFamily: 'var(--sans)' }} className="block text-[11px] font-semibold tracking-[0.08em] uppercase mb-2">
              Search name
            </label>
            <input
              id="eng-name" name="name" type="text" autoFocus required
              placeholder="e.g. Caleb — Transfer Portal 2026"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--navy)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--line)' }}
              className="px-4 py-3"
            />
          </div>

          <div className="mb-5">
            <label htmlFor="eng-athlete" style={{ color: 'var(--ink)', fontFamily: 'var(--sans)' }} className="block text-[11px] font-semibold tracking-[0.08em] uppercase mb-2">
              Athlete name
              <span style={{ color: 'var(--slate-soft)' }} className="ml-2 normal-case font-normal tracking-normal">optional</span>
            </label>
            <input
              id="eng-athlete" name="athlete_name" type="text"
              placeholder="Caleb Koskie"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--navy)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--line)' }}
              className="px-4 py-3"
            />
          </div>

          <div className="mb-5">
            <label htmlFor="eng-current-school" style={{ color: 'var(--ink)', fontFamily: 'var(--sans)' }} className="block text-[11px] font-semibold tracking-[0.08em] uppercase mb-2">
              Current school
              <span style={{ color: 'var(--slate-soft)' }} className="ml-2 normal-case font-normal tracking-normal">optional</span>
            </label>
            <input
              id="eng-current-school" name="current_school" type="text"
              placeholder="Indiana University"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--navy)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--line)' }}
              className="px-4 py-3"
            />
          </div>

          {orgOptions.length > 0 && (
            <div className="mb-5">
              <label htmlFor="eng-org" style={{ color: 'var(--ink)', fontFamily: 'var(--sans)' }} className="block text-[11px] font-semibold tracking-[0.08em] uppercase mb-2">
                Organization
              </label>
              <select
                id="eng-org" name="organization_id"
                style={{ ...inputStyle, appearance: 'none' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--navy)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--line)' }}
                className="px-4 py-3"
              >
                <option value="">— my organization —</option>
                {orgOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
          )}

          <div className="mb-8">
            <label htmlFor="eng-due" style={{ color: 'var(--ink)', fontFamily: 'var(--sans)' }} className="block text-[11px] font-semibold tracking-[0.08em] uppercase mb-2">
              Decision target date
              <span style={{ color: 'var(--slate-soft)' }} className="ml-2 normal-case font-normal tracking-normal">optional</span>
            </label>
            <input
              id="eng-due" name="decision_due_at" type="date"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--navy)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--line)' }}
              className="px-4 py-3"
            />
          </div>

          {state?.error && (
            <p style={{ color: 'var(--red)', fontFamily: 'var(--sans)' }} className="text-[12px] mb-5 -mt-4" role="alert">
              {state.error}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit" disabled={isPending}
              style={{ background: isPending ? 'var(--slate)' : 'var(--navy)', color: 'var(--cream)', fontFamily: 'var(--sans)', cursor: isPending ? 'not-allowed' : 'pointer', border: 'none', flex: 1 }}
              className="py-3 text-[12px] font-semibold tracking-[0.08em] uppercase"
            >
              {isPending ? 'Creating…' : 'Start search'}
            </button>
            <button
              type="button" onClick={onClose} disabled={isPending}
              style={{ background: 'transparent', color: 'var(--ink-soft)', fontFamily: 'var(--sans)', border: '1px solid var(--line)', cursor: isPending ? 'not-allowed' : 'pointer' }}
              className="py-3 px-5 text-[12px] font-semibold tracking-[0.08em] uppercase"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
