'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { saveFactorScore } from './actions'
import { PRIORITY_FACTOR_LABELS, type PriorityFactor } from '@/lib/ai/visit-question-generator'

// Top 5 ranked priorities are weighted 30/25/20/15/10, per the spec's worked
// example — factors ranked 6-9 don't move the total.
const TOP5_WEIGHTS = [0.30, 0.25, 0.20, 0.15, 0.10]

export type SchoolForComparison = {
  id: string
  name: string
  pipelineStatus: 'active' | 'committed' | 'passed'
  scores: Partial<Record<PriorityFactor, number>>
  activeRedFlagCount: number
}

export function RecommendationPanel({
  engagementId,
  schools,
  priorityRanking,
}: {
  engagementId: string
  schools: SchoolForComparison[]
  priorityRanking: Record<PriorityFactor, number> | null
}) {
  const eligibleSchools = schools.filter(s => s.pipelineStatus !== 'passed')

  const [selected, setSelected] = useState<string[]>(eligibleSchools.slice(0, 5).map(s => s.id))
  const [localScores, setLocalScores] = useState<Record<string, Partial<Record<PriorityFactor, number>>>>(
    Object.fromEntries(schools.map(s => [s.id, s.scores])),
  )
  const [, startSave] = useTransition()

  const top5 = useMemo(() => {
    if (!priorityRanking) return []
    return (Object.entries(priorityRanking) as [PriorityFactor, number][])
      .sort((a, b) => a[1] - b[1])
      .slice(0, 5)
      .map(([factor], i) => ({ factor, weight: TOP5_WEIGHTS[i] }))
  }, [priorityRanking])

  function toggleSelected(id: string) {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 5) return prev
      return [...prev, id]
    })
  }

  function setScore(vendorId: string, factor: PriorityFactor, score: number) {
    setLocalScores(prev => ({ ...prev, [vendorId]: { ...prev[vendorId], [factor]: score } }))
    startSave(async () => { await saveFactorScore(engagementId, vendorId, factor, score) })
  }

  function weightedTotal(vendorId: string): number | null {
    const scores = localScores[vendorId] ?? {}
    let total = 0
    for (const { factor, weight } of top5) {
      const s = scores[factor]
      if (s == null) return null
      total += s * weight
    }
    return total
  }

  const compared = selected
    .map(id => schools.find(s => s.id === id))
    .filter((s): s is SchoolForComparison => !!s)
    .map(s => ({ school: s, total: weightedTotal(s.id) }))
    .sort((a, b) => (b.total ?? -1) - (a.total ?? -1))

  const fullyScored = compared.filter(c => c.total != null)
  const winner = fullyScored[0]
  const runnerUp = fullyScored[1]
  const cleanestFlags = compared.length > 0
    ? compared.reduce((min, c) => c.school.activeRedFlagCount < min.school.activeRedFlagCount ? c : min)
    : null

  if (!priorityRanking) {
    return (
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <p style={{ color: 'var(--ink-soft)', fontFamily: 'var(--sans)' }} className="text-[14px]">
          Complete the <Link href={`/e/${engagementId}/athlete-profile`} style={{ color: 'var(--navy)', fontWeight: 600 }}>athlete profile</Link> first — the comparison is weighted by your stated priorities.
        </p>
      </div>
    )
  }

  if (eligibleSchools.length < 2) {
    return (
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <p style={{ color: 'var(--ink-soft)', fontFamily: 'var(--sans)' }} className="text-[14px]">
          Add at least 2 active schools in <Link href={`/e/${engagementId}/schools`} style={{ color: 'var(--navy)', fontWeight: 600 }}>School Tracker</Link> to compare them here.
        </p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 0 80px' }}>
      <div className="mb-6">
        <p style={{ color: 'var(--gold)', fontFamily: 'var(--sans)' }} className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-2">
          College Recruitment
        </p>
        <h1 style={{ fontFamily: 'var(--display)', color: 'var(--navy)' }} className="text-[32px] font-medium tracking-tight leading-tight mb-1">
          Decision
        </h1>
        <p style={{ color: 'var(--ink-soft)', fontFamily: 'var(--sans)' }} className="text-[14px]">
          Weighted by your top 5 priorities — pick 2 to 5 schools to compare.
        </p>
      </div>

      {/* School selector */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {eligibleSchools.map(s => {
          const active = selected.includes(s.id)
          return (
            <button
              key={s.id}
              onClick={() => toggleSelected(s.id)}
              style={{
                background: active ? 'var(--navy)' : 'var(--white)',
                color: active ? 'var(--cream)' : 'var(--ink-soft)',
                border: `1px solid ${active ? 'var(--navy)' : 'var(--line)'}`,
                fontFamily: 'var(--sans)', cursor: 'pointer',
              }}
              className="px-4 py-2 text-[13px] font-medium"
            >
              {s.name}
            </button>
          )
        })}
      </div>

      {/* Priority weights */}
      <div style={{ background: 'var(--white)', border: '1px solid var(--line)', padding: '16px 20px', marginBottom: 24 }}>
        <p style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)' }} className="text-[11px] font-semibold uppercase tracking-widest mb-3">
          Your weighted priorities
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {top5.map(({ factor, weight }) => (
            <div key={factor} className="flex items-center justify-between">
              <span style={{ color: 'var(--ink)', fontFamily: 'var(--sans)' }} className="text-[13px]">{PRIORITY_FACTOR_LABELS[factor]}</span>
              <span style={{ color: 'var(--navy)', fontFamily: 'var(--mono)', fontWeight: 700 }} className="text-[13px]">{Math.round(weight * 100)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Score entry */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
        {selected.map(id => {
          const school = schools.find(s => s.id === id)
          if (!school) return null
          return (
            <div key={id} style={{ background: 'var(--white)', border: '1px solid var(--line)', padding: '16px 20px' }}>
              <p style={{ fontFamily: 'var(--display)', color: 'var(--navy)' }} className="text-[18px] font-medium mb-3">
                {school.name}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {top5.map(({ factor }) => (
                  <div key={factor} className="flex items-center justify-between gap-3">
                    <span style={{ color: 'var(--ink-soft)', fontFamily: 'var(--sans)' }} className="text-[13px]">{PRIORITY_FACTOR_LABELS[factor]}</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button
                          key={n}
                          onClick={() => setScore(id, factor, n)}
                          style={{
                            width: 26, height: 26,
                            background: (localScores[id]?.[factor] ?? 0) >= n ? 'var(--gold)' : 'var(--paper)',
                            border: '1px solid var(--line)', color: 'var(--navy)', fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer',
                          }}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Comparison table */}
      {compared.length > 0 && (
        <div style={{ background: 'var(--white)', border: '1px solid var(--line)', overflow: 'hidden', marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--cream)' }}>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--slate-soft)', textTransform: 'uppercase' }}>School</th>
                <th style={{ textAlign: 'right', padding: '10px 16px', fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--slate-soft)', textTransform: 'uppercase' }}>Weighted score</th>
                <th style={{ textAlign: 'right', padding: '10px 16px', fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--slate-soft)', textTransform: 'uppercase' }}>Open red flags</th>
              </tr>
            </thead>
            <tbody>
              {compared.map(({ school, total }, i) => (
                <tr key={school.id} style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--sans)', color: 'var(--ink)', fontWeight: i === 0 && total != null ? 700 : 400 }}>
                    {school.name} {i === 0 && total != null && <span style={{ color: 'var(--gold)' }}>✓ highest</span>}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--navy)', fontWeight: 700 }}>
                    {total != null ? `${total.toFixed(1)}/5.0` : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--sans)', color: school.activeRedFlagCount > 0 ? 'var(--red)' : 'var(--green)' }}>
                    {school.activeRedFlagCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recommendation */}
      {winner && (
        <div style={{ background: 'var(--cream)', border: '1px solid var(--line)', padding: '20px 24px' }}>
          <p style={{ color: 'var(--gold)', fontFamily: 'var(--sans)' }} className="text-[10px] font-semibold uppercase tracking-widest mb-2">
            Recommendation
          </p>
          <p style={{ color: 'var(--ink)', fontFamily: 'var(--sans)', lineHeight: 1.6 }} className="text-[14px]">
            Based on your priorities, <strong style={{ color: 'var(--navy)' }}>{winner.school.name}</strong> is your best fit ({winner.total!.toFixed(1)}/5.0).
            {runnerUp && ` ${runnerUp.school.name} is close behind (${runnerUp.total!.toFixed(1)}/5.0).`}
            {cleanestFlags && cleanestFlags.school.activeRedFlagCount === 0 && ` ${cleanestFlags.school.name} has the cleanest red flag profile.`}
            {cleanestFlags && cleanestFlags.school.activeRedFlagCount > 0 && cleanestFlags.school.id !== winner.school.id && ` ${cleanestFlags.school.name} has fewer open red flags (${cleanestFlags.school.activeRedFlagCount}) — worth weighing against the score gap.`}
          </p>
        </div>
      )}
      {!winner && compared.length > 0 && (
        <p style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)' }} className="text-[13px]">
          Score all 5 priorities for at least one school to see a recommendation.
        </p>
      )}
    </div>
  )
}
