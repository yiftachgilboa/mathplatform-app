'use client'

// ─────────────────────────────────────────────────────────────
// שלד משחק — נוצר ע"י scripts/new-game.mjs
// החיבור לפלטפורמה (SDK, יציאה, כוכבים, מסך סיום) כבר מוכן.
// מה שמשנים בכל משחק: generateQuestion() + החלק המסומן "מכניקת המשחק".
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import GameBackButton from '@/components/GameBackButton'

const GAME_ID = '__GAME_ID__'
const GAME_TITLE = '__GAME_TITLE__'
const BG_IMAGE = '/art/games/__GAME_ID__-game-bg.jpg' // רקע בתוך המשחק — להחליף את הקובץ בארט האמיתי
const TOTAL_QUESTIONS = 5

type Question = {
  id: string
  type: string        // סוג השאלה — נשלח ל-SDK לניתוח שגיאות
  prompt: string      // הטקסט שמוצג לילד
  answer: string      // התשובה הנכונה
  options: string[]   // אפשרויות (כולל הנכונה) — אם המשחק בהקלדה, אפשר להתעלם
}

// ── מכניקת המשחק: יצירת שאלה ─────────────────────────────────
function generateQuestion(index: number): Question {
  const a = 2 + Math.floor(Math.random() * 8)
  const b = 2 + Math.floor(Math.random() * 8)
  const answer = a * b
  const options = new Set<number>([answer])
  while (options.size < 4) options.add(Math.max(1, answer + Math.floor(Math.random() * 11) - 5))
  return {
    id: `q-${index + 1}`,
    type: 'placeholder',
    prompt: `${a} × ${b} = ?`,
    answer: String(answer),
    options: [...options].sort(() => Math.random() - 0.5).map(String),
  }
}

// כוכבים: לפי תשובות נכונות בניסיון הראשון (מטבעות: 3⭐=+10, 2⭐=+7, 1⭐=+3)
function calcStars(firstTryCorrect: number) {
  const pct = firstTryCorrect / TOTAL_QUESTIONS
  return pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : 1
}

function sdk() {
  return (window as any).MathPlatformSDK
}

export default function GameClient() {
  const router = useRouter()
  const [qIndex, setQIndex] = useState(0)
  const [question, setQuestion] = useState<Question | null>(null) // נוצר ב-useEffect (Math.random → hydration)
  const [attempt, setAttempt] = useState(1)
  const [firstTryCorrect, setFirstTryCorrect] = useState(0)
  const [feedback, setFeedback] = useState<'ok' | 'err' | null>(null)
  const [done, setDone] = useState<{ stars: number } | null>(null)

  // SDK + שאלה ראשונה
  useEffect(() => {
    setQuestion(generateQuestion(0))
    const script = document.createElement('script')
    script.src = '/sdk/mathplatform-sdk-v1.js'
    script.onload = () => sdk()?.emit('GAME_STARTED', { gameId: GAME_ID })
    document.head.appendChild(script)
  }, [])

  function submit(childAnswer: string) {
    if (!question || feedback === 'ok') return
    const correct = childAnswer === question.answer

    sdk()?.emit('ANSWER', {
      correct,
      questionId: question.id,
      questionType: question.type,
      correctAnswer: question.answer,
      childAnswer,
      attemptNumber: attempt,
    })

    if (!correct) {
      setFeedback('err')
      setAttempt(a => a + 1)
      setTimeout(() => setFeedback(null), 600)
      return
    }

    const newFirstTry = firstTryCorrect + (attempt === 1 ? 1 : 0)
    setFirstTryCorrect(newFirstTry)
    setFeedback('ok')

    setTimeout(() => {
      const next = qIndex + 1
      if (next >= TOTAL_QUESTIONS) {
        const stars = calcStars(newFirstTry)
        sdk()?.emit('GAME_OVER', {
          score: Math.round((newFirstTry / TOTAL_QUESTIONS) * 100),
          maxScore: 100,
          stars,
          correctAnswers: newFirstTry,
          totalQuestions: TOTAL_QUESTIONS,
        })
        setDone({ stars })
      } else {
        setQIndex(next)
        setQuestion(generateQuestion(next))
        setAttempt(1)
        setFeedback(null)
      }
    }, 800)
  }

  return (
    <div style={{
      minHeight: '100dvh', direction: 'rtl', position: 'relative', overflow: 'hidden',
      background: `#2b3a55 url('${BG_IMAGE}') center/cover no-repeat`,
      fontFamily: 'var(--font-secular), "Secular One", sans-serif',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <GameBackButton />

      {/* ── מכניקת המשחק: תצוגה ─────────────────────────────── */}
      {question && !done && (
        <div style={{
          background: 'rgba(255,255,255,0.92)', borderRadius: 24, padding: '28px 24px',
          width: 'min(480px, 100%)', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          outline: feedback === 'ok' ? '4px solid #3cb371' : feedback === 'err' ? '4px solid #e05050' : 'none',
        }}>
          <div style={{ fontSize: 15, color: '#666' }}>{GAME_TITLE} · שאלה {qIndex + 1} מתוך {TOTAL_QUESTIONS}</div>
          <div style={{ fontSize: 44, margin: '18px 0 24px', color: '#111' }}>{question.prompt}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {question.options.map(opt => (
              <button key={opt} onClick={() => submit(opt)} style={{
                fontSize: 28, padding: '14px 0', borderRadius: 14, cursor: 'pointer',
                border: '2px solid #111', background: '#fff', color: '#111', fontFamily: 'inherit',
              }}>{opt}</button>
            ))}
          </div>
        </div>
      )}

      {/* ── מסך סיום (לא לשנות את הלוגיקה, רק עיצוב) ───────────── */}
      {done && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150 }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 32, textAlign: 'center', width: 'min(360px, 90%)' }}>
            <div style={{ fontSize: 56 }}>🎉</div>
            <div style={{ fontSize: 30, color: '#111' }}>כל הכבוד!</div>
            <div style={{ fontSize: 40, margin: '12px 0' }}>{'⭐'.repeat(done.stars)}{'☆'.repeat(3 - done.stars)}</div>
            <button onClick={() => router.back()} style={{
              fontSize: 22, padding: '12px 36px', borderRadius: 14, border: 'none',
              background: '#3cb371', color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
            }}>המשך ▶</button>
          </div>
        </div>
      )}
    </div>
  )
}
