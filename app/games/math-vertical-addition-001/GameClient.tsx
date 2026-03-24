'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const GAME_ID = 'math-vertical-addition-001'

const COLORS = {
  dustGrey: '#dad7cd',
  drySage: '#a3b18a',
  fern: '#588157',
  hunter: '#3a5a40',
  pine: '#344e41',
}

// ─── Audio ───────────────────────────────────────────────
function useAudio() {
  const ctx = useRef<AudioContext | null>(null)
  const getCtx = () => {
    if (!ctx.current) ctx.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    return ctx.current
  }
  const play = useCallback((type: string) => {
    try {
      const ac = getCtx()
      const now = ac.currentTime
      if (type === 'correct') {
        ;[0, 0.12, 0.24].forEach((t, i) => {
          const o = ac.createOscillator(); const g = ac.createGain()
          o.connect(g); g.connect(ac.destination)
          o.frequency.value = [523, 659, 784][i]
          g.gain.setValueAtTime(0.25, now + t); g.gain.exponentialRampToValueAtTime(0.001, now + t + 0.3)
          o.start(now + t); o.stop(now + t + 0.3)
        })
      } else if (type === 'wrong') {
        const o = ac.createOscillator(); const g = ac.createGain()
        o.type = 'sawtooth'; o.frequency.value = 180
        o.connect(g); g.connect(ac.destination)
        g.gain.setValueAtTime(0.3, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
        o.start(now); o.stop(now + 0.4)
      } else if (type === 'fanfare') {
        ;[0,0.1,0.2,0.3,0.45,0.6].forEach((t,i) => {
          const f=[523,659,784,1047,784,1047][i]
          const o=ac.createOscillator(); const g=ac.createGain()
          o.connect(g); g.connect(ac.destination)
          o.frequency.value=f; g.gain.setValueAtTime(0.3,now+t); g.gain.exponentialRampToValueAtTime(0.001,now+t+0.35)
          o.start(now+t); o.stop(now+t+0.35)
        })
      } else if (type === 'borrow') {
        const o = ac.createOscillator(); const g = ac.createGain()
        o.type = 'triangle'; o.frequency.value = 880
        o.connect(g); g.connect(ac.destination)
        g.gain.setValueAtTime(0.2, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
        o.start(now); o.stop(now + 0.25)
      } else if (type === 'merge') {
        ;[0,0.1].forEach((t,i) => {
          const o=ac.createOscillator(); const g=ac.createGain()
          o.frequency.value=[660,880][i]; o.connect(g); g.connect(ac.destination)
          g.gain.setValueAtTime(0.2,now+t); g.gain.exponentialRampToValueAtTime(0.001,now+t+0.2)
          o.start(now+t); o.stop(now+t+0.2)
        })
      } else if (type === 'trash') {
        const o = ac.createOscillator(); const g = ac.createGain()
        o.type = 'sawtooth'; o.frequency.value = 220
        o.frequency.exponentialRampToValueAtTime(80, now + 0.3)
        o.connect(g); g.connect(ac.destination)
        g.gain.setValueAtTime(0.2, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
        o.start(now); o.stop(now + 0.3)
      }
    } catch(e) {}
  }, [])
  return play
}

// ─── Generate exercise ────────────────────────────────────
function genExercise(level: number) {
  const maxDigits = level + 1
  const max = Math.pow(10, maxDigits) - 1
  const min = Math.pow(10, maxDigits - 1)
  let a = Math.floor(Math.random() * (max - min) + min)
  let b = Math.floor(Math.random() * (max - min) + min)
  if (a + b > 9999) b = Math.floor(b / 2)
  return { a, b, op: '+' as const, answer: a + b }
}

function padDigits(n: number, len: number): (number | null)[] {
  const s = String(n).padStart(len, ' ')
  return s.split('').map(c => (c === ' ' ? null : Number(c)))
}

// ─── Coin visual ──────────────────────────────────────────
function CoinColumn({ value, label, symbol, color }: { value: number, label: string, symbol: string, color: string }) {
  const count = Math.min(value, 12)
  const isBill = symbol === '₪100'
  const coinW = isBill ? 38 : 28
  const coinH = isBill ? 20 : 28
  const step = Math.round(coinH * 0.30)
  const totalH = coinH + step * (count - 1) + 4
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, minWidth: coinW + 8 }}>
      <span style={{ color: COLORS.drySage, fontSize:11, fontFamily:"'Varela Round',sans-serif" }}>{label}</span>
      <div style={{ position:'relative', width: coinW, height: count > 0 ? totalH : 0 }}>
        {Array.from({length: count}, (_,i) => (
          <div key={i} style={{
            position:'absolute', top: i * step, left:0,
            width: coinW, height: coinH,
            borderRadius: isBill ? 4 : '50%',
            background: color,
            border: '2px solid rgba(255,255,255,0.25)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize: 8, color:'#fff', fontWeight:700,
            boxShadow:'0 2px 5px rgba(0,0,0,0.4)',
            zIndex: i,
          }}>{symbol}</div>
        ))}
      </div>
      {value > 12 && <span style={{color:COLORS.drySage,fontSize:10}}>×{value}</span>}
    </div>
  )
}

