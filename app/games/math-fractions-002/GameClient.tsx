'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import GameBackButton from '@/components/GameBackButton'

const GAME_ID = 'math-fractions-002'

const FRACTION_NAMES = ['','מלא','חצי','שליש','רבע','חמישית','שישית','שביעית','שמינית','תשיעית','עשירית']

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800&display=swap');
  :root {
    --green-dark: #2d7a4f; --green-mid: #4aad7a; --green-light: #a8e6c3; --green-pale: #e8f8f0;
    --pink-dark: #c2456b; --pink-mid: #e8789a; --pink-light: #f7bdd0; --pink-pale: #fdf0f4;
    --neutral: #f9f5f7; --text-dark: #2b2b3a; --text-mid: #5a5a72; --text-light: #9090a8;
    --white: #ffffff; --radius: 18px; --radius-sm: 10px;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .fractions-wrap {
    font-family: 'Nunito', sans-serif;
    background: url('/art/games/bg-fractions.jpg') center/cover no-repeat;
    min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px;
  }
  .fractions-app {
    width: 100%; max-width: 780px; background: var(--white); border-radius: 32px;
    box-shadow: 0 8px 48px rgba(45,122,79,0.13), 0 2px 8px rgba(194,69,107,0.08);
    padding: 32px 36px 28px; position: relative; overflow: hidden;
  }
  .fractions-app::before {
    content: ''; position: absolute; top: -60px; left: -60px; width: 200px; height: 200px;
    background: radial-gradient(circle, var(--green-pale) 0%, transparent 70%); pointer-events: none;
  }
  .fractions-app::after {
    content: ''; position: absolute; bottom: -60px; right: -60px; width: 200px; height: 200px;
    background: radial-gradient(circle, var(--pink-pale) 0%, transparent 70%); pointer-events: none;
  }
  .app-header { text-align: center; margin-bottom: 22px; }
  .app-title { font-family: 'Fredoka One', cursive; font-size: 30px; color: var(--green-dark); letter-spacing: 1px; }
  .progress-row { display: flex; justify-content: center; gap: 14px; margin-bottom: 26px; }
  .progress-dot {
    width: 36px; height: 36px; border-radius: 50%; border: 2.5px solid var(--green-light);
    background: var(--white); display: flex; align-items: center; justify-content: center;
    font-size: 18px; color: transparent; transition: all 0.4s cubic-bezier(.34,1.56,.64,1);
  }
  .progress-dot.done {
    background: linear-gradient(135deg, var(--green-mid), var(--green-dark)); border-color: var(--green-dark);
    color: white; transform: scale(1.12); box-shadow: 0 4px 16px rgba(74,173,122,0.4);
  }
  .progress-dot.current {
    border-color: var(--green-mid); box-shadow: 0 0 0 4px rgba(74,173,122,0.15);
    animation: pulse-dot 2s ease-in-out infinite;
  }
  @keyframes pulse-dot {
    0%,100%{box-shadow:0 0 0 4px rgba(74,173,122,0.15)} 50%{box-shadow:0 0 0 8px rgba(74,173,122,0.08)}
  }
  .exercise-card {
    background: var(--neutral); border-radius: var(--radius); padding: 28px 20px;
    display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 0; min-height: 280px;
  }
  .vdivider {
    width: 1px; align-self: stretch; flex: 0 0 1px;
    background: linear-gradient(180deg, transparent, var(--green-light), var(--pink-light), transparent);
  }
  .left-panel { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 0 28px; flex: 0 0 auto; }
  .side-label { font-size: 12px; font-weight: 700; color: var(--text-mid); text-align: center; letter-spacing: 0.3px; }
  .rect-container {
    display: flex; flex-direction: column; border: 2.5px solid var(--text-dark); border-radius: 8px;
    overflow: hidden; cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,0.06); width: 68px;
  }
  .rect-seg { width: 68px; transition: background 0.15s; border-top: 1.5px solid rgba(0,0,0,0.15); }
  .rect-seg:first-child { border-top: none; }
  .rect-seg:hover { filter: brightness(0.92); }
  .rect-seg.colored { background: linear-gradient(135deg, var(--green-light), var(--green-mid)); }
  .rect-seg:not(.colored) { background: white; }
  .rect-seg.wrong-colored { background: linear-gradient(135deg, var(--pink-light), var(--pink-mid)) !important; }
  .rect-seg.wrong-empty { background: rgba(74,173,122,0.12) !important; outline: 2px dashed var(--green-mid); outline-offset: -2px; }
  .rect-feedback { font-size: 12px; font-weight: 700; min-height: 16px; text-align: center; }
  .rect-feedback.ok { color: var(--green-dark); }
  .rect-feedback.err { color: var(--pink-dark); }
  .fraction-center { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 0 36px; flex: 0 0 auto; }
  .fraction-box {
    background: white; border-radius: 20px; padding: 16px 28px;
    box-shadow: 0 4px 24px rgba(45,122,79,0.10); display: flex; flex-direction: column; align-items: center;
  }
  .frac-num { font-family: 'Fredoka One', cursive; font-size: 50px; color: var(--green-dark); line-height: 1; }
  .frac-line { width: 54px; height: 3px; background: linear-gradient(90deg, var(--green-mid), var(--pink-mid)); border-radius: 2px; margin: 6px 0; }
  .frac-denom { font-family: 'Fredoka One', cursive; font-size: 50px; color: var(--pink-dark); line-height: 1; }
  .frac-name { font-size: 14px; color: var(--text-light); font-weight: 700; }
  .right-panel { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 0 28px; flex: 0 0 auto; }
  .whole-number { font-family: 'Fredoka One', cursive; font-size: 60px; color: var(--text-dark); line-height: 1; text-align: center; }
  .answer-input {
    width: 80px; height: 52px; border: 2.5px solid var(--green-light); border-radius: var(--radius-sm);
    font-family: 'Fredoka One', cursive; font-size: 28px; text-align: center; background: white;
    color: var(--text-dark); outline: none; transition: border-color 0.2s, box-shadow 0.2s;
    -moz-appearance: textfield;
  }
  .answer-input::-webkit-inner-spin-button, .answer-input::-webkit-outer-spin-button { -webkit-appearance: none; }
  .answer-input:focus { border-color: var(--green-mid); box-shadow: 0 0 0 4px rgba(74,173,122,0.15); }
  .answer-input.correct { border-color: var(--green-dark); background: var(--green-pale); color: var(--green-dark); }
  .answer-input.wrong { border-color: var(--pink-dark); background: var(--pink-pale); color: var(--pink-dark); animation: shake 0.45s ease; }
  @keyframes shake {
    0%,100%{transform:translateX(0)} 15%{transform:translateX(-8px)} 30%{transform:translateX(8px)}
    45%{transform:translateX(-6px)} 60%{transform:translateX(6px)} 75%{transform:translateX(-3px)} 90%{transform:translateX(3px)}
  }
  .calc-feedback { font-size: 12px; font-weight: 700; min-height: 16px; text-align: center; }
  .calc-feedback.ok { color: var(--green-dark); }
  .calc-feedback.err { color: var(--pink-dark); }
  .btn-row { display: flex; justify-content: center; gap: 16px; margin-top: 22px; }
  .btn { font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 15px; border: none; border-radius: 50px; padding: 12px 28px; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; }
  .btn:active { transform: scale(0.96); }
  .btn-check { background: linear-gradient(135deg, var(--green-mid), var(--green-dark)); color: white; box-shadow: 0 4px 18px rgba(45,122,79,0.35); }
  .btn-check:hover { box-shadow: 0 6px 24px rgba(45,122,79,0.45); transform: translateY(-1px); }
  .btn-new { background: linear-gradient(135deg, var(--pink-light), var(--pink-mid)); color: var(--pink-dark); box-shadow: 0 4px 14px rgba(194,69,107,0.18); }
  .btn-new:hover { box-shadow: 0 6px 20px rgba(194,69,107,0.28); transform: translateY(-1px); }
  .btn-continue { background: linear-gradient(135deg, var(--green-mid), var(--green-dark)); color: white; box-shadow: 0 4px 18px rgba(45,122,79,0.35); margin-top: 16px; }
  .celebration-overlay {
    position: fixed; inset: 0; background: rgba(45,122,79,0.12); backdrop-filter: blur(3px);
    z-index: 100; display: flex; align-items: center; justify-content: center;
  }
  .celebration-box {
    background: white; border-radius: 32px; padding: 44px 56px; text-align: center;
    box-shadow: 0 16px 64px rgba(45,122,79,0.22); animation: pop-in 0.5s cubic-bezier(.34,1.56,.64,1);
  }
  @keyframes pop-in { 0%{transform:scale(0.5);opacity:0} 100%{transform:scale(1);opacity:1} }
  .celebration-emoji { font-size: 64px; display: block; margin-bottom: 8px; }
  .celebration-title { font-family: 'Fredoka One', cursive; font-size: 36px; color: var(--green-dark); margin-bottom: 6px; }
  .celebration-sub { font-size: 16px; color: var(--text-mid); font-weight: 600; }
  .correct-flash { position: fixed; inset: 0; background: rgba(74,173,122,0.18); pointer-events: none; z-index: 50; opacity: 0; transition: opacity 0.3s; }
  .correct-flash.show { opacity: 1; }
  @keyframes confetti-fall { 0%{opacity:1;transform:translateY(-10px) rotate(0deg)} 100%{opacity:0;transform:translateY(100vh) rotate(720deg)} }
