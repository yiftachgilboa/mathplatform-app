'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import GameBackButton from '@/components/GameBackButton'
import goalkeeperImg from './assets/goalkeeper-shva-001.png'

const GAME_ID = 'language-shva-001'

const GOAL_TARGETS = [
  { x: 40, y: 22 }, { x: 50, y: 22 }, { x: 57, y: 22 },
  { x: 40, y: 27 }, { x: 50, y: 27 }, { x: 57, y: 27 },
  { x: 40, y: 32 }, { x: 50, y: 32 }, { x: 57, y: 32 },
]
const MISS_TARGETS = [
  { x: 8,  y: 35 },
  { x: 10, y: 50 },
  { x: 12, y: 62 },
  { x: 92, y: 35 },
  { x: 90, y: 50 },
  { x: 88, y: 62 },
]
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

function calcSize(targetY: number): number {
  const startY = 82, startSize = 8, goalY = 22, goalSize = 1.6
  const ratio = Math.abs(targetY - startY) / Math.abs(goalY - startY)
  return Math.max(startSize * Math.pow(goalSize / startSize, ratio), 0.8)
}

const FINAL_LETTERS: Record<string, string> = {
  'נ': 'ן',
  'מ': 'ם',
  'פ': 'ף',
  'כ': 'ך',
  'צ': 'ץ',
}

const SHVA_LETTERS = [
  { char: 'אְ', base: 'א', sound: 'א' },
  { char: 'גְ', base: 'ג', sound: 'ג' },
  { char: 'דְ', base: 'ד', sound: 'ד' },
  { char: 'הְ', base: 'ה', sound: 'ה' },
  { char: 'וְ', base: 'ו', sound: 'ו' },
  { char: 'זְ', base: 'ז', sound: 'ז' },
  { char: 'חְ', base: 'ח', sound: 'ח' },
  { char: 'טְ', base: 'ט', sound: 'ט' },
  { char: 'יְ', base: 'י', sound: 'י' },
  { char: 'לְ', base: 'ל', sound: 'ל' },
  { char: 'מְ', base: 'מ', sound: 'מ' },
  { char: 'נְ', base: 'נ', sound: 'נ' },
  { char: 'סְ', base: 'ס', sound: 'ס' },
  { char: 'עְ', base: 'ע', sound: 'ע' },
  { char: 'צְ', base: 'צ', sound: 'צ' },
  { char: 'קְ', base: 'ק', sound: 'ק' },
  { char: 'רְ', base: 'ר', sound: 'ר' },
  { char: 'שְ', base: 'ש', sound: 'ש' },
  { char: 'תְ', base: 'ת', sound: 'ת' },
]

type CircleState = 'empty' | 'goal' | 'miss'
type ShvaLetter = typeof SHVA_LETTERS[number]
type Particle = { id: number; x: number; y: number; color: string; vx: number; vy: number; age: number; opacity: number }

// ── Web Audio ─────────────────────────────────────────────────────────────────
function createAudioContext() {
  return new ((window as any).AudioContext || (window as any).webkitAudioContext)()
}
function playCorrect() {
  const ctx = createAudioContext()
  ;[523, 659, 784].forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.value = freq; osc.type = 'sine'
    gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.3)
    osc.start(ctx.currentTime + i * 0.15)
    osc.stop(ctx.currentTime + i * 0.15 + 0.3)
  })
}
function playKick() {
  const ctx = createAudioContext()
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++)
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3)
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const gain = ctx.createGain(); gain.gain.value = 0.6
  source.connect(gain); gain.connect(ctx.destination)
  source.start()
}

function speakLetter(char: string) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(char)
  u.lang = 'he-IL'; u.rate = 0.75; u.pitch = 1.1
  window.speechSynthesis.speak(u)
}

