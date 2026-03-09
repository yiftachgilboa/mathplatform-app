'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

type Phase = 'playing' | 'feedback-correct' | 'feedback-wrong' | 'end'

function GameContent() {
  const searchParams = useSearchParams()
  const childId = searchParams.get('childId') ?? ''
  const router = useRouter()
  const sdkLoaded = useRef(false)
  const attemptRef = useRef(1)

  const [phase, setPhase] = useState<Phase>('playing')
  const [attempt, setAttempt] = useState(1)
  const [stars, setStars] = useState(0)
  const [score, setScore] = useState(0)
  const [progress, setProgress] = useState(0)

  // Load SDK
  useEffect(() => {
    if (sdkLoaded.current) return
    sdkLoaded.current = true

    const script = document.createElement('script')
    script.src = '/sdk/mathplatform-sdk-v1.js'
    script.onload = () => {
      window.MathPlatformSDK?.init({ childId })
      window.MathPlatformSDK?.emit('GAME_STARTED', { gameId: 'math-addition-001' })
    }
    document.head.appendChild(script)
  }, [childId])

  function handleAnswer(answer: string) {
    const correct = answer === '2'
    const currentAttempt = attemptRef.current

    window.MathPlatformSDK?.emit('ANSWER', {
      correct,
      questionId: 'q-001',
      questionType: 'addition',
      correctAnswer: '2',
      childAnswer: answer,
      attemptNumber: currentAttempt,
    })

    if (correct) {
      const s = currentAttempt === 1 ? 3 : currentAttempt === 2 ? 2 : 1
      const sc = currentAttempt === 1 ? 100 : currentAttempt === 2 ? 70 : 50

      setStars(s)
      setScore(sc)
      setProgress(100)
      setPhase('feedback-correct')

      window.MathPlatformSDK?.emit('GAME_OVER', {
        score: sc,
        maxScore: 100,
        stars: s,
        correctAnswers: 1,
        totalQuestions: 1,
      })

      setTimeout(() => setPhase('end'), 1200)
    } else {
      attemptRef.current += 1
      setAttempt(a => a + 1)
      setPhase('feedback-wrong')
      setTimeout(() => setPhase('playing'), 1000)
    }
  }

  function handleRestart() {
    attemptRef.current = 1
    setAttempt(1)
    setPhase('playing')
    setProgress(0)
    setStars(0)
    setScore(0)
    window.MathPlatformSDK?.emit('GAME_STARTED', { gameId: 'math-addition-001' })
  }

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-between p-6" dir="rtl">

      {/* Progress bar */}
      <div className="w-full max-w-sm">
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col items-center gap-8 w-full max-w-sm">

        {phase === 'end' ? (
          // End screen
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="text-6xl">
              {stars === 3 ? '⭐⭐⭐' : stars === 2 ? '⭐⭐' : '⭐'}
            </div>
            <p className="text-2xl font-bold">כל הכבוד!</p>
            <p className="text-gray-800 text-lg">ניקוד: {score} / 100</p>
            <div className="flex gap-3">
              <button
                onClick={handleRestart}
                className="bg-blue-500 hover:bg-blue-600 text-white text-xl font-bold py-4 px-8 rounded-2xl transition"
              >
                שחק שוב
              </button>
              <button
                onClick={() => router.push(`/child/${childId}`)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-xl font-bold py-4 px-8 rounded-2xl transition"
              >
                חזרה לדשבורד
              </button>
            </div>
          </div>
        ) : (
          // Game screen
          <>
            {/* Question */}
            <div className="text-center">
              <p className="text-5xl font-bold mb-2 text-gray-800" dir="ltr">1 + 1 = ?</p>
              {phase === 'feedback-correct' && (
                <p className="text-3xl mt-4">✅ נכון!</p>
              )}
              {phase === 'feedback-wrong' && (
                <p className="text-3xl mt-4">❌ נסה שוב</p>
              )}
            </div>

            {/* Answer buttons */}
            <div className="flex gap-4 w-full">
              {['2', '3'].map(opt => (
                <button
                  key={opt}
                  onClick={() => phase === 'playing' && handleAnswer(opt)}
                  disabled={phase !== 'playing'}
                  className="flex-1 bg-white border-2 border-blue-200 text-4xl font-bold py-8 rounded-2xl shadow-sm hover:border-blue-400 active:scale-95 transition disabled:opacity-50 text-gray-800"
                >
                  {opt}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div /> {/* spacer */}
    </div>
  )
}

export default function GamePage() {
  return (
    <Suspense fallback={<div>טוען...</div>}>
      <GameContent />
    </Suspense>
  )
}
