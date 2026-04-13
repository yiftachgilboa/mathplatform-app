'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import GameBackButton from '@/components/GameBackButton'
import zombieImg from './assets/zombie-walk.png'
import hintAlef from './assets/hints/א.png'
import hintBet from './assets/hints/ב.png'
import hintGimel from './assets/hints/ג.png'
import hintDalet from './assets/hints/ד.png'
import hintHe from './assets/hints/ה.png'
import hintVav from './assets/hints/ו.png'
import hintZayin from './assets/hints/ז.png'
import hintHet from './assets/hints/ח.png'
import hintTet from './assets/hints/ט.png'

const GAME_ID = 'language-aleph-bet-001'

const ALEPH_BET: { letter: string; name: string; color: string }[] = [
  { letter: 'א', name: 'אלף',   color: '#a78bfa' },
  { letter: 'ב', name: 'בית',   color: '#818cf8' },
  { letter: 'ג', name: 'גימל',  color: '#38bdf8' },
  { letter: 'ד', name: 'דלת',   color: '#34d399' },
  { letter: 'ה', name: 'הא',    color: '#fbbf24' },
  { letter: 'ו', name: 'וו',    color: '#f87171' },
  { letter: 'ז', name: 'זין',   color: '#e879f9' },
  { letter: 'ח', name: 'חית',   color: '#60a5fa' },
  { letter: 'ט', name: 'טית',   color: '#4ade80' },
  { letter: 'י', name: 'יוד',   color: '#facc15' },
  { letter: 'כ', name: 'כף',    color: '#fb923c' },
  { letter: 'ל', name: 'למד',   color: '#c084fc' },
  { letter: 'מ', name: 'מם',    color: '#67e8f9' },
  { letter: 'נ', name: 'נון',   color: '#86efac' },
  { letter: 'ס', name: 'סמך',   color: '#fde68a' },
  { letter: 'ע', name: 'עין',   color: '#fca5a5' },
  { letter: 'פ', name: 'פא',    color: '#d8b4fe' },
  { letter: 'צ', name: 'צדיק',  color: '#7dd3fc' },
  { letter: 'ק', name: 'קוף',   color: '#6ee7b7' },
  { letter: 'ר', name: 'ריש',   color: '#fcd34d' },
  { letter: 'ש', name: 'שין',   color: '#fdba74' },
  { letter: 'ת', name: 'תו',    color: '#f0abfc' },
]

const HINT_IMAGES: Record<string, string> = {
  'א': hintAlef.src,
  'ב': hintBet.src,
  'ג': hintGimel.src,
  'ד': hintDalet.src,
  'ה': hintHe.src,
  'ו': hintVav.src,
  'ז': hintZayin.src,
  'ח': hintHet.src,
  'ט': hintTet.src,
}

const HINT_COLORS = [
  '#e879f9','#a78bfa','#38bdf8','#34d399','#fbbf24',
  '#f87171','#60a5fa','#4ade80','#facc15','#fb923c',
]

const ZOMBIE_FRAMES = 8
const ZOMBIE_FRAME_W = 86
const ZOMBIE_FRAME_H = 391
const ZOMBIE_SHEET_W = 691
const ZOMBIE_DISPLAY_H = 380

