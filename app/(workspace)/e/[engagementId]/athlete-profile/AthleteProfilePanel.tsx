'use client'

import { useState, useTransition } from 'react'
import {
  saveAthleteProfile, inviteAthlete, inviteAdvisor,
  saveExitInterview, saveCurrentSchool, generateQuestionBankAction,
} from './actions'
import type { AthleteProfile, PriorityFactor, ExitInterview, ExitReason } from '@/lib/ai/visit-question-generator'
import { PRIORITY_FACTOR_LABELS, EXIT_REASON_LABELS, EXIT_FOLLOWUPS } from '@/lib/ai/visit-question-generator'
import { DragRankList } from '@/components/recruiting/DragRankList'
import { MicButton } from '@/components/recruiting/MicButton'

const PRIORITY_FACTORS: PriorityFactor[] = [
  'player_development',
  'coaching_staff_fit',
  'winning_program',
  'playing_style_fit',
  'finances_nil',
  'culture_fit',
  'campus_fit',
  'academics_major',
  'location',
]

const Q1 = {
  prompt: 'Why did you enter the portal?',
  options: {
    a: 'Playing time — I need to be a starter',
    b: 'Compete against better pitching / test myself',
    c: 'Pursue individual stats / dominance',
    d: 'Best overall opportunity (money, fit, program)',
  },
}
const Q2 = {
  prompt: 'Your biggest goal for 2027 is:',
  options: {
    a: 'Get drafted in any round',
    b: 'Be a top-100 prospect',
    c: 'Help my team win / make the tournament',
    d: 'Hit .350+ and 25+ HRs',
  },
}
const Q3 = {
  prompt: 'When things don\'t go well, you:',
  options: {
    a: 'Own it and work to improve',
    b: 'Ask coaches for help immediately',
    c: 'Get frustrated / blame circumstances',
    d: 'Regret the decision / second-guess',
  },
}
const Q4 = {
  prompt: 'Playing time reality:',
  options: {
    a: 'I need to be the starter day one',
    b: "Fine competing — best man plays",
    c: 'Give me consistent ABs',
    d: 'Playing time as long as NIL is right',
  },
}
const Q5 = {
  prompt: 'In one year, this transfer is a success if:',
  options: {
    a: "I'm drafted higher than I would've been at Indiana",
    b: 'I helped my team win and made an impact',
    c: 'I dominated statistically no matter what',
    d: "I'm healthier, more developed, ready for pro ball",
  },
}

const DECISION_QUESTIONS = [Q1, Q2, Q3, Q4, Q5] as const
type DQKey = 'q1_portal_reason' | 'q2_goal_2027' | 'q3_adversity' | 'q4_playing_time' | 'q5_success_definition'
type DQOption = 'a' | 'b' | 'c' | 'd'
const DQ_KEYS: DQKey[] = ['q1_portal_reason', 'q2_goal_2027', 'q3_adversity', 'q4_playing_time', 'q5_success_definition']
const DQ_OPTIONS: DQOption[] = ['a', 'b', 'c', 'd']

function defaultExitInterview(): ExitInterview {
  return { reasons: [], details: {}, redFlagsToAvoid: '' }
}

function defaultProfile(): AthleteProfile {
  const priority_ranking = Object.fromEntries(
    PRIORITY_FACTORS.map((f, i) => [f, i + 1])
  ) as Record<PriorityFactor, number>
  const dq = { a: 1, b: 2, c: 3, d: 4 }
  return {
    priority_ranking,
    q1_portal_reason: { ...dq },
    q2_goal_2027: { ...dq },
    q3_adversity: { ...dq },
    q4_playing_time: { ...dq },
    q5_success_definition: { ...dq },
  }
}

