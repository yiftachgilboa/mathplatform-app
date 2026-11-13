'use client'
import { useEffect, useState } from 'react'
import type { Question } from '@/lib/course/content'

type Result = { passed: boolean } | null

/**
 * שלב 5 — מבחן מעבר: שאלות בסדר אקראי, בלי רמזים ובלי ניסיון שני.
 * בסוף: הדמות מגיבה. עבר → onPassed (חגיגה + מעבר). לא עבר → לנסות שוב / חזרה לתרגול.
 */
export default function TestStage({ questions, count, mascot, ui, onAnswer, onFinish, onBackToPractice }: {
  questions: Question[]; count: number; mascot: string
  ui: { testProgress: string; testPass: string; testFail: string; retry: string; backToPractice: string }
  onAnswer: (correct: boolean, q: Question, picked: number) => void
  onFinish: (correct: number, total: number) => Promise<{ passed: boolean }>
  onBackToPractice: () => void
}) {
  const [order, setOrder] = useState<Question[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [results, setResults] = useState<boolean[]>([])
  const [picked, setPicked] = useState<number | null>(null)
  const [result, setResult] = useState<Result>(null)
  const [round, setRound] = useState(0)

  // ערבוב בצד הלקוח בלבד (Math.random ברינדור שרת = hydration error)
  useEffect(() => {
    const shuffle = <T,>(a: T[]) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
    // גם סדר התשובות מעורבב, כדי שהתשובה הנכונה לא תהיה תמיד באותו מקום
    const picked = shuffle([...questions]).slice(0, Math.min(count, questions.length)).map(q => {
      const idx = shuffle(q.answers.map((_, i) => i))
      return { q: q.q, answers: idx.map(i => q.answers[i]), correct: idx.indexOf(q.correct) }
    })
    // eslint-disable-next-line react-hooks/set-state-in-effect -- אקראיות חייבת לרוץ רק בלקוח
    setOrder(picked)
    setIdx(0); setResults([]); setPicked(null); setResult(null)
  }, [questions, count, round])

  if (!order) return <div className="box" />
  const total = order.length
  const q = order[idx]

  function pick(i: number) {
    if (picked !== null || !q) return
    setPicked(i)
    const ok = i === q.correct
    onAnswer(ok, q, i)
    const next = [...results, ok]
    setTimeout(async () => {
      setResults(next); setPicked(null)
      if (idx + 1 < total) { setIdx(idx + 1); return }
      setIdx(total)
      const r = await onFinish(next.filter(Boolean).length, total)
      setResult(r)
    }, 380)
  }

  const dots = (
    <div role="img" aria-label={ui.testProgress.replace('{n}', String(Math.min(idx + 1, total))).replace('{total}', String(total))}
      style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
      {order.map((_, j) => {
        const done = j < results.length
        const bg = result ? (results[j] ? 'var(--success)' : 'var(--warn)') : done ? 'var(--success)' : j === idx ? 'var(--primary)' : 'var(--line-2)'
        return <span key={j} style={{ width: 12, height: 12, borderRadius: '50%', background: bg }} />
      })}
    </div>
  )

  if (idx >= total) {
    return (
      <div className="panel-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, padding: '40px 20px 44px', textAlign: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mascot} alt="" className={result?.passed ? 'pop bob' : 'pop'} style={{ width: 140, height: 140, objectFit: 'contain', opacity: result ? 1 : 0.4 }} />
        {result && (
          <>
            <p style={{ margin: 0, fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 900, letterSpacing: '-0.6px' }}>{result.passed ? ui.testPass : ui.testFail}</p>
            {dots}
            {!result.passed && (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button type="button" className="press c-primary" onClick={() => setRound(r => r + 1)}
                  style={{ minHeight: 56, padding: '0 28px', borderRadius: 999, fontSize: 19, fontWeight: 800 }}>{ui.retry}</button>
                <button type="button" className="press c-light" onClick={onBackToPractice}
                  style={{ minHeight: 56, padding: '0 28px', borderRadius: 999, fontSize: 19, fontWeight: 800 }}>{ui.backToPractice}</button>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div key={`${round}-${idx}`} className="panel-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, padding: 'clamp(28px, 5vw, 44px) 20px 48px' }}>
      {dots}
      <p style={{ margin: 0, fontSize: 'clamp(44px, 9vw, 72px)', fontWeight: 900, direction: 'ltr', letterSpacing: '-1px', textAlign: 'center' }}>
        {q.q.includes('?') ? (
          <>
            {q.q.split('?')[0]}
            <span style={{ display: 'inline-block', minWidth: '1.2em', borderBottom: '6px solid var(--dot)' }}>&#8203;</span>
            {q.q.split('?').slice(1).join('?')}
          </>
        ) : q.q}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${q.answers.length >= 4 ? 4 : q.answers.length}, minmax(0, 1fr))`, gap: 12, width: '100%', maxWidth: 560 }}>
        {q.answers.map((a, i) => {
          const on = picked === i
          return (
            <button key={i} type="button" className="press c-ans" onClick={() => pick(i)}
              style={{ fontSize: 'clamp(28px, 5vw, 36px)', fontWeight: 900, minHeight: 80, borderRadius: 22, border: `2px solid ${on ? 'var(--primary)' : 'var(--line-2)'}`, background: on ? 'var(--primary)' : '#fff', color: on ? '#fff' : 'var(--ink)' }}>
              {a}
            </button>
          )
        })}
      </div>
    </div>
  )
}