function isCorrectAnswer(input: string, name: string, letter: string): boolean {
  const normalize = (s: string) =>
    s.trim()
     .replace(/[\u05F3\u05F4'''`״"]/g, '')
     .replace(/\s+/g, ' ')
     .trim()

  const cleaned = normalize(input)
  const cleanName = normalize(name)

  // הסר תחיליות נפוצות
  const withoutPrefix = cleaned
    .replace(/^ה?אות\s*/, '')
    .replace(/^האות\s*/, '')
    .trim()

  // התאמה מדויקת
  if (
    withoutPrefix === cleanName ||
    cleaned === cleanName ||
    withoutPrefix === letter ||
    cleaned === letter
  ) return true

  // התאמה חלקית — השם מוכל בקלט
  if (withoutPrefix.length >= 2 && cleanName.startsWith(withoutPrefix)) return true
  if (withoutPrefix.length >= 2 && withoutPrefix.startsWith(cleanName)) return true

  // מילון דמיון פונטי לאותיות בעייתיות
  const phonetic: Record<string, string[]> = {
    'אלף':  ['אל','אלפ','אלף','אות א'],
    'בית':  ['בי','בית','בת','בייט'],
    'גימל': ['גימ','גמל','גים','גימל'],
    'דלת':  ['דל','דלת','דלט'],
    'הא':   ['הא','היי','הי','הה','הע'],
    'וו':   ['ו','וו','וואו','וי'],
    'זין':  ['זי','זין','זן'],
    'חית':  ['חי','חית','חת','חיית'],
    'טית':  ['טי','טית','טת'],
    'יוד':  ['יו','יוד','יד','יוט'],
    'כף':   ['כ','כף','כפ','קף'],
    'למד':  ['ל','למד','למ','למד'],
    'מם':   ['מ','מם','מן'],
    'נון':  ['נ','נון','נן','נו'],
    'סמך':  ['סמ','סמך','סמק'],
    'עין':  ['עי','עין','ען','אין'],
    'פא':   ['פ','פא','פה','פע'],
    'צדיק': ['צ','צדי','צדיק','צדק'],
    'קוף':  ['ק','קוף','קף','קופ'],
    'ריש':  ['ר','ריש','רש','ריס'],
    'שין':  ['ש','שי','שין','שן'],
    'תו':   ['ת','תו','טו','תא','תף','טף','תפ','טפ'],
  }

  const variants = phonetic[cleanName] || []
  return variants.some(v => withoutPrefix === v || cleaned === v)
}

type GamePhase = 'playing' | 'feedback' | 'roundOver'

function buildRound(mastered: string[], wrongLetters: string[], all: typeof ALEPH_BET): typeof ALEPH_BET {
  const round: typeof ALEPH_BET = []
  const used = new Set<string>()

  const priority = [
    ...wrongLetters.filter(l => !mastered.includes(l)),
    ...all.filter(a => !mastered.includes(a.letter) && !wrongLetters.includes(a.letter)).map(a => a.letter),
  ].slice(0, 3)

  priority.forEach(l => {
    const e = all.find(a => a.letter === l)
    if (e && !used.has(l)) { round.push(e); used.add(l) }
  })

  const shuffledMastered = [...mastered].sort(() => Math.random() - 0.5)
  for (const l of shuffledMastered) {
    if (round.length >= 10) break
    const e = all.find(a => a.letter === l)
    if (e && !used.has(l)) { round.push(e); used.add(l) }
  }

  for (const a of all) {
    if (round.length >= 10) break
    if (!used.has(a.letter)) { round.push(a); used.add(a.letter) }
  }

  return round.sort(() => Math.random() - 0.5).slice(0, 10)
}

function playSuccessTones(ctx: AudioContext) {
  const tones = [523, 659, 784] // C5, E5, G5 — עולים
  tones.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.value = freq
    osc.type = 'sine'
    const t = ctx.currentTime + i * 0.15
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.3, t + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
    osc.start(t); osc.stop(t + 0.3)
  })
}

function playErrorTones(ctx: AudioContext) {
  const tones = [392, 330, 262] // G4, E4, C4 — יורדים
  tones.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.value = freq
    osc.type = 'sine'
    const t = ctx.currentTime + i * 0.15
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.3, t + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
    osc.start(t); osc.stop(t + 0.3)
  })
}

function speakHebrew(text: string) {
  if (typeof window === 'undefined') return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'he-IL'; u.rate = 0.85
  window.speechSynthesis.speak(u)
}

export default function GameClient() {
  const router = useRouter()
  const audioCtxRef = useRef<AudioContext | null>(null)
  const recognitionRef = useRef<any>(null)
  const phaseRef = useRef<GamePhase>('playing')
  const currentIdxRef = useRef(0)
  const roundRef = useRef<typeof ALEPH_BET>([])
  const answersRef = useRef<boolean[]>([])

  const [mastered, setMastered] = useState<string[]>([])
  const [wrongLetters, setWrongLetters] = useState<string[]>([])
  const [round, setRound] = useState<typeof ALEPH_BET>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<boolean[]>([])
  const [phase, setPhase] = useState<GamePhase>('playing')
  const [lastCorrect, setLastCorrect] = useState(false)
  const [voiceInput, setVoiceInput] = useState('')
  const [micActive, setMicActive] = useState(false)
  const [hintActive, setHintActive] = useState(false)
  const [hintColorIdx, setHintColorIdx] = useState(0)
  const attemptCountRef = useRef(0)
  const [manualLetter, setManualLetter] = useState<string | null>(null)
  const manualLetterRef = useRef<string | null>(null)
  const [letterShake, setLetterShake] = useState(false)
  const [letterSuccess, setLetterSuccess] = useState(false)
  const [streaks, setStreaks] = useState<Record<string, number>>({})
  const streaksRef = useRef<Record<string, number>>({})
  const zombieCanvasRef = useRef<HTMLCanvasElement>(null)
  const zombiePoolRef = useRef<Array<{
    x: number; y: number; speed: number; active: boolean; frame: number; frameTimer: number
  }>>([])
  const zombieRafRef = useRef<number | undefined>(undefined)
  const spawnTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const zombieSpriteRef = useRef<HTMLImageElement | null>(null)
  const particleCanvasRef = useRef<HTMLCanvasElement>(null)
  const particleRafRef = useRef<number | undefined>(undefined)

  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { currentIdxRef.current = currentIdx }, [currentIdx])
  useEffect(() => { roundRef.current = round }, [round])

  // load data
  useEffect(() => {
    const m = JSON.parse(localStorage.getItem('alephbet_mastered') || '[]')
    const w = JSON.parse(localStorage.getItem('alephbet_wrong') || '[]')
    const s = JSON.parse(localStorage.getItem('alephbet_streaks') || '{}')
    setMastered(m); setWrongLetters(w)
    setStreaks(s); streaksRef.current = s
    const r = buildRound(m, w, ALEPH_BET)
    setRound(r); roundRef.current = r
  }, [])

  // SDK
  useEffect(() => {
    const s = document.createElement('script')
    s.src = '/sdk/mathplatform-sdk-v1.js'
    s.onload = () => window.MathPlatformSDK?.emit('GAME_STARTED', { gameId: GAME_ID })
    document.head.appendChild(s)
    return () => { s.remove() }
  }, [])

  // טעינת sprite פעם אחת
  useEffect(() => {
    const img = new Image()
    img.src = zombieImg.src
    img.onload = () => { zombieSpriteRef.current = img }
  }, [])

  // zombie pool + canvas draw loop
  useEffect(() => {
    if (phase !== 'playing' || round.length === 0) return

    const FRAME_W = ZOMBIE_FRAME_W
    const FRAME_H = ZOMBIE_FRAME_H
    const DISPLAY_H = ZOMBIE_DISPLAY_H
    const DISPLAY_W = Math.round(FRAME_W * (DISPLAY_H / FRAME_H))
    const TARGET_Y_PERCENT = 0.85

    // אתחל pool רק אם ריק לגמרי — אל תאפס זומבים פעילים
    if (zombiePoolRef.current.length === 0) {
      zombiePoolRef.current = Array.from({ length: 1 }, () => ({
        x: -15, y: 0, speed: 0, active: false, frame: 0, frameTimer: 0,
      }))
    }

    const spawnZombie = () => {
      const slot = zombiePoolRef.current.find(z => !z.active)
      if (!slot) return
      slot.active = true
      // מרחק אקראי גדול מחוץ למסך — כל זומבי מתחיל במקום שונה
      slot.x = -3
      slot.y = TARGET_Y_PERCENT * 100
      slot.speed = 0.018 + Math.random() * 0.006
      slot.frame = 0
      slot.frameTimer = 0
    }

    spawnZombie()



    let lastTs = 0
    const draw = (ts: number) => {
      if (phaseRef.current === 'roundOver') {
        if (zombieRafRef.current) cancelAnimationFrame(zombieRafRef.current)
        return
      }
      const dt = Math.min(ts - lastTs, 50)
      lastTs = ts

      const canvas = zombieCanvasRef.current
      if (!canvas) { zombieRafRef.current = requestAnimationFrame(draw); return }
      const ctx = canvas.getContext('2d')
      if (!ctx) { zombieRafRef.current = requestAnimationFrame(draw); return }

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const sprite = zombieSpriteRef.current
      zombiePoolRef.current.forEach(z => {
        if (!z.active) return
        z.x += z.speed * (dt / 16)
        if (z.x > 90) { z.active = false; return }
        z.frameTimer += dt
        if (z.frameTimer > 120) { z.frame = (z.frame + 1) % ZOMBIE_FRAMES; z.frameTimer = 0 }
        if (!sprite) return
        const px = (z.x / 100) * canvas.width
        const py = (z.y / 100) * canvas.height - DISPLAY_H
        ctx.drawImage(sprite, z.frame * FRAME_W, 0, FRAME_W, FRAME_H, px, py, DISPLAY_W, DISPLAY_H)
      })

      zombieRafRef.current = requestAnimationFrame(draw)
    }
    zombieRafRef.current = requestAnimationFrame(draw)

    return () => {
      if (zombieRafRef.current) cancelAnimationFrame(zombieRafRef.current)
      if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current)
    }
  }, [currentIdx, round.length])

  const explodeZombies = useCallback(() => {
    const canvas = zombieCanvasRef.current
    if (!canvas) return

    // מצא זומבי ותיק ביותר
    const pool = zombiePoolRef.current
    let oldest: typeof pool[0] | null = null
    let oldestIdx = -1
    for (let i = 0; i < pool.length; i++) {
      const z = pool[i]
      if (!z.active) continue
      if (!oldest || z.x > oldest.x) { oldest = z; oldestIdx = i }
    }
    if (!oldest || oldestIdx < 0) return

    // מיקום חד-קרן — צד ימין, גובה 40% מהמסך
    const hornX = canvas.width * 0.78
    const hornY = canvas.height * 0.22

    // מיקום הזומבי היעד
    const targetX = (oldest.x / 100) * canvas.width
    const targetY = (oldest.y / 100) * canvas.height - ZOMBIE_DISPLAY_H / 2

    const targetIdx = oldestIdx

    const pCanvas = particleCanvasRef.current
    if (!pCanvas) return
    const ctx = pCanvas.getContext('2d')
    if (!ctx) return

    // מצב כדור האור
    let ballX = hornX
    let ballY = hornY
    const dx = targetX - hornX
    const dy = targetY - hornY
    const dist = Math.sqrt(dx * dx + dy * dy)
    const speed = dist / 42
    const vx = (dx / dist) * speed
    const vy = (dy / dist) * speed
    let hit = false

    type P = { x: number; y: number; vx: number; vy: number; life: number }
    const pts: P[] = []

    if (particleRafRef.current) cancelAnimationFrame(particleRafRef.current)

    const animate = () => {
      ctx.clearRect(0, 0, pCanvas.width, pCanvas.height)

      if (!hit) {
        // תנועה איטית + easing — מאיץ בהתחלה ומאט בסוף
        ballX += vx * 0.6
        ballY += vy * 0.6

        // גודל גדל ככל שמתקרב לזומבי
        const ddx0 = ballX - hornX
        const ddy0 = ballY - hornY
        const traveled = Math.sqrt(ddx0 * ddx0 + ddy0 * ddy0)
        const progress = Math.min(traveled / dist, 1)
        const radius = 5 + progress * 14

        // זוהר מטושטש — שכבות
        ctx.globalAlpha = 0.15
        ctx.fillStyle = '#ffffff'
        ctx.shadowColor = '#c4b5fd'
        ctx.shadowBlur = 40
        ctx.beginPath()
        ctx.arc(ballX, ballY, radius * 2.5, 0, Math.PI * 2)
        ctx.fill()

        ctx.globalAlpha = 0.3
        ctx.shadowBlur = 24
        ctx.beginPath()
        ctx.arc(ballX, ballY, radius * 1.6, 0, Math.PI * 2)
        ctx.fill()

        ctx.globalAlpha = 0.9
        ctx.fillStyle = '#ffffff'
        ctx.shadowColor = '#ffffff'
        ctx.shadowBlur = 12
        ctx.beginPath()
        ctx.arc(ballX, ballY, radius, 0, Math.PI * 2)
        ctx.fill()

        ctx.shadowBlur = 0
        ctx.globalAlpha = 1

        // זנב — שביל של נקודות קטנות
        for (let t = 1; t <= 5; t++) {
          const tx = ballX - vx * 0.6 * t
          const ty = ballY - vy * 0.6 * t
          ctx.globalAlpha = 0.3 - t * 0.05
          ctx.fillStyle = '#e9d5ff'
          ctx.beginPath()
          ctx.arc(tx, ty, radius * 0.4, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1

        // פגיעה
        const ddx = ballX - targetX
        const ddy = ballY - targetY
        if (Math.sqrt(ddx * ddx + ddy * ddy) < radius + 15) {
          hit = true
          pool[targetIdx].active = false
          for (let i = 0; i < 32; i++) {
            const a = (Math.PI * 2 * i) / 32
            const s = 0.8 + Math.random() * 2.5
            pts.push({
              x: targetX, y: targetY,
              vx: Math.cos(a) * s,
              vy: Math.sin(a) * s,
              life: 1,
            })
          }
        }
      } else {
        let alive = false
        for (const p of pts) {
          if (p.life <= 0) continue
          p.x += p.vx; p.y += p.vy
          p.vx *= 0.91; p.vy *= 0.91
          p.life -= 0.035
          alive = true
          ctx.globalAlpha = p.life * 0.9
          ctx.fillStyle = '#ffffff'
          ctx.shadowColor = '#ffffff'
          ctx.shadowBlur = 6
          ctx.beginPath()
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.shadowBlur = 0
        ctx.globalAlpha = 1
        if (!alive) {
          ctx.clearRect(0, 0, pCanvas.width, pCanvas.height)
          return
        }
      }

      particleRafRef.current = requestAnimationFrame(animate)
    }

    particleRafRef.current = requestAnimationFrame(animate)
  }, [])

  const handleAnswer = useCallback((input: string) => {
    if (phaseRef.current !== 'playing') return
    const idx = currentIdxRef.current
    const cur = manualLetterRef.current
      ? ALEPH_BET.find(a => a.letter === manualLetterRef.current) ?? roundRef.current[idx]
      : roundRef.current[idx]
    if (!cur) return

    const correct = isCorrectAnswer(input, cur.name, cur.letter)

    window.MathPlatformSDK?.emit('ANSWER', {
      correct, questionId: `q-${idx + 1}`, questionType: 'aleph-bet-recognition',
      correctAnswer: cur.name, childAnswer: input.trim(), attemptNumber: 1,
    })

    if (!audioCtxRef.current)
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    if (correct) {
      playSuccessTones(audioCtxRef.current)
      explodeZombies()
      setLetterSuccess(true)
    }

    if (correct) {
      // עדכן רצף
      const newStreaks = { ...streaksRef.current }
      newStreaks[cur.letter] = (newStreaks[cur.letter] || 0) + 1
      streaksRef.current = newStreaks
      setStreaks(newStreaks)
      localStorage.setItem('alephbet_streaks', JSON.stringify(newStreaks))

      // רק אחרי 3 הצלחות ברצף — סמן כנלמד
      if (newStreaks[cur.letter] >= 3) {
        setMastered(prev => {
          const updated = prev.includes(cur.letter) ? prev : [...prev, cur.letter]
          localStorage.setItem('alephbet_mastered', JSON.stringify(updated))
          return updated
        })
      }

      setWrongLetters(prev => {
        const updated = prev.filter(l => l !== cur.letter)
        localStorage.setItem('alephbet_wrong', JSON.stringify(updated))
        return updated
      })
    } else {
      setWrongLetters(prev => { const u = prev.includes(cur.letter) ? prev : [...prev, cur.letter]; localStorage.setItem('alephbet_wrong', JSON.stringify(u)); return u })
    }

    setLastCorrect(correct)
    setAnswers(prev => { const u = [...prev, correct]; answersRef.current = u; return u })
    setPhase('feedback'); phaseRef.current = 'feedback'
    setVoiceInput(''); setHintActive(false)

    setTimeout(() => {
      const nextIdx = idx + 1
      if (nextIdx >= roundRef.current.length) {
        const cc = answersRef.current.filter(Boolean).length
        const tot = roundRef.current.length
        const stars = cc / tot >= 0.9 ? 3 : cc / tot >= 0.6 ? 2 : 1
        window.MathPlatformSDK?.emit('GAME_OVER', { score: Math.round(cc / tot * 100), maxScore: 100, stars, correctAnswers: cc, totalQuestions: tot })
        setPhase('roundOver'); phaseRef.current = 'roundOver'
      } else {
        setCurrentIdx(nextIdx); currentIdxRef.current = nextIdx
        setPhase('playing'); phaseRef.current = 'playing'
        attemptCountRef.current = 0
        setManualLetter(null)
        manualLetterRef.current = null
        setHintActive(false)
        setLetterShake(false)
        setLetterSuccess(false)
      }
    }, 1400)
  }, [explodeZombies])

  // mic helpers
  const stopMic = useCallback(() => {
    if (recognitionRef.current) { try { recognitionRef.current.abort() } catch { } recognitionRef.current = null }
    setMicActive(false)
  }, [])

  const startMic = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR || recognitionRef.current) return

    const rec = new SR()
    rec.lang = 'he-IL'
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 3

    let silenceTimer: ReturnType<typeof setTimeout> | null = null

    const resetSilence = () => {
      if (silenceTimer) clearTimeout(silenceTimer)
      silenceTimer = setTimeout(() => {
        // אחרי 2.5 שניות שקט — נסה לעבד מה שיש
        if (phaseRef.current !== 'playing') return
        if (recognitionRef.current) {
          try { recognitionRef.current.stop() } catch {}
        }
      }, 2500)
    }

    rec.onresult = (e: any) => {
      if (phaseRef.current !== 'playing') return
      resetSilence()

      const results = Array.from(e.results) as any[]

      const getCur = () => manualLetterRef.current
        ? ALEPH_BET.find(a => a.letter === manualLetterRef.current)
          ?? roundRef.current[currentIdxRef.current]
        : roundRef.current[currentIdxRef.current]

      const SOUND_GROUPS: string[][] = [
        ['א','ה','ע'], ['כ','ק'], ['ו','ב'], ['ת','ט'], ['צ','ס','ז'],
      ]
      const getSoundGroup = (letter: string) =>
        SOUND_GROUPS.find(g => g.includes(letter)) ?? [letter]

      // ── תוצאות סופיות ──
      for (const result of results) {
        if (!result.isFinal) continue

        const transcript = 'האות ' + result[0].transcript.trim()
        setVoiceInput(transcript)

        const cur = getCur()
        if (!cur) continue

        // 1. תשובה נכונה
        if (isCorrectAnswer(transcript, cur.name, cur.letter)) {
          if (silenceTimer) clearTimeout(silenceTimer)
          setVoiceInput('')
          handleAnswer(transcript)
          return
        }

        // 2. בדוק אם זיהה אות אחרת מתוך 22 האותיות
        let detectedLetter: typeof ALEPH_BET[0] | null = null
        for (const entry of ALEPH_BET) {
          if (isCorrectAnswer(transcript, entry.name, entry.letter)) {
            detectedLetter = entry
            break
          }
        }

        if (detectedLetter) {
          const sameGroup = getSoundGroup(cur.letter)
          const isWrongLetter =
            detectedLetter.letter !== cur.letter &&
            !sameGroup.includes(detectedLetter.letter)
          if (isWrongLetter) {
            if (!audioCtxRef.current)
              audioCtxRef.current = new (window.AudioContext ||
                (window as any).webkitAudioContext)()
            playErrorTones(audioCtxRef.current)
            setLetterShake(true)
            setTimeout(() => setLetterShake(false), 600)
            setVoiceInput('')
            setWrongLetters(prev => {
              const updated = prev.includes(cur.letter)
                ? prev : [...prev, cur.letter]
              localStorage.setItem('alephbet_wrong', JSON.stringify(updated))
              return updated
            })
            const newStreaks = { ...streaksRef.current }
            newStreaks[cur.letter] = 0
            streaksRef.current = newStreaks
            setStreaks(newStreaks)
            localStorage.setItem('alephbet_streaks', JSON.stringify(newStreaks))
            // הפעל מחדש מיקרופון אחרי טעות
            setTimeout(() => {
              if (phaseRef.current === 'playing') startMic()
            }, 400)
            return
          }
        } else {
          // לא זיהה אף אות — סתם דיבור, נקה וחכה
          setVoiceInput('')
        }

        // 3. יותר מדי מילים ולא אות ספציפית — נקה וחכה
        const wordCount = transcript.split(/\s+/).length
        if (wordCount >= 3) {
          setVoiceInput('')
          return
        }
      }

      // ── interim — תפוס תשובה נכונה מיידית ──
      const lastResult = results[results.length - 1]
      if (!lastResult.isFinal) {
        for (let a = 0; a < lastResult.length; a++) {
          const t = 'האות ' + lastResult[a].transcript.trim()
          setVoiceInput(t)
          const cur = getCur()
          if (cur && isCorrectAnswer(t, cur.name, cur.letter)) {
            if (silenceTimer) clearTimeout(silenceTimer)
            setVoiceInput('')
            handleAnswer(t)
            return
          }
        }
      }
    }

    rec.onerror = (e: any) => {
      if (e.error === 'no-speech') return  // התעלם — זה נורמלי
      recognitionRef.current = null
      setMicActive(false)
    }

    rec.onend = () => {
      if (silenceTimer) clearTimeout(silenceTimer)
      recognitionRef.current = null
      setMicActive(false)
      if (phaseRef.current === 'playing') {
        setTimeout(() => startMic(), 300)
      }
    }

    try {
      rec.start()
      recognitionRef.current = rec
      setMicActive(true)

      // חימום — utterance שקטה כדי ש-API יהיה מוכן מיידית
      setTimeout(() => {
        const warmup = new SpeechSynthesisUtterance(' ')
        warmup.volume = 0
        warmup.lang = 'he-IL'
        window.speechSynthesis.speak(warmup)
      }, 100)
    } catch {}
  }, [handleAnswer])

  // auto-start mic when playing
  useEffect(() => {
    if (phase === 'playing' && round.length > 0) {
      setTimeout(() => startMic(), 50)
    } else {
      stopMic()
    }
  }, [phase, round.length]) // eslint-disable-line

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phaseRef.current !== 'playing') return
      const found = ALEPH_BET.find(a => a.letter === e.key)
      if (found) {
        setManualLetter(found.letter)
        manualLetterRef.current = found.letter
        setHintActive(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [phase])

  const handleHint = () => {
    setHintActive(prev => !prev)
  }

  const startNewRound = () => {
    stopMic()
    const r = buildRound(mastered, wrongLetters, ALEPH_BET)
    setRound(r); roundRef.current = r
    setCurrentIdx(0); currentIdxRef.current = 0
    setAnswers([]); answersRef.current = []
    setPhase('playing'); phaseRef.current = 'playing'
    zombiePoolRef.current.forEach(z => { z.active = false })
    setHintActive(false); setVoiceInput('')
  }

  const autoLetter = round[currentIdx]
  const current = manualLetter
    ? ALEPH_BET.find(a => a.letter === manualLetter) ?? autoLetter
    : autoLetter
  const correctCount = answers.filter(Boolean).length

  // — Round Over —
  if (phase === 'roundOver') {
    const tot = round.length
    const stars = correctCount / tot >= 0.9 ? 3 : correctCount / tot >= 0.6 ? 2 : 1
    return (
      <div style={{ minHeight: '100dvh', background: 'linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: '"Nunito", "Varela Round", var(--font-secular, sans-serif)', direction: 'rtl', gap: 24, padding: 24 }}>
        <div style={{ fontSize: 64 }}>{stars === 3 ? '⭐⭐⭐' : stars === 2 ? '⭐⭐' : '⭐'}</div>
        <div style={{ fontSize: 32, color: '#e9d5ff', fontWeight: 700 }}>{correctCount}/{tot} נכון!</div>
        <div style={{ fontSize: 18, color: '#c4b5fd' }}>{stars === 3 ? 'מעולה! כל הכבוד 🎉' : stars === 2 ? 'יפה מאוד! עוד קצת לשכלול!' : 'נסו שוב, אתם יכולים!'}</div>
        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: '12px 24px', color: '#e9d5ff', fontSize: 15, textAlign: 'center' }}>
          שלטת ב-{mastered.length} מתוך {ALEPH_BET.length} האותיות
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
            {ALEPH_BET.map(a => (
              <span key={a.letter} style={{ width: 30, height: 30, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, background: mastered.includes(a.letter) ? '#4ade80' : 'rgba(255,255,255,0.15)', color: mastered.includes(a.letter) ? '#14532d' : '#e9d5ff' }}>{a.letter}</span>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={startNewRound} style={btnStyle('#7c3aed', '#fff')}>סיבוב נוסף 🔄</button>
          <button onClick={() => router.back()} style={btnStyle('rgba(255,255,255,0.15)', '#e9d5ff')}>חזרה</button>
        </div>
      </div>
    )
  }

  // — Main Game —
  return (
    <div style={{ minHeight: '100dvh', background: 'url(/art/games/bg-aleph-bet.jpg) center/cover no-repeat', fontFamily: '"Nunito", "Varela Round", var(--font-secular, sans-serif)', direction: 'rtl', overflow: 'hidden', position: 'relative', userSelect: 'none' }}>
      <GameBackButton />

      {/* Full-screen zombie canvas */}
      <canvas
        ref={zombieCanvasRef}
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}
        width={1200}
        height={800}
      />
      {/* Full-screen particle canvas */}
      <canvas
        ref={particleCanvasRef}
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 6 }}
        width={1200}
        height={800}
      />

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '16px 0 4px', position: 'relative', zIndex: 10 }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: answers[i] === true ? '#4ade80' : answers[i] === false ? '#f87171' : i === currentIdx && phase === 'playing' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)', border: i === currentIdx && phase === 'playing' ? '2px solid #e9d5ff' : '2px solid transparent', transition: 'background 0.4s', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 700 }}>
            {answers[i] === true ? '✓' : answers[i] === false ? '✗' : i + 1}
          </div>
        ))}
      </div>

      {/* Battle arena — height 0, zombies drawn on fixed canvas */}
      <div style={{ position: 'relative', width: '100%', height: '0px', overflow: 'visible' }}>
        {phase === 'feedback' && (
          <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 4, background: lastCorrect ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)' }} />
        )}
      </div>

      {/* Letter card */}
      {current && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '0px 16px', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10 }}>

          <div style={{ position: 'relative' }}>
            {/* ✅ top-left — manual confirm */}
            <button
              onClick={() => handleAnswer(current?.name ?? '')}
              title="אישור ידני"
              style={{ position: 'absolute', top: -14, left: -14, zIndex: 20, width: 40, height: 40, borderRadius: '50%', background: '#4ade80', border: '2px solid rgba(34,197,94,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer' }}
            ><span style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>✓</span></button>

            {/* 🔊 top-right */}
            <button
              onClick={() => speakHebrew(current.name)}
              style={{ position: 'absolute', top: -14, right: -14, zIndex: 20, width: 40, height: 40, borderRadius: '50%', background: 'rgba(234,179,8,0.85)', border: '2px solid rgba(253,224,71,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer', color: '#fff' }}
            >🔊</button>

            {/* 💡 bottom-right */}
            <button
              onClick={handleHint}
              style={{ position: 'absolute', bottom: -14, right: -14, zIndex: 20, width: 40, height: 40, borderRadius: '50%', background: 'rgba(167,139,250,0.85)', border: '2px solid rgba(196,181,253,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer' }}
            ><span style={{ fontSize: 20 }}>💡</span></button>

            {/* ～ bottom-left */}
            {phase === 'playing' && (
              <button
                onClick={() => {
                  const cur = current
                  if (!cur) return
                  setWrongLetters(prev => {
                    const updated = prev.includes(cur.letter) ? prev : [...prev, cur.letter]
                    localStorage.setItem('alephbet_wrong', JSON.stringify(updated))
                    return updated
                  })
                  explodeZombies()
                  handleAnswer(cur.name)
                }}
                style={{
                  position: 'absolute',
                  bottom: -14,
                  left: -14,
                  zIndex: 20,
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'rgba(234,88,12,0.85)',
                  border: '2px solid rgba(251,146,60,0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  cursor: 'pointer',
                  color: '#fff',
                  fontWeight: 700,
                }}
              >～</button>
            )}

            {/* Letter */}
            <div style={{
              width: 'clamp(220px,45vw,320px)',
              height: 'clamp(220px,45vw,320px)',
              borderRadius: 28,
              background: 'rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              animation: letterShake ? 'shake 0.5s ease' : 'none',
              transition: 'border 0.3s ease',
              border: letterSuccess
                ? '3px solid #4ade80'
                : '3px solid rgba(255,255,255,0.25)',
            }}>
              {/* האות — מתעמעמת כשרמז פעיל */}
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 'clamp(165px,42vw,270px)',
                color: letterSuccess ? '#4ade80' : '#fff',
                fontWeight: 700,
                opacity: hintActive ? 0 : 1,
                transition: 'color 0.3s ease, opacity 0.4s ease',
              }}>
                {current.letter}
              </div>

              {/* תמונת רמז — מופיעה בפייד */}
              {HINT_IMAGES[current.letter] && (
                <div style={{
                  position: 'absolute', inset: 0,
                  opacity: hintActive ? 1 : 0,
                  transition: 'opacity 0.4s ease',
                }}>
                  <img
                    src={HINT_IMAGES[current.letter]}
                    alt={current.name}
                    style={{
                      width: '100%', height: '100%',
                      objectFit: 'cover',
                      borderRadius: 25,
                    }}
                  />
                </div>
              )}

              {/* אם אין תמונה — צבע רמז */}
              {!HINT_IMAGES[current.letter] && hintActive && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: HINT_COLORS[hintColorIdx],
                  borderRadius: 25,
                  opacity: 0.85,
                  transition: 'opacity 0.4s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'clamp(165px,42vw,270px)',
                  color: '#1a0533', fontWeight: 700,
                }}>
                  {current.letter}
                </div>
              )}
            </div>
          </div>

          {/* Mic status */}
          <div style={{ fontSize: 13, color: micActive ? '#4ade80' : 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: micActive ? '#4ade80' : 'rgba(255,255,255,0.2)', display: 'inline-block', animation: micActive ? 'pulse 1s infinite' : 'none' }} />
            {micActive ? '🎙 אמור: "האות ___"' : 'מכין מיקרופון...'}
          </div>

          {/* Voice transcript */}
          <div style={{ minHeight: 38, fontSize: 22, color: '#fde68a', padding: '4px 20px', background: voiceInput ? 'rgba(255,255,255,0.06)' : 'transparent', borderRadius: 10, minWidth: 120, textAlign: 'center', transition: 'background 0.2s' }}>
            {voiceInput}
          </div>

          {/* Feedback */}
          {phase === 'feedback' && (
            <div style={{ fontSize: 26, fontWeight: 700, color: lastCorrect ? '#4ade80' : '#f87171', animation: 'popIn 0.3s ease' }}>
              {lastCorrect ? `✨ נכון! ${current.name}` : `✗ ${current.name}`}
            </div>
          )}
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800&display=swap');
        @keyframes popIn { 0%{transform:scale(0.7);opacity:0} 70%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
        @keyframes hornGlow { 0%,100%{filter:drop-shadow(0 0 8px #f0abfc)} 50%{filter:drop-shadow(0 0 28px #f0abfc) drop-shadow(0 0 56px #a78bfa)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes zombieWalk {
          0%   { background-position-x: 0px; }
          100% { background-position-x: -${Math.round(ZOMBIE_SHEET_W * (ZOMBIE_DISPLAY_H / ZOMBIE_FRAME_H))}px; }
        }
        @keyframes hornPulse {
          0%   { opacity: 0; }
          25%  { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes shake {
          0%,100% { transform: translateX(0) }
          20%     { transform: translateX(-8px) }
          40%     { transform: translateX(8px) }
          60%     { transform: translateX(-6px) }
          80%     { transform: translateX(6px) }
        }
      `}</style>
    </div>
  )
}


function btnStyle(bg: string, color: string): React.CSSProperties {
  return { background: bg, color, border: 'none', borderRadius: 12, padding: '12px 24px', fontSize: 17, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }
}
