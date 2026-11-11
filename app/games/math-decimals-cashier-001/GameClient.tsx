'use client'

// הקופה של קנג'י — פעולות חשבון במספרים עשרוניים (כיתה ה')
// הילד מחשב כמה לשלם על הקנייה: חיבור, כפל (כמה יחידות) וחיסור (הנחה).
// קושי: שאלות 1–2 פעולה אחת, 3–4 שתי פעולות, 5 שלוש פעולות.

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Varela_Round, Rubik } from 'next/font/google'
import GameBackButton from '@/components/GameBackButton'

const varela = Varela_Round({ weight: '400', subsets: ['hebrew', 'latin'] })
const rubik = Rubik({ weight: ['500', '700', '800'], subsets: ['hebrew', 'latin'] })

const GAME_ID = 'math-decimals-cashier-001'
const BG_IMAGE = '/art/games/math-decimals-cashier-001-game-bg.jpg' // רקע בתוך המשחק — להחליף בארט האמיתי
const TOTAL_QUESTIONS = 5
const MAX_MISTAKES = 6 // בטעות השישית העכביש נוגע בראש
const TIME_PER_Q = 60
const MAX_TIP = 300 // אגורות — טיפ מקסימלי כשעונים מהר

// ── מוצרים ──────────────────────────────────────────────────
type Product = { emoji: string; one: string; many: string }
const PRODUCTS: Product[] = [
  { emoji: '🌽', one: 'תירס', many: 'קלחי תירס' },
  { emoji: '🍅', one: 'עגבנייה', many: 'עגבניות' },
  { emoji: '🥖', one: 'באגט', many: 'באגטים' },
  { emoji: '🥛', one: 'קרטון חלב', many: 'קרטוני חלב' },
  { emoji: '🍎', one: 'תפוח', many: 'תפוחים' },
  { emoji: '🍌', one: 'בננה', many: 'בננות' },
  { emoji: '🧀', one: 'גבינה', many: 'גבינות' },
  { emoji: '🍫', one: 'שוקולד', many: 'שוקולדים' },
  { emoji: '🥒', one: 'מלפפון', many: 'מלפפונים' },
  { emoji: '🍋', one: 'לימון', many: 'לימונים' },
  { emoji: '🥑', one: 'אבוקדו', many: 'אבוקדואים' },
  { emoji: '🍪', one: 'עוגייה', many: 'עוגיות' },
  { emoji: '🧃', one: 'מיץ', many: 'מיצים' },
  { emoji: '🍙', one: 'אוניגירי', many: 'אוניגירים' },
  { emoji: '🍡', one: 'שיפוד דנגו', many: 'שיפודי דנגו' },
  { emoji: '🍩', one: 'סופגנייה', many: 'סופגניות' },
  { emoji: '🥕', one: 'גזר', many: 'גזרים' },
  { emoji: '🍉', one: 'אבטיח', many: 'אבטיחים' },
]

const GREETINGS = [
  'בוקר טוב חנה! כובע יפה 🎩',
  'מה נשמע אחותי? 😎',
  'אחי!! מלא זמן לא התראינו! ...מאתמול 😅',
  'סליחה, נרדמתי על הקופה 😴',
  'ברוכים הבאים! היום יש מבצע על חיוכים — חינם 😁',
  'וואו, איזה תור ארוך היום... אה, זה רק אתם 🙃',
  'שלום שלום! הבאתם שקית? לא? גם אני לא 🛍️',
  'אוי, שוב העכביש הזה מסתובב פה... לא משנה 🕷️',
  'היי! אתם נראים כמו מישהו שיודע לחשב 🧠',
  'מה קורה אלופים? 🏆 עוד יום, עוד קופה',
  'יו, איזה נעליים! הן עלו יותר מהקנייה? 👟',
  'שלום משה! ...אה, אתם לא משה. גם טוב 🤷',
]
const CORRECT_LINES = ['בדיוק! הקופה שמחה 💰', 'מושלם! אפשר להעסיק אתכם פה 😄', 'וואו, יותר מהר מהמחשבון שלי! 🧮', 'צ\'ינג! תודה רבה ושיהיה יום מתוק 🍬']
const WRONG_LINES = ['אממ... זה לא מסתדר לי בקופה 🤔 נסו שוב', 'רגע, משהו פה לא סוגר... עוד פעם? 🧐', 'אוי! העכביש מתקרב... תבדקו שוב 😰']

// ── חישובים (הכול באגורות כדי לא להסתבך עם שגיאות עיגול) ─────
type Item = { p: Product; qty: number; price: number }
type Order = { items: Item[]; discount: number; total: number; ops: number; greeting: string }

const fmt = (ag: number) => (ag / 100).toFixed(2)
const rnd = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1))
const randPrice = (max = 990) => 110 + 10 * rnd(0, (max - 110) / 10) // 1.10–9.90, קפיצות של 10 אגורות
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]

