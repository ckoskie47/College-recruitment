import type { VisitQuestion, VisitQuestionBooklet } from '@/lib/ai/visit-question-generator'

const PILLAR_ORDER = ['Athletic Program', 'Playing Time', 'Financial Package', 'Academic Fit', 'Campus & Life Fit']

export function QuestionBookletDisplay({ booklet }: { booklet: VisitQuestionBooklet }) {
  const byPillar = PILLAR_ORDER.map(pillar => ({
    pillar,
    questions: booklet.questions.filter(q => q.pillar === pillar),
  })).filter(g => g.questions.length > 0)

  return (
    <div>
      <div className="mb-8">
        <p style={{ color: 'var(--gold)', fontFamily: 'var(--sans)' }} className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-1">
          Visit Questions
        </p>
        <h2 style={{ fontFamily: 'var(--display)', color: 'var(--navy)' }} className="text-[28px] font-medium tracking-tight mb-2">
          {booklet.school_name}
        </h2>
        {booklet.top_priorities.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {booklet.top_priorities.map((p, i) => (
              <span key={i} style={{ background: 'var(--cream-deep)', border: '1px solid var(--line)', color: 'var(--navy)', fontFamily: 'var(--sans)' }} className="px-3 py-1 text-[11px] font-semibold">
                {p}
              </span>
            ))}
          </div>
        )}
      </div>

      {byPillar.map(({ pillar, questions }) => (
        <div key={pillar} className="mb-8">
          <div style={{ height: 1, background: 'var(--line)', marginBottom: 20, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: -1, width: 32, height: 3, background: 'var(--gold)' }} />
          </div>
          <p style={{ color: 'var(--gold)', fontFamily: 'var(--sans)' }} className="text-[10px] font-semibold tracking-[0.16em] uppercase mb-4">
            {pillar}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {questions.map((q: VisitQuestion, i: number) => (
              <div key={i} style={{ background: 'var(--white)', border: '1px solid var(--line)', padding: '20px 24px' }}>
                <p style={{ fontFamily: 'var(--sans)', color: 'var(--ink)', fontWeight: 600, lineHeight: 1.5 }} className="text-[14px] mb-3">
                  {q.question}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <p style={{ color: 'var(--ink-soft)', fontFamily: 'var(--sans)' }} className="text-[12px]">
                    <span style={{ color: 'var(--navy)', fontWeight: 600 }}>Why it matters:</span> {q.why_it_matters}
                  </p>
                  <p style={{ color: 'var(--ink-soft)', fontFamily: 'var(--sans)' }} className="text-[12px]">
                    <span style={{ color: 'var(--navy)', fontWeight: 600 }}>Listen for:</span> {q.listen_for}
                  </p>
                  <p style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)' }} className="text-[11px]">
                    Driven by: {q.priority_driver}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
