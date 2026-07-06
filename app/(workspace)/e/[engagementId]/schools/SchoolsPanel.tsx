'use client'

import { useState, useTransition } from 'react'
import {
  addSchool, updateSchool, logInteraction,
  SCHOOL_STATUS_LABELS, INTERACTION_TYPES,
  type SchoolStatus, type InteractionType,
} from './actions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SchoolWithInteractions = {
  id: string
  name: string
  contact_name: string | null
  contact_email: string | null
  proposed_fee_amount: number | null
  proposal_status: SchoolStatus
  metadata: { next_step?: string } | null
  interactions: {
    id: string
    title: string
    scheduled_at: string
    location: string | null
    notes: string | null
    attendees: string[] | null
  }[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<SchoolStatus, { bg: string; text: string; border: string }> = {
  invited:    { bg: '#EBE5D5', text: '#3D5A75', border: '#D9D2C2' },
  submitted:  { bg: '#FBEFCF', text: '#B47E11', border: '#F0D98B' },
  finalist:   { bg: '#FBF3E2', text: '#B89653', border: '#D4B879' },
  selected:   { bg: '#DFE9DF', text: '#2F5D3A', border: '#B8D4B8' },
  eliminated: { bg: '#F4D9D7', text: '#9E2A2B', border: '#E8B4B2' },
  declined:   { bg: '#F4D9D7', text: '#9E2A2B', border: '#E8B4B2' },
}

function StatusBadge({ status }: { status: SchoolStatus }) {
  const c = STATUS_COLORS[status]
  return (
    <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, fontFamily: 'var(--sans)', display: 'inline-block' }}
      className="px-3 py-1 text-[11px] font-semibold tracking-[0.06em] uppercase rounded-sm">
      {SCHOOL_STATUS_LABELS[status]}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function interactionLabel(type: string | null) {
  return INTERACTION_TYPES.find(t => t.value === type)?.label ?? type ?? 'Interaction'
}

// ---------------------------------------------------------------------------
// Add School Form
// ---------------------------------------------------------------------------

function AddSchoolForm({ engagementId, onAdded }: { engagementId: string; onAdded: () => void }) {
  const [name, setName] = useState('')
  const [coach, setCoach] = useState('')
  const [contact, setContact] = useState('')
  const [pct, setPct] = useState('')
  const [status, setStatus] = useState<SchoolStatus>('invited')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function handle() {
    if (!name.trim()) { setError('Enter a school name.'); return }
    setError(null)
    start(async () => {
      const r = await addSchool(engagementId, name, coach, contact, pct, status)
      if (r.success) { setName(''); setCoach(''); setContact(''); setPct(''); onAdded() }
      else setError(r.error ?? 'Failed.')
    })
  }

  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--line)', borderStyle: 'dashed', padding: '20px 20px' }} className="mb-4">
      <p style={{ color: 'var(--gold)', fontFamily: 'var(--sans)' }} className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-3">
        Add school
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          value={name} onChange={e => setName(e.target.value)}
          placeholder="School name"
          style={{ border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none', width: '100%', fontSize: 16 }}
          className="px-4 py-3"
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input
            value={coach} onChange={e => setCoach(e.target.value)}
            placeholder="Position coach"
            style={{ border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none', fontSize: 16 }}
            className="px-4 py-3"
          />
          <input
            value={contact} onChange={e => setContact(e.target.value)}
            placeholder="Phone / email"
            style={{ border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none', fontSize: 16 }}
            className="px-4 py-3"
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="relative">
            <input
              value={pct} onChange={e => setPct(e.target.value)}
              placeholder="Scholarship %"
              type="number" min="0" max="100"
              style={{ border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none', width: '100%', fontSize: 16 }}
              className="px-4 py-3"
            />
          </div>
          <select
            value={status} onChange={e => setStatus(e.target.value as SchoolStatus)}
            style={{ border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none', fontSize: 16 }}
            className="px-4 py-3"
          >
            {(Object.keys(SCHOOL_STATUS_LABELS) as SchoolStatus[]).map(s => (
              <option key={s} value={s}>{SCHOOL_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        {error && <p style={{ color: 'var(--red)', fontFamily: 'var(--sans)' }} className="text-[13px]">{error}</p>}
        <button
          onClick={handle} disabled={pending}
          style={{ background: pending ? 'var(--slate)' : 'var(--navy)', color: 'var(--cream)', fontFamily: 'var(--sans)', border: 'none', cursor: pending ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}
          className="py-4 w-full"
        >
          {pending ? 'Adding…' : 'Add school'}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Log Interaction Form
// ---------------------------------------------------------------------------

function LogInteractionForm({ engagementId, vendorId, onDone }: { engagementId: string; vendorId: string; onDone: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const [type, setType] = useState<InteractionType>('phone_call')
  const [date, setDate] = useState(today)
  const [summary, setSummary] = useState('')
  const [notes, setNotes] = useState('')
  const [participants, setParticipants] = useState<string[]>(['Caleb'])
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const PARTICIPANT_OPTIONS = ['Caleb', 'Dad', 'Mom', 'Advisor', 'Head Coach', 'Position Coach']

  function toggleParticipant(p: string) {
    setParticipants(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  function handle() {
    if (!summary.trim()) { setError('Add a brief summary.'); return }
    setError(null)
    start(async () => {
      const r = await logInteraction(engagementId, vendorId, type, date, summary, notes, participants)
      if (r.success) { setSummary(''); setNotes(''); onDone() }
      else setError(r.error ?? 'Failed.')
    })
  }

  return (
    <div style={{ background: 'var(--cream)', border: '1px solid var(--line)', padding: '16px 16px', marginTop: 12 }}>
      <p style={{ color: 'var(--navy)', fontFamily: 'var(--sans)', fontWeight: 700 }} className="text-[12px] uppercase tracking-widest mb-3">
        Log interaction
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <select
            value={type} onChange={e => setType(e.target.value as InteractionType)}
            style={{ border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none', fontSize: 16 }}
            className="px-3 py-3"
          >
            {INTERACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input
            type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none', fontSize: 16 }}
            className="px-3 py-3"
          />
        </div>
        <input
          value={summary} onChange={e => setSummary(e.target.value)}
          placeholder="Brief summary — e.g. 'Coach said 1 spot left at DH'"
          style={{ border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none', width: '100%', fontSize: 16 }}
          className="px-4 py-3"
        />
        <textarea
          value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Full notes — what was said, what to follow up on…"
          rows={4}
          style={{ border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none', width: '100%', resize: 'vertical', fontSize: 16 }}
          className="px-4 py-3"
        />
        {/* Participants */}
        <div>
          <p style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)' }} className="text-[11px] font-semibold uppercase tracking-widest mb-2">
            Who was on the call
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PARTICIPANT_OPTIONS.map(p => (
              <button
                key={p} type="button" onClick={() => toggleParticipant(p)}
                style={{
                  border: `1px solid ${participants.includes(p) ? 'var(--navy)' : 'var(--line)'}`,
                  background: participants.includes(p) ? 'var(--navy)' : 'var(--paper)',
                  color: participants.includes(p) ? 'var(--cream)' : 'var(--ink)',
                  fontFamily: 'var(--sans)', cursor: 'pointer', fontSize: 13,
                }}
                className="px-4 py-2 font-medium"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        {error && <p style={{ color: 'var(--red)', fontFamily: 'var(--sans)' }} className="text-[13px]">{error}</p>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handle} disabled={pending}
            style={{ flex: 1, background: pending ? 'var(--slate)' : 'var(--navy)', color: 'var(--cream)', fontFamily: 'var(--sans)', border: 'none', cursor: pending ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700 }}
            className="py-4"
          >
            {pending ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={onDone}
            style={{ background: 'transparent', color: 'var(--slate-soft)', fontFamily: 'var(--sans)', border: '1px solid var(--line)', cursor: 'pointer', fontSize: 13 }}
            className="px-5 py-4"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// School Card
// ---------------------------------------------------------------------------

function SchoolCard({ school, engagementId }: { school: SchoolWithInteractions; engagementId: string }) {
  const [expanded, setExpanded] = useState(false)
  const [logging, setLogging] = useState(false)
  const [editingStatus, setEditingStatus] = useState(false)
  const [nextStep, setNextStep] = useState(school.metadata?.next_step ?? '')
  const [savingNext, startSavingNext] = useTransition()
  const [statusPending, startStatus] = useTransition()

  const lastInteraction = school.interactions[0]

  function handleStatusChange(s: SchoolStatus) {
    startStatus(async () => {
      await updateSchool(school.id, engagementId, { status: s })
      setEditingStatus(false)
    })
  }

  function handleNextStep() {
    startSavingNext(async () => {
      await updateSchool(school.id, engagementId, { nextStep })
    })
  }

  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--line)', borderRadius: 4, overflow: 'hidden' }}>
      {/* Card header — always visible */}
      <div style={{ padding: '16px 20px' }}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontFamily: 'var(--display)', color: 'var(--navy)', lineHeight: 1.2 }} className="text-[20px] font-medium mb-1 truncate">
              {school.name}
            </h3>
            {school.contact_name && (
              <p style={{ color: 'var(--ink-soft)', fontFamily: 'var(--sans)' }} className="text-[13px]">
                {school.contact_name}
                {school.contact_email && <span style={{ color: 'var(--slate-soft)' }}> · {school.contact_email}</span>}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {editingStatus ? (
              <select
                autoFocus
                defaultValue={school.proposal_status}
                onChange={e => handleStatusChange(e.target.value as SchoolStatus)}
                onBlur={() => setEditingStatus(false)}
                style={{ border: '1px solid var(--navy)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--sans)', fontSize: 14 }}
                className="px-2 py-1"
              >
                {(Object.keys(SCHOOL_STATUS_LABELS) as SchoolStatus[]).map(s => (
                  <option key={s} value={s}>{SCHOOL_STATUS_LABELS[s]}</option>
                ))}
              </select>
            ) : (
              <button onClick={() => setEditingStatus(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <StatusBadge status={school.proposal_status} />
              </button>
            )}
            {school.proposed_fee_amount != null && (
              <span style={{ fontFamily: 'var(--mono)', color: 'var(--navy)', fontWeight: 700 }} className="text-[14px]">
                {school.proposed_fee_amount}%
              </span>
            )}
          </div>
        </div>

        {/* Next step */}
        <div className="flex items-center gap-2 mt-3">
          <input
            value={nextStep}
            onChange={e => setNextStep(e.target.value)}
            onBlur={handleNextStep}
            onKeyDown={e => e.key === 'Enter' && handleNextStep()}
            placeholder="Next step…"
            style={{ flex: 1, border: 'none', borderBottom: '1px solid var(--line)', background: 'transparent', color: 'var(--ink-soft)', fontFamily: 'var(--sans)', outline: 'none', fontSize: 14 }}
            className="py-1"
          />
          {savingNext && <span style={{ color: 'var(--slate-soft)', fontSize: 11, fontFamily: 'var(--sans)' }}>saving…</span>}
        </div>

        {/* Last contact + expand */}
        <div className="flex items-center justify-between mt-3">
          <span style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)' }} className="text-[12px]">
            {lastInteraction
              ? `Last: ${interactionLabel(lastInteraction.location)} on ${formatDate(lastInteraction.scheduled_at)}`
              : 'No interactions yet'
            }
            {school.interactions.length > 0 && ` · ${school.interactions.length} total`}
          </span>
          <button
            onClick={() => setExpanded(v => !v)}
            style={{ color: 'var(--navy)', fontFamily: 'var(--sans)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
            className="py-1 pl-4"
          >
            {expanded ? 'Less ↑' : 'Details ↓'}
          </button>
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--line)', padding: '16px 20px', background: 'var(--paper)' }}>
          {/* Log interaction button */}
          {!logging && (
            <button
              onClick={() => setLogging(true)}
              style={{ width: '100%', background: 'var(--navy)', color: 'var(--cream)', fontFamily: 'var(--sans)', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase' }}
              className="py-4 mb-4"
            >
              + Log interaction
            </button>
          )}

          {logging && (
            <LogInteractionForm
              engagementId={engagementId}
              vendorId={school.id}
              onDone={() => setLogging(false)}
            />
          )}

          {/* Interaction history */}
          {school.interactions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: logging ? 16 : 0 }}>
              <p style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)' }} className="text-[11px] font-semibold uppercase tracking-widest">
                Interaction history
              </p>
              {school.interactions.map(interaction => (
                <InteractionEntry key={interaction.id} interaction={interaction} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function InteractionEntry({ interaction }: {
  interaction: SchoolWithInteractions['interactions'][number]
}) {
  const [showNotes, setShowNotes] = useState(false)
  const hasNotes = Boolean(interaction.notes?.trim())

  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--line)', padding: '12px 16px', borderRadius: 3 }}>
      <div className="flex items-start justify-between gap-2">
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: 'var(--sans)', color: 'var(--ink)', fontWeight: 600 }} className="text-[14px]">
            {interaction.title}
          </p>
          <p style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)' }} className="text-[12px] mt-0.5">
            {formatDate(interaction.scheduled_at)}
            {interaction.attendees && interaction.attendees.length > 0 && (
              <> · {interaction.attendees.join(', ')}</>
            )}
          </p>
        </div>
        {hasNotes && (
          <button
            onClick={() => setShowNotes(v => !v)}
            style={{ color: 'var(--navy)', fontFamily: 'var(--sans)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            {showNotes ? 'Hide' : 'Notes'}
          </button>
        )}
      </div>
      {showNotes && hasNotes && (
        <div style={{ background: 'var(--cream)', borderRadius: 3, padding: '12px 14px', marginTop: 10 }}>
          <p style={{ color: 'var(--ink)', fontFamily: 'var(--sans)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }} className="text-[13px]">
            {interaction.notes}
          </p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Panel
// ---------------------------------------------------------------------------

export function SchoolsPanel({ engagementId, schools }: { engagementId: string; schools: SchoolWithInteractions[] }) {
  const [showAdd, setShowAdd] = useState(schools.length === 0)
  const [filter, setFilter] = useState<SchoolStatus | 'all'>('all')

  const filtered = filter === 'all' ? schools : schools.filter(s => s.proposal_status === filter)

  const counts = {
    all: schools.length,
    ...(Object.fromEntries(
      (Object.keys(SCHOOL_STATUS_LABELS) as SchoolStatus[]).map(s => [s, schools.filter(x => x.proposal_status === s).length])
    )) as Record<SchoolStatus, number>,
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 80px' }}>
      {/* Header */}
      <div className="mb-6">
        <p style={{ color: 'var(--gold)', fontFamily: 'var(--sans)' }} className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-2">
          College Recruitment
        </p>
        <h1 style={{ fontFamily: 'var(--display)', color: 'var(--navy)' }} className="text-[32px] font-medium tracking-tight leading-tight mb-1">
          School Tracker
        </h1>
        <p style={{ color: 'var(--ink-soft)', fontFamily: 'var(--sans)' }} className="text-[14px]">
          {schools.length} school{schools.length !== 1 ? 's' : ''} tracked
        </p>
      </div>

      {/* Filter tabs — horizontally scrollable on mobile */}
      <div style={{ overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, minWidth: 'max-content' }}>
          {([['all', 'All'], ...Object.entries(SCHOOL_STATUS_LABELS)] as [string, string][]).map(([value, label]) => {
            const count = counts[value as SchoolStatus | 'all'] ?? 0
            const active = filter === value
            return (
              <button
                key={value}
                onClick={() => setFilter(value as SchoolStatus | 'all')}
                style={{
                  background: active ? 'var(--navy)' : 'var(--white)',
                  color: active ? 'var(--cream)' : 'var(--ink-soft)',
                  border: `1px solid ${active ? 'var(--navy)' : 'var(--line)'}`,
                  fontFamily: 'var(--sans)', cursor: 'pointer', whiteSpace: 'nowrap',
                }}
                className="px-4 py-2 text-[13px] font-medium"
              >
                {label} {count > 0 && <span style={{ opacity: 0.7 }}>({count})</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Add school toggle */}
      <button
        onClick={() => setShowAdd(v => !v)}
        style={{ width: '100%', background: showAdd ? 'var(--cream)' : 'var(--navy)', color: showAdd ? 'var(--ink-soft)' : 'var(--cream)', fontFamily: 'var(--sans)', border: `1px solid ${showAdd ? 'var(--line)' : 'var(--navy)'}`, cursor: 'pointer', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase' }}
        className="py-4 mb-4"
      >
        {showAdd ? '↑ Hide form' : '+ Add school'}
      </button>

      {showAdd && (
        <AddSchoolForm engagementId={engagementId} onAdded={() => setShowAdd(false)} />
      )}

      {/* School list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.length === 0 && (
          <div style={{ background: 'var(--white)', border: '1px solid var(--line)', padding: '40px 20px', textAlign: 'center' }}>
            <p style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)' }} className="text-[14px]">
              {schools.length === 0 ? 'Add your first school above.' : 'No schools with this status.'}
            </p>
          </div>
        )}
        {filtered.map(school => (
          <SchoolCard key={school.id} school={school} engagementId={engagementId} />
        ))}
      </div>
    </div>
  )
}