// מבנה הזמנה: כמויות ('n' = כמה יחידות → כפל) + האם יש הנחה
// מספר הפעולות = (מוצרים - 1) חיבורים + מספר ה-'n' כפלים + הנחה
type Shape = { qtys: ('n' | 1)[]; disc: boolean }
const SHAPES: Record<number, Shape[]> = {
  1: [{ qtys: ['n'], disc: false }, { qtys: [1, 1], disc: false }],
  2: [{ qtys: ['n', 1], disc: false }, { qtys: [1, 1], disc: true }, { qtys: ['n'], disc: true }, { qtys: [1, 1, 1], disc: false }],
  3: [{ qtys: ['n', 1], disc: true }, { qtys: ['n', 'n'], disc: false }, { qtys: [1, 1, 1], disc: true }, { qtys: ['n', 1, 1], disc: false }],
}

function generateOrder(index: number): Order {
  const ops = index < 2 ? 1 : index < 4 ? 2 : 3
  const shape = pick(SHAPES[ops])
  const pool = [...PRODUCTS].sort(() => Math.random() - 0.5)
  const items: Item[] = shape.qtys.map((q, i) => ({ p: pool[i], qty: q === 'n' ? rnd(2, 5) : 1, price: randPrice() }))
  const sum = items.reduce((s, it) => s + it.qty * it.price, 0)
  // הנחה באותו טווח (1.10–9.90) ותמיד קטנה מהסכום
  const discount = shape.disc ? randPrice(Math.min(990, Math.floor((sum - 50) / 10) * 10)) : 0
  return { items, discount, total: sum - discount, ops, greeting: pick(GREETINGS) }
}

function describe(order: Order) {
  const parts = order.items.map(it =>
    it.qty > 1 ? `${it.qty} ${it.p.many} ב־₪${fmt(it.price)} ליחידה` : `${it.p.one} ב־₪${fmt(it.price)}`)
  const list = parts.length > 1 ? parts.slice(0, -1).join(', ') + ', ו' + parts[parts.length - 1] : parts[0]
  return { list, discount: order.discount ? `וקיבלתם הנחה של ₪${fmt(order.discount)} 🎉` : '' }
}

function parseAgorot(s: string): number | null {
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null
  const [i, f = ''] = s.split('.')
  return Number(i) * 100 + Number(f.padEnd(2, '0'))
}

// ── סאונד (Web Audio, בלי קבצים) ─────────────────────────────
let audioCtx: AudioContext | null = null
function ac() {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}
function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.15, when = 0, slideTo?: number) {
  try {
    const c = ac(), t = c.currentTime + when
    const o = c.createOscillator(), g = c.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    o.connect(g).connect(c.destination)
    o.start(t); o.stop(t + dur + 0.02)
  } catch {}
}
function noise(dur: number, vol = 0.1, when = 0) {
  try {
    const c = ac(), t = c.currentTime + when
    const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
    const s = c.createBufferSource(), g = c.createGain(), hp = c.createBiquadFilter()
    hp.type = 'highpass'; hp.frequency.value = 3000
    s.buffer = buf; g.gain.value = vol
    s.connect(hp).connect(g).connect(c.destination)
    s.start(t)
  } catch {}
}
const sfx = {
  key: () => tone(900, 0.05, 'square', 0.04),
  pop: () => tone(500, 0.1, 'sine', 0.12, 0, 900),
  coin: () => { // צ'ינג של קופה + מטבעות
    noise(0.08, 0.15)
    tone(1318, 0.12, 'triangle', 0.18, 0.02)
    tone(1760, 0.35, 'triangle', 0.18, 0.1)
    tone(2637, 0.4, 'sine', 0.08, 0.1)
    ;[0.3, 0.38, 0.45, 0.55].forEach((w, i) => tone(3000 + i * 400, 0.06, 'sine', 0.06, w))
  },
  wrong: () => { tone(260, 0.18, 'sawtooth', 0.1, 0, 200); tone(180, 0.3, 'sawtooth', 0.1, 0.18, 120) },
  spider: () => { tone(500, 0.9, 'sine', 0.07, 0.1, 140); tone(510, 0.9, 'triangle', 0.04, 0.1, 150) },
  tick: () => tone(1400, 0.03, 'square', 0.03),
  win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, 'triangle', 0.15, i * 0.11)),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.35, 'sawtooth', 0.08, i * 0.18)),
}

type SDK = { emit: (event: string, data: Record<string, unknown>) => void }
function sdk() { return (window as unknown as { MathPlatformSDK?: SDK }).MathPlatformSDK }

type Mood = 'waiting' | 'happy' | 'scared' | 'sad'
type Phase = 'greet' | 'order' | 'paid' | 'won' | 'lost'

// גבות: לכל הבעה — הזזה אנכית וזווית (הגבה הימנית במראה)
const BROWS: Record<Mood, { y: number; r: number }> = {
  waiting: { y: -2, r: 0 },
  happy: { y: -9, r: 4 },
  scared: { y: -14, r: -14 },
  sad: { y: -3, r: -18 },
}