function CoinsPanel({ exercise, partialAnswer }: { exercise: any, partialAnswer: (number|undefined)[] }) {
  if (!exercise) return null
  const { a, b } = exercise
  const maxLen = Math.max(String(a).length, String(b).length)

  const getCoins = (n: number) => ({
    hundreds: Math.floor(n / 100),
    tens: Math.floor((n % 100) / 10),
    ones: n % 10,
  })

  let partialNum = 0
  const filled = partialAnswer.filter(x => x !== undefined)
  if (filled.length > 0) {
    const ansStr = String(exercise.answer)
    const confirmedStr = ansStr.split('').map((d: string, i: number) => {
      const fromRight = ansStr.length - 1 - i
      return partialAnswer[fromRight] !== undefined ? d : '0'
    }).join('')
    partialNum = parseInt(confirmedStr) || 0
  }

  const aC = getCoins(a)
  const bC = getCoins(b)
  const pC = getCoins(partialNum)

  const rows = [
    { label: 'מספר ראשון', coins: aC, color: '#5a8a6a' },
    { label: 'מוסיפים', coins: bC, color: '#7a6a3a' },
    ...(partialNum > 0 ? [{ label: 'תשובה', coins: pC, color: COLORS.fern }] : []),
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, height:'100%', overflowY:'auto' }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{
          background:'rgba(0,0,0,0.2)', borderRadius:12, padding:'10px 12px',
          border:'1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{ color:COLORS.drySage, fontSize:12, marginBottom:8, fontFamily:"'Varela Round',sans-serif" }}>{row.label}</div>
          <div style={{ display:'flex', flexDirection:'row', gap:12, justifyContent:'flex-end', direction:'ltr' }}>
            {maxLen >= 3 && <CoinColumn value={row.coins.hundreds} label="מאות" symbol="₪100" color="#4a7a9a" />}
            {maxLen >= 2 && <CoinColumn value={row.coins.tens}    label="עשרות" symbol="₪10"  color="#7a9a7a" />}
            <CoinColumn value={row.coins.ones} label="אחדות" symbol="₪1" color="#b5883e" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Egg Crack ────────────────────────────────────────────
function EggCrack({ onDone }: { onDone: (rect: DOMRect | null) => void }) {
  const TAPS_NEEDED = 15
  const [cracks, setCracks] = useState(0)
  const [phase, setPhase] = useState('cracking')
  const eggRef = useRef<HTMLDivElement>(null)

  function playCrack() {
    try {
      const ac = new (window.AudioContext || (window as any).webkitAudioContext)()
      ;[0, 0.07].forEach((t, i) => {
        const o = ac.createOscillator(), g = ac.createGain()
        o.connect(g); g.connect(ac.destination)
        o.frequency.value = 180 - i * 40; o.type = 'triangle'
        g.gain.setValueAtTime(0.25, ac.currentTime + t)
        g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + t + 0.3)
        o.start(ac.currentTime + t); o.stop(ac.currentTime + t + 0.35)
      })
    } catch(e) {}
  }

  function tap() {
    playCrack()
    const next = cracks + 1
    if (next >= TAPS_NEEDED) {
      setCracks(next)
      onDone(eggRef.current?.getBoundingClientRect() ?? null)
      setPhase('dragon')
    } else setCracks(next)
  }

  if (phase === 'dragon') return null

  return (
    <div style={{
      position:'absolute', inset:0, display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', gap:6, zIndex:20,
    }}>
      <div
        ref={eggRef}
        style={{ position:'relative', width:220, height:220, cursor:'pointer',
          filter: cracks > 0 ? 'drop-shadow(0 0 20px rgba(255,100,255,0.9))' : 'drop-shadow(0 0 8px rgba(120,80,255,0.4))',
        }}
        onMouseDown={tap}
        onTouchStart={e=>{e.preventDefault();tap()}}
      >
        <svg width="220" height="220" viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="eggGrad" cx="40%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#e8e0d0"/>
              <stop offset="100%" stopColor="#c8b89a"/>
            </radialGradient>
          </defs>
          <ellipse cx="110" cy="120" rx="70" ry="90" fill="url(#eggGrad)" />
          {cracks > 0  && <line x1="110" y1="60" x2="100" y2="90"  stroke="#8B6914" strokeWidth="1.5" opacity={Math.min(1,cracks/3)}/>}
          {cracks > 2  && <line x1="100" y1="90" x2="115" y2="110" stroke="#8B6914" strokeWidth="1.5"/>}
          {cracks > 4  && <line x1="115" y1="110" x2="95" y2="135" stroke="#8B6914" strokeWidth="1.5"/>}
          {cracks > 6  && <line x1="110" y1="60" x2="125" y2="95"  stroke="#8B6914" strokeWidth="1.5"/>}
          {cracks > 8  && <line x1="125" y1="95" x2="140" y2="115" stroke="#8B6914" strokeWidth="1.5"/>}
          {cracks > 10 && <line x1="95" y1="135" x2="85" y2="160"  stroke="#8B6914" strokeWidth="2"/>}
          {cracks > 12 && <line x1="140" y1="115" x2="150" y2="145" stroke="#8B6914" strokeWidth="2"/>}
        </svg>
      </div>
      <div style={{ color:COLORS.drySage, fontSize:15, fontFamily:"'Varela Round',sans-serif" }}>
        {cracks===0 ? '👆 הקש לפתוח' : cracks < TAPS_NEEDED-2 ? 'עוד...' : 'עוד אחת!'}
      </div>
    </div>
  )
}

// ─── Dragon Fall ──────────────────────────────────────────
function DragonFall({ idx, rect }: { idx: number, rect: DOMRect | null }) {
  const startY = rect ? rect.top + rect.height / 2 - 80 : -200
  const startLeft = rect ? rect.left + rect.width / 2 : null
  const [y, setY] = useState(startY)
  const [landed, setLanded] = useState(false)
  const frameRef = useRef<number | null>(null)
  const vy = useRef(0)
  const xPercent = startLeft ? null : 15 + (idx % 5) * 17

  useEffect(() => {
    const dragonH = 120
    const floor = window.innerHeight - dragonH - 10
    function step() {
      vy.current += 0.7
      setY(prev => {
        const ny = prev + vy.current
        if (ny >= floor) { setLanded(true); return floor }
        frameRef.current = requestAnimationFrame(step)
        return ny
      })
    }
    frameRef.current = requestAnimationFrame(step)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [])

  return (
    <div style={{
      position:'fixed',
      left: startLeft != null ? startLeft : `${xPercent}%`,
      top: y,
      transform:'translateX(-50%)',
      fontSize: 80,
      pointerEvents:'none',
      zIndex:8888,
      filter: landed ? 'none' : 'drop-shadow(0 6px 18px rgba(255,60,200,0.6))',
      lineHeight:1,
    }}>🐉</div>
  )
}

// ─── Vertical Exercise ────────────────────────────────────
function VerticalExercise({ exercise, answers, errorIdx, hintMsg, dropTargetIdx, onDragOverCell, boardRef }: {
  exercise: any, answers: (number|undefined)[], errorIdx: number|null,
  hintMsg: string, dropTargetIdx: number|null,
  onDragOverCell: (col: number|null) => void,
  boardRef: React.RefObject<HTMLDivElement | null>
}) {
  if (!exercise) return null
  const { a, b, answer } = exercise
  const ansLen = String(answer).length
  const maxLen = Math.max(String(a).length, String(b).length, ansLen)
  const aP = padDigits(a, maxLen)
  const bP = padDigits(b, maxLen)
  const ansP = padDigits(answer, maxLen)
  const filledCount = answers.filter(x => x !== undefined).length

  return (
    <div style={{ fontFamily:"'Varela Round',sans-serif", direction:'ltr', display:'inline-block' }}>
      <table style={{ borderCollapse:'separate', borderSpacing:'6px 4px' }}>
        <tbody>
          <tr>
            <td style={{ width:24 }}></td>
            {aP.map((d, i) => (
              <td key={i} style={{ textAlign:'center', minWidth:44, height:52 }}>
                {d !== null && <span style={{ fontSize:30, fontWeight:700, color:COLORS.dustGrey }}>{d}</span>}
              </td>
            ))}
          </tr>
          <tr>
            <td style={{ textAlign:'center', verticalAlign:'middle' }}>
              <span style={{ fontSize:28, fontWeight:700, color:COLORS.drySage }}>+</span>
            </td>
            {bP.map((d, i) => (
              <td key={i} style={{ textAlign:'center', minWidth:44, height:52 }}>
                {d !== null && <span style={{ fontSize:30, fontWeight:700, color:COLORS.dustGrey }}>{d}</span>}
              </td>
            ))}
          </tr>
          <tr>
            <td colSpan={maxLen + 1} style={{ padding:0 }}>
              <div style={{ height:2, background:`linear-gradient(90deg, transparent, ${COLORS.drySage}, transparent)`, margin:'2px 0' }} />
            </td>
          </tr>
          <tr>
            <td></td>
            {ansP.map((d, ai) => {
              const colFromRight = maxLen - 1 - ai
              const placed = answers[colFromRight]
              const isError = errorIdx === colFromRight
              const isCorrect = placed !== undefined && d !== null && placed === d
              const isActive = colFromRight < ansLen
              const isNext = isActive && filledCount === colFromRight
              if (!isActive && d === null) return <td key={ai} style={{ minWidth:44 }} />
              return (
                <td
                  key={ai}
                  data-answer-col={colFromRight}
                  onMouseEnter={() => onDragOverCell(colFromRight)}
                  onMouseLeave={() => onDragOverCell(null)}
                  style={{ textAlign:'center', minWidth:44, height:56, position:'relative' }}
                >
                  <div style={{
                    width:42, height:48, margin:'0 auto', borderRadius:10,
                    background: isCorrect ? 'rgba(88,129,87,0.35)' : isError ? 'rgba(180,60,60,0.35)' : isNext ? 'rgba(163,177,138,0.15)' : 'rgba(255,255,255,0.05)',
                    border: isCorrect ? `2px solid ${COLORS.fern}` : isError ? '2px solid #c04040' : isNext ? `2px dashed ${COLORS.drySage}` : '2px solid transparent',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    transition:'all 0.2s',
                  }}>
                    {placed !== undefined && (
                      <span style={{
                        fontSize:28, fontWeight:700,
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
      <div style={{ minHeight:42, marginTop:8 }}>
        {hintMsg && (
          <div style={{
            padding:'10px 18px', borderRadius:10,
            background:'rgba(180,100,40,0.25)', border:'1px solid rgba(220,140,60,0.4)',
            color:'#f0c070', fontSize:24, fontWeight:700, textAlign:'center', direction:'ltr',
            fontFamily:"'Varela Round',sans-serif", letterSpacing:2,
          }}>{hintMsg}</div>
        )}
      </div>
    </div>
  )
}

// ─── Digit Bank ───────────────────────────────────────────
function DigitBank({ onDragStart }: { onDragStart: (e: React.MouseEvent | React.TouchEvent, digit: number, fromBoard: boolean) => void }) {
  const rows = [[1,2,3,4,5],[6,7,8,9,0]]
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8, alignSelf:'stretch', justifyContent:'center', paddingLeft:16 }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display:'flex', gap:8 }}>
          {row.map(i => (
            <div
              key={i}
              onMouseDown={(e) => onDragStart(e, i, false)}
              onTouchStart={(e) => onDragStart(e, i, false)}
              style={{
                width:52, height:52, borderRadius:13,
                background:`linear-gradient(135deg, ${COLORS.hunter}, ${COLORS.pine})`,
                border:`2px solid ${COLORS.fern}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:24, fontWeight:700, color:COLORS.dustGrey,
                cursor:'grab', userSelect:'none',
                boxShadow:'0 4px 12px rgba(0,0,0,0.4)',
              }}
            >{i}</div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Trash ────────────────────────────────────────────────
function TrashBin({ isOver }: { isOver: boolean }) {
  return (
    <div style={{
      width:52, height:52, borderRadius:12,
      background: isOver ? 'rgba(200,60,60,0.5)' : 'rgba(100,40,40,0.4)',
      border: isOver ? '2px solid #e06060' : '2px solid rgba(180,60,60,0.5)',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:24, transition:'all 0.2s',
    }}>🗑️</div>
  )
}

// ─── Progress Bar ─────────────────────────────────────────
function ProgressBar({ current, total }: { current: number, total: number }) {
  return (
    <div style={{ display:'flex', gap:6, alignItems:'center' }}>
      {Array.from({length:total},(_,i)=>(
        <div key={i} style={{
          flex:1, height:6, borderRadius:3,
          background: i < current ? COLORS.fern : 'rgba(255,255,255,0.15)',
          transition:'background 0.3s',
        }}/>
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════
export default function GameClient() {
  const router = useRouter()
  const play = useAudio()

  const [screen, setScreen] = useState<'start'|'game'|'end'>('start')
  const [level, setLevel] = useState(1)

  const [exercises, setExercises] = useState<any[]>([])
  const [exIdx, setExIdx] = useState(0)
  const [answers, setAnswers] = useState<(number|undefined)[]>([])
  const [errorIdx, setErrorIdx] = useState<number|null>(null)
  const [hintMsg, setHintMsg] = useState('')
  const [completed, setCompleted] = useState<boolean[]>([])
  const [showSuccess, setShowSuccess] = useState(false)
  const [eggPhase, setEggPhase] = useState('cracking')
  const [dragons, setDragons] = useState<{id:number, rect:DOMRect|null}[]>([])

  const [timeLeft, setTimeLeft] = useState(600)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [dragOverTrash, setDragOverTrash] = useState(false)
  const [dragOverBoard, setDragOverBoard] = useState<number|null>(null)
  const [floatingDigits, setFloatingDigits] = useState<{id:number, digit:number, x:number, y:number}[]>([])

  const [attemptMap, setAttemptMap] = useState<Record<string,number>>({})
  const [correctCount, setCorrectCount] = useState(0)

  const dragRef = useRef<{active:boolean, digit:number|null}>({ active:false, digit:null })
  const trashRef = useRef<HTMLDivElement>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const gameAreaRef = useRef<HTMLDivElement>(null)
  const ghostRef = useRef<HTMLElement|null>(null)

  const totalExercises = 3

  // SDK load
  useEffect(() => {
    const script = document.createElement('script')
    script.src = '/sdk/mathplatform-sdk-v1.js'
    script.onload = () => {
      ;(window as any).MathPlatformSDK?.emit('GAME_STARTED', { gameId: GAME_ID })
    }
    document.head.appendChild(script)
  }, [])

  // CSS animations
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Varela+Round&family=Fredoka+One&display=swap');
      @keyframes popIn { 0%{transform:scale(0.5);opacity:0} 70%{transform:scale(1.2)} 100%{transform:scale(1);opacity:1} }
      @keyframes shake { 0%,100%{transform:translateX(0)} 15%{transform:translateX(-8px)} 50%{transform:translateX(-6px)} 85%{transform:translateX(-3px)} }
      @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
      * { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
    `
    document.head.appendChild(style)
    return () => { document.head.removeChild(style) }
  }, [])

  const curExercise = exercises[exIdx]

  function startGame() {
    const exs = Array.from({length: totalExercises}, () => genExercise(level))
    setExercises(exs)
    setExIdx(0); setAnswers([]); setErrorIdx(null); setHintMsg('')
    setFloatingDigits([]); setEggPhase('cracking')
    setCompleted(Array(totalExercises).fill(false))
    setShowSuccess(false); setDragons([]); setCorrectCount(0)
    setScreen('game')
    setTimeLeft(600)
    timerRef.current && clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setTimeLeft(t => {
      if (t <= 1) { clearInterval(timerRef.current!); return 0 }
      return t - 1
    }), 1000)
  }

  function getEventCoords(e: any) {
    if (e.touches?.length) return { x: e.touches[0].clientX, y: e.touches[0].clientY }
    if (e.changedTouches?.length) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }
    return { x: e.clientX, y: e.clientY }
  }

  function createGhost(digit: number) {
    let g = document.getElementById('drag-ghost') as HTMLElement
    if (!g) { g = document.createElement('div'); g.id='drag-ghost'; document.body.appendChild(g) }
    g.textContent = String(digit)
    g.style.cssText = `
      position:fixed; pointer-events:none; z-index:9999;
      font-size:64px; font-weight:700; color:#dad7cd;
      font-family:'Varela Round',sans-serif;
      text-shadow:0 3px 12px rgba(0,0,0,0.9);
      transform:translate(-50%,-50%);
    `
    ghostRef.current = g
    return g
  }

  function moveGhost(x: number, y: number) {
    if (ghostRef.current) { ghostRef.current.style.left = x+'px'; ghostRef.current.style.top = y+'px' }
  }

  function removeGhost() {
    if (ghostRef.current) ghostRef.current.style.display='none'
    ghostRef.current = null
  }

  function handleDropDigit(digit: number, colFromRight: number) {
    if (!curExercise) return
    const ansStr = String(curExercise.answer)
    const ansLen = ansStr.length
    const filledCount = answers.filter(x => x !== undefined).length
    if (colFromRight !== filledCount) return

    const correctDigit = Number(ansStr[ansLen - 1 - colFromRight])
    const attempt = (attemptMap[`${exIdx}-${colFromRight}`] ?? 0) + 1
    setAttemptMap(prev => ({ ...prev, [`${exIdx}-${colFromRight}`]: attempt }))

    if (digit === correctDigit) {
      play('correct')
      const newAns = [...answers]
      newAns[colFromRight] = digit
      setAnswers(newAns)
      setErrorIdx(null); setHintMsg('')

      ;(window as any).MathPlatformSDK?.emit('ANSWER', {
        correct: true,
        questionId: `q-${String(exIdx+1).padStart(3,'0')}-col${colFromRight}`,
        questionType: 'vertical-addition',
        correctAnswer: String(correctDigit),
        childAnswer: String(digit),
        attemptNumber: attempt,
      })

      if (newAns.filter(x => x !== undefined).length === ansLen) {
        play('fanfare')
        setShowSuccess(true)
        setCorrectCount(prev => prev + 1)
        const newComp = [...completed]; newComp[exIdx] = true; setCompleted(newComp)
      }
    } else {
      play('wrong')
      setErrorIdx(colFromRight)
      const maxLen = Math.max(String(curExercise.a).length, String(curExercise.b).length, ansLen)
      const colA = Number(String(curExercise.a).padStart(maxLen,'0')[maxLen-1-colFromRight])
      const colB = Number(String(curExercise.b).padStart(maxLen,'0')[maxLen-1-colFromRight])
      const prevCol = colFromRight - 1
      const prevA = prevCol >= 0 ? Number(String(curExercise.a).padStart(maxLen,'0')[maxLen-1-prevCol]) : 0
      const prevB = prevCol >= 0 ? Number(String(curExercise.b).padStart(maxLen,'0')[maxLen-1-prevCol]) : 0
      const carry = prevA + prevB > 9 ? 1 : 0
      setHintMsg(carry > 0 ? `${colA}  +  ${colB}  +  ${carry}  =  ?` : `${colA}  +  ${colB}  =  ?`)

      ;(window as any).MathPlatformSDK?.emit('ANSWER', {
        correct: false,
        questionId: `q-${String(exIdx+1).padStart(3,'0')}-col${colFromRight}`,
        questionType: 'vertical-addition',
        correctAnswer: String(correctDigit),
        childAnswer: String(digit),
        attemptNumber: attempt,
      })

      setTimeout(() => {
        setErrorIdx(null)
        setAnswers(prev => {
          const a = [...prev]; delete a[colFromRight]; return a
        })
      }, 1500)
    }
  }

  function handleDragStart(e: any, digit: number, fromBoard: boolean, floatingId?: number) {
    e.preventDefault()
    dragRef.current = { active:true, digit }
    if (floatingId != null) setFloatingDigits(prev => prev.filter(fd => fd.id !== floatingId))
    const g = createGhost(digit)
    const {x,y} = getEventCoords(e)
    g.style.display='block'
    moveGhost(x, y)

    function onMove(ev: any) {
      ev.preventDefault()
      const {x,y} = getEventCoords(ev)
      moveGhost(x, y)
      if (trashRef.current) {
        const r = trashRef.current.getBoundingClientRect()
        setDragOverTrash(x >= r.left && x <= r.right && y >= r.top && y <= r.bottom)
      }
      if (boardRef.current) {
        const cells = boardRef.current.querySelectorAll('[data-answer-col]')
        let found: number|null = null
        cells.forEach(cell => {
          const r = cell.getBoundingClientRect()
          if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom)
            found = Number((cell as HTMLElement).dataset.answerCol)
        })
        setDragOverBoard(found)
      }
    }

    function onEnd(ev: any) {
      ev.preventDefault()
      removeGhost()
      const {x,y} = getEventCoords(ev)
      dragRef.current.active = false
      setDragOverTrash(false); setDragOverBoard(null)

      if (trashRef.current) {
        const r = trashRef.current.getBoundingClientRect()
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) { play('trash'); cleanup(); return }
      }
      if (boardRef.current) {
        const cells = boardRef.current.querySelectorAll('[data-answer-col]')
        let dropped = false
        cells.forEach(cell => {
          const r = cell.getBoundingClientRect()
          if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
            handleDropDigit(digit, Number((cell as HTMLElement).dataset.answerCol))
            dropped = true
          }
        })
        if (dropped) { cleanup(); return }
      }
      if (gameAreaRef.current) {
        const ar = gameAreaRef.current.getBoundingClientRect()
        const fx = Math.max(16, Math.min(x - ar.left, ar.width - 16))
        const fy = Math.max(16, Math.min(y - ar.top, ar.height - 16))
        setFloatingDigits(prev => [...prev, { id: Date.now(), digit, x: fx, y: fy }])
      }
      cleanup()
    }

    function cleanup() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onEnd)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
    window.addEventListener('mousemove', onMove, {passive:false})
    window.addEventListener('mouseup', onEnd, {passive:false})
    window.addEventListener('touchmove', onMove, {passive:false})
    window.addEventListener('touchend', onEnd, {passive:false})
  }

  function nextExercise() {
    if (exIdx + 1 >= exercises.length) {
      timerRef.current && clearInterval(timerRef.current)
      const stars = correctCount >= 3 ? 3 : correctCount >= 2 ? 2 : 1
      ;(window as any).MathPlatformSDK?.emit('GAME_OVER', {
        score: correctCount * 33,
        maxScore: 100,
        stars,
        correctAnswers: correctCount,
        totalQuestions: totalExercises,
      })
      setScreen('end')
      return
    }
    setExIdx(exIdx + 1)
    setAnswers([]); setErrorIdx(null); setHintMsg('')
    setShowSuccess(false); setFloatingDigits([]); setEggPhase('cracking')
  }

  const baseStyle: React.CSSProperties = {
    minHeight:'100vh', width:'100%',
    background:`linear-gradient(160deg, ${COLORS.pine} 0%, #1e2e22 50%, ${COLORS.pine} 100%)`,
    color: COLORS.dustGrey,
    fontFamily:"'Varela Round',sans-serif",
    direction:'rtl',
    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
    padding:16, userSelect:'none',
  }

  // ── מסך פתיחה ──
  if (screen === 'start') return (
    <div style={baseStyle}>
      <div style={{
        background:`linear-gradient(135deg, ${COLORS.hunter}, #243328)`,
        borderRadius:28, padding:'44px 52px', maxWidth:380, width:'100%',
        boxShadow:'0 20px 60px rgba(0,0,0,0.5)',
        border:`1px solid rgba(163,177,138,0.15)`,
        display:'flex', flexDirection:'column', gap:28, alignItems:'center',
      }}>
        <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:26, color:COLORS.dustGrey, textAlign:'center' }}>
          🧮 חיבור במאונך
        </div>

        <div style={{ display:'flex', gap:10, direction:'ltr' }}>
          {([[3,'ארבע ספרות'],[2,'תלת-ספרתי'],[1,'דו-ספרתי']] as [number,string][]).map(([v,label])=>(
            <button key={v} onClick={()=>setLevel(v)} style={{
              padding:'10px 14px', borderRadius:12, border:'none', cursor:'pointer',
              background: level===v ? COLORS.hunter : 'rgba(255,255,255,0.06)',
              color: level===v ? COLORS.dustGrey : COLORS.drySage,
              fontSize:13, fontFamily:"'Varela Round',sans-serif",
              outline: level===v ? `2px solid ${COLORS.fern}` : '2px solid transparent',
              transition:'all 0.18s', whiteSpace:'nowrap',
            } as React.CSSProperties}>{label}</button>
          ))}
        </div>

        <button onClick={startGame} style={{
          width:72, height:72, borderRadius:'50%', border:'none', cursor:'pointer',
          background:`linear-gradient(135deg, ${COLORS.fern}, ${COLORS.hunter})`,
          boxShadow:'0 6px 20px rgba(88,129,87,0.5)',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <svg width="28" height="28" viewBox="0 0 28 28">
            <polygon points="6,2 26,14 6,26" fill="white"/>
          </svg>
        </button>
      </div>
    </div>
  )

  // ── מסך סיום ──
  if (screen === 'end') {
    const stars = correctCount >= 3 ? 3 : correctCount >= 2 ? 2 : 1
    return (
      <div style={baseStyle}>
        <div style={{
          background:`linear-gradient(135deg, ${COLORS.hunter}, #243328)`,
          borderRadius:24, padding:'40px 48px', maxWidth:420, width:'100%',
          boxShadow:'0 20px 60px rgba(0,0,0,0.5)',
          textAlign:'center',
        }}>
          <div style={{ fontSize:64, marginBottom:16 }}>
            {stars===3 ? '🏆' : stars===2 ? '🌟' : '💪'}
          </div>
          <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:32, color:COLORS.dustGrey, margin:0 }}>
            {stars===3 ? 'כל הכבוד!' : stars===2 ? 'יפה מאוד!' : 'המשיכו להתאמן!'}
          </h2>
          <div style={{ fontSize:56, fontWeight:700, color:COLORS.fern, fontFamily:"'Fredoka One',cursive", margin:'16px 0 8px' }}>
            {'⭐'.repeat(stars)}
          </div>
          <div style={{ color:COLORS.drySage, fontSize:15, marginBottom:28 }}>
            {correctCount} מתוך {totalExercises} תרגילים
          </div>
          <button onClick={() => router.back()} style={{
            width:'100%', padding:14, borderRadius:14, border:'none', cursor:'pointer',
            background:`linear-gradient(135deg, ${COLORS.fern}, ${COLORS.hunter})`,
            color:'#fff', fontSize:18, fontFamily:"'Fredoka One',cursive",
            boxShadow:'0 6px 20px rgba(88,129,87,0.4)',
          }}>המשך</button>
        </div>
      </div>
    )
  }

  // ── מסך משחק ──
  const mins = String(Math.floor(timeLeft/60)).padStart(2,'0')
  const secs = String(timeLeft%60).padStart(2,'0')
  const timeRed = timeLeft < 60

  return (
    <div style={{ ...baseStyle, justifyContent:'flex-start', padding:'12px 16px' }}>
      {/* header */}
      <div style={{ width:'100%', maxWidth:900, marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6 }}>
          <button onClick={() => { timerRef.current && clearInterval(timerRef.current); router.back() }} style={{
            width:36, height:36, borderRadius:10, border:'none', cursor:'pointer',
            background:'rgba(255,255,255,0.08)', color:COLORS.drySage,
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <polyline points="11,3 5,9 11,15" stroke="#a3b18a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div style={{ flex:1 }}>
            <ProgressBar current={completed.filter(Boolean).length} total={totalExercises} />
          </div>
          <div style={{
            padding:'4px 14px', borderRadius:20,
            background: timeRed ? 'rgba(200,60,60,0.3)' : 'rgba(88,129,87,0.2)',
            border: timeRed ? '1px solid rgba(220,80,80,0.5)' : `1px solid rgba(88,129,87,0.3)`,
            color: timeRed ? '#f08080' : COLORS.drySage,
            fontSize:16, fontWeight:700,
            animation: timeRed ? 'pulse 1s infinite' : 'none',
          }}>{mins}:{secs}</div>
        </div>
      </div>

      <div style={{ width:'100%', maxWidth:900, display:'flex', gap:16, flex:1, alignItems:'stretch' }}>
        {/* coins panel */}
        <div style={{
          flex:'0 0 240px',
          background:`linear-gradient(160deg, ${COLORS.hunter}, #1e2c22)`,
          borderRadius:20, padding:14,
          border:`1px solid rgba(163,177,138,0.15)`,
          boxShadow:'0 8px 24px rgba(0,0,0,0.3)',
          overflow:'hidden',
        }}>
          <CoinsPanel exercise={curExercise} partialAnswer={answers} />
        </div>

        {/* game panel */}
        <div
          ref={gameAreaRef}
          style={{
            flex:1,
            background:`linear-gradient(160deg, ${COLORS.hunter}, #1e2c22)`,
            borderRadius:20,
            border:`1px solid rgba(163,177,138,0.15)`,
            boxShadow:'0 8px 24px rgba(0,0,0,0.3)',
            display:'flex', flexDirection:'column',
            position:'relative', overflow:'hidden',
          }}
        >
          {/* digit bank */}
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'14px 16px 10px 16px',
            borderBottom:`1px solid rgba(163,177,138,0.1)`,
            flexShrink:0,
          }}>
            <DigitBank onDragStart={handleDragStart} />
            <div style={{ color:COLORS.drySage, fontSize:13, alignSelf:'flex-start' }}>
              תרגיל {exIdx+1}/{totalExercises}
            </div>
          </div>

          {/* floating digits */}
          {floatingDigits.map(fd => (
            <div
              key={fd.id}
              onMouseDown={(e) => handleDragStart(e, fd.digit, false, fd.id)}
              onTouchStart={(e) => handleDragStart(e, fd.digit, false, fd.id)}
              style={{
                position:'absolute', left:fd.x, top:fd.y,
                transform:'translate(-50%,-50%)',
                fontSize:30, fontWeight:700, color:COLORS.dustGrey,
                cursor:'grab', userSelect:'none', zIndex:5,
                lineHeight:1, pointerEvents:'auto',
              }}
            >{fd.digit}</div>
          ))}

          {/* dragons */}
          {dragons.map((d, i) => (
            <DragonFall key={d.id} idx={i} rect={d.rect} />
          ))}

          {/* exercise area */}
          <div style={{
            flex:1, display:'flex', alignItems:'center', justifyContent:'center',
            padding:'16px 20px 20px 20px', position:'relative',
          }}>
            {eggPhase === 'cracking' && (
              <EggCrack onDone={(rect) => {
                setEggPhase('done')
                setDragons(prev => [...prev, { id: Date.now(), rect }])
              }} />
            )}
            <div ref={boardRef}>
              <VerticalExercise
                exercise={curExercise}
                answers={answers}
                errorIdx={errorIdx}
                hintMsg={hintMsg}
                dropTargetIdx={dragOverBoard}
                onDragOverCell={setDragOverBoard}
                boardRef={boardRef}
              />
            </div>
          </div>

          {/* trash */}
          <div ref={trashRef} style={{ position:'absolute', bottom:14, left:14, zIndex:3 }}>
            <TrashBin isOver={dragOverTrash} />
          </div>

          {/* success overlay */}
          {showSuccess && (
            <div style={{
              position:'absolute', inset:0,
              background:'rgba(20,40,25,0.9)', borderRadius:20,
              display:'flex', flexDirection:'column',
              alignItems:'center', justifyContent:'center',
              zIndex:10,
            }}>
              <div style={{ fontSize:72, animation:'bounce 0.6s ease infinite' }}>🎉</div>
              <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:32, color:COLORS.dustGrey, marginTop:12 }}>
                כל הכבוד!
              </div>
              <div style={{ color:COLORS.drySage, fontSize:16, margin:'8px 0 24px', direction:'ltr' }}>
                {curExercise.a} + {curExercise.b} = {curExercise.answer}
              </div>
              <button onClick={nextExercise} style={{
                padding:'14px 32px', borderRadius:14, border:'none', cursor:'pointer',
                background:`linear-gradient(135deg, ${COLORS.fern}, ${COLORS.hunter})`,
                color:'#fff', fontSize:18, fontFamily:"'Fredoka One',cursive",
                boxShadow:'0 6px 20px rgba(88,129,87,0.4)',
              }}>
                {exIdx + 1 < exercises.length ? 'תרגיל הבא ➡️' : 'סיום 🏁'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