export default function GameClient() {
  const router = useRouter()
  const [goals, setGoals] = useState(0)
  const [misses, setMisses] = useState(0)
  const [circles, setCircles] = useState<CircleState[]>(Array(10).fill('empty'))
  const [currentLetter, setCurrentLetter] = useState<ShvaLetter>(SHVA_LETTERS[0])
  const [usedIndices, setUsedIndices] = useState<number[]>([])
  const [micStatus, setMicStatus] = useState<'idle' | 'listening'>('idle')
  const [isKicking, setIsKicking] = useState(false)
  const [isCardVisible, setIsCardVisible] = useState(false)
  const [ballPos, setBallPos] = useState({ x: 50, y: 88 })
  const [ballSize, setBallSize] = useState('8vw')
  const [ballTransDur, setBallTransDur] = useState('0s')
  const [ballEasing, setBallEasing] = useState('cubic-bezier(0.0,0.0,0.4,1.0)')
  const [gkPos, setGkPos] = useState({ x: 50, y: 28 })
  const [gkRot, setGkRot] = useState(0)
  const [gkTransDur, setGkTransDur] = useState('0s')
  const [gkEasing, setGkEasing] = useState('ease-out')
  const [currentRound, setCurrentRound] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [stars, setStars] = useState(0)
  const [goalFlash, setGoalFlash] = useState(false)
  const [particles, setParticles] = useState<Particle[]>([])

  // refs — כמו ב-language-nikud-001
  const recRef        = useRef<any>(null)
  const listeningRef  = useRef(false)
  const pausedRef     = useRef(false)
  const confirmingRef = useRef(false)
  const currentLetterRef = useRef(currentLetter)
  const usedIndicesRef   = useRef(usedIndices)
  const circlesRef       = useRef(circles)
  const currentRoundRef  = useRef(0)
  const pendingAnswerRef = useRef({ isCorrect: true, transcript: '' })
  const goalsRef         = useRef(0)
  const attemptRef       = useRef(1)
  currentLetterRef.current = currentLetter
  usedIndicesRef.current   = usedIndices
  circlesRef.current       = circles
  currentRoundRef.current  = currentRound
  goalsRef.current         = goals

  // ── launchFireworks ───────────────────────────────────────────────────────
  const launchFireworks = useCallback(() => {
    const colors = ['#FFD700','#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7']
    const origins = [20, 35, 50, 65, 80]
    const newParticles = origins.flatMap(x =>
      Array.from({ length: 12 }, () => ({
        id: Math.random(),
        x,
        y: 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 4,
        vy: -(Math.random() * 3 + 1),
        age: 0,
        opacity: 1,
      }))
    )
    setParticles(newParticles)

    let rafId: number
    const animate = () => {
      setParticles(prev => {
        if (prev.length === 0) return prev
        const next = prev
          .map(p => ({
            ...p,
            x: p.x + p.vx * 0.3,
            y: p.y + p.vy,
            vy: p.vy + 0.15,
            age: p.age + 1,
            opacity: p.age > 60 ? Math.max(0, 1 - (p.age - 60) / 60) : 1,
          }))
          .filter(p => p.age < 120)
        return next
      })
      rafId = requestAnimationFrame(animate)
    }
    rafId = requestAnimationFrame(animate)
    setTimeout(() => {
      cancelAnimationFrame(rafId)
      setParticles([])
    }, 3000)
  }, [])

  // ── goalkeeperJump ────────────────────────────────────────────────────────
  const goalkeeperJump = useCallback((ballTargetX: number) => {
    const dir = ballTargetX > 50 ? -1 : 1
    const baseY = 28

    // סיבוב + תנועה לצד + עלייה לפיצוי, נשאר שם עד אות חדשה
    setGkTransDur('0.4s')
    setGkEasing('ease-out')
    setGkPos({ x: 50 + dir * 3, y: baseY - 5 })
    setGkRot(dir * 90)
  }, [])

  // ── endGame ───────────────────────────────────────────────────────────────
  const endGame = useCallback((finalGoals: number) => {
    const stars = finalGoals >= 9 ? 3 : finalGoals >= 6 ? 2 : 1
    ;(window as any).MathPlatformSDK?.emit('GAME_OVER', {
      score: finalGoals,
      maxScore: 10,
      stars,
      correctAnswers: finalGoals,
      totalQuestions: 10,
    })
    setStars(stars)
    setGameOver(true)
  }, [])

  // ── getNextLetter ──────────────────────────────────────────────────────────
  const getNextLetter = useCallback((prevUsed: number[]) => {
    const available = SHVA_LETTERS.map((_, i) => i).filter(i => !prevUsed.includes(i))
    if (available.length === 0) return
    const randomIndex = available[Math.floor(Math.random() * available.length)]
    setUsedIndices(prev => [...prev, randomIndex])
    setCurrentLetter(SHVA_LETTERS[randomIndex])
  }, [])

  // ── resetBallAndKeeper ────────────────────────────────────────────────────
  const resetBallAndKeeper = useCallback(() => {
    setBallTransDur('0s')
    setBallEasing('cubic-bezier(0.0,0.0,0.4,1.0)')
    setBallPos({ x: 50, y: 88 })
    setBallSize('8vw')
    setGkTransDur('0.4s')
    setGkEasing('ease-out')
    setGkPos({ x: 50, y: 28 })
    setGkRot(0)
  }, [])

  // ── advanceAfterKick ──────────────────────────────────────────────────────
  const advanceAfterKick = useCallback((isGoal: boolean) => {
    setTimeout(() => {
      const round = currentRoundRef.current
      const { isCorrect, transcript } = pendingAnswerRef.current

      // עדכן עיגולים לפי index הנוכחי
      setCircles(prev => {
        const next = [...prev]
        next[round] = isGoal ? 'goal' : 'miss'
        return next
      })

      if (isGoal) setGoals(g => g + 1)
      else        setMisses(m => m + 1)

      // שלח ANSWER ל-SDK
      ;(window as any).MathPlatformSDK?.emit('ANSWER', {
        correct: isCorrect,
        questionId: currentLetterRef.current.char,
        questionType: 'letter-shva',
        correctAnswer: currentLetterRef.current.base,
        childAnswer: transcript,
        attemptNumber: attemptRef.current,
      })

      setIsKicking(false)
      confirmingRef.current = false
      pausedRef.current = false
      resetBallAndKeeper()

      if (!isGoal) {
        // החמצה — אותה אות, ניסיון נוסף
        attemptRef.current += 1
        setIsCardVisible(true)
        setTimeout(() => startListeningRef.current(), 300)
        return
      }

      // גול — אות חדשה
      attemptRef.current = 1
      setCurrentRound(round + 1)

      if (round + 1 >= 10) {
        endGame(goalsRef.current + 1)
        return
      }

      const nextUsed = [...usedIndicesRef.current]
      getNextLetter(nextUsed)
      setIsCardVisible(true)
      setTimeout(() => startListeningRef.current(), 300)
    }, 1000)
  }, [getNextLetter, endGame, resetBallAndKeeper])

  // ── handleGoal / handleMiss ────────────────────────────────────────────────
  const handleGoal = useCallback(() => {
    const t = pick(GOAL_TARGETS)
    const tx = t.x
    const ty = t.y

    goalkeeperJump(tx)

    // איפוס מיידי לנקודת ההתחלה
    setBallTransDur('0s')
    setBallPos({ x: 50, y: 88 })
    setBallSize('8vw')

    // frame הבא — טיסה ליעד
    setTimeout(() => {
      setBallTransDur('0.6s')
      setBallPos({ x: tx, y: ty })
      setBallSize('1.6vw')
    }, 16)

    // הגעה ליעד → נפילה לרצפת השער (Y: 38.5%) — גרוויטציה + אפקטים
    setTimeout(() => {
      setBallEasing('cubic-bezier(0.4,0.0,1.0,1.0)')
      setBallTransDur('0.4s')
      setBallPos({ x: tx, y: 38.5 })
      launchFireworks()
      setGoalFlash(true)
      setTimeout(() => setGoalFlash(false), 3000)
    }, 630)

    // קפיצה ראשונה — חזרה ל-easing רגיל
    setTimeout(() => {
      setBallEasing('cubic-bezier(0.0,0.0,0.4,1.0)')
      setBallTransDur('0.1s')
      setBallPos({ x: tx, y: 35.5 })
      setBallSize('1.75vw')
    }, 840)

    // ירידה חזרה ל-38.5%
    setTimeout(() => {
      setBallTransDur('0.1s')
      setBallPos({ x: tx, y: 38.5 })
    }, 950)

    // קפיצה שנייה — עלייה ל-37%
    setTimeout(() => {
      setBallTransDur('0.08s')
      setBallPos({ x: tx, y: 37 })
      setBallSize('1.45vw')
    }, 1060)

    // עצירה סופית ב-38.5%
    setTimeout(() => {
      setBallTransDur('0.08s')
      setBallPos({ x: tx, y: 38.5 })
      setBallSize('1.5vw')
    }, 1150)

    // המתן 800ms → המשך
    setTimeout(() => advanceAfterKick(true), 1950)
  }, [advanceAfterKick, goalkeeperJump])

  const handleMiss = useCallback(() => {
    const t = pick(MISS_TARGETS)

    goalkeeperJump(t.x)

    // תנועה ישירה ליעד בקהל
    setTimeout(() => {
      setBallTransDur('0.9s')
      setBallEasing('cubic-bezier(0.0,0.0,0.4,1.0)')
      setBallPos({ x: t.x, y: t.y })
      setBallSize(`${calcSize(t.y).toFixed(2)}vw`)
    }, 16)

    // הכדור נשאר בקהל — המשך לסבב הבא
    setTimeout(() => advanceAfterKick(false), 1400)
  }, [advanceAfterKick, goalkeeperJump])

  // ── kick — נקודת הכניסה ───────────────────────────────────────────────────
  const kick = useCallback((isCorrect: boolean) => {
    if (isKicking) return
    setIsKicking(true)
    pausedRef.current = true
    // 1. כרטיסייה נעלמת
    setIsCardVisible(false)
    // 2. המתן 500ms → בעיטה
    setTimeout(() => {
      playKick()
      isCorrect ? handleGoal() : handleMiss()
    }, 500)
  }, [isKicking, handleGoal, handleMiss])

  const kickRef = useRef(kick)
  kickRef.current = kick

  // ── checkAnswer ────────────────────────────────────────────────────────────
  const checkAnswer = useCallback((transcript: string): boolean => {
    const normalized = transcript.trim().replace(/[\u0591-\u05C7]/g, '')
    const base = currentLetterRef.current.base
    const finalForm = FINAL_LETTERS[base] || null
    return normalized.endsWith(base) || (finalForm ? normalized.endsWith(finalForm) : false)
  }, [])

  // ── handleCorrectAnswer / handleWrongAnswer ────────────────────────────────
  const handleCorrectAnswer = useCallback(() => {
    confirmingRef.current = true
    try { recRef.current?.abort() } catch {}
    listeningRef.current = false
    setMicStatus('idle')
    playCorrect()
    kickRef.current(true)
  }, [])

  const handleWrongAnswer = useCallback((spoken = '') => {
    console.log('❌ שגוי:', spoken, '| צפוי:', currentLetterRef.current.base)
    kickRef.current(false)
  }, [])

  // refs ל-handlers — כדי ש-SpeechRecognition תמיד יקרא לגרסה העדכנית
  const handleCorrectRef = useRef(handleCorrectAnswer)
  const handleWrongRef   = useRef(handleWrongAnswer)
  handleCorrectRef.current = handleCorrectAnswer
  handleWrongRef.current   = handleWrongAnswer

  // ── startListening ─────────────────────────────────────────────────────────
  const startListeningRef = useRef<() => void>(() => {})
  const startListening = useCallback(() => {
    if (listeningRef.current || pausedRef.current) return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.lang = 'he-IL'
    rec.continuous = false
    rec.interimResults = true
    rec.maxAlternatives = 10
    recRef.current = rec
    rec.onstart = () => { listeningRef.current = true; setMicStatus('listening') }
    rec.onresult = (e: any) => {
      const alts: string[] = []
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i]
        for (let j = 0; j < r.length; j++) alts.push(r[j].transcript)
      }
      const ok = alts.some(a => checkAnswer(a))
      if (ok) {
        pendingAnswerRef.current = { isCorrect: true, transcript: alts.find(a => checkAnswer(a)) || alts[0] }
        listeningRef.current = false
        handleCorrectRef.current()
      } else if (e.results[e.results.length - 1].isFinal) {
        pendingAnswerRef.current = { isCorrect: false, transcript: alts[0] || '' }
        handleWrongRef.current(alts[0] || '')
      }
    }
    rec.onerror = (e: any) => {
      listeningRef.current = false; setMicStatus('idle')
      if (e.error === 'not-allowed') return
      if (!pausedRef.current && !confirmingRef.current)
        setTimeout(() => startListeningRef.current(), 400)
    }
    rec.onend = () => {
      listeningRef.current = false; setMicStatus('idle')
      if (!pausedRef.current && !confirmingRef.current)
        setTimeout(() => startListeningRef.current(), 200)
    }
    try { rec.start() } catch {}
  }, [checkAnswer])
  startListeningRef.current = startListening

  // ── SDK + התחלת האזנה ─────────────────────────────────────────────────────
  useEffect(() => {
    const script = document.createElement('script')
    script.src = '/sdk/mathplatform-sdk-v1.js'
    script.onload = () => {
      window.MathPlatformSDK?.emit('GAME_STARTED', { gameId: GAME_ID })
      getNextLetter([])
      setIsCardVisible(true)
      setTimeout(() => startListeningRef.current(), 300)
    }
    document.head.appendChild(script)
    if ((window as any).MathPlatformSDK) {
      getNextLetter([])
      setIsCardVisible(true)
      setTimeout(() => startListeningRef.current(), 300)
    }
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Secular+One&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .shva-root {
          position: relative;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          font-family: 'Secular One', sans-serif;
          direction: rtl;
          background-image: url(/art/games/bg-language-shva-001.jpg);
          background-size: cover;
          background-position: center;
        }

        /* ── פאנלי ניקוד ── */
        .score-panel {
          position: fixed;
          z-index: 20;
          display: flex;
          align-items: center;
          gap: 16px;
          background: rgba(0,0,0,0.6);
          border-radius: 12px;
          padding: 16px 32px;
        }
        .score-panel.left  { left: 16px; top: 16px; }
        .score-panel.right { right: 80px; top: 16px; }
        .score-emoji { font-size: 52px; line-height: 1; }
        .score-num {
          font-size: 40px;
          font-weight: 700;
          color: #fff;
        }

        /* ── אזור עיגולים ── */
        .goal-area {
          position: absolute;
          top: 6%;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
          width: 70vw;
          max-width: 380px;
        }

        /* ── שוער ── */
        .goalkeeper-wrap {
          position: absolute;
          z-index: 6;
          transform-origin: center bottom;
          width: 8%;
          height: 16%;
        }

        /* 10 עיגולים */
        .circles-row {
          display: flex;
          gap: 6px;
          justify-content: center;
          margin-bottom: 8px;
        }
        .circle {
          width: clamp(20px, 5vw, 30px);
          height: clamp(20px, 5vw, 30px);
          border-radius: 50%;
          border: 2.5px solid rgba(255,255,255,0.7);
          background: transparent;
          transition: background 0.3s, border-color 0.3s;
        }
        .circle.goal {
          background: #22c55e;
          border-color: #22c55e;
          box-shadow: 0 0 8px #22c55e88;
        }
        .circle.miss {
          background: #ef4444;
          border-color: #ef4444;
          box-shadow: 0 0 8px #ef444488;
        }

        /* שוער */
        .goalkeeper {
          font-size: clamp(52px, 14vw, 96px);
          line-height: 1;
          display: block;
          transform: scaleX(0.55);
          filter: drop-shadow(0 4px 12px rgba(0,0,0,0.5));
          user-select: none;
        }

        /* ── כרטיסיית האות ── */
        .letter-card {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 10;
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.3);
          padding: 29px 80px 58px 80px;
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .letter-display {
          font-size: 15vw;
          line-height: 1;
          color: #fff;
          text-shadow:
            0 0 30px rgba(96,165,250,0.8),
            0 4px 20px rgba(0,0,0,0.7);
          user-select: none;
        }

        /* כפתורי פינה בכרטיסייה */
        .btn-corner {
          position: absolute;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.15s;
          color: #fff;
        }
        .btn-corner:hover  { transform: scale(1.12); }
        .btn-corner:active { transform: scale(0.93); }
        .btn-approve {
          top: 10px;
          right: 10px;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          box-shadow: 0 4px 12px rgba(34,197,94,0.5);
        }
        .btn-sound {
          top: 10px;
          left: 10px;
          background: rgba(96,165,250,0.25);
          border: 1.5px solid rgba(96,165,250,0.5) !important;
          color: #93c5fd;
        }

        /* ── כדור ── */
        .ball {
          position: absolute;
          left: 50%;
          top: 88%;
          font-size: 8vw;
          line-height: 1;
          transform: translate(-50%, -50%);
          user-select: none;
          filter: drop-shadow(0 6px 16px rgba(0,0,0,0.6));
          z-index: 8;
        }

        /* אנימציות בעיטה — target מגיע מ-CSS variables */
        @keyframes kickGoal {
          0%   { left: 50%; top: 88%; font-size: 8vw; }
          62%  { left: var(--tx); top: var(--ty); font-size: 3.2vw; }
          74%  { top: calc(var(--ty) + 3%); font-size: 3.5vw; }
          86%  { top: calc(var(--ty) - 1%); font-size: 2.9vw; }
          100% { left: var(--tx); top: var(--ty); font-size: 3.0vw; }
        }
        .ball.kick-goal {
          animation: kickGoal 1.9s cubic-bezier(0.15, 0, 0.75, 1) forwards;
        }

        @keyframes kickMiss {
          0%   { left: 50%; top: 88%; font-size: 8vw; opacity: 1; }
          100% { left: var(--tx); top: var(--ty); font-size: 0.5vw; opacity: 0; }
        }
        .ball.kick-miss {
          animation: kickMiss 1.0s cubic-bezier(0.4, 0, 1, 1) forwards;
        }

        /* נקודת העונשין */
        .penalty-spot {
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: rgba(255,255,255,0.5);
          transform: translate(-50%, -50%);
          left: 50%;
          top: 82%;
        }

        /* מיקרופון */
        .mic-ind {
          position: fixed;
          bottom: 20px;
          left: 20px;
          z-index: 50;
          width: 54px;
          height: 54px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          transition: all 0.3s;
        }
        .mic-on {
          background: linear-gradient(135deg, #ef4444, #f97316);
          box-shadow: 0 6px 20px rgba(239,68,68,0.5);
        }
        .mic-off {
          background: rgba(255,255,255,0.07);
          border: 2px solid rgba(255,255,255,0.12);
        }
        @keyframes pulse-ring {
          0%   { transform: scale(1); opacity: 0.6 }
          100% { transform: scale(1.8); opacity: 0 }
        }
        .mic-on::before {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 2px solid #ef4444;
          animation: pulse-ring 1.1s ease-out infinite;
        }

        /* פרטיקלים */
        .particle {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          pointer-events: none;
          transform: translate(-50%, -50%);
        }
      `}</style>

      <div className="shva-root">
        <GameBackButton />

        {/* ── פאנל שמאל — החמצות ── */}
        <div className="score-panel left">
          <span className="score-emoji">🐉</span>
          <span className="score-num">{misses}</span>
        </div>

        {/* ── פאנל ימין — שערים ── */}
        <div
          className="score-panel right"
          style={goalFlash ? {
            transform: 'scale(1.4)',
            filter: 'drop-shadow(0 0 12px gold)',
            transition: 'transform 0.15s ease-out',
          } : {
            transform: 'scale(1)',
            transition: 'transform 0.3s ease-in',
          }}
        >
          <span className="score-emoji">😺</span>
          <span className="score-num">{goals}</span>
        </div>

        {/* ── אזור עיגולים ── */}
        <div className="goal-area">
          <div className="circles-row">
            {circles.map((state, i) => (
              <div key={i} className={`circle ${state !== 'empty' ? state : ''}`} />
            ))}
          </div>
        </div>

        {/* ── שוער ── */}
        <div
          className="goalkeeper-wrap"
          style={{
            left: `${gkPos.x}%`,
            top: `${gkPos.y}%`,
            transform: `translateX(-50%) rotate(${gkRot}deg)`,
            transition: `left ${gkTransDur} ${gkEasing}, top ${gkTransDur} ${gkEasing}, transform ${gkTransDur} ${gkEasing}`,
          }}
        >
          <img
            src={goalkeeperImg.src}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          />
        </div>

        {/* ── נקודת העונשין ── */}
        <div className="penalty-spot" />

        {/* ── overlay — כהייה כשכרטיסייה מוצגת ── */}
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.3)',
          transition: 'opacity 0.3s',
          opacity: isCardVisible ? 1 : 0,
          pointerEvents: 'none',
          zIndex: 5,
        }} />

        {/* ── כדור ── */}
        <div
          className="ball"
          style={{
            left: `${ballPos.x}%`,
            top: `${ballPos.y}%`,
            fontSize: ballSize,
            transition: `left ${ballTransDur} ${ballEasing}, top ${ballTransDur} ${ballEasing}, font-size ${ballTransDur} ${ballEasing}`,
          }}
        >⚽</div>

        {/* ── כרטיסיית האות ── */}
        {isCardVisible && (
          <div className="letter-card" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', position: 'absolute', zIndex: 10 }}>
            <button
              className="btn-corner btn-sound"
              onClick={() => speakLetter(currentLetter.char)}
            >🔊</button>
            <span className="letter-display">{currentLetter.char}</span>
            <button
              className="btn-corner btn-approve"
              onClick={() => handleCorrectRef.current()}
            >✓</button>
          </div>
        )}

        {/* ── פרטיקלים ── */}
        {particles.map(p => (
          <div
            key={p.id}
            className="particle"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              background: p.color,
              opacity: p.opacity,
            }}
          />
        ))}

        {/* ── מיקרופון ── */}
        <div className={`mic-ind ${micStatus === 'listening' ? 'mic-on' : 'mic-off'}`}>🎤</div>

        {/* ── מסך סיום ── */}
        {gameOver && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            fontFamily: "'Secular One', sans-serif",
            direction: 'rtl',
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '8px' }}>
              {stars >= 1 ? '⭐' : '☆'}
              {stars >= 2 ? '⭐' : '☆'}
              {stars >= 3 ? '⭐' : '☆'}
            </div>
            <div style={{ color: 'white', fontSize: '2rem', margin: '16px 0' }}>
              {goals} שערים מתוך 10 🎉
            </div>
            <button
              onClick={() => router.back()}
              style={{
                marginTop: '24px',
                padding: '14px 48px',
                fontSize: '1.4rem',
                fontFamily: "'Secular One', sans-serif",
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: '#fff',
                border: 'none',
                borderRadius: '16px',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(34,197,94,0.5)',
              }}
            >המשך</button>
          </div>
        )}
      </div>
    </>
  )
}