`

function generateExercise(usedDenoms: number[]): {
  denom: number; whole: number; correctAnswer: number; newUsedDenoms: number[]
} {
  const avail = [2, 3, 4, 5, 6, 7, 8, 9, 10].filter(d => !usedDenoms.includes(d))
  const pool = avail.length ? avail : [2, 3, 4, 5, 6, 7, 8, 9, 10]
  const denom = pool[Math.floor(Math.random() * pool.length)]
  const newUsedDenoms = avail.length ? [...usedDenoms, denom] : [denom]
  const mult = 2 + Math.floor(Math.random() * 9)
  return { denom, whole: denom * mult, correctAnswer: mult, newUsedDenoms }
}

export default function GameClient() {
  const router = useRouter()
  const audioCtxRef = useRef<AudioContext | null>(null)
  const usedDenomsRef = useRef<number[]>([])
  const checkedRef = useRef(false)
  const correctAnswerRef = useRef(4)
  const coloredCellsRef = useRef<number[]>([])
  const currentQRef = useRef(0)
  const correctAnswersRef = useRef(0)

  const [denom, setDenom] = useState(3)
  const [whole, setWhole] = useState(12)
  const [coloredCells, setColoredCells] = useState<number[]>([])
  const [currentQ, setCurrentQ] = useState(0)
  const [inputValue, setInputValue] = useState('')
  const [inputClass, setInputClass] = useState('answer-input')
  const [calcFeedback, setCalcFeedback] = useState({ text: '', cls: '' })
  const [rectFeedback, setRectFeedback] = useState({ text: '', cls: '' })
  const [rectFeedbackMode, setRectFeedbackMode] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [showFlash, setShowFlash] = useState(false)

  function getACtx() {
    if (!audioCtxRef.current)
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    return audioCtxRef.current
  }

  function playSuccess() {
    try {
      const ctx = getACtx()
      ;[523, 659, 784, 1047].forEach((freq, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain()
        o.connect(g); g.connect(ctx.destination); o.type = 'sine'
        o.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12)
        g.gain.setValueAtTime(0, ctx.currentTime + i * 0.12)
        g.gain.linearRampToValueAtTime(0.18, ctx.currentTime + i * 0.12 + 0.02)
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3)
        o.start(ctx.currentTime + i * 0.12); o.stop(ctx.currentTime + i * 0.12 + 0.35)
      })
    } catch {}
  }

  function playError() {
    try {
      const ctx = getACtx()
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination); o.type = 'sawtooth'
      o.frequency.setValueAtTime(220, ctx.currentTime)
      o.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.3)
      g.gain.setValueAtTime(0.15, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
      o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.4)
    } catch {}
  }

  function playWin() {
    try {
      const ctx = getACtx()
      ;[523, 659, 784, 659, 784, 1047, 784, 1047, 1319].forEach((freq, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain()
        o.connect(g); g.connect(ctx.destination); o.type = 'sine'
        o.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1)
        g.gain.setValueAtTime(0, ctx.currentTime + i * 0.1)
        g.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.1 + 0.02)
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.25)
        o.start(ctx.currentTime + i * 0.1); o.stop(ctx.currentTime + i * 0.1 + 0.3)
      })
    } catch {}
  }

  function loadNewExercise() {
    const { denom: d, whole: w, correctAnswer: ca, newUsedDenoms } = generateExercise(usedDenomsRef.current)
    usedDenomsRef.current = newUsedDenoms
    correctAnswerRef.current = ca
    checkedRef.current = false
    coloredCellsRef.current = []
    setDenom(d)
    setWhole(w)
    setColoredCells([])
    setInputValue('')
    setInputClass('answer-input')
    setCalcFeedback({ text: '', cls: '' })
    setRectFeedback({ text: '', cls: '' })
    setRectFeedbackMode(false)
  }

  // SDK load + first exercise
  useEffect(() => {
    loadNewExercise()
    const script = document.createElement('script')
    script.src = '/sdk/mathplatform-sdk-v1.js'
    script.onload = () => {
      ;(window as any).MathPlatformSDK?.emit('GAME_STARTED', { gameId: GAME_ID })
    }
    document.head.appendChild(script)
  }, [])

  // CSS injection
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = CSS
    document.head.appendChild(style)
    return () => { document.head.removeChild(style) }
  }, [])

  function toggleCell(idx: number) {
    if (checkedRef.current) return
    const next = coloredCellsRef.current.includes(idx)
      ? coloredCellsRef.current.filter(i => i !== idx)
      : [...coloredCellsRef.current, idx]
    coloredCellsRef.current = next
    setColoredCells([...next])
  }

  function spawnConfetti() {
    const cols = ['#4aad7a', '#e8789a', '#a8e6c3', '#f7bdd0', '#2d7a4f', '#c2456b']
    for (let i = 0; i < 60; i++) {
      const c = document.createElement('div')
      c.style.cssText = [
        'position:fixed', 'pointer-events:none', 'z-index:200',
        `left:${Math.random() * 100}vw`,
        `background:${cols[Math.floor(Math.random() * cols.length)]}`,
        `animation:confetti-fall ${1 + Math.random() * 0.8}s ease-in ${Math.random() * 0.8}s forwards`,
        `width:${8 + Math.random() * 8}px`, `height:${8 + Math.random() * 8}px`,
        `border-radius:${Math.random() > 0.5 ? '50%' : '2px'}`,
      ].join(';')
      document.body.appendChild(c)
      setTimeout(() => c.remove(), 2400)
    }
  }

  function checkAll() {
    if (checkedRef.current) return
    const val = parseInt(inputValue)
    const curCorrect = correctAnswerRef.current
    const curColoredCells = coloredCellsRef.current
    const curQ = currentQRef.current
    const curCorrectAnswers = correctAnswersRef.current

    if (isNaN(val)) {
      setInputClass('answer-input wrong')
      setTimeout(() => setInputClass('answer-input'), 500)
      setCalcFeedback({ text: 'יש להכניס מספר', cls: 'err' })
      playError()
      return
    }

    let calcOk = false
    if (val === curCorrect) {
      setInputClass('answer-input correct')
      setCalcFeedback({ text: '✓ נכון!', cls: 'ok' })
      calcOk = true
    } else {
      setInputClass('answer-input wrong')
      setTimeout(() => { setInputClass('answer-input'); setInputValue('') }, 600)
      setCalcFeedback({ text: '✗ לא נכון', cls: 'err' })
    }

    const colored = curColoredCells.length
    let rectOk = false
    if (colored === 1) {
      rectOk = true
      setRectFeedbackMode(false)
      setRectFeedback({ text: '✓ צביעה נכונה!', cls: 'ok' })
    } else {
      setRectFeedbackMode(true)
      setRectFeedback({
        text: colored === 0 ? '✗ יש לצבוע חלק אחד' : '✗ צבע רק חלק אחד',
        cls: 'err',
      })
    }

    // SDK: ANSWER
    ;(window as any).MathPlatformSDK?.emit('ANSWER', {
      correct: calcOk && rectOk,
      questionId: `q-${curQ + 1}`,
      questionType: 'fraction-of-number',
      correctAnswer: String(curCorrect),
      childAnswer: inputValue,
      attemptNumber: 1,
    })

    if (calcOk && rectOk) {
      checkedRef.current = true
      const nextQ = curQ + 1
      const newCorrectAnswers = curCorrectAnswers + 1
      currentQRef.current = nextQ
      correctAnswersRef.current = newCorrectAnswers
      setCurrentQ(nextQ)
      playSuccess()
      setShowFlash(true)
      setTimeout(() => setShowFlash(false), 500)

      if (nextQ >= 5) {
        setTimeout(() => {
          playWin()
          spawnConfetti()
          const score = newCorrectAnswers * 20
          const stars = score >= 90 ? 3 : score >= 60 ? 2 : 1
          ;(window as any).MathPlatformSDK?.emit('GAME_OVER', {
            score,
            maxScore: 100,
            stars,
            correctAnswers: newCorrectAnswers,
            totalQuestions: 5,
          })
          setShowCelebration(true)
        }, 1100)
      } else {
        setTimeout(() => loadNewExercise(), 1000)
      }
    } else {
      playError()
    }
  }


  const segHeight = Math.max(14, Math.floor(220 / denom))

  function getSegClass(idx: number): string {
    const isColored = coloredCells.includes(idx)
    if (rectFeedbackMode) {
      const should = idx < 1
      if (isColored && !should) return 'rect-seg wrong-colored'
      if (!isColored && should) return 'rect-seg wrong-empty'
    }
    return isColored ? 'rect-seg colored' : 'rect-seg'
  }

  return (
    <>
      <GameBackButton />

      {/* Green flash */}
      <div className={`correct-flash${showFlash ? ' show' : ''}`} />

      {/* Celebration overlay */}
      {showCelebration && (
        <div className="celebration-overlay">
          <div className="celebration-box">
            <span className="celebration-emoji">🎉</span>
            <div className="celebration-title">כל הכבוד!</div>
            <div className="celebration-sub">השלמת את כל 5 התרגילים!</div>
            <br />
            <button className="btn btn-continue" onClick={() => router.back()}>
              המשך ▶
            </button>
          </div>
        </div>
      )}

      <div className="fractions-wrap">
        <div className="fractions-app">
          <div className="app-header">
            <div className="app-title">🌿 תרגול שברים 🌸</div>
          </div>

          {/* Progress dots */}
          <div className="progress-row">
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className={`progress-dot${i < currentQ ? ' done' : i === currentQ ? ' current' : ''}`}
              >
                {i < currentQ ? '✓' : ''}
              </div>
            ))}
          </div>

          {/* Exercise card */}
          <div className="exercise-card">
            {/* Left: rectangle */}
            <div className="left-panel">
              <div className="side-label">צבע את השבר במלבן</div>
              <div className="rect-container">
                {Array.from({ length: denom }, (_, i) => (
                  <div
                    key={i}
                    className={getSegClass(i)}
                    style={{ height: segHeight }}
                    onClick={() => toggleCell(i)}
                  />
                ))}
              </div>
              <div className={`rect-feedback${rectFeedback.cls ? ' ' + rectFeedback.cls : ''}`}>
                {rectFeedback.text}
              </div>
            </div>

            <div className="vdivider" />

            {/* Center: fraction */}
            <div className="fraction-center">
              <div className="fraction-box">
                <div className="frac-num">1</div>
                <div className="frac-line" />
                <div className="frac-denom">{denom}</div>
              </div>
              <div className="frac-name">{FRACTION_NAMES[denom] || `1/${denom}`}</div>
            </div>

            <div className="vdivider" />

            {/* Right: calculation */}
            <div className="right-panel">
              <div className="side-label">כמה זה השבר מהמספר?</div>
              <div className="whole-number">{whole}</div>
              <input
                type="number"
                className={inputClass}
                placeholder="?"
                min={1}
                max={999}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') checkAll() }}
              />
              <div className={`calc-feedback${calcFeedback.cls ? ' ' + calcFeedback.cls : ''}`}>
                {calcFeedback.text}
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="btn-row">
            <button className="btn btn-check" onClick={checkAll}>בדיקה ✓</button>
            <button className="btn btn-new" onClick={loadNewExercise}>תרגיל חדש ↻</button>
          </div>
        </div>
      </div>
    </>
  )
}