export default function GameClient() {
  const router = useRouter()
  const [qIndex, setQIndex] = useState(0)
  const [order, setOrder] = useState<Order | null>(null)
  const [phase, setPhase] = useState<Phase>('greet')
  const [input, setInput] = useState('')
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q)
  const [mistakes, setMistakes] = useState(0)
  const [attempt, setAttempt] = useState(1)
  const [register, setRegister] = useState(0)
  const [tempMood, setTempMood] = useState<Mood | null>(null)
  const [line, setLine] = useState<string | null>(null) // תגובת הקופאי לתשובה
  const [floaters, setFloaters] = useState<{ id: number; text: string; tip?: boolean }[]>([])
  const [stars, setStars] = useState(0)

  const pointer = useRef({ x: 0, y: 0 })
  const spiderMovedAt = useRef(0)
  const moodTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const eyeRefs = [useRef<SVGEllipseElement>(null), useRef<SVGEllipseElement>(null)]
  const pupilRefs = [useRef<SVGGElement>(null), useRef<SVGGElement>(null)]
  const eyesGroup = useRef<SVGGElement>(null)
  const spiderRef = useRef<SVGGElement>(null)

  const spiderStep = Math.min(mistakes, MAX_MISTAKES)
  const baseMood: Mood = phase === 'lost' || spiderStep >= 4 ? 'scared' : 'waiting'
  const mood = tempMood ?? baseMood

  const flashMood = useCallback((m: Mood, ms: number) => {
    if (moodTimer.current) clearTimeout(moodTimer.current)
    setTempMood(m)
    moodTimer.current = setTimeout(() => setTempMood(null), ms)
  }, [])

  // התחלה: SDK + הזמנה ראשונה (Math.random רק בצד לקוח)
  useEffect(() => {
    setOrder(generateOrder(0))
    pointer.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const script = document.createElement('script')
    script.src = '/sdk/mathplatform-sdk-v1.js'
    script.onload = () => sdk()?.emit('GAME_STARTED', { gameId: GAME_ID })
    document.head.appendChild(script)
  }, [])

  // עיניים: עוקבות אחרי העכבר/המגע, ואחרי העכביש כשהוא זז
  useEffect(() => {
    const onMove = (e: PointerEvent) => { pointer.current = { x: e.clientX, y: e.clientY } }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerdown', onMove)
    const cur = [{ x: 0, y: 0 }, { x: 0, y: 0 }]
    let raf = 0
    const loop = () => {
      let target = pointer.current
      if (Date.now() - spiderMovedAt.current < 2500 && spiderRef.current) {
        const r = spiderRef.current.getBoundingClientRect()
        target = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
      }
      eyeRefs.forEach((eye, i) => {
        const pupil = pupilRefs[i].current
        if (!eye.current || !pupil) return
        const r = eye.current.getBoundingClientRect()
        const dx = target.x - (r.left + r.width / 2), dy = target.y - (r.top + r.height / 2)
        const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 160)
        cur[i].x += ((dx / d) * 9 * k - cur[i].x) * 0.25
        cur[i].y += ((dy / d) * 12 * k - cur[i].y) * 0.25
        pupil.setAttribute('transform', `translate(${cur[i].x.toFixed(2)} ${cur[i].y.toFixed(2)})`)
      })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onMove)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // מצמוץ
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const blink = () => {
      const g = eyesGroup.current
      if (g) { g.style.transform = 'scaleY(0.1)'; setTimeout(() => { g.style.transform = '' }, 130) }
      t = setTimeout(blink, 2500 + Math.random() * 3000)
    }
    t = setTimeout(blink, 2000)
    return () => clearTimeout(t)
  }, [])

  const mistakesRef = useRef(0)
  const addMistake = useCallback(() => {
    const next = mistakesRef.current + 1
    mistakesRef.current = next
    setMistakes(next)
    spiderMovedAt.current = Date.now()
    setTimeout(sfx.spider, 250)
    if (next >= MAX_MISTAKES) {
      setTimeout(() => { setPhase('lost'); sfx.lose() }, 1300)
    }
  }, [])

  // שעון — רץ רק בזמן שמקלידים תשובה. כשנגמר: רק אין טיפ (בלי עונש, בלי עכביש)
  useEffect(() => {
    if (phase !== 'order' || timeLeft <= 0) return
    const t = setTimeout(() => {
      const next = timeLeft - 1
      setTimeLeft(next)
      if (next <= 10 && next > 0) sfx.tick()
    }, 1000)
    return () => clearTimeout(t)
  }, [phase, timeLeft])

  function reveal() {
    if (phase !== 'greet') return
    sfx.pop()
    setPhase('order')
  }

  function press(k: string) {
    if (phase !== 'order') return
    sfx.key()
    setInput(v => {
      if (k === '⌫') return v.slice(0, -1)
      if (k === '.') return v.includes('.') ? v : (v || '0') + '.'
      if (v.length >= 6) return v
      if (v.includes('.') && v.split('.')[1].length >= 2) return v
      if (v === '0') return k
      return v + k
    })
  }

  function pay() {
    if (phase !== 'order' || !order) return
    const val = parseAgorot(input)
    if (val === null) return
    const correct = val === order.total
    sdk()?.emit('ANSWER', {
      correct,
      questionId: `q-${qIndex + 1}`,
      questionType: `decimal-ops-${order.ops}`,
      correctAnswer: fmt(order.total),
      childAnswer: input,
      attemptNumber: attempt,
    })

    if (correct) {
      sfx.coin()
      const tip = timeLeft > 0 ? Math.round((timeLeft / TIME_PER_Q) * (MAX_TIP / 10)) * 10 : 0
      setRegister(r => r + order.total + tip)
      const id = Date.now()
      setFloaters(f => [...f, { id, text: `+₪${fmt(order.total)}` }, ...(tip ? [{ id: id + 1, text: `טיפ על מהירות +₪${fmt(tip)} ⚡`, tip: true }] : [])])
      setTimeout(() => setFloaters(f => f.filter(x => x.id !== id && x.id !== id + 1)), 2000)
      setLine(pick(CORRECT_LINES))
      flashMood('happy', 2200)
      setPhase('paid')
      setTimeout(() => next(), 2400)
    } else {
      sfx.wrong()
      setAttempt(a => a + 1)
      setInput('')
      setLine(pick(WRONG_LINES))
      flashMood('sad', 1500)
      addMistake()
    }
  }

  function next() {
    const n = qIndex + 1
    if (n >= TOTAL_QUESTIONS) {
      // כוכבים לפי מספר טעויות (כולל זמן שנגמר) — מטבעות: 3⭐=+10, 2⭐=+7, 1⭐=+3
      const m = mistakesRef.current
      const s = m <= 1 ? 3 : m <= 3 ? 2 : 1
      setStars(s)
      sdk()?.emit('GAME_OVER', {
        score: Math.max(0, 100 - m * 15),
        maxScore: 100,
        stars: s,
        correctAnswers: TOTAL_QUESTIONS,
        totalQuestions: TOTAL_QUESTIONS,
      })
      setPhase('won')
      sfx.win()
      flashMood('happy', 999999)
      return
    }
    setQIndex(n)
    setOrder(generateOrder(n))
    setPhase('greet')
    setInput('')
    setTimeLeft(TIME_PER_Q)
    setAttempt(1)
    setLine(null)
  }

  function restart() {
    setQIndex(0); setOrder(generateOrder(0)); setPhase('greet'); setInput('')
    setTimeLeft(TIME_PER_Q); setAttempt(1); setMistakes(0); mistakesRef.current = 0; setRegister(0); setLine(null); setTempMood(null)
  }

  // מקלדת
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === 'greet' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); reveal(); return }
      if (phase !== 'order') return
      if (/^\d$/.test(e.key)) press(e.key)
      else if (e.key === '.' || e.key === ',' || e.key === 'Decimal' || e.code === 'Period' || e.code === 'NumpadDecimal' || e.code === 'Comma') press('.')
      else if (e.key === 'Backspace') press('⌫')
      else if (e.key === 'Enter') pay()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const desc = order ? describe(order) : null
  const spiderY = -232 + spiderStep * ((22 + 232) / MAX_MISTAKES) // 22 = נוגע בשיער
  const brow = BROWS[mood]
  const timerPct = timeLeft / TIME_PER_Q
  const KEYS_TOP = ['1', '2', '3', '4', '5']
  const KEYS_BOTTOM = ['6', '7', '8', '9', '0']

  return (
    <div className={`kc-root ${varela.className}`} style={{ backgroundImage: `url('${BG_IMAGE}')` }}>
      <style>{CSS}</style>
      <style>{`.kc-num{font-family:${rubik.style.fontFamily}}`}</style>
      <GameBackButton />

      {/* ── HUD ── */}
      <div className="kc-hud">
        <div className="kc-progress">
          {Array.from({ length: TOTAL_QUESTIONS }, (_, i) => (
            <div key={i} className={`kc-seg ${i < qIndex || (i === qIndex && (phase === 'paid' || phase === 'won')) ? 'done' : i === qIndex ? 'now' : ''}`}>
              <span className="kc-num">{i + 1}</span>
            </div>
          ))}
        </div>
        <div className="kc-money"><span>💰 בקופה</span> <b className="kc-num">₪{fmt(register)}</b></div>
      </div>

      <div className="kc-main">
        {/* ── שמאל: שעון, קופאי, עכביש, בועה, מוצרים ── */}
        <div className="kc-left">
          <div className="kc-stage">
            {/* שעון בצד */}
            <div className={`kc-timer ${timeLeft <= 10 && phase === 'order' ? 'urgent' : ''}`}>
              <svg viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="32" className="kc-timer-bg" />
                <circle cx="40" cy="40" r="32" className="kc-timer-fg"
                  strokeDasharray={`${2 * Math.PI * 32}`} strokeDashoffset={`${2 * Math.PI * 32 * (1 - timerPct)}`} />
              </svg>
              <div className="kc-timer-txt kc-num">{timeLeft}</div>
              <div className="kc-timer-lbl">{timeLeft > 0 ? 'טיפ ⚡' : 'בלי טיפ'}</div>
            </div>

            {/* קופאי + עכביש */}
            <svg className="kc-cashier" viewBox="0 -260 300 620" aria-label="קנג'י הקופאי">
              {/* חוט + עכביש */}
              <g ref={spiderRef} className="kc-spider" style={{ transform: `translateY(${spiderY}px)` }}>
                <line x1="150" y1="-700" x2="150" y2="-18" stroke="#2b2d42" strokeWidth="2" />
                <g className="kc-legs">
                  {[-1, 1].map(side => [0, 1, 2, 3].map(i => (
                    <path key={`${side}${i}`} d={`M${150 + side * 14} ${-6 + i * 5} q${side * 18} ${-14 + i * 6} ${side * 30} ${2 + i * 7}`}
                      stroke="#1b1b2f" strokeWidth="4" fill="none" strokeLinecap="round" />
                  )))}
                </g>
                <circle cx="150" cy="0" r="20" fill="#1b1b2f" />
                <circle cx="150" cy="-4" r="20" fill="#2d2d4a" opacity=".6" />
                <circle cx="143" cy="-3" r="5" fill="#ff2e63" />
                <circle cx="157" cy="-3" r="5" fill="#ff2e63" />
                <circle cx="144" cy="-4" r="1.6" fill="#fff" />
                <circle cx="158" cy="-4" r="1.6" fill="#fff" />
                <path d="M138 -11 L147 -7 M162 -11 L153 -7" stroke="#ff2e63" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M141 8 Q150 14 159 8" stroke="#fff" strokeWidth="2" fill="none" />
                <path d="M144 9 l2 5 l2 -4 M152 9 l2 5 l2 -5" fill="#fff" />
              </g>

              {/* גוף */}
              <path d="M40 360 Q45 268 150 258 Q255 268 260 360 Z" fill="#f8f9fa" stroke="#2b2d42" strokeWidth="5" />
              <path d="M88 360 L95 285 Q150 300 205 285 L212 360 Z" fill="#2ec4b6" stroke="#2b2d42" strokeWidth="5" />
              <rect x="160" y="305" width="38" height="18" rx="4" fill="#fff" stroke="#2b2d42" strokeWidth="3" />
              <text x="179" y="319" fontSize="11" textAnchor="middle" fill="#2b2d42">קנג׳י</text>
              <rect x="135" y="235" width="30" height="30" fill="#ffd9c0" stroke="#2b2d42" strokeWidth="4" />
              {/* פנים */}
              <ellipse cx="150" cy="160" rx="88" ry="92" fill="#ffe3cf" stroke="#2b2d42" strokeWidth="5" />
              {/* שיער אנימה */}
              <path d="M58 150 Q50 60 120 48 L112 22 L145 45 L160 14 L172 46 L205 24 L195 55 Q252 75 242 150 Q232 110 205 98 L200 120 L182 96 L165 118 L150 92 L132 118 L120 96 L100 122 L96 98 Q70 110 58 150 Z"
                fill="#3a3f7a" stroke="#2b2d42" strokeWidth="5" strokeLinejoin="round" />
              <path d="M120 55 Q140 48 165 52" stroke="#7b83d6" strokeWidth="5" fill="none" strokeLinecap="round" />
              {/* גבות */}
              <path d="M92 122 Q115 110 138 120" stroke="#2b2d42" strokeWidth="7" fill="none" strokeLinecap="round" className="kc-brow"
                style={{ transform: `translateY(${brow.y}px) rotate(${brow.r}deg)` }} />
              <path d="M162 120 Q185 110 208 122" stroke="#2b2d42" strokeWidth="7" fill="none" strokeLinecap="round" className="kc-brow"
                style={{ transform: `translateY(${brow.y}px) rotate(${-brow.r}deg)` }} />
              {/* עיניים */}
              <g ref={eyesGroup} className="kc-eyes">
                {[115, 185].map((cx, i) => (
                  <g key={cx}>
                    <ellipse ref={eyeRefs[i]} cx={cx} cy="165" rx="24" ry="30" fill="#fff" stroke="#2b2d42" strokeWidth="4" />
                    <g ref={pupilRefs[i]}>
                      <ellipse cx={cx} cy="167" rx="15" ry="18" fill="url(#kcIris)" />
                      <ellipse cx={cx} cy="168" rx="7" ry="9" fill="#141428" />
                      <circle cx={cx - 6} cy="159" r="5" fill="#fff" />
                      <circle cx={cx + 5} cy="174" r="2.4" fill="#fff" />
                    </g>
                  </g>
                ))}
              </g>
              <defs>
                <linearGradient id="kcIris" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#1d3557" />
                  <stop offset="1" stopColor="#4cc9f0" />
                </linearGradient>
              </defs>
              {/* לחיים */}
              <ellipse cx="92" cy="205" rx="14" ry="7" fill="#ff8fab" opacity={mood === 'happy' ? 0.85 : 0.45} />
              <ellipse cx="208" cy="205" rx="14" ry="7" fill="#ff8fab" opacity={mood === 'happy' ? 0.85 : 0.45} />
              {/* פה */}
              {mood === 'waiting' && <path d="M136 214 Q150 224 164 214" stroke="#2b2d42" strokeWidth="4" fill="none" strokeLinecap="round" />}
              {mood === 'happy' && <g><path d="M124 206 Q150 248 176 206 Z" fill="#7a2e3a" stroke="#2b2d42" strokeWidth="4" strokeLinejoin="round" /><path d="M138 226 Q150 236 162 226 Q150 220 138 226" fill="#ff6b81" /></g>}
              {mood === 'scared' && <ellipse cx="150" cy="222" rx="11" ry="15" fill="#7a2e3a" stroke="#2b2d42" strokeWidth="4" />}
              {mood === 'sad' && <path d="M132 226 Q150 210 168 226" stroke="#2b2d42" strokeWidth="4" fill="none" strokeLinecap="round" />}
              {/* אפקטים לפי הבעה */}
              {mood === 'scared' && <path d="M232 110 q8 14 0 20 q-8 -6 0 -20 Z" fill="#8ecae6" stroke="#2b2d42" strokeWidth="2" className="kc-sweat" />}
              {mood === 'sad' && <path d="M100 196 q6 12 0 17 q-6 -5 0 -17 Z" fill="#8ecae6" stroke="#2b2d42" strokeWidth="2" className="kc-tear" />}
              {mood === 'happy' && <g className="kc-sparkles" fill="#ffd166" stroke="#2b2d42" strokeWidth="2">
                <path d="M40 90 l5 12 l12 5 l-12 5 l-5 12 l-5 -12 l-12 -5 l12 -5 Z" />
                <path d="M258 80 l4 9 l9 4 l-9 4 l-4 9 l-4 -9 l-9 -4 l9 -4 Z" />
              </g>}
            </svg>

            {/* בועת דיבור */}
            {order && desc && (
              <div className={`kc-bubble ${phase === 'greet' ? 'clickable' : ''}`} onClick={reveal} key={`b-${qIndex}`}>
                {phase === 'greet' ? (
                  <>
                    <div className="kc-say">{order.greeting}</div>
                    <div className="kc-tap">👆 לחצו להמשך</div>
                  </>
                ) : (
                  <>
                    {line ? <div className={`kc-say kc-line ${phase === 'paid' ? 'ok' : 'err'}`}>{line}</div> : null}
                    <div className="kc-say">אוקיי, אז אתם רוצים לקנות: <b>{desc.list}</b>.</div>
                    {desc.discount && <div className="kc-say kc-disc">{desc.discount}</div>}
                    {phase === 'order' && <div className="kc-hint">תקלידו את התשלום שתרצו לבצע 👇</div>}
                  </>
                )}
              </div>
            )}
          </div>

          {/* דלפק מוצרים */}
          {order && (
            <div className="kc-counter" key={`c-${qIndex}`}>
              {order.items.map((it, i) => (
                <div key={i} className="kc-item" style={{ animationDelay: `${i * 0.15}s` }}>
                  <div className="kc-emoji">{it.p.emoji}</div>
                  {it.qty > 1 && <div className="kc-qty kc-num">×{it.qty}</div>}
                  <div className="kc-tag kc-num">₪{fmt(it.price)}</div>
                  <div className="kc-name">{it.p.one}</div>
                </div>
              ))}
              {order.discount > 0 && phase !== 'greet' && (
                <div className="kc-item kc-coupon">
                  <div className="kc-emoji">✂️</div>
                  <div className="kc-tag kc-num">−₪{fmt(order.discount)}</div>
                  <div className="kc-name">הנחה</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── ימין: הקופה ── */}
        <div className="kc-register">
          {floaters.map(f => <div key={f.id} className={`kc-float kc-num ${f.tip ? 'tip' : ''}`}>{f.text}</div>)}
          <div className="kc-keys-row">
            {KEYS_TOP.map(k => <button key={k} className="kc-key kc-num" onClick={() => press(k)} disabled={phase !== 'order'}>{k}</button>)}
          </div>
          <div className="kc-mid">
            <button className="kc-key kc-del" onClick={() => press('⌫')} disabled={phase !== 'order'} aria-label="מחיקה">⌫</button>
            <div className={`kc-display kc-num ${phase === 'paid' ? 'ok' : ''}`}>
              <span className="kc-cur">₪</span>
              <span className={input ? '' : 'kc-ph'}>{input || '0.00'}</span>
            </div>
            <button className="kc-key kc-dot kc-num" onClick={() => press('.')} disabled={phase !== 'order'} aria-label="נקודה">.</button>
          </div>
          <div className="kc-keys-row">
            {KEYS_BOTTOM.map(k => <button key={k} className="kc-key kc-num" onClick={() => press(k)} disabled={phase !== 'order'}>{k}</button>)}
          </div>
          <button className="kc-pay" onClick={pay} disabled={phase !== 'order' || !input}>שלם 💳</button>
          <div className="kc-lives">
            {Array.from({ length: MAX_MISTAKES }, (_, i) => <span key={i} className={i < spiderStep ? 'used' : ''}>🕸️</span>)}
          </div>
        </div>
      </div>

      {/* ── מסך ניצחון ── */}
      {phase === 'won' && (
        <div className="kc-overlay">
          <div className="kc-modal">
            <div className="kc-big">🎉</div>
            <div className="kc-title">הקופה מלאה! כל הכבוד!</div>
            <div className="kc-stars">{'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}</div>
            <div className="kc-sub">אספתם <b className="kc-num">₪{fmt(register)}</b> לקופה של קנג׳י</div>
            <button className="kc-btn" onClick={() => router.back()}>המשך ▶</button>
          </div>
        </div>
      )}

      {/* ── מסך הפסד ── */}
      {phase === 'lost' && (
        <div className="kc-overlay">
          <div className="kc-modal">
            <div className="kc-big">🕷️😱</div>
            <div className="kc-title">העכביש הגיע לקנג׳י!</div>
            <div className="kc-sub">לא נורא — נסו שוב, הפעם בזהירות</div>
            <button className="kc-btn" onClick={restart}>נסו שוב 🔄</button>
            <button className="kc-btn kc-btn2" onClick={() => router.back()}>יציאה</button>
          </div>
        </div>
      )}
    </div>
  )
}

const CSS = `
.kc-root{min-height:100dvh;direction:rtl;position:relative;overflow:hidden;background-color:#ffe5ec;background-size:cover;background-position:center;
  display:flex;flex-direction:column;gap:10px;padding:14px 16px;color:#2b2d42;user-select:none;-webkit-user-select:none}
.kc-root::before{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,240,245,.35),rgba(205,240,255,.35));pointer-events:none}
.kc-root>*{position:relative}
.kc-hud{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-right:52px;flex-wrap:wrap}
.kc-progress{display:flex;gap:6px}
.kc-seg{width:46px;height:30px;border-radius:15px;background:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;transition:.3s}
.kc-seg.now{background:#ffd166;transform:translateY(-2px)}
.kc-seg.done{background:#2ec4b6;color:#fff}
.kc-money{background:#fff;border-radius:18px;padding:6px 16px;font-size:20px;display:flex;gap:8px;align-items:center}
.kc-money b{font-size:26px;color:#e76f51}
.kc-main{flex:1;display:grid;grid-template-columns:1.25fr 1fr;gap:16px;min-height:0}
.kc-left{display:flex;flex-direction:column;gap:12px;min-width:0}
.kc-stage{flex:1 1 0;position:relative;display:flex;align-items:flex-end;gap:8px;min-height:0}
.kc-cashier{height:100%;max-height:520px;min-height:240px;width:auto;flex-shrink:0;overflow:hidden}
@media (min-width:901px) and (orientation:landscape){.kc-root{height:100dvh}.kc-main{grid-template-rows:minmax(0,1fr)}.kc-left{min-height:0}}
.kc-brow{transform-box:fill-box;transform-origin:center;transition:transform .35s cubic-bezier(.5,1.8,.5,1)}
.kc-eyes{transform-box:fill-box;transform-origin:center;transition:transform .08s}
.kc-spider{transition:transform 1.2s cubic-bezier(.4,0,.3,1.3)}
.kc-legs{animation:kcLegs .5s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:center}
@keyframes kcLegs{from{transform:scaleY(1)}to{transform:scaleY(.85)}}
.kc-sweat{animation:kcDrop 1s ease-in infinite}
.kc-tear{animation:kcDrop 1.2s ease-in infinite}
@keyframes kcDrop{from{transform:translateY(0);opacity:1}to{transform:translateY(18px);opacity:0}}
.kc-sparkles{animation:kcSpark .6s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:center}
@keyframes kcSpark{from{opacity:.4;transform:scale(.8)}to{opacity:1;transform:scale(1.1)}}
.kc-timer{position:absolute;top:0;left:0;width:92px;text-align:center;z-index:2}
.kc-timer svg{width:92px;height:92px;transform:rotate(-90deg)}
.kc-timer-bg{fill:#fff;stroke:#e9ecef;stroke-width:9}
.kc-timer-fg{fill:none;stroke:#2ec4b6;stroke-width:9;stroke-linecap:round;transition:stroke-dashoffset 1s linear,stroke .3s}
.kc-timer.urgent .kc-timer-fg{stroke:#ef476f}
.kc-timer.urgent{animation:kcPulse .5s ease-in-out infinite alternate}
@keyframes kcPulse{to{transform:scale(1.07)}}
.kc-timer-txt{position:absolute;top:0;left:0;width:92px;height:92px;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:800}
.kc-timer-lbl{font-size:14px;margin-top:2px;background:#fff;border-radius:10px;display:inline-block;padding:0 8px}
.kc-bubble{flex:1;align-self:center;background:#fff;border-radius:26px;padding:18px 20px;position:relative;
  font-size:clamp(18px,2.1vw,25px);line-height:1.5;animation:kcPop .35s cubic-bezier(.5,1.8,.5,1);max-width:520px;margin-top:70px}
.kc-bubble::after{content:'';position:absolute;right:-12px;bottom:40px;border-top:12px solid transparent;border-bottom:12px solid transparent;border-left:14px solid #fff}
.kc-bubble.clickable{cursor:pointer}
.kc-bubble.clickable:hover{transform:translateY(-2px)}
@keyframes kcPop{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}
.kc-say b{color:#3a0ca3}
.kc-tap{margin-top:10px;font-size:16px;color:#8d99ae;animation:kcBlinkTxt 1s ease-in-out infinite alternate}
@keyframes kcBlinkTxt{to{opacity:.35}}
.kc-disc{color:#e76f51;margin-top:4px}
.kc-hint{margin-top:10px;font-size:17px;color:#2ec4b6}
.kc-line{font-weight:bold;margin-bottom:6px;padding-bottom:6px;border-bottom:2px dashed #dee2e6}
.kc-line.ok{color:#2a9d8f}
.kc-line.err{color:#ef476f}
.kc-counter{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;background:linear-gradient(#ffd6a5,#fdbb84);border-radius:22px;padding:14px}
.kc-item{position:relative;background:#fff;border-radius:18px;padding:8px 12px 6px;text-align:center;min-width:110px;animation:kcSlide .5s cubic-bezier(.3,1.5,.5,1) both}
@keyframes kcSlide{from{transform:translateX(-120px) rotate(-8deg);opacity:0}to{transform:none;opacity:1}}
.kc-emoji{font-size:clamp(52px,6vw,72px);line-height:1.1}
.kc-qty{position:absolute;top:-12px;left:-12px;background:#ef476f;color:#fff;border-radius:50%;width:46px;height:46px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800}
.kc-tag{background:#ffd166;border-radius:10px;font-size:clamp(24px,2.6vw,32px);font-weight:800;padding:0 10px;margin-top:4px;direction:ltr}
.kc-name{font-size:16px;margin-top:4px}
.kc-coupon{background:#fff0f3}
.kc-coupon .kc-tag{background:#ff8fab}
.kc-register{position:relative;background:linear-gradient(160deg,#cdb4db,#a2d2ff);border-radius:28px;padding:18px;
  display:flex;flex-direction:column;gap:12px;justify-content:center;direction:ltr}
.kc-qty{direction:ltr}
.kc-keys-row{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
.kc-mid{display:grid;grid-template-columns:1fr 3fr 1fr;gap:10px}
.kc-key,.kc-pay,.kc-btn{border:none}
.kc-key{font-size:clamp(26px,3vw,36px);font-weight:800;border-radius:16px;background:#fff;color:#2b2d42;
  padding:10px 0;cursor:pointer;transition:transform .06s,box-shadow .06s;touch-action:manipulation}
.kc-key:active:not(:disabled){transform:scale(.94)}
.kc-key:disabled,.kc-pay:disabled{opacity:.55;cursor:default}
.kc-del{background:#ffadad;font-family:inherit}
.kc-dot{background:#ffd166;font-size:44px;line-height:.6}
.kc-display{background:#1b2f2a;border-radius:16px;color:#7cffc4;font-size:clamp(40px,5vw,60px);font-weight:800;display:flex;align-items:center;
  justify-content:center;gap:8px;direction:ltr;text-shadow:0 0 12px rgba(124,255,196,.6);min-height:86px}
.kc-display.ok{color:#ffd166;text-shadow:0 0 14px rgba(255,209,102,.8)}
.kc-cur{font-size:.6em;opacity:.8}
.kc-ph{opacity:.3}
.kc-pay{font-family:inherit;font-size:clamp(24px,2.6vw,32px);border-radius:18px;background:#2ec4b6;color:#fff;padding:12px;cursor:pointer;touch-action:manipulation}
.kc-pay:active:not(:disabled){transform:scale(.97)}
.kc-lives{display:flex;justify-content:center;gap:6px;font-size:20px}
.kc-lives span.used{filter:grayscale(1);opacity:.3}
.kc-float{position:absolute;top:20%;left:50%;transform:translateX(-50%);font-size:40px;font-weight:800;color:#2a9d8f;-webkit-text-stroke:2px #fff;paint-order:stroke;
  animation:kcFloat 2s ease-out forwards;pointer-events:none;z-index:5;white-space:nowrap;direction:ltr}
.kc-float.tip{top:34%;font-size:26px;color:#e76f51;animation-delay:.25s;opacity:0;direction:rtl}
@keyframes kcFloat{0%{opacity:0;transform:translate(-50%,20px) scale(.7)}15%{opacity:1;transform:translate(-50%,0) scale(1.1)}100%{opacity:0;transform:translate(-50%,-90px) scale(1)}}
.kc-overlay{position:fixed!important;inset:0;background:rgba(43,45,66,.55);display:flex;align-items:center;justify-content:center;z-index:150;padding:16px}
.kc-modal{background:#fff;border-radius:30px;padding:30px;text-align:center;width:min(420px,100%);animation:kcPop .4s cubic-bezier(.5,1.8,.5,1)}
.kc-big{font-size:64px}
.kc-title{font-size:30px;margin:6px 0}
.kc-stars{font-size:44px;margin:8px 0}
.kc-sub{font-size:20px;margin-bottom:18px}
.kc-sub b{color:#e76f51;font-size:26px}
.kc-btn{font-family:inherit;font-size:22px;border-radius:16px;background:#2ec4b6;color:#fff;padding:10px 34px;cursor:pointer;margin:4px}
.kc-btn2{background:#fff;color:#2b2d42}
@media (max-width:900px),(orientation:portrait){
  .kc-main{grid-template-columns:1fr}
  .kc-stage{flex:none;height:max(260px,32vh)}
  .kc-cashier{min-height:0;max-height:100%}
  .kc-counter{padding:10px}
  .kc-emoji{font-size:52px}
  .kc-key{padding:6px 0}
  .kc-display{min-height:64px}
  .kc-register{padding:14px;gap:10px}
  .kc-timer,.kc-timer svg,.kc-timer-txt{width:72px}
  .kc-timer svg,.kc-timer-txt{height:72px}
  .kc-timer-txt{font-size:26px}
  .kc-bubble{margin-top:60px}
}
@media (max-width:560px){
  .kc-stage{flex-direction:column;align-items:center}
  .kc-bubble{margin-top:0;align-self:stretch;max-width:none}
  .kc-bubble::after{display:none}
  .kc-cashier{min-height:220px;max-height:260px}
  .kc-item{min-width:90px}
  .kc-key{padding:8px 0}
}
`