function InviteRow({
  label,
  description,
  placeholder,
  nameField,
  onInvite,
}: {
  label: string
  description: string
  placeholder: string
  nameField?: boolean
  onInvite: (email: string, name: string) => Promise<{ success: boolean; error?: string }>
}) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [pending, start] = useTransition()

  function handle() {
    if (!email.trim().includes('@')) { setMessage({ type: 'error', text: 'Enter a valid email.' }); return }
    setMessage(null)
    start(async () => {
      const result = await onInvite(email.trim(), name.trim())
      if (result.success) {
        setMessage({ type: 'success', text: `Invite sent to ${email.trim()}.` })
        setEmail('')
        setName('')
      } else {
        setMessage({ type: 'error', text: result.error ?? 'Failed to send.' })
      }
    })
  }

  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--line)', padding: '20px 24px' }}>
      <p style={{ fontFamily: 'var(--sans)', color: 'var(--navy)', fontWeight: 600 }} className="text-[13px] mb-1">
        {label}
      </p>
      <p style={{ fontFamily: 'var(--sans)', color: 'var(--slate-soft)' }} className="text-[12px] mb-4">
        {description}
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        {nameField && (
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="First name"
            style={{ width: 140, border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none' }}
            className="px-3 py-2 text-[13px]"
          />
        )}
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handle()}
          placeholder={placeholder}
          style={{ flex: 1, minWidth: 200, border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none' }}
          className="px-3 py-2 text-[13px]"
        />
        <button
          onClick={handle}
          disabled={pending}
          style={{ background: pending ? 'var(--slate)' : 'var(--navy)', color: 'var(--cream)', fontFamily: 'var(--sans)', border: 'none', cursor: pending ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
          className="px-4 py-2 text-[11px] font-semibold tracking-[0.08em] uppercase"
        >
          {pending ? 'Sending…' : 'Send invite'}
        </button>
      </div>
      {message && (
        <p style={{ color: message.type === 'success' ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--sans)' }} className="text-[12px] mt-2">
          {message.text}
        </p>
      )}
    </div>
  )
}

function ExitInterviewSection({
  exitInterview,
  onChange,
  currentSchool,
}: {
  exitInterview: ExitInterview
  onChange: (next: ExitInterview) => void
  currentSchool: string
}) {
  function toggleReason(reason: ExitReason) {
    const has = exitInterview.reasons.includes(reason)
    const reasons = has ? exitInterview.reasons.filter(r => r !== reason) : [...exitInterview.reasons, reason]
    const details = { ...exitInterview.details }
    if (has) delete details[reason]
    onChange({ ...exitInterview, reasons, details })
  }

  function setDetail(reason: ExitReason, key: string, value: string) {
    onChange({
      ...exitInterview,
      details: { ...exitInterview.details, [reason]: { ...(exitInterview.details[reason] ?? {}), [key]: value } },
    })
  }

  function appendDetail(reason: ExitReason, key: string, spoken: string) {
    const current = exitInterview.details[reason]?.[key] ?? ''
    setDetail(reason, key, current ? `${current} ${spoken}` : spoken)
  }

  const inputStyle = {
    border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)',
    fontFamily: 'var(--sans)', outline: 'none', width: '100%', fontSize: 14,
  }

  const experienceLabel = currentSchool
    ? `Tell me about your experience at ${currentSchool}.`
    : 'Tell me about your experience at your current school.'

  return (
    <div className="mb-10">
      <p style={{ color: 'var(--ink)', fontFamily: 'var(--sans)' }} className="text-[11px] font-semibold tracking-[0.08em] uppercase mb-1">
        Part 3 — Exit Interview
      </p>
      <p style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)' }} className="text-[12px] mb-5">
        Why are you leaving? This drives the questions that check whether a new school will repeat the same problems.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {(Object.keys(EXIT_REASON_LABELS) as ExitReason[]).map(reason => {
          const checked = exitInterview.reasons.includes(reason)
          const followups = EXIT_FOLLOWUPS[reason]
          return (
            <div key={reason} style={{ background: 'var(--white)', border: '1px solid var(--line)', padding: '14px 20px' }}>
              <label className="flex items-center gap-3" style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={checked} onChange={() => toggleReason(reason)} />
                <span style={{ fontFamily: 'var(--sans)', color: 'var(--ink)', fontSize: 13 }}>
                  {EXIT_REASON_LABELS[reason]}
                </span>
              </label>
              {checked && followups && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14, paddingLeft: 28 }}>
                  {followups.map(f => (
                    <div key={f.key}>
                      <label style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)' }} className="block text-[12px] mb-1.5">
                        {f.prompt}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          value={exitInterview.details[reason]?.[f.key] ?? ''}
                          onChange={e => setDetail(reason, f.key, e.target.value)}
                          style={inputStyle}
                          className="px-3 py-2"
                        />
                        <MicButton onTranscript={spoken => appendDetail(reason, f.key, spoken)} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <label htmlFor="red-flags-to-avoid" style={{ color: 'var(--ink)', fontFamily: 'var(--sans)' }} className="block text-[11px] font-semibold tracking-[0.08em] uppercase mb-2">
        {experienceLabel}
      </label>
      <div className="flex items-start gap-2">
        <textarea
          id="red-flags-to-avoid"
          value={exitInterview.redFlagsToAvoid}
          onChange={e => onChange({ ...exitInterview, redFlagsToAvoid: e.target.value })}
          placeholder={'What worked, what didn\'t, and what you don\'t want to repeat — e.g. "Coach never followed through on playing time promises."'}
          rows={4}
          style={{ ...inputStyle, resize: 'vertical' }}
          className="px-4 py-3"
        />
        <MicButton onTranscript={spoken => onChange({
          ...exitInterview,
          redFlagsToAvoid: exitInterview.redFlagsToAvoid ? `${exitInterview.redFlagsToAvoid} ${spoken}` : spoken,
        })} />
      </div>
    </div>
  )
}

export function AthleteProfilePanel({
  engagementId,
  athleteName,
  initialCurrentSchool,
  initialProfile,
  initialExitInterview,
}: {
  engagementId: string
  athleteName: string
  initialCurrentSchool: string | null
  initialProfile: AthleteProfile | null
  initialExitInterview: ExitInterview | null
}) {
  const [profile, setProfile] = useState<AthleteProfile>(initialProfile ?? defaultProfile())
  const [exitInterview, setExitInterview] = useState<ExitInterview>(initialExitInterview ?? defaultExitInterview())
  const [currentSchool, setCurrentSchool] = useState(initialCurrentSchool ?? '')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [savePending, startSave] = useTransition()
  const [bankPending, startBank] = useTransition()
  const [bankMessage, setBankMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [, startSchoolSave] = useTransition()

  const orderedFactors = [...PRIORITY_FACTORS].sort((a, b) => profile.priority_ranking[a] - profile.priority_ranking[b])

  function handleReorderPriorities(newOrder: PriorityFactor[]) {
    const priority_ranking = Object.fromEntries(newOrder.map((f, i) => [f, i + 1])) as Record<PriorityFactor, number>
    setProfile(p => ({ ...p, priority_ranking }))
  }

  function handleReorderDecision(key: DQKey, newOrder: DQOption[]) {
    const answer = Object.fromEntries(newOrder.map((opt, i) => [opt, i + 1])) as AthleteProfile[DQKey]
    setProfile(p => ({ ...p, [key]: answer }))
  }

  function handleCurrentSchoolBlur() {
    startSchoolSave(async () => { await saveCurrentSchool(engagementId, currentSchool) })
  }

  function handleSave() {
    setMessage(null)
    startSave(async () => {
      const [profileResult, exitResult] = await Promise.all([
        saveAthleteProfile(engagementId, profile),
        saveExitInterview(engagementId, exitInterview),
      ])
      const failed = !profileResult.success ? profileResult : !exitResult.success ? exitResult : null
      setMessage(failed
        ? { type: 'error', text: failed.error ?? 'Failed to save.' }
        : { type: 'success', text: 'Profile saved.' })
    })
  }

  function handleGenerateBank() {
    setBankMessage(null)
    startBank(async () => {
      const result = await generateQuestionBankAction(engagementId, athleteName)
      setBankMessage(result.success
        ? { type: 'success', text: `Generated ${result.count} questions — find them on each school's page in School Tracker.` }
        : { type: 'error', text: result.error ?? 'Failed to generate question bank.' })
    })
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <p style={{ color: 'var(--gold)', fontFamily: 'var(--sans)' }} className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3">
          College Recruitment
        </p>
        <h1 style={{ fontFamily: 'var(--display)', color: 'var(--navy)' }} className="text-[38px] font-medium tracking-[-0.01em] leading-[1.1] mb-2">
          Athlete Profile
        </h1>
        <p style={{ color: 'var(--ink-soft)', fontFamily: 'var(--sans)' }} className="text-[14px] leading-relaxed max-w-[520px] mb-5">
          Rank your priorities and complete the decision profile. These answers drive the visit question guide — the higher a factor ranks, the harder we push on it during visits.
        </p>
        <label htmlFor="current-school" style={{ color: 'var(--ink)', fontFamily: 'var(--sans)' }} className="block text-[11px] font-semibold tracking-[0.08em] uppercase mb-2">
          Current school
        </label>
        <input
          id="current-school"
          value={currentSchool}
          onChange={e => setCurrentSchool(e.target.value)}
          onBlur={handleCurrentSchoolBlur}
          placeholder="e.g. Indiana University"
          style={{ border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none', width: '100%', maxWidth: 320, fontSize: 15 }}
          className="px-3.5 py-2.5"
        />
      </div>

      <div style={{ height: 1, background: 'var(--line)', marginBottom: 36, position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: -1, width: 48, height: 3, background: 'var(--gold)' }} />
      </div>

      {/* Invite section */}
      <div className="mb-10">
        <p style={{ color: 'var(--ink)', fontFamily: 'var(--sans)' }} className="text-[11px] font-semibold tracking-[0.08em] uppercase mb-1">
          Invite to this engagement
        </p>
        <p style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)' }} className="text-[12px] mb-5">
          Caleb gets a direct link to this questionnaire. The advisor gets full access to the engagement.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <InviteRow
            label="Athlete"
            description="Sends Caleb a personal email with a direct link to fill out this profile. No platform experience required — he clicks the link and lands straight on this page."
            placeholder="caleb@email.com"
            nameField
            onInvite={(email, name) => inviteAthlete(engagementId, email, name || athleteName)}
          />
          <InviteRow
            label="Recruiting Advisor"
            description="Sends the advisor an invite with access to the full engagement — scores, visit notes, school comparisons, and the final recommendation."
            placeholder="advisor@email.com"
            onInvite={(email) => inviteAdvisor(engagementId, email)}
          />
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--line)', marginBottom: 36, position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: -1, width: 48, height: 3, background: 'var(--gold)' }} />
      </div>

      {/* Part 1: Priority Ranking */}
      <div className="mb-10">
        <p style={{ color: 'var(--ink)', fontFamily: 'var(--sans)' }} className="text-[11px] font-semibold tracking-[0.08em] uppercase mb-1">
          Part 1 — What matters most in your transfer?
        </p>
        <p style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)' }} className="text-[12px] mb-5">
          Drag to reorder — top of the list is most important.
        </p>
        <DragRankList
          items={orderedFactors}
          getKey={f => f}
          renderLabel={factor => (
            <span style={{ fontFamily: 'var(--sans)', color: 'var(--ink)', fontSize: 13 }}>
              {PRIORITY_FACTOR_LABELS[factor]}
            </span>
          )}
          onReorder={handleReorderPriorities}
        />
      </div>

      {/* Part 2: Decision Profile */}
      <div className="mb-10">
        <p style={{ color: 'var(--ink)', fontFamily: 'var(--sans)' }} className="text-[11px] font-semibold tracking-[0.08em] uppercase mb-1">
          Part 2 — Decision Profile
        </p>
        <p style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)' }} className="text-[12px] mb-5">
          Drag to reorder within each question — top is most like you.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {DECISION_QUESTIONS.map((dq, qi) => {
            const key = DQ_KEYS[qi]
            const orderedOptions = [...DQ_OPTIONS].sort((a, b) => profile[key][a] - profile[key][b])
            return (
              <div key={key} style={{ background: 'var(--white)', border: '1px solid var(--line)', padding: '20px 24px' }}>
                <p style={{ fontFamily: 'var(--sans)', color: 'var(--navy)', fontWeight: 600 }} className="text-[13px] mb-4">
                  {dq.prompt}
                </p>
                <DragRankList
                  items={orderedOptions}
                  getKey={opt => opt}
                  renderLabel={opt => (
                    <span style={{ fontFamily: 'var(--sans)', color: 'var(--ink)', fontSize: 13 }}>
                      <span style={{ fontFamily: 'var(--mono)', color: 'var(--slate-soft)', fontWeight: 700, textTransform: 'uppercase', marginRight: 8 }}>
                        {opt}
                      </span>
                      {dq.options[opt]}
                    </span>
                  )}
                  onReorder={newOrder => handleReorderDecision(key, newOrder)}
                />
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--line)', marginBottom: 36, position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: -1, width: 48, height: 3, background: 'var(--gold)' }} />
      </div>

      <ExitInterviewSection exitInterview={exitInterview} onChange={setExitInterview} currentSchool={currentSchool} />

      {/* Save */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={handleSave}
          disabled={savePending}
          style={{
            background: savePending ? 'var(--slate)' : 'var(--navy)', color: 'var(--cream)',
            fontFamily: 'var(--sans)', border: 'none', cursor: savePending ? 'not-allowed' : 'pointer',
          }}
          className="px-6 py-2.5 text-[11px] font-semibold tracking-[0.08em] uppercase"
        >
          {savePending ? 'Saving…' : 'Save profile'}
        </button>
        {message && (
          <p style={{ color: message.type === 'success' ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--sans)' }} className="text-[12px]">
            {message.text}
          </p>
        )}
      </div>

      {/* Generate question bank */}
      <div className="flex items-center gap-3 mb-12">
        <button
          onClick={handleGenerateBank}
          disabled={bankPending}
          style={{
            background: bankPending ? 'var(--slate)' : 'var(--gold)', color: 'var(--navy)',
            fontFamily: 'var(--sans)', border: 'none', cursor: bankPending ? 'not-allowed' : 'pointer',
          }}
          className="px-6 py-2.5 text-[11px] font-semibold tracking-[0.08em] uppercase"
        >
          {bankPending ? 'Generating…' : 'Generate my question bank'}
        </button>
        {bankMessage && (
          <p style={{ color: bankMessage.type === 'success' ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--sans)' }} className="text-[12px]">
            {bankMessage.text}
          </p>
        )}
      </div>
    </div>
  )
}
