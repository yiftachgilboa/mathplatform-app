'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import StorySelector from './StorySelector'
import StoryReader from './StoryReader'

const GAME_ID = 'language-reading-001'
const TOPIC = 'kamatz'

type Screen = 'select' | 'read' | 'finish'

export default function GameClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [screen, setScreen] = useState<Screen>('select')
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [stars, setStars] = useState(0)
  const sdkReady = useRef(false)

  // טעינת SDK
  useEffect(() => {
    if (sdkReady.current) return
    const script = document.createElement('script')
    script.src = '/sdk/mathplatform-sdk-v1.js'
    script.onload = () => {
      sdkReady.current = true
      window.MathPlatformSDK?.emit('GAME_STARTED', { gameId: GAME_ID })
    }
    document.head.appendChild(script)
  }, [])

  const handleSelectStory = (bookId: string) => {
    setSelectedBookId(bookId)
    setScreen('read')
  }

  const handleFinish = (earnedStars: number) => {
    setStars(earnedStars)

    // שלח ANSWER — קריאת סיפור שלמה = תשובה נכונה
    window.MathPlatformSDK?.emit('ANSWER', {
      correct: true,
      questionId: selectedBookId ?? 'unknown',
      questionType: 'storybook-reading',
      correctAnswer: selectedBookId ?? '',
      childAnswer: selectedBookId ?? '',
      attemptNumber: 1,
    })

    // שלח GAME_OVER
    window.MathPlatformSDK?.emit('GAME_OVER', {
      score: earnedStars * 33,
      maxScore: 100,
      stars: earnedStars,
      correctAnswers: 1,
      totalQuestions: 1,
    })

    setScreen('finish')
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: "url('/art/games/language-reading-001.jpg') center/cover no-repeat",
      direction: 'rtl',
    }}>

      {screen === 'select' && (
        <StorySelector topic={TOPIC} onSelect={handleSelectStory} />
      )}

      {screen === 'read' && selectedBookId && (
        <StoryReader bookId={selectedBookId} onFinish={handleFinish} />
      )}

      {screen === 'finish' && (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: '1.5rem', padding: '2rem',
          fontFamily: "'Secular One', serif",
        }}>
          <div style={{
            background: '#FFE066',
            border: '4px solid #111',
            borderRadius: 24,
            boxShadow: '8px 8px 0 #111',
            padding: '2.5rem 3rem',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 16,
          }}>
            <div style={{ fontSize: 80 }}>🏆</div>
            <div style={{
              fontFamily: "'Bangers', cursive",
              fontSize: 40, letterSpacing: '0.06em', color: '#111',
            }}>
              סיימת את הסיפור!
            </div>

            {/* כוכבים */}
            <div style={{ display: 'flex', gap: 8, fontSize: 36 }}>
              {[1, 2, 3].map(i => (
                <span key={i}>{i <= stars ? '⭐' : '☆'}</span>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: '0.5rem' }}>
              <button
                onClick={() => { setScreen('read') }}
                style={{
                  padding: '10px 24px', fontSize: 16,
                  fontFamily: "'Bangers', cursive", letterSpacing: '0.05em',
                  borderRadius: 10, border: '3px solid #111',
                  background: '#4CAF50', color: '#fff',
                  boxShadow: '4px 4px 0 #111', cursor: 'pointer',
                }}>
                קרא שוב
              </button>
              <button
                onClick={() => setScreen('select')}
                style={{
                  padding: '10px 24px', fontSize: 16,
                  fontFamily: "'Bangers', cursive", letterSpacing: '0.05em',
                  borderRadius: 10, border: '3px solid #111',
                  background: '#fff', color: '#111',
                  boxShadow: '4px 4px 0 #111', cursor: 'pointer',
                }}>
                סיפור אחר
              </button>
              <button
                onClick={() => router.back()}
                style={{
                  padding: '10px 24px', fontSize: 16,
                  fontFamily: "'Bangers', cursive", letterSpacing: '0.05em',
                  borderRadius: 10, border: '3px solid #111',
                  background: '#2196F3', color: '#fff',
                  boxShadow: '4px 4px 0 #111', cursor: 'pointer',
                }}>
                המשך
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
