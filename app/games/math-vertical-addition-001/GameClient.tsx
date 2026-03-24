'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const GAME_ID = 'math-vertical-addition-001'

const COLORS = {
  dustGrey: '#dad7cd',
  drySage: '#a3b18a',
  fern: '#588157',
  hunter: '#3a5a40',
  pine: '#344e41',
}

type Exercise = {
  id: string
  a: number
  b: number
  answer: number
}

type GamePhase = 'playing' | 'success' | 'finished'

function genExercises(count: number): Exercise[] {
  return Array.from({ length: count }, (_, i) => {
    const a = Math.floor(Math.random() * 90) + 10
    const b = Math.floor(Math.random() * 90) + 10
    return { id: `q-${String(i + 1).padStart(3, '0')}`, a, b, answer: a + b }
  })
}

function padDigits(n: number, len: number): (number | null)[] {
  const s = String(n).padStart(len, ' ')
  return s.split('').map(c => (c === ' ' ? null : Number(c)))
}

export default function GameClient() {
  const router = useRouter()
  const [sdkReady, setSdkReady] = useState(false)
  const [phase, setPhase] = useState<GamePhase>('playing')
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<(number | undefined)[]>([])
  const [errorIdx, setErrorIdx] = useState<number | null>(null)
  const [hintMsg, setHintMsg] = useState('')
  const [correctCount, setCorrectCount] = useState(0)
  const [attemptMap, setAttemptMap] = useState<Record<string, number>>({})
  const totalQuestions = 5

  // טעינת SDK
  useEffect(() => {
    const script = document.createElement('script')
    script.src = '/sdk/mathplatform-sdk-v1.js'
    script.onload = () => {
      ;(window as any).MathPlatformSDK?.emit('GAME_STARTED', { gameId: GAME_ID })
      setSdkReady(true)
    }
    document.head.appendChild(script)
  }, [])

  // יצירת תרגילים
  useEffect(() => {
    setExercises(genExercises(totalQuestions))
  }, [])

  const curExercise = exercises[currentIdx]

  function handleDigitDrop(digit: number, colFromRight: number) {
    if (!curExercise) return
    const ansStr = String(curExercise.answer)
    const ansLen = ansStr.length

    if (colFromRight !== (answers.filter(a => a !== undefined).length)) return

    const correctDigit = Number(ansStr[ansLen - 1 - colFromRight])
    const attempt = (attemptMap[curExercise.id] ?? 0) + 1
    setAttemptMap(prev => ({ ...prev, [curExercise.id]: attempt }))

    if (digit === correctDigit) {
      const newAnswers = [...answers]
      newAnswers[colFromRight] = digit
      setAnswers(newAnswers)
      setErrorIdx(null)
      setHintMsg('')

      ;(window as any).MathPlatformSDK?.emit('ANSWER', {
        correct: true,
        questionId: curExercise.id,
        questionType: 'vertical-addition',
        correctAnswer: String(correctDigit),
        childAnswer: String(digit),
        attemptNumber: attempt,
      })

      if (newAnswers.filter(a => a !== undefined).length === ansLen) {
        setCorrectCount(prev => prev + 1)
        setPhase('success')
      }
    } else {
      setErrorIdx(colFromRight)
      const maxLen = Math.max(String(curExercise.a).length, String(curExercise.b).length, ansLen)
      const colA = Number(String(curExercise.a).padStart(maxLen, '0')[maxLen - 1 - colFromRight])
      const colB = Number(String(curExercise.b).padStart(maxLen, '0')[maxLen - 1 - colFromRight])
      const prevCol = colFromRight - 1
      const prevA = prevCol >= 0 ? Number(String(curExercise.a).padStart(maxLen, '0')[maxLen - 1 - prevCol]) : 0
      const prevB = prevCol >= 0 ? Number(String(curExercise.b).padStart(maxLen, '0')[maxLen - 1 - prevCol]) : 0
      const carry = prevA + prevB > 9 ? 1 : 0
      const hint = carry > 0
        ? `${colA}  +  ${colB}  +  ${carry}  =  ?`
        : `${colA}  +  ${colB}  =  ?`
      setHintMsg(hint)

      ;(window as any).MathPlatformSDK?.emit('ANSWER', {
        correct: false,
        questionId: curExercise.id,
        questionType: 'vertical-addition',
        correctAnswer: String(correctDigit),
        childAnswer: String(digit),
        attemptNumber: attempt,
      })

      setTimeout(() => {
        setErrorIdx(null)
        setAnswers(prev => {
          const a = [...prev]
          delete a[colFromRight]
          return a
        })
      }, 1500)
    }
  }

  function nextExercise() {
    if (currentIdx + 1 >= totalQuestions) {
      const stars = correctCount >= 4 ? 3 : correctCount >= 3 ? 2 : 1
      ;(window as any).MathPlatformSDK?.emit('GAME_OVER', {
        score: correctCount * 20,
        maxScore: 100,
        stars,
        correctAnswers: correctCount,
        totalQuestions,
      })
      setPhase('finished')
      return
    }
    setCurrentIdx(prev => prev + 1)
    setAnswers([])
    setErrorIdx(null)
    setHintMsg('')
    setPhase('playing')
  }

  if (!sdkReady || exercises.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: COLORS.pine }}>
        <p style={{ color: COLORS.dustGrey, fontFamily: 'Secular One, sans-serif' }}>טוען...</p>
      </div>
    )
  }

  // ── מסך סיום ──
  if (phase === 'finished') {
    const stars = correctCount >= 4 ? 3 : correctCount >= 3 ? 2 : 1
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `linear-gradient(160deg, ${COLORS.pine}, #1e2e22)`,
        fontFamily: 'Secular One, sans-serif', direction: 'rtl',
      }}>
        <div style={{
          background: `linear-gradient(135deg, ${COLORS.hunter}, #243328)`,
          borderRadius: 24, padding: '40px 48px', maxWidth: 400, width: '100%',
          textAlign: 'center', color: COLORS.dustGrey,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>
            {stars === 3 ? '🏆' : stars === 2 ? '🌟' : '💪'}
          </div>
          <h2 style={{ fontSize: 28, margin: '0 0 8px' }}>
            {stars === 3 ? 'כל הכבוד!' : stars === 2 ? 'יפה מאוד!' : 'המשיכו להתאמן!'}
          </h2>
          <div style={{ fontSize: 48, color: COLORS.fern, margin: '12px 0' }}>
            {'⭐'.repeat(stars)}
          </div>
          <p style={{ color: COLORS.drySage, margin: '0 0 24px' }}>
            {correctCount} מתוך {totalQuestions} נכון
          </p>
          <button onClick={() => router.back()} style={{
            width: '100%', padding: 14, borderRadius: 14, border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg, ${COLORS.fern}, ${COLORS.hunter})`,
            color: '#fff', fontSize: 18, fontFamily: 'Secular One, sans-serif',
          }}>המשך</button>
        </div>
      </div>
    )
  }

  if (!curExercise) return null

  const ansStr = String(curExercise.answer)
  const ansLen = ansStr.length
  const maxLen = Math.max(String(curExercise.a).length, String(curExercise.b).length, ansLen)
  const filledCount = answers.filter(a => a !== undefined).length

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: `linear-gradient(160deg, ${COLORS.pine}, #1e2e22)`,
      fontFamily: 'Secular One, sans-serif', direction: 'rtl', padding: 24,
      color: COLORS.dustGrey,
    }}>
      {/* כפתור חזרה */}
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 50 }}>
        <button
          onClick={() => router.back()}
          style={{
            width: 40, height: 40, borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'rgba(255,255,255,0.08)', color: '#a3b18a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}
        >←</button>
      </div>

      {/* progress */}
      <div style={{ width: '100%', maxWidth: 480, marginBottom: 24, display: 'flex', gap: 6 }}>
        {Array.from({ length: totalQuestions }, (_, i) => (
          <div key={i} style={{
            flex: 1, height: 6, borderRadius: 3,
            background: i < currentIdx ? COLORS.fern : 'rgba(255,255,255,0.15)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      {/* exercise card */}
      <div style={{
        background: `linear-gradient(160deg, ${COLORS.hunter}, #1e2c22)`,
        borderRadius: 24, padding: '36px 48px',
        border: `1px solid rgba(163,177,138,0.15)`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
        minWidth: 320,
      }}>
        <div style={{ color: COLORS.drySage, fontSize: 14 }}>
          תרגיל {currentIdx + 1} מתוך {totalQuestions}
        </div>

        {/* vertical exercise display */}
        <div style={{ direction: 'ltr', fontFamily: 'Secular One, sans-serif' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: '8px 4px' }}>
            <tbody>
              {/* row A */}
              <tr>
                <td style={{ width: 24 }} />
                {padDigits(curExercise.a, maxLen).map((d, i) => (
                  <td key={i} style={{ textAlign: 'center', minWidth: 48, height: 56 }}>
                    {d !== null && <span style={{ fontSize: 36, fontWeight: 700, color: COLORS.dustGrey }}>{d}</span>}
                  </td>
                ))}
              </tr>
              {/* row B */}
              <tr>
                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                  <span style={{ fontSize: 32, color: COLORS.drySage }}>+</span>
                </td>
                {padDigits(curExercise.b, maxLen).map((d, i) => (
                  <td key={i} style={{ textAlign: 'center', minWidth: 48, height: 56 }}>
                    {d !== null && <span style={{ fontSize: 36, fontWeight: 700, color: COLORS.dustGrey }}>{d}</span>}
                  </td>
                ))}
              </tr>
              {/* divider */}
              <tr>
                <td colSpan={maxLen + 1} style={{ padding: 0 }}>
                  <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${COLORS.drySage}, transparent)`, margin: '2px 0' }} />
                </td>
              </tr>
              {/* answer row */}
              <tr>
                <td />
                {padDigits(curExercise.answer, maxLen).map((d, ai) => {
                  const colFromRight = maxLen - 1 - ai
                  const isActive = colFromRight < ansLen
                  const placed = answers[colFromRight]
                  const isCorrect = placed !== undefined && placed === d
                  const isError = errorIdx === colFromRight
                  const isNext = isActive && filledCount === colFromRight

                  if (!isActive && d === null) return <td key={ai} style={{ minWidth: 48 }} />
                  return (
                    <td key={ai} style={{ textAlign: 'center', minWidth: 48, height: 60 }}>
                      <div style={{
                        width: 46, height: 52, margin: '0 auto', borderRadius: 12,
                        background: isCorrect ? 'rgba(88,129,87,0.35)' : isError ? 'rgba(180,60,60,0.35)' : isNext ? 'rgba(163,177,138,0.12)' : 'rgba(255,255,255,0.04)',
                        border: isCorrect ? `2px solid ${COLORS.fern}` : isError ? '2px solid #c04040' : isNext ? `2px dashed ${COLORS.drySage}` : '2px solid transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s',
                      }}>
                        {placed !== undefined && (
                          <span style={{
                            fontSize: 32, fontWeight: 700,
                            color: isCorrect ? '#7dcc80' : isError ? '#e07070' : COLORS.dustGrey,
                          }}>{placed}</span>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* hint */}
        <div style={{ minHeight: 40, width: '100%', textAlign: 'center' }}>
          {hintMsg && (
            <div style={{
              padding: '8px 16px', borderRadius: 10,
              background: 'rgba(180,100,40,0.25)', border: '1px solid rgba(220,140,60,0.4)',
              color: '#f0c070', fontSize: 22, fontWeight: 700, direction: 'ltr', letterSpacing: 2,
            }}>{hintMsg}</div>
          )}
        </div>

        {/* digit bank */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[[1,2,3,4,5],[6,7,8,9,0]].map((row, ri) => (
            <div key={ri} style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              {row.map(digit => (
                <button
                  key={digit}
                  onClick={() => handleDigitDrop(digit, filledCount)}
                  style={{
                    width: 56, height: 56, borderRadius: 14,
                    background: `linear-gradient(135deg, ${COLORS.hunter}, ${COLORS.pine})`,
                    border: `2px solid ${COLORS.fern}`,
                    color: COLORS.dustGrey, fontSize: 26, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'Secular One, sans-serif',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                    transition: 'transform 0.1s',
                  }}
                  onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.92)' }}
                  onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
                >{digit}</button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* success overlay */}
      {phase === 'success' && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(20,40,25,0.92)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          zIndex: 10,
        }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
          <div style={{ fontSize: 30, color: COLORS.dustGrey, fontFamily: 'Secular One, sans-serif', marginBottom: 8 }}>
            כל הכבוד!
          </div>
          <div style={{ color: COLORS.drySage, fontSize: 18, marginBottom: 28, direction: 'ltr' }}>
            {curExercise.a} + {curExercise.b} = {curExercise.answer}
          </div>
          <button onClick={nextExercise} style={{
            padding: '14px 36px', borderRadius: 14, border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg, ${COLORS.fern}, ${COLORS.hunter})`,
            color: '#fff', fontSize: 20, fontFamily: 'Secular One, sans-serif',
            boxShadow: '0 6px 20px rgba(88,129,87,0.4)',
          }}>
            {currentIdx + 1 < totalQuestions ? 'תרגיל הבא ➡️' : 'סיום 🏁'}
          </button>
        </div>
      )}
    </div>
  )
}
