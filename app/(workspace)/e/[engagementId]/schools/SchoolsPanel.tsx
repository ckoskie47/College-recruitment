'use client'

import { useState, useTransition } from 'react'
import {
  addSchool, updateSchoolStage, updateSchoolStatus, updateSchoolOffer, updateNextStep,
  logInteraction, addRedFlag, updateRedFlagStatus, saveSchoolResearch, markQuestionAsked,
  saveTranscript, autoResearchSchool, updateCommunicationNote, updateCommunicationNps,
  updateCommunicationParentNps, updateCommunicationVisitImpressions, reorderSchoolRanking,
} from './actions'
import {
  PIPELINE_STAGES, COMM_TYPES, ENERGY_LEVELS, RED_FLAG_SEVERITIES, QUESTION_STAGE_LABELS,
  TRANSCRIPT_SOURCE_LABELS,
  type PipelineStage, type PipelineStatus, type CommType, type EnergyLevel,
  type RedFlagSeverity, type RedFlagStatus, type RedFlagSource, type QuestionStage,
  type QuestionSource, type PriorityFactor, type QuestionAskedInput, type TranscriptSource,
} from './constants'
import { PRIORITY_FACTOR_LABELS } from '@/lib/ai/visit-question-generator'
import type { SchoolResearch } from '@/lib/ai/school-research-analyzer'
import type { VisitQuestionBooklet } from '@/lib/ai/visit-question-generator'
import { generateVisitQuestionsAction } from '../athlete-profile/actions'
import { QuestionBookletDisplay } from '@/components/recruiting/QuestionBookletDisplay'
import { MicButton } from '@/components/recruiting/MicButton'
import { DragRankList } from '@/components/recruiting/DragRankList'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TranscriptEntry = {
  id: string
  rawText: string
  source: TranscriptSource
  uploadedAt: string
}

export type CommunicationEntry = {
  id: string
  title: string
  scheduled_at: string
  duration_minutes: number | null
  comm_type: CommType | null
  topics: string[]
  key_points: string[]
  questions_asked: { question: string; answer: string; redFlagIdentified: boolean }[]
  athlete_takeaway: string | null
  energy_level: EnergyLevel | null
  who_initiated: string | null
  notes: string | null
  attendees: string[] | null
  transcript: TranscriptEntry | null
  nps_score: number | null
  nps_reason: string | null
  parent_nps_score: number | null
  parent_nps_reason: string | null
  best_thing: string | null
  concern: string | null
}

export type RedFlagEntry = {
  id: string
  source: RedFlagSource
  flag: string
  severity: RedFlagSeverity
  status: RedFlagStatus
  resolution_notes: string | null
  matches_exit_concern: boolean
}

export type QuestionEntry = {
  id: string
  stage: QuestionStage
  source: QuestionSource
  factor: PriorityFactor | null
  question: string
  status: string
  coach_answer: string | null
  red_flag_identified: boolean
}

export type SchoolWithDetails = {
  id: string
  school_id: string | null
  name: string
  contact_name: string | null
  contact_email: string | null
  pipeline_stage: PipelineStage
  pipeline_status: PipelineStatus
  nil_offer_amount: number | null
  nil_offer_notes: string | null
  pt_estimate: string | null
  decision_deadline: string | null
  passed_reason: string | null
  overall_rank: number | null
  metadata: { next_step?: string } | null
  communications: CommunicationEntry[]
  redFlags: RedFlagEntry[]
  historicalFlags: { flag: string; severity: string }[]
  questions: QuestionEntry[]
  researchNotes: string | null
  researchStructured: SchoolResearch | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const SEVERITY_COLORS: Record<RedFlagSeverity, { bg: string; text: string; border: string }> = {
  low:    { bg: '#EBE5D5', text: '#6B7F95', border: '#D9D2C2' },
  medium: { bg: '#FBEFCF', text: '#B47E11', border: '#F0D98B' },
  high:   { bg: '#F4D9D7', text: '#9E2A2B', border: '#E8B4B2' },
}

function SeverityBadge({ severity }: { severity: RedFlagSeverity }) {
  const c = SEVERITY_COLORS[severity]
  return (
    <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, fontFamily: 'var(--sans)' }}
      className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-sm">
      {severity}
    </span>
  )
}

function StatusPill({ status }: { status: PipelineStatus }) {
  if (status === 'active') return null
  const c = status === 'committed' ? { bg: '#DFE9DF', text: '#2F5D3A', border: '#B8D4B8' } : { bg: '#F4D9D7', text: '#9E2A2B', border: '#E8B4B2' }
  return (
    <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, fontFamily: 'var(--sans)' }}
      className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide rounded-sm">
      {status}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Stage progress indicator
// ---------------------------------------------------------------------------

