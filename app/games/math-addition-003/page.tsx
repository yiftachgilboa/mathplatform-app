'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

const TOTAL_QUESTIONS = 5
const GAME_ID = 'math-addition-003'

type Phase = 'playing' | 'feedback-correct' | 'feedback-wrong' | 'end'

function generateQuestion() {
  const a = Math.floor(Math.random() * 50) + 1
  const b = Math.floor(Math.random() * 50) + 1
  const correct = a + b

  const optionsSet = new Set<number>([correct])
  while (optionsSet.size < 4) {
    const distractor = correct + (Math.floor(Math.random() * 11) - 5)
    if (distractor > 0 && distractor !== correct) optionsSet.add(distractor)
  }

  const options = Array.from(optionsSet).sort(() => Math.random() - 0.5)
  return { a, b, correct, options }
}

function GameContent() {
  const searchParams = useSearchParams()
  const childId = searchParams.get('childId') ?? ''
  const router = useRouter()
  const sdkLoaded = useRef(false)
  const attemptRef = useRef(1)

  const [phase, setPhase] = useState<Phase>('playing')
  const [question, setQuestion] = useState(generateQuestion)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [stars, setStars] = useState(0)
  const [score, setScore] = useState(0)

  // Load SDK
  useEffect(() => {
    if (sdkLoaded.current) return
    sdkLoaded.current = true

    const script = document.createElement('script')
    script.src = '/sdk/mathplatform-sdk-v1.js'
    script.onload = () => {
      window.MathPlatformSDK?.init({ childId })
      window.MathPlatformSDK?.emit('GAME_STARTED', { gameId: GAME_ID })
    }
    document.head.appendChild(script)
  }, [childId])

  function handleAnswer(answer: number) {
    const correct = answer === question.correct
    const currentAttempt = attemptRef.current

    window.MathPlatformSDK?.emit('ANSWER', {
      correct,
      questionId: `q-${questionIndex + 1}`,
      questionType: 'addition',
      correctAnswer: String(question.correct),
      childAnswer: String(answer),
      attemptNumber: currentAttempt,
    })

    if (correct) {
      const newCorrectCount = correctCount + 1
      setCorrectCount(newCorrectCount)
      setPhase('feedback-correct')

      setTimeout(() => {
        if (questionIndex + 1 >= TOTAL_QUESTIONS) {
          const s = newCorrectCount >= 5 ? 3 : newCorrectCount >= 3 ? 2 : 1
          const sc = Math.round((newCorrectCount / TOTAL_QUESTIONS) * 100)
          setStars(s)
          setScore(sc)
          setPhase('end')

          window.MathPlatformSDK?.emit('GAME_OVER', {
            score: sc,
            maxScore: 100,
            stars: s,
            correctAnswers: newCorrectCount,
            totalQuestions: TOTAL_QUESTIONS,
          })
        } else {
          attemptRef.current = 1
          setQuestionIndex(i => i + 1)
          setQuestion(generateQuestion())
          setPhase('playing')
        }
      }, 1000)
    } else {
      attemptRef.current += 1
      setPhase('feedback-wrong')
      setTimeout(() => setPhase('playing'), 1000)
    }
  }

  function handleRestart() {
    attemptRef.current = 1
    setQuestionIndex(0)
    setCorrectCount(0)
    setQuestion(generateQuestion())
    setPhase('playing')
    setStars(0)
    setScore(0)
    window.MathPlatformSDK?.emit('GAME_STARTED', { gameId: GAME_ID })
  }

  const progress = (questionIndex / TOTAL_QUESTIONS) * 100

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
        <p className="text-sm text-gray-500 text-center mt-1">
          שאלה {questionIndex + 1} מתוך {TOTAL_QUESTIONS}
        </p>
      </div>

      {/* Main content */}
      <div className="flex flex-col items-center gap-8 w-full max-w-sm">

        {phase === 'end' ? (
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
          <>
            {/* Question */}
            <div className="text-center">
              <p className="text-5xl font-bold mb-2 text-gray-800" dir="ltr">
                {question.a} + {question.b} = ?
              </p>
              {phase === 'feedback-correct' && (
                <p className="text-3xl mt-4">✅ נכון!</p>
              )}
              {phase === 'feedback-wrong' && (
                <p className="text-3xl mt-4">❌ נסה שוב</p>
              )}
            </div>

            {/* Answer buttons */}
            <div className="grid grid-cols-2 gap-4 w-full">
              {question.options.map(opt => (
                <button
                  key={opt}
                  onClick={() => phase === 'playing' && handleAnswer(opt)}
                  disabled={phase !== 'playing'}
                  className="bg-white border-2 border-blue-200 text-4xl font-bold py-8 rounded-2xl shadow-sm hover:border-blue-400 active:scale-95 transition disabled:opacity-50 text-gray-800"
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