// Stages aren't a required sequence — a school can go straight from a text
// to a decision, or skip zoom/visit/offer entirely. This only marks the
// CURRENT stage; it never implies earlier stages were actually completed.
function StageProgress({ stage, status, onChange }: { stage: PipelineStage; status: PipelineStatus; onChange: (s: PipelineStage) => void }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {PIPELINE_STAGES.map((s) => {
        const current = s.value === stage
        return (
          <button
            key={s.value}
            type="button"
            disabled={status !== 'active'}
            onClick={() => onChange(s.value)}
            title={`Mark as ${s.label}`}
            style={{
              background: current ? 'var(--navy)' : 'var(--white)',
              color: current ? 'var(--cream)' : 'var(--slate-soft)',
              border: `1px solid ${current ? 'var(--navy)' : 'var(--line)'}`,
              fontFamily: 'var(--sans)', cursor: status === 'active' ? 'pointer' : 'default',
            }}
            className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide rounded-sm"
          >
            {current ? '● ' : ''}{s.label}
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add School Form
// ---------------------------------------------------------------------------

function AddSchoolForm({ engagementId, onAdded }: { engagementId: string; onAdded: () => void }) {
  const [name, setName] = useState('')
  const [coach, setCoach] = useState('')
  const [contact, setContact] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function handle() {
    if (!name.trim()) { setError('Enter a school name.'); return }
    setError(null)
    start(async () => {
      const r = await addSchool(engagementId, name, coach, contact)
      if (r.success) { setName(''); setCoach(''); setContact(''); onAdded() }
      else setError(r.error ?? 'Failed.')
    })
  }

  const inputStyle = { border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none', fontSize: 16 }

  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--line)', borderStyle: 'dashed', padding: '20px 20px' }} className="mb-4">
      <p style={{ color: 'var(--gold)', fontFamily: 'var(--sans)' }} className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-3">
        Add school
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="School name" style={{ ...inputStyle, width: '100%' }} className="px-4 py-3" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input value={coach} onChange={e => setCoach(e.target.value)} placeholder="Coach name" style={inputStyle} className="px-4 py-3" />
          <input value={contact} onChange={e => setContact(e.target.value)} placeholder="Phone / email" style={inputStyle} className="px-4 py-3" />
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
// NPS scale (1-10) + main reason — captured on every touchpoint
// ---------------------------------------------------------------------------

function npsColor(n: number): string {
  if (n >= 9) return 'var(--green)'
  if (n >= 7) return 'var(--gold)'
  return 'var(--red)'
}

function NpsScale({ score, onScoreChange, reason, onReasonChange, label, reasonPlaceholder }: {
  score: string; onScoreChange: (v: string) => void
  reason: string; onReasonChange: (v: string) => void
  label?: string; reasonPlaceholder?: string
}) {
  return (
    <div>
      <label style={{ color: 'var(--ink)', fontFamily: 'var(--sans)' }} className="block text-[11px] font-semibold tracking-[0.08em] uppercase mb-2">
        {label ?? 'How likely are you to pick this school right now? (1–10)'}
      </label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
          const active = score === String(n)
          return (
            <button
              key={n} type="button" onClick={() => onScoreChange(String(n))}
              style={{
                width: 34, height: 34, borderRadius: 4,
                background: active ? npsColor(n) : 'var(--paper)',
                color: active ? 'var(--cream)' : 'var(--ink)',
                border: `1px solid ${active ? npsColor(n) : 'var(--line)'}`,
                fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}
            >
              {n}
            </button>
          )
        })}
      </div>
      <input
        value={reason} onChange={e => onReasonChange(e.target.value)}
        placeholder={reasonPlaceholder ?? 'Main reason for that score…'}
        style={{ border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none', width: '100%', fontSize: 14 }}
        className="px-3 py-2"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Log Interaction Form
// ---------------------------------------------------------------------------

function LogInteractionForm({ engagementId, vendorId, onDone }: { engagementId: string; vendorId: string; onDone: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const [commType, setCommType] = useState<CommType>('call_1')
  const [date, setDate] = useState(today)
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [participants, setParticipants] = useState<string[]>(['Caleb'])
  const [showMore, setShowMore] = useState(false)
  const [whoInitiated, setWhoInitiated] = useState('')
  const [topics, setTopics] = useState('')
  const [keyPoints, setKeyPoints] = useState('')
  const [questionsAsked, setQuestionsAsked] = useState<QuestionAskedInput[]>([])
  const [athleteTakeaway, setAthleteTakeaway] = useState('')
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel | ''>('')
  const [npsScore, setNpsScore] = useState('')
  const [npsReason, setNpsReason] = useState('')
  const [parentNpsScore, setParentNpsScore] = useState('')
  const [parentNpsReason, setParentNpsReason] = useState('')
  const [bestThing, setBestThing] = useState('')
  const [concern, setConcern] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const PARTICIPANT_OPTIONS = ['Caleb', 'Dad', 'Mom', 'Advisor', 'Head Coach', 'Position Coach']
  const inputStyle = { border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none', width: '100%', fontSize: 16 }

  function toggleParticipant(p: string) {
    setParticipants(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  function addQuestionRow() {
    setQuestionsAsked(prev => [...prev, { question: '', answer: '', redFlagIdentified: false }])
  }
  function updateQuestionRow(i: number, patch: Partial<QuestionAskedInput>) {
    setQuestionsAsked(prev => prev.map((q, idx) => idx === i ? { ...q, ...patch } : q))
  }
  function removeQuestionRow(i: number) {
    setQuestionsAsked(prev => prev.filter((_, idx) => idx !== i))
  }

  function handle() {
    if (!notes.trim()) { setError('Add a note about this touchpoint.'); return }
    setError(null)
    start(async () => {
      const r = await logInteraction(engagementId, vendorId, {
        commType, date, durationMinutes: duration, whoInitiated,
        topics: topics.split('\n').map(t => t.trim()).filter(Boolean),
        keyPoints: keyPoints.split('\n').map(t => t.trim()).filter(Boolean),
        questionsAsked, athleteTakeaway, energyLevel, notes, participants,
        npsScore, npsReason, parentNpsScore, parentNpsReason, bestThing, concern,
      })
      if (r.success) onDone()
      else setError(r.error ?? 'Failed.')
    })
  }

  return (
    <div style={{ background: 'var(--cream)', border: '1px solid var(--line)', padding: '16px 16px', marginTop: 12 }}>
      <p style={{ color: 'var(--navy)', fontFamily: 'var(--sans)', fontWeight: 700 }} className="text-[12px] uppercase tracking-widest mb-3">
        Log communication
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <select value={commType} onChange={e => setCommType(e.target.value as CommType)} style={inputStyle} className="px-3 py-3">
            {COMM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} className="px-3 py-3" />
        </div>
        <input type="number" min="0" value={duration} onChange={e => setDuration(e.target.value)} placeholder="Duration (min) — optional" style={inputStyle} className="px-3 py-3" />

        <div>
          <label style={{ color: 'var(--ink)', fontFamily: 'var(--sans)' }} className="block text-[11px] font-semibold tracking-[0.08em] uppercase mb-2">
            Notes
          </label>
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)} autoFocus
            placeholder="What was said, what to follow up on…"
            rows={5}
            style={{ ...inputStyle, resize: 'vertical', fontSize: 15 }}
            className="px-4 py-3"
          />
        </div>

        <NpsScale score={npsScore} onScoreChange={setNpsScore} reason={npsReason} onReasonChange={setNpsReason} />

        {commType === 'visit' && (
          <>
            <NpsScale
              score={parentNpsScore} onScoreChange={setParentNpsScore}
              reason={parentNpsReason} onReasonChange={setParentNpsReason}
              label="Parent rating, if they'd like to weigh in (1–10)"
              reasonPlaceholder="Main reason for their score… (optional)"
            />
            <div>
              <label style={{ color: 'var(--ink)', fontFamily: 'var(--sans)' }} className="block text-[11px] font-semibold tracking-[0.08em] uppercase mb-2">
                Best thing about the school/visit
              </label>
              <input value={bestThing} onChange={e => setBestThing(e.target.value)} placeholder="What stood out in a good way…" style={inputStyle} className="px-3 py-3" />
            </div>
            <div>
              <label style={{ color: 'var(--ink)', fontFamily: 'var(--sans)' }} className="block text-[11px] font-semibold tracking-[0.08em] uppercase mb-2">
                Concern about the school/visit
              </label>
              <input value={concern} onChange={e => setConcern(e.target.value)} placeholder="Anything that gave pause…" style={inputStyle} className="px-3 py-3" />
            </div>
          </>
        )}

        <div>
          <p style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)' }} className="text-[11px] font-semibold uppercase tracking-widest mb-2">
            {commType === 'visit' ? 'Who was there' : 'Who was on the call'}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PARTICIPANT_OPTIONS.map(p => (
              <button key={p} type="button" onClick={() => toggleParticipant(p)}
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

        <button
          type="button" onClick={() => setShowMore(v => !v)}
          style={{ color: 'var(--navy)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 700, textAlign: 'left' }}
        >
          {showMore ? '− Hide extra detail' : '+ Add more detail (topics, questions asked, takeaway…)'}
        </button>

        {showMore && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--paper)', border: '1px solid var(--line)', padding: 12 }}>
            <input value={whoInitiated} onChange={e => setWhoInitiated(e.target.value)} placeholder="Who called (name/role)" style={inputStyle} className="px-3 py-3" />
            <textarea value={topics} onChange={e => setTopics(e.target.value)} placeholder={'Topics discussed (one per line)'} rows={2} style={{ ...inputStyle, resize: 'vertical' }} className="px-4 py-3" />
            <textarea value={keyPoints} onChange={e => setKeyPoints(e.target.value)} placeholder={'Key points (one per line) — e.g. "You\'d start day 1 if you earn it"'} rows={3} style={{ ...inputStyle, resize: 'vertical' }} className="px-4 py-3" />

            {/* Questions asked */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)' }} className="text-[11px] font-semibold uppercase tracking-widest">
                  Questions asked
                </p>
                <button type="button" onClick={addQuestionRow} style={{ color: 'var(--navy)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 700 }}>
                  + Add
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {questionsAsked.map((q, i) => (
                  <div key={i} style={{ background: 'var(--white)', border: '1px solid var(--line)', padding: '10px 12px' }}>
                    <input
                      value={q.question} onChange={e => updateQuestionRow(i, { question: e.target.value })}
                      placeholder="Question asked" style={{ ...inputStyle, marginBottom: 6 }} className="px-3 py-2 text-[13px]"
                    />
                    <input
                      value={q.answer} onChange={e => updateQuestionRow(i, { answer: e.target.value })}
                      placeholder="Their answer" style={{ ...inputStyle, marginBottom: 6 }} className="px-3 py-2 text-[13px]"
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2" style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--ink-soft)' }}>
                        <input type="checkbox" checked={q.redFlagIdentified} onChange={e => updateQuestionRow(i, { redFlagIdentified: e.target.checked })} />
                        Red flag in this answer
                      </label>
                      <button type="button" onClick={() => removeQuestionRow(i)} style={{ color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <textarea value={athleteTakeaway} onChange={e => setAthleteTakeaway(e.target.value)} placeholder="Your takeaway from this call" rows={2} style={{ ...inputStyle, resize: 'vertical' }} className="px-4 py-3" />

            <select value={energyLevel} onChange={e => setEnergyLevel(e.target.value as EnergyLevel)} style={inputStyle} className="px-3 py-3">
              <option value="">Energy level after this call…</option>
              {ENERGY_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
        )}

        {error && <p style={{ color: 'var(--red)', fontFamily: 'var(--sans)' }} className="text-[13px]">{error}</p>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handle} disabled={pending}
            style={{ flex: 1, background: pending ? 'var(--slate)' : 'var(--navy)', color: 'var(--cream)', fontFamily: 'var(--sans)', border: 'none', cursor: pending ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700 }}
            className="py-4"
          >
            {pending ? 'Saving…' : 'Save'}
          </button>
          <button onClick={onDone} style={{ background: 'transparent', color: 'var(--slate-soft)', fontFamily: 'var(--sans)', border: '1px solid var(--line)', cursor: 'pointer', fontSize: 13 }} className="px-5 py-4">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Communication history entry
// ---------------------------------------------------------------------------

function TranscriptSection({ engagementId, meetingId, transcript }: {
  engagementId: string; meetingId: string; transcript: TranscriptEntry | null
}) {
  const [adding, setAdding] = useState(false)
  const [viewing, setViewing] = useState(false)
  const [text, setText] = useState('')
  const [source, setSource] = useState<TranscriptSource>('manual_paste')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setText(String(reader.result ?? ''))
      setSource('file_upload')
    }
    reader.readAsText(file)
  }

  function handleSave() {
    if (!text.trim()) { setError('Paste or upload a transcript first.'); return }
    setError(null)
    start(async () => {
      const r = await saveTranscript(engagementId, meetingId, text, source)
      if (r.success) { setAdding(false); setText('') }
      else setError(r.error ?? 'Failed to save transcript.')
    })
  }

  if (transcript && !adding) {
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <p style={{ color: 'var(--navy)', fontFamily: 'var(--sans)', fontWeight: 600 }} className="text-[12px]">
            Transcript — {TRANSCRIPT_SOURCE_LABELS[transcript.source]}
          </p>
          <button onClick={() => setViewing(v => !v)} style={{ color: 'var(--navy)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
            {viewing ? 'Hide' : 'View'}
          </button>
        </div>
        {viewing && (
          <pre style={{ background: 'var(--cream)', border: '1px solid var(--line)', padding: '10px 12px', whiteSpace: 'pre-wrap', fontFamily: 'var(--sans)', color: 'var(--ink)', maxHeight: 300, overflowY: 'auto', margin: 0 }} className="text-[12px]">
            {transcript.rawText}
          </pre>
        )}
      </div>
    )
  }

  return (
    <div>
      {!adding ? (
        <button type="button" onClick={() => setAdding(true)} style={{ color: 'var(--navy)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 700 }}>
          + Add transcript
        </button>
      ) : (
        <div style={{ background: 'var(--white)', border: '1px solid var(--line)', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)' }} className="text-[11px] font-semibold uppercase tracking-widest">
            Upload a file (.txt, .vtt, .srt) or paste below
          </p>
          <input type="file" accept=".txt,.vtt,.srt,.md" onChange={handleFile} style={{ fontFamily: 'var(--sans)', fontSize: 12 }} />
          <textarea
            value={text} onChange={e => { setText(e.target.value); setSource('manual_paste') }}
            placeholder="Paste the call/recording transcript here…"
            rows={5}
            style={{ border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none', width: '100%', fontSize: 13, resize: 'vertical' }}
            className="px-3 py-2"
          />
          {error && <p style={{ color: 'var(--red)', fontFamily: 'var(--sans)' }} className="text-[12px]">{error}</p>}
          <div className="flex items-center gap-2">
            <button onClick={handleSave} disabled={pending} style={{ background: 'var(--navy)', color: 'var(--cream)', fontFamily: 'var(--sans)', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700 }} className="px-4 py-2">
              {pending ? 'Saving…' : 'Save transcript'}
            </button>
            <button onClick={() => { setAdding(false); setText(''); setError(null) }} style={{ background: 'transparent', color: 'var(--slate-soft)', border: '1px solid var(--line)', fontFamily: 'var(--sans)', cursor: 'pointer', fontSize: 11 }} className="px-3 py-2">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function EditableNote({ engagementId, meetingId, notes }: { engagementId: string; meetingId: string; notes: string | null }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(notes ?? '')
  const [pending, start] = useTransition()

  function handleSave() {
    start(async () => {
      await updateCommunicationNote(engagementId, meetingId, draft)
      setEditing(false)
    })
  }

  if (!editing) {
    return (
      <div className="mt-2">
        {notes && (
          <p style={{ color: 'var(--ink)', fontFamily: 'var(--sans)', whiteSpace: 'pre-wrap' }} className="text-[13px]">
            {notes}
          </p>
        )}
        <button
          type="button" onClick={() => { setDraft(notes ?? ''); setEditing(true) }}
          style={{ color: 'var(--navy)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 700, marginTop: notes ? 4 : 0 }}
        >
          {notes ? 'Edit note' : '+ Add note'}
        </button>
      </div>
    )
  }

  return (
    <div className="mt-2">
      <div className="flex items-start gap-2">
        <textarea
          value={draft} onChange={e => setDraft(e.target.value)}
          rows={3} autoFocus
          style={{ border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none', width: '100%', fontSize: 13, resize: 'vertical' }}
          className="px-3 py-2"
        />
        <MicButton onTranscript={spoken => setDraft(prev => (prev ? `${prev} ${spoken}` : spoken))} />
      </div>
      <div className="flex items-center gap-2 mt-2">
        <button onClick={handleSave} disabled={pending} style={{ background: pending ? 'var(--slate)' : 'var(--navy)', color: 'var(--cream)', fontFamily: 'var(--sans)', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700 }} className="px-4 py-2">
          {pending ? 'Saving…' : 'Save note'}
        </button>
        <button onClick={() => setEditing(false)} style={{ background: 'transparent', color: 'var(--slate-soft)', border: '1px solid var(--line)', fontFamily: 'var(--sans)', cursor: 'pointer', fontSize: 11 }} className="px-3 py-2">
          Cancel
        </button>
      </div>
    </div>
  )
}

function EditableNps({ engagementId, meetingId, npsScore, npsReason }: {
  engagementId: string; meetingId: string; npsScore: number | null; npsReason: string | null
}) {
  const [editing, setEditing] = useState(false)
  const [draftScore, setDraftScore] = useState(npsScore != null ? String(npsScore) : '')
  const [draftReason, setDraftReason] = useState(npsReason ?? '')
  const [pending, start] = useTransition()

  function handleSave() {
    start(async () => {
      await updateCommunicationNps(engagementId, meetingId, draftScore, draftReason)
      setEditing(false)
    })
  }

  if (!editing) {
    return (
      <div className="mt-2">
        {npsScore != null && (
          <div className="flex items-center gap-2">
            <span style={{ background: npsColor(npsScore), color: 'var(--cream)', fontFamily: 'var(--mono)', fontWeight: 700 }} className="px-2 py-0.5 text-[11px] rounded-sm">
              {npsScore}/10
            </span>
            {npsReason && <span style={{ color: 'var(--ink-soft)', fontFamily: 'var(--sans)' }} className="text-[12px]">{npsReason}</span>}
          </div>
        )}
        <button
          type="button" onClick={() => { setDraftScore(npsScore != null ? String(npsScore) : ''); setDraftReason(npsReason ?? ''); setEditing(true) }}
          style={{ color: 'var(--navy)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 700, marginTop: npsScore != null ? 4 : 0 }}
        >
          {npsScore != null ? 'Edit score' : '+ Rate this school (1–10)'}
        </button>
      </div>
    )
  }

  return (
    <div className="mt-2">
      <NpsScale score={draftScore} onScoreChange={setDraftScore} reason={draftReason} onReasonChange={setDraftReason} />
      <div className="flex items-center gap-2 mt-2">
        <button onClick={handleSave} disabled={pending} style={{ background: pending ? 'var(--slate)' : 'var(--navy)', color: 'var(--cream)', fontFamily: 'var(--sans)', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700 }} className="px-4 py-2">
          {pending ? 'Saving…' : 'Save score'}
        </button>
        <button onClick={() => setEditing(false)} style={{ background: 'transparent', color: 'var(--slate-soft)', border: '1px solid var(--line)', fontFamily: 'var(--sans)', cursor: 'pointer', fontSize: 11 }} className="px-3 py-2">
          Cancel
        </button>
      </div>
    </div>
  )
}

function EditableParentNps({ engagementId, meetingId, parentNpsScore, parentNpsReason }: {
  engagementId: string; meetingId: string; parentNpsScore: number | null; parentNpsReason: string | null
}) {
  const [editing, setEditing] = useState(false)
  const [draftScore, setDraftScore] = useState(parentNpsScore != null ? String(parentNpsScore) : '')
  const [draftReason, setDraftReason] = useState(parentNpsReason ?? '')
  const [pending, start] = useTransition()

  function handleSave() {
    start(async () => {
      await updateCommunicationParentNps(engagementId, meetingId, draftScore, draftReason)
      setEditing(false)
    })
  }

  if (!editing) {
    return (
      <div className="mt-2">
        {parentNpsScore != null && (
          <div className="flex items-center gap-2">
            <span style={{ background: npsColor(parentNpsScore), color: 'var(--cream)', fontFamily: 'var(--mono)', fontWeight: 700 }} className="px-2 py-0.5 text-[11px] rounded-sm">
              Parent {parentNpsScore}/10
            </span>
            {parentNpsReason && <span style={{ color: 'var(--ink-soft)', fontFamily: 'var(--sans)' }} className="text-[12px]">{parentNpsReason}</span>}
          </div>
        )}
        <button
          type="button" onClick={() => { setDraftScore(parentNpsScore != null ? String(parentNpsScore) : ''); setDraftReason(parentNpsReason ?? ''); setEditing(true) }}
          style={{ color: 'var(--navy)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 700, marginTop: parentNpsScore != null ? 4 : 0 }}
        >
          {parentNpsScore != null ? 'Edit parent rating' : '+ Add a parent rating (1–10)'}
        </button>
      </div>
    )
  }

  return (
    <div className="mt-2">
      <NpsScale
        score={draftScore} onScoreChange={setDraftScore} reason={draftReason} onReasonChange={setDraftReason}
        label="Parent rating (1–10)" reasonPlaceholder="Main reason for their score… (optional)"
      />
      <div className="flex items-center gap-2 mt-2">
        <button onClick={handleSave} disabled={pending} style={{ background: pending ? 'var(--slate)' : 'var(--navy)', color: 'var(--cream)', fontFamily: 'var(--sans)', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700 }} className="px-4 py-2">
          {pending ? 'Saving…' : 'Save rating'}
        </button>
        <button onClick={() => setEditing(false)} style={{ background: 'transparent', color: 'var(--slate-soft)', border: '1px solid var(--line)', fontFamily: 'var(--sans)', cursor: 'pointer', fontSize: 11 }} className="px-3 py-2">
          Cancel
        </button>
      </div>
    </div>
  )
}

function EditableVisitImpressions({ engagementId, meetingId, bestThing, concern }: {
  engagementId: string; meetingId: string; bestThing: string | null; concern: string | null
}) {
  const [editing, setEditing] = useState(false)
  const [draftBest, setDraftBest] = useState(bestThing ?? '')
  const [draftConcern, setDraftConcern] = useState(concern ?? '')
  const [pending, start] = useTransition()

  function handleSave() {
    start(async () => {
      await updateCommunicationVisitImpressions(engagementId, meetingId, draftBest, draftConcern)
      setEditing(false)
    })
  }

  if (!editing) {
    return (
      <div className="mt-2">
        {(bestThing || concern) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {bestThing && <p style={{ color: 'var(--green)', fontFamily: 'var(--sans)' }} className="text-[12px]">✓ {bestThing}</p>}
            {concern && <p style={{ color: 'var(--red)', fontFamily: 'var(--sans)' }} className="text-[12px]">⚠ {concern}</p>}
          </div>
        )}
        <button
          type="button" onClick={() => { setDraftBest(bestThing ?? ''); setDraftConcern(concern ?? ''); setEditing(true) }}
          style={{ color: 'var(--navy)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 700, marginTop: (bestThing || concern) ? 4 : 0 }}
        >
          {(bestThing || concern) ? 'Edit best thing / concern' : '+ Add best thing / concern'}
        </button>
      </div>
    )
  }

  const editInputStyle = { border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none', width: '100%', fontSize: 13 }

  return (
    <div className="mt-2" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div>
        <label style={{ color: 'var(--ink)', fontFamily: 'var(--sans)' }} className="block text-[11px] font-semibold tracking-[0.08em] uppercase mb-1">
          Best thing about the school/visit
        </label>
        <input value={draftBest} onChange={e => setDraftBest(e.target.value)} style={editInputStyle} className="px-3 py-2" />
      </div>
      <div>
        <label style={{ color: 'var(--ink)', fontFamily: 'var(--sans)' }} className="block text-[11px] font-semibold tracking-[0.08em] uppercase mb-1">
          Concern about the school/visit
        </label>
        <input value={draftConcern} onChange={e => setDraftConcern(e.target.value)} style={editInputStyle} className="px-3 py-2" />
      </div>
      <div className="flex items-center gap-2">
        <button onClick={handleSave} disabled={pending} style={{ background: pending ? 'var(--slate)' : 'var(--navy)', color: 'var(--cream)', fontFamily: 'var(--sans)', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700 }} className="px-4 py-2">
          {pending ? 'Saving…' : 'Save'}
        </button>
        <button onClick={() => setEditing(false)} style={{ background: 'transparent', color: 'var(--slate-soft)', border: '1px solid var(--line)', fontFamily: 'var(--sans)', cursor: 'pointer', fontSize: 11 }} className="px-3 py-2">
          Cancel
        </button>
      </div>
    </div>
  )
}

function TimelineEntry({ engagementId, entry, isLast }: { engagementId: string; entry: CommunicationEntry; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const hasExtraDetail = entry.topics.length > 0 || entry.key_points.length > 0 || entry.questions_asked.length > 0 || Boolean(entry.athlete_takeaway)

  return (
    <div className="flex items-stretch gap-3">
      {/* Timeline rail */}
      <div className="flex flex-col items-center" style={{ width: 16, flexShrink: 0 }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--gold)', border: '2px solid var(--white)', boxShadow: '0 0 0 1px var(--line)', marginTop: 4, flexShrink: 0 }} />
        {!isLast && <div style={{ flex: 1, width: 2, background: 'var(--line)', marginTop: 2 }} />}
      </div>

      {/* Card */}
      <div style={{ background: 'var(--white)', border: '1px solid var(--line)', padding: '12px 16px', borderRadius: 3, flex: 1, marginBottom: 16 }}>
        <div className="flex items-start justify-between gap-2">
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: 'var(--sans)', color: 'var(--ink)', fontWeight: 600 }} className="text-[14px]">
              {entry.title}{entry.duration_minutes ? ` · ${entry.duration_minutes} min` : ''}
            </p>
            <p style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)' }} className="text-[12px] mt-0.5">
              {formatDate(entry.scheduled_at)}
              {entry.who_initiated && <> · {entry.who_initiated}</>}
              {entry.attendees && entry.attendees.length > 0 && <> · {entry.attendees.join(', ')}</>}
              {entry.energy_level && <> · {ENERGY_LEVELS.find(l => l.value === entry.energy_level)?.label}</>}
            </p>
          </div>
          {hasExtraDetail && (
            <button onClick={() => setExpanded(v => !v)} style={{ color: 'var(--navy)', fontFamily: 'var(--sans)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
              {expanded ? 'Hide' : 'Details'}
            </button>
          )}
        </div>

        <EditableNote engagementId={engagementId} meetingId={entry.id} notes={entry.notes} />
        <EditableNps engagementId={engagementId} meetingId={entry.id} npsScore={entry.nps_score} npsReason={entry.nps_reason} />
        {entry.comm_type === 'visit' && (
          <>
            <EditableParentNps engagementId={engagementId} meetingId={entry.id} parentNpsScore={entry.parent_nps_score} parentNpsReason={entry.parent_nps_reason} />
            <EditableVisitImpressions engagementId={engagementId} meetingId={entry.id} bestThing={entry.best_thing} concern={entry.concern} />
          </>
        )}

        <div style={{ borderTop: '1px solid var(--line)', marginTop: 10, paddingTop: 10 }}>
          <p style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)' }} className="text-[11px] font-semibold uppercase tracking-widest mb-1">
            Recording
          </p>
          <TranscriptSection engagementId={engagementId} meetingId={entry.id} transcript={entry.transcript} />
        </div>

        {expanded && (
          <div style={{ background: 'var(--cream)', borderRadius: 3, padding: '12px 14px', marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {entry.topics.length > 0 && (
              <div>
                <p style={{ color: 'var(--navy)', fontFamily: 'var(--sans)', fontWeight: 600 }} className="text-[12px] mb-1">Topics</p>
                <ul style={{ color: 'var(--ink)', fontFamily: 'var(--sans)' }} className="text-[13px] list-disc pl-5">
                  {entry.topics.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
            )}
            {entry.key_points.length > 0 && (
              <div>
                <p style={{ color: 'var(--navy)', fontFamily: 'var(--sans)', fontWeight: 600 }} className="text-[12px] mb-1">Key points</p>
                <ul style={{ color: 'var(--ink)', fontFamily: 'var(--sans)' }} className="text-[13px] list-disc pl-5">
                  {entry.key_points.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
            )}
            {entry.questions_asked.length > 0 && (
              <div>
                <p style={{ color: 'var(--navy)', fontFamily: 'var(--sans)', fontWeight: 600 }} className="text-[12px] mb-1">Questions asked</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {entry.questions_asked.map((q, i) => (
                    <div key={i} style={{ fontFamily: 'var(--sans)' }} className="text-[13px]">
                      <span style={{ color: 'var(--ink)', fontWeight: 600 }}>Q: {q.question}</span>
                      {q.answer && <><br /><span style={{ color: 'var(--ink-soft)' }}>A: {q.answer}</span></>}
                      {q.redFlagIdentified && <span style={{ color: 'var(--red)' }}> 🚩 red flag</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {entry.athlete_takeaway && (
              <div>
                <p style={{ color: 'var(--navy)', fontFamily: 'var(--sans)', fontWeight: 600 }} className="text-[12px] mb-1">Takeaway</p>
                <p style={{ color: 'var(--ink)', fontFamily: 'var(--sans)' }} className="text-[13px]">{entry.athlete_takeaway}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Red flags section
// ---------------------------------------------------------------------------

function RedFlagsSection({ engagementId, vendorId, flags, historicalFlags }: {
  engagementId: string; vendorId: string; flags: RedFlagEntry[]; historicalFlags: { flag: string; severity: string }[]
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [flagText, setFlagText] = useState('')
  const [severity, setSeverity] = useState<RedFlagSeverity>('medium')
  const [pending, start] = useTransition()
  const [, startStatus] = useTransition()

  function handleAdd() {
    start(async () => {
      const r = await addRedFlag(engagementId, vendorId, flagText, severity)
      if (r.success) { setFlagText(''); setShowAdd(false) }
    })
  }

  function handleStatus(id: string, status: RedFlagStatus) {
    startStatus(async () => { await updateRedFlagStatus(id, engagementId, status) })
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <p style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)' }} className="text-[11px] font-semibold uppercase tracking-widest">
          Red flags {flags.length > 0 && `(${flags.length})`}
        </p>
        <button type="button" onClick={() => setShowAdd(v => !v)} style={{ color: 'var(--navy)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 700 }}>
          {showAdd ? 'Cancel' : '+ Log a flag'}
        </button>
      </div>

      {historicalFlags.length > 0 && (
        <div style={{ background: '#FBEFCF', border: '1px solid #F0D98B', padding: '10px 14px', marginBottom: 8 }}>
          <p style={{ color: '#8A6416', fontFamily: 'var(--sans)', fontWeight: 700 }} className="text-[12px] mb-1">
            ⚠ Seen before — flagged at this school in a past search
          </p>
          {historicalFlags.map((f, i) => (
            <p key={i} style={{ color: '#8A6416', fontFamily: 'var(--sans)' }} className="text-[12px]">
              · {f.flag}
            </p>
          ))}
        </div>
      )}

      {showAdd && (
        <div style={{ background: 'var(--cream)', border: '1px solid var(--line)', padding: '12px', marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input value={flagText} onChange={e => setFlagText(e.target.value)} placeholder="What did you notice?" style={{ border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none', fontSize: 14 }} className="px-3 py-2" />
          <div className="flex items-center gap-2">
            <select value={severity} onChange={e => setSeverity(e.target.value as RedFlagSeverity)} style={{ border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--sans)', fontSize: 14 }} className="px-2 py-2">
              {RED_FLAG_SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={handleAdd} disabled={pending} style={{ background: 'var(--navy)', color: 'var(--cream)', fontFamily: 'var(--sans)', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }} className="px-4 py-2">
              {pending ? 'Saving…' : 'Save flag'}
            </button>
          </div>
        </div>
      )}

      {flags.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {flags.map(f => (
            <div key={f.id} style={{ background: 'var(--white)', border: '1px solid var(--line)', padding: '10px 12px' }} className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <SeverityBadge severity={f.severity} />
                  <span style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)' }} className="text-[10px] uppercase tracking-wide">{f.source.replace('_', ' ')}</span>
                </div>
                <p style={{ color: 'var(--ink)', fontFamily: 'var(--sans)' }} className="text-[13px]">{f.flag}</p>
              </div>
              <select
                defaultValue={f.status}
                onChange={e => handleStatus(f.id, e.target.value as RedFlagStatus)}
                style={{ border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--sans)', fontSize: 11 }}
                className="px-2 py-1"
              >
                {(['new', 'investigating', 'monitored', 'resolved', 'accepted'] as RedFlagStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Research section
// ---------------------------------------------------------------------------

function ResearchSection({ engagementId, vendorId, schoolId, notes, structured }: {
  engagementId: string; vendorId: string; schoolId: string | null
  notes: string | null; structured: SchoolResearch | null
}) {
  const [rawNotes, setRawNotes] = useState(notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [autoPending, startAuto] = useTransition()

  function handleAnalyze() {
    if (!schoolId) return
    setError(null)
    start(async () => {
      const r = await saveSchoolResearch(engagementId, vendorId, schoolId, rawNotes)
      if (!r.success) setError(r.error ?? 'Failed to analyze.')
    })
  }

  function handleAutoResearch() {
    if (!schoolId) return
    setError(null)
    startAuto(async () => {
      const r = await autoResearchSchool(engagementId, vendorId, schoolId)
      if (r.success && r.summary) setRawNotes(r.summary)
      if (!r.success) setError(r.error ?? 'Failed to auto-research.')
    })
  }

  return (
    <div className="mb-4">
      <p style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)' }} className="text-[11px] font-semibold uppercase tracking-widest mb-2">
        Research
      </p>
      <button
        onClick={handleAutoResearch} disabled={autoPending}
        style={{ background: 'transparent', color: 'var(--navy)', border: '1px solid var(--line)', fontFamily: 'var(--sans)', cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}
        className="px-4 py-2 mb-2"
      >
        {autoPending ? 'Searching the web…' : '🔎 Auto-research with AI'}
      </button>
      <p style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)' }} className="text-[11px] mb-2">
        Uses live web search — always double-check names, records, and dates before relying on them.
      </p>
      <textarea
        value={rawNotes} onChange={e => setRawNotes(e.target.value)}
        placeholder="Paste articles, roster pages, past notes about the coach/program — AI will structure it and flag red flags."
        rows={3}
        style={{ border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none', width: '100%', fontSize: 14, resize: 'vertical' }}
        className="px-3 py-2 mb-2"
      />
      {error && <p style={{ color: 'var(--red)', fontFamily: 'var(--sans)' }} className="text-[12px] mb-2">{error}</p>}
      <button onClick={handleAnalyze} disabled={pending} style={{ background: pending ? 'var(--slate)' : 'var(--gold)', color: 'var(--navy)', fontFamily: 'var(--sans)', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }} className="px-4 py-2 mb-3">
        {pending ? 'Analyzing…' : 'Analyze research'}
      </button>

      {structured && (
        <div style={{ background: 'var(--white)', border: '1px solid var(--line)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {structured.headCoach?.name && (
            <div>
              <p style={{ color: 'var(--navy)', fontFamily: 'var(--sans)', fontWeight: 600 }} className="text-[12px]">
                {structured.headCoach.name}{structured.headCoach.yearsAtSchool != null && ` · year ${structured.headCoach.yearsAtSchool}`}
              </p>
              {structured.headCoach.background && <p style={{ color: 'var(--ink-soft)', fontFamily: 'var(--sans)' }} className="text-[12px]">{structured.headCoach.background}</p>}
              {structured.headCoach.philosophy && <p style={{ color: 'var(--ink-soft)', fontFamily: 'var(--sans)' }} className="text-[12px]">{structured.headCoach.philosophy}</p>}
            </div>
          )}
          {structured.program?.summary && <p style={{ color: 'var(--ink)', fontFamily: 'var(--sans)' }} className="text-[12px]">{structured.program.summary}</p>}
          {structured.transferPortalHistory && (structured.transferPortalHistory.transfersIn != null || structured.transferPortalHistory.transfersOut != null) && (
            <p style={{ color: 'var(--ink)', fontFamily: 'var(--sans)' }} className="text-[12px]">
              Transfers: {structured.transferPortalHistory.transfersIn ?? '?'} in / {structured.transferPortalHistory.transfersOut ?? '?'} out
              {structured.transferPortalHistory.reasonsOut && ` — ${structured.transferPortalHistory.reasonsOut}`}
            </p>
          )}
          {structured.positives.length > 0 && (
            <div>
              {structured.positives.map((p, i) => (
                <p key={i} style={{ color: 'var(--green)', fontFamily: 'var(--sans)' }} className="text-[12px]">✓ {p.indicator}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Suggested questions section
// ---------------------------------------------------------------------------

function QuestionsSection({ engagementId, questions }: { engagementId: string; questions: QuestionEntry[] }) {
  const [expanded, setExpanded] = useState(false)
  const [stageFilter, setStageFilter] = useState<QuestionStage | 'all'>('all')
  const [, start] = useTransition()
  const [answerDraft, setAnswerDraft] = useState<Record<string, string>>({})

  if (questions.length === 0) return null

  const filtered = stageFilter === 'all' ? questions : questions.filter(q => q.stage === stageFilter)
  const pendingCount = questions.filter(q => q.status === 'pending').length

  function handleAsk(id: string) {
    start(async () => { await markQuestionAsked(id, engagementId, answerDraft[id] ?? '') })
  }

  const stages = [...new Set(questions.map(q => q.stage))]

  return (
    <div className="mb-4">
      <button onClick={() => setExpanded(v => !v)} className="flex items-center justify-between w-full" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <p style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)' }} className="text-[11px] font-semibold uppercase tracking-widest">
          Suggested questions ({pendingCount} pending)
        </p>
        <span style={{ color: 'var(--navy)', fontFamily: 'var(--sans)' }} className="text-[12px] font-semibold">{expanded ? 'Hide ↑' : 'Show ↓'}</span>
      </button>
      {expanded && (
        <div className="mt-2">
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            <button onClick={() => setStageFilter('all')} style={{ background: stageFilter === 'all' ? 'var(--navy)' : 'var(--white)', color: stageFilter === 'all' ? 'var(--cream)' : 'var(--ink-soft)', border: '1px solid var(--line)', fontFamily: 'var(--sans)', cursor: 'pointer' }} className="px-3 py-1.5 text-[11px]">All</button>
            {stages.map(s => (
              <button key={s} onClick={() => setStageFilter(s)} style={{ background: stageFilter === s ? 'var(--navy)' : 'var(--white)', color: stageFilter === s ? 'var(--cream)' : 'var(--ink-soft)', border: '1px solid var(--line)', fontFamily: 'var(--sans)', cursor: 'pointer' }} className="px-3 py-1.5 text-[11px]">
                {QUESTION_STAGE_LABELS[s]}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(q => (
              <div key={q.id} style={{ background: 'var(--white)', border: '1px solid var(--line)', padding: '10px 12px', opacity: q.status === 'asked' ? 0.6 : 1 }}>
                <p style={{ color: 'var(--ink)', fontFamily: 'var(--sans)' }} className="text-[13px] mb-1">
                  {q.status === 'asked' && '✓ '}{q.question}
                </p>
                {q.factor && (
                  <p style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)' }} className="text-[11px] mb-1">
                    Driven by: {PRIORITY_FACTOR_LABELS[q.factor]}
                  </p>
                )}
                {q.status === 'asked' && q.coach_answer && (
                  <p style={{ color: 'var(--ink-soft)', fontFamily: 'var(--sans)' }} className="text-[12px]">A: {q.coach_answer}</p>
                )}
                {q.status === 'pending' && (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      value={answerDraft[q.id] ?? ''}
                      onChange={e => setAnswerDraft(prev => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder="Their answer (optional)"
                      style={{ flex: 1, border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none', fontSize: 12 }}
                      className="px-2 py-1"
                    />
                    <button onClick={() => handleAsk(q.id)} style={{ color: 'var(--navy)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                      Mark asked
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Offer details
// ---------------------------------------------------------------------------

function OfferSection({ engagementId, vendorId, nilAmount, nilNotes, ptEstimate, decisionDeadline }: {
  engagementId: string; vendorId: string
  nilAmount: number | null; nilNotes: string | null; ptEstimate: string | null; decisionDeadline: string | null
}) {
  const [editing, setEditing] = useState(false)
  const [amount, setAmount] = useState(nilAmount != null ? String(nilAmount) : '')
  const [notes, setNotes] = useState(nilNotes ?? '')
  const [pt, setPt] = useState(ptEstimate ?? '')
  const [deadline, setDeadline] = useState(decisionDeadline ?? '')
  const [pending, start] = useTransition()

  const inputStyle = { border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none', fontSize: 13, width: '100%' }

  function handleSave() {
    start(async () => {
      await updateSchoolOffer(vendorId, engagementId, { nilAmount: amount, nilNotes: notes, ptEstimate: pt, decisionDeadline: deadline })
      setEditing(false)
    })
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <p style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)' }} className="text-[11px] font-semibold uppercase tracking-widest">
          Offer details
        </p>
        <button type="button" onClick={() => setEditing(v => !v)} style={{ color: 'var(--navy)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 700 }}>
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>
      {editing ? (
        <div style={{ background: 'var(--white)', border: '1px solid var(--line)', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="0" placeholder="NIL amount ($)" style={inputStyle} className="px-3 py-2" />
            <input value={pt} onChange={e => setPt(e.target.value)} placeholder="PT estimate (e.g. Starter)" style={inputStyle} className="px-3 py-2" />
          </div>
          <input value={deadline} onChange={e => setDeadline(e.target.value)} type="date" style={inputStyle} className="px-3 py-2" />
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Offer notes" style={inputStyle} className="px-3 py-2" />
          <button onClick={handleSave} disabled={pending} style={{ background: 'var(--navy)', color: 'var(--cream)', fontFamily: 'var(--sans)', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }} className="px-4 py-2">
            {pending ? 'Saving…' : 'Save offer'}
          </button>
        </div>
      ) : (
        (nilAmount != null || ptEstimate || decisionDeadline || nilNotes) && (
          <div style={{ background: 'var(--white)', border: '1px solid var(--line)', padding: '10px 12px', fontFamily: 'var(--sans)' }} className="text-[13px]">
            {nilAmount != null && <div>${nilAmount.toLocaleString()} NIL</div>}
            {ptEstimate && <div style={{ color: 'var(--ink-soft)' }}>PT: {ptEstimate}</div>}
            {decisionDeadline && <div style={{ color: 'var(--ink-soft)' }}>Decision deadline: {formatDate(decisionDeadline)}</div>}
            {nilNotes && <div style={{ color: 'var(--ink-soft)' }}>{nilNotes}</div>}
          </div>
        )
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Visit questions
// ---------------------------------------------------------------------------

function VisitQuestionsSection({ engagementId, schoolName, athleteName }: {
  engagementId: string; schoolName: string; athleteName: string
}) {
  const [booklet, setBooklet] = useState<VisitQuestionBooklet | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function handleGenerate() {
    setError(null)
    start(async () => {
      const result = await generateVisitQuestionsAction(engagementId, schoolName, athleteName)
      if (result.success && result.booklet) setBooklet(result.booklet)
      else setError(result.error ?? 'Failed to generate questions.')
    })
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <p style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)' }} className="text-[11px] font-semibold uppercase tracking-widest">
          Visit questions
        </p>
        <button onClick={handleGenerate} disabled={pending} style={{ color: 'var(--navy)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 700 }}>
          {pending ? 'Generating…' : booklet ? 'Regenerate' : '+ Generate for this visit'}
        </button>
      </div>
      {pending && (
        <p style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)' }} className="text-[12px]">
          Building a tailored question guide for {schoolName} — takes about 15 seconds.
        </p>
      )}
      {error && <p style={{ color: 'var(--red)', fontFamily: 'var(--sans)' }} className="text-[12px]">{error}</p>}
      {booklet && (
        <div style={{ background: 'var(--white)', border: '1px solid var(--line)', padding: '16px 18px', marginTop: 8 }}>
          <QuestionBookletDisplay booklet={booklet} />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// School Card
// ---------------------------------------------------------------------------

function SchoolCard({ school, engagementId, athleteName }: { school: SchoolWithDetails; engagementId: string; athleteName: string }) {
  const [expanded, setExpanded] = useState(false)
  const [logging, setLogging] = useState(false)
  const [nextStep, setNextStep] = useState(school.metadata?.next_step ?? '')
  const [savingNext, startSavingNext] = useTransition()
  const [, startStage] = useTransition()
  const [, startStatus] = useTransition()
  const [passReason, setPassReason] = useState('')
  const [showPassForm, setShowPassForm] = useState(false)

  const lastComm = school.communications[0]

  function handleStageChange(s: PipelineStage) {
    if (s === 'offer') setExpanded(true)
    startStage(async () => { await updateSchoolStage(school.id, engagementId, s) })
  }

  function handlePass() {
    startStatus(async () => { await updateSchoolStatus(school.id, engagementId, 'passed', passReason); setShowPassForm(false) })
  }

  function handleCommit() {
    startStatus(async () => { await updateSchoolStatus(school.id, engagementId, 'committed') })
  }

  function handleReactivate() {
    startStatus(async () => { await updateSchoolStatus(school.id, engagementId, 'active') })
  }

  function handleNextStep() {
    startSavingNext(async () => { await updateNextStep(school.id, engagementId, nextStep) })
  }

  const activeFlagCount = school.redFlags.filter(f => f.status !== 'resolved').length

  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--line)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px' }}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 style={{ fontFamily: 'var(--display)', color: 'var(--navy)', lineHeight: 1.2 }} className="text-[20px] font-medium truncate">
                {school.name}
              </h3>
              <StatusPill status={school.pipeline_status} />
              {school.overall_rank != null && school.pipeline_status === 'active' && (
                <span style={{ background: 'var(--gold)', color: 'var(--navy)', fontFamily: 'var(--sans)' }} className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-sm">
                  #{school.overall_rank}
                </span>
              )}
              {activeFlagCount > 0 && (
                <span style={{ background: '#F4D9D7', color: '#9E2A2B', border: '1px solid #E8B4B2', fontFamily: 'var(--sans)' }} className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-sm">
                  🚩 {activeFlagCount}
                </span>
              )}
            </div>
            {school.contact_name && (
              <p style={{ color: 'var(--ink-soft)', fontFamily: 'var(--sans)' }} className="text-[13px] mt-1">
                {school.contact_name}
                {school.contact_email && <span style={{ color: 'var(--slate-soft)' }}> · {school.contact_email}</span>}
              </p>
            )}
          </div>
        </div>

        {school.pipeline_status !== 'passed' && (
          <div className="mt-3 mb-3">
            <StageProgress stage={school.pipeline_stage} status={school.pipeline_status} onChange={handleStageChange} />
          </div>
        )}
        {school.pipeline_status === 'passed' && school.passed_reason && (
          <p style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)' }} className="text-[12px] mt-2">Reason: {school.passed_reason}</p>
        )}

        {(school.nil_offer_amount != null || school.pt_estimate || school.decision_deadline) && (
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {school.nil_offer_amount != null && <span style={{ fontFamily: 'var(--mono)', color: 'var(--navy)', fontWeight: 700 }} className="text-[13px]">${school.nil_offer_amount.toLocaleString()} NIL</span>}
            {school.pt_estimate && <span style={{ color: 'var(--ink-soft)', fontFamily: 'var(--sans)' }} className="text-[12px]">PT: {school.pt_estimate}</span>}
            {school.decision_deadline && <span style={{ color: 'var(--ink-soft)', fontFamily: 'var(--sans)' }} className="text-[12px]">Deadline: {formatDate(school.decision_deadline)}</span>}
          </div>
        )}

        <div className="flex items-center gap-2 mt-3">
          <input
            value={nextStep} onChange={e => setNextStep(e.target.value)} onBlur={handleNextStep}
            onKeyDown={e => e.key === 'Enter' && handleNextStep()}
            placeholder="Next step…"
            style={{ flex: 1, border: 'none', borderBottom: '1px solid var(--line)', background: 'transparent', color: 'var(--ink-soft)', fontFamily: 'var(--sans)', outline: 'none', fontSize: 14 }}
            className="py-1"
          />
          {savingNext && <span style={{ color: 'var(--slate-soft)', fontSize: 11, fontFamily: 'var(--sans)' }}>saving…</span>}
        </div>

        <div className="flex items-center justify-between mt-3">
          <span style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)' }} className="text-[12px]">
            {lastComm ? `Last: ${lastComm.title} on ${formatDate(lastComm.scheduled_at)}` : 'No communications yet'}
            {school.communications.length > 0 && ` · ${school.communications.length} total`}
          </span>
          <button onClick={() => setExpanded(v => !v)} style={{ color: 'var(--navy)', fontFamily: 'var(--sans)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }} className="py-1 pl-4">
            {expanded ? 'Less ↑' : 'Details ↓'}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--line)', padding: '16px 20px', background: 'var(--paper)' }}>
          {school.pipeline_status === 'active' && (
            <div className="flex items-center gap-2 mb-4">
              <button onClick={handleCommit} style={{ background: 'var(--green)', color: 'var(--cream)', fontFamily: 'var(--sans)', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }} className="px-3 py-2">
                Commit here
              </button>
              {!showPassForm ? (
                <button onClick={() => setShowPassForm(true)} style={{ background: 'transparent', color: 'var(--red)', border: '1px solid var(--line)', fontFamily: 'var(--sans)', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }} className="px-3 py-2">
                  Pass
                </button>
              ) : (
                <>
                  <input value={passReason} onChange={e => setPassReason(e.target.value)} placeholder="Why pass?" style={{ border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none', fontSize: 12 }} className="px-2 py-2" />
                  <button onClick={handlePass} style={{ background: 'var(--red)', color: 'var(--cream)', border: 'none', fontFamily: 'var(--sans)', cursor: 'pointer', fontSize: 11 }} className="px-3 py-2">Confirm</button>
                </>
              )}
            </div>
          )}
          {school.pipeline_status !== 'active' && (
            <button onClick={handleReactivate} style={{ background: 'transparent', color: 'var(--navy)', border: '1px solid var(--line)', fontFamily: 'var(--sans)', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }} className="px-3 py-2 mb-4">
              Reactivate
            </button>
          )}

          {school.pipeline_stage === 'offer' && school.nil_offer_amount == null && !school.pt_estimate && !school.decision_deadline && !school.nil_offer_notes && (
            <div style={{ background: '#FBEFCF', border: '1px solid #F0D98B', padding: '10px 14px', marginBottom: 12 }}>
              <p style={{ color: '#8A6416', fontFamily: 'var(--sans)', fontWeight: 700 }} className="text-[12px]">
                🎉 Offer received — enter the details below.
              </p>
            </div>
          )}

          <OfferSection
            engagementId={engagementId} vendorId={school.id}
            nilAmount={school.nil_offer_amount} nilNotes={school.nil_offer_notes}
            ptEstimate={school.pt_estimate} decisionDeadline={school.decision_deadline}
          />
          <RedFlagsSection engagementId={engagementId} vendorId={school.id} flags={school.redFlags} historicalFlags={school.historicalFlags} />
          <ResearchSection engagementId={engagementId} vendorId={school.id} schoolId={school.school_id} notes={school.researchNotes} structured={school.researchStructured} />
          <QuestionsSection engagementId={engagementId} questions={school.questions} />
          <VisitQuestionsSection engagementId={engagementId} schoolName={school.name} athleteName={athleteName} />

          {!logging && (
            <button onClick={() => setLogging(true)} style={{ width: '100%', background: 'var(--navy)', color: 'var(--cream)', fontFamily: 'var(--sans)', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase' }} className="py-4 mb-4">
              + Log communication
            </button>
          )}
          {logging && <LogInteractionForm engagementId={engagementId} vendorId={school.id} onDone={() => setLogging(false)} />}

          {school.communications.length > 0 && (
            <div style={{ marginTop: logging ? 16 : 0 }}>
              <p style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)' }} className="text-[11px] font-semibold uppercase tracking-widest mb-3">
                Timeline
              </p>
              {school.communications.map((c, i) => (
                <TimelineEntry key={c.id} engagementId={engagementId} entry={c} isLast={i === school.communications.length - 1} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Panel
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Current standings — ongoing gut-feel ranking, updatable anytime
// ---------------------------------------------------------------------------

function CurrentStandingsSection({ engagementId, schools }: { engagementId: string; schools: SchoolWithDetails[] }) {
  const [, start] = useTransition()
  const active = schools.filter(s => s.pipeline_status === 'active')
  const ordered = [...active].sort((a, b) => {
    const ra = a.overall_rank ?? Infinity
    const rb = b.overall_rank ?? Infinity
    if (ra !== rb) return ra - rb
    return a.name.localeCompare(b.name)
  })

  if (ordered.length < 2) return null

  function handleReorder(newOrder: SchoolWithDetails[]) {
    start(async () => { await reorderSchoolRanking(engagementId, newOrder.map(s => s.id)) })
  }

  return (
    <div className="mb-6">
      <p style={{ color: 'var(--gold)', fontFamily: 'var(--sans)' }} className="text-[10px] font-semibold uppercase tracking-widest mb-1">
        Current Standings
      </p>
      <p style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)' }} className="text-[12px] mb-3">
        Drag to reorder — your gut-feel ranking right now, separate from the weighted comparison on the Decision page.
      </p>
      <DragRankList
        items={ordered}
        getKey={s => s.id}
        renderLabel={school => (
          <span style={{ fontFamily: 'var(--sans)', color: 'var(--ink)', fontSize: 14, fontWeight: 600 }}>
            {school.name}
          </span>
        )}
        onReorder={handleReorder}
      />
    </div>
  )
}

export function SchoolsPanel({ engagementId, athleteName, schools, exitInterviewFlags, exitInterviewAvoid }: {
  engagementId: string
  athleteName: string
  schools: SchoolWithDetails[]
  exitInterviewFlags: RedFlagEntry[]
  exitInterviewAvoid: string | null
}) {
  const [showAdd, setShowAdd] = useState(schools.length === 0)
  const [filter, setFilter] = useState<'all' | PipelineStatus>('all')

  const filtered = (filter === 'all' ? schools : schools.filter(s => s.pipeline_status === filter))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))

  const activeCount = schools.filter(s => s.pipeline_status === 'active').length
  const committedCount = schools.filter(s => s.pipeline_status === 'committed').length
  const passedCount = schools.filter(s => s.pipeline_status === 'passed').length
  const totalActiveFlags = schools.reduce((sum, s) => sum + s.redFlags.filter(f => f.status !== 'resolved').length, 0)
  const stageCounts = PIPELINE_STAGES.map(s => ({
    ...s,
    count: schools.filter(sc => sc.pipeline_status === 'active' && sc.pipeline_stage === s.value).length,
  }))

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 80px' }}>
      <div className="mb-6">
        <p style={{ color: 'var(--gold)', fontFamily: 'var(--sans)' }} className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-2">
          College Recruitment
        </p>
        <h1 style={{ fontFamily: 'var(--display)', color: 'var(--navy)' }} className="text-[32px] font-medium tracking-tight leading-tight mb-1">
          School Tracker
        </h1>
        <p style={{ color: 'var(--ink-soft)', fontFamily: 'var(--sans)' }} className="text-[14px]">
          {activeCount} active · {committedCount} committed · {passedCount} passed
          {totalActiveFlags > 0 && ` · ${totalActiveFlags} open red flag${totalActiveFlags !== 1 ? 's' : ''}`}
        </p>
      </div>

      <CurrentStandingsSection engagementId={engagementId} schools={schools} />

      {exitInterviewAvoid && (
        <div style={{ background: 'var(--white)', border: '1px solid var(--line)', padding: '14px 18px', marginBottom: 16 }}>
          <p style={{ color: 'var(--gold)', fontFamily: 'var(--sans)' }} className="text-[10px] font-semibold uppercase tracking-widest mb-1">
            Avoid repeating
          </p>
          <p style={{ color: 'var(--ink)', fontFamily: 'var(--sans)' }} className="text-[13px]">{exitInterviewAvoid}</p>
        </div>
      )}

      {exitInterviewFlags.length > 0 && (
        <div style={{ background: 'var(--white)', border: '1px solid var(--line)', padding: '14px 18px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {exitInterviewFlags.map(f => (
            <div key={f.id} className="flex items-center gap-2">
              <SeverityBadge severity={f.severity} />
              <span style={{ color: 'var(--ink)', fontFamily: 'var(--sans)' }} className="text-[13px]">{f.flag}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, minWidth: 'max-content' }}>
          {stageCounts.map(s => (
            <span key={s.value} style={{ background: 'var(--white)', border: '1px solid var(--line)', color: 'var(--ink-soft)', fontFamily: 'var(--sans)' }} className="px-3 py-1.5 text-[12px] whitespace-nowrap">
              {s.label}: {s.count}
            </span>
          ))}
        </div>
      </div>

      <div style={{ overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, minWidth: 'max-content' }}>
          {([['all', 'All'], ['active', 'Active'], ['committed', 'Committed'], ['passed', 'Passed']] as [string, string][]).map(([value, label]) => {
            const active = filter === value
            return (
              <button key={value} onClick={() => setFilter(value as 'all' | PipelineStatus)}
                style={{ background: active ? 'var(--navy)' : 'var(--white)', color: active ? 'var(--cream)' : 'var(--ink-soft)', border: `1px solid ${active ? 'var(--navy)' : 'var(--line)'}`, fontFamily: 'var(--sans)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                className="px-4 py-2 text-[13px] font-medium"
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <button onClick={() => setShowAdd(v => !v)}
        style={{ width: '100%', background: showAdd ? 'var(--cream)' : 'var(--navy)', color: showAdd ? 'var(--ink-soft)' : 'var(--cream)', fontFamily: 'var(--sans)', border: `1px solid ${showAdd ? 'var(--line)' : 'var(--navy)'}`, cursor: 'pointer', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase' }}
        className="py-4 mb-4"
      >
        {showAdd ? '↑ Hide form' : '+ Add school'}
      </button>

      {showAdd && <AddSchoolForm engagementId={engagementId} onAdded={() => setShowAdd(false)} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.length === 0 && (
          <div style={{ background: 'var(--white)', border: '1px solid var(--line)', padding: '40px 20px', textAlign: 'center' }}>
            <p style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)' }} className="text-[14px]">
              {schools.length === 0 ? 'Add your first school above.' : 'No schools with this status.'}
            </p>
          </div>
        )}
        {filtered.map(school => <SchoolCard key={school.id} school={school} engagementId={engagementId} athleteName={athleteName} />)}
      </div>
    </div>
  )
}
