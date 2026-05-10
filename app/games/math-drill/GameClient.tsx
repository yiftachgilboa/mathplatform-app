'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import GameBackButton from '@/components/GameBackButton'

const GAME_ID_MAP: Record<string, number> = {
  'math-drill-001': 1,
  'math-drill-002': 2,
  'math-drill-003': 3,
}

const TOPICS: Record<string, { label: string }> = {
  decompose:  { label: 'פירוק מספרים' },
  addSub10:   { label: 'חיבור וחיסור עד 10' },
  complete10: { label: 'השלמה לעשר' },
  add20:      { label: 'חיבור עד 20' },
  sub20:      { label: 'חיסור עד 20' },
  add100:     { label: 'חיבור עד 100' },
  sub100:     { label: 'חיסור עד 100' },
  multiply:   { label: 'לוח הכפל' },
  divide:     { label: 'חילוק' },
  addSub1000: { label: 'חיבור וחיסור עד 1000' },
}

function generatePool(topic: string, { multiplyTables, breakingTen }: { multiplyTables: number[], breakingTen: boolean }) {
  const pool: { q: string, a: number, key: string }[] = []
  const add = (q: string, a: number) => pool.push({ q, a, key: topic + ':' + q + '=' + a })

  if (topic === 'decompose') {
    for (let n = 3; n <= 10; n++) for (let a = 1; a < n; a++) add('D|' + n + '|' + a, n - a)
  } else if (topic === 'addSub10') {
    for (let a = 1; a <= 9; a++) for (let b = 1; a + b <= 10; b++) add(a + ' + ' + b, a + b)
    for (let s = 2; s <= 10; s++) for (let b = 1; b < s; b++) add(s + ' − ' + b, s - b)
  } else if (topic === 'complete10') {
    for (let a = 1; a <= 9; a++) add('D|10|' + a, 10 - a)
  } else if (topic === 'add20') {
    for (let a = 1; a <= 10; a++) for (let b = 1; b <= 10; b++) {
      if (a + b > 20) continue
      const crossesTen = (a % 10) + b >= 10 && a + b > 10
      if (breakingTen && !crossesTen) continue
      if (!breakingTen && crossesTen) continue
      add(a + ' + ' + b, a + b)
    }
  } else if (topic === 'sub20') {
    for (let s = 2; s <= 20; s++) for (let b = 1; b < s; b++) {
      const crossesTen = (s > 10 && s - b < 10) || (s <= 10 && b > s % 10 && s % 10 !== 0)
      if (breakingTen && !crossesTen) continue
      if (!breakingTen && crossesTen) continue
      add(s + ' − ' + b, s - b)
    }
  } else if (topic === 'add100') {
    for (let a = 5; a <= 90; a += 5) for (let b = 5; a + b <= 100; b += 5) {
      const crossesTen = Math.floor(a / 10) !== Math.floor((a + b) / 10) && b % 10 !== 0
      if (breakingTen && !crossesTen) continue
      if (!breakingTen && crossesTen) continue
      add(a + ' + ' + b, a + b)
    }
  } else if (topic === 'sub100') {
    for (let s = 20; s <= 100; s += 10) for (let b = 1; b < s && b <= 50; b += 5) {
      const crossesTen = s % 10 < b % 10
      if (breakingTen && !crossesTen) continue
      if (!breakingTen && crossesTen) continue
      add(s + ' − ' + b, s - b)
    }
  } else if (topic === 'multiply') {
    if (!multiplyTables.length) return pool
    for (const t of multiplyTables) for (let b = 1; b <= 10; b++) add(t + ' × ' + b, t * b)
  } else if (topic === 'divide') {
    if (!multiplyTables.length) return pool
    for (const t of multiplyTables.filter(x => x > 0)) for (let b = 1; b <= 10; b++) add((t * b) + ' : ' + t, b)
  } else if (topic === 'addSub1000') {
    for (let a = 100; a <= 900; a += 100) for (let b = 100; a + b <= 1000; b += 100) add(a + ' + ' + b, a + b)
    for (let s = 200; s <= 1000; s += 100) for (let b = 100; b < s; b += 100) add(s + ' − ' + b, s - b)
  }
  return pool
}

function pickWeighted(pool: { q: string, a: number, key: string }[], memory: Record<string, number>, count: number) {
  if (!pool.length) return []
  const w = pool.map(q => ({ ...q, w: Math.max(0.5, 10 / Math.pow(1.6, memory[q.key] || 0)) }))
  const result: typeof pool = [], used = new Set<string>()
  let tries = 0
  while (result.length < count && tries < 1000) {
    tries++
    if (used.size >= w.length) used.clear()
    const avail = w.filter(x => !used.has(x.key))
    if (!avail.length) break
    const total = avail.reduce((s, x) => s + x.w, 0)
    let r = Math.random() * total
    for (const x of avail) { r -= x.w; if (r <= 0) { result.push(x); used.add(x.key); break } }
  }
  return result.slice(0, count)
}

function buildQuestions(
  settings: { topics: string[], multiplyTables: number[], breakingTen: boolean },
  memoryMap: Record<string, number>,
  errorPool: string[]
) {
  const { topics } = settings
  if (!topics || !topics.length) return []

  // עד 3 שאלות ממאגר הטעויות
  const errorQuestions: { q: string, a: number, key: string }[] = []
  for (const key of errorPool.slice(0, 3)) {
    const [topic] = key.split(':')
    const pool = generatePool(topic, settings)
    const match = pool.find(p => p.key === key)
    if (match) errorQuestions.push(match)
  }

  const remaining = 9 - errorQuestions.length
  const n = topics.length
  const perTopic = Math.floor(remaining / n)
  const rem = remaining - perTopic * n
  const result = [...errorQuestions]
  topics.forEach((t, i) => result.push(...pickWeighted(generatePool(t, settings), memoryMap, perTopic + (i < rem ? 1 : 0))))

  // ערבוב
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]]
  }
  return result.slice(0, 9)
}

const TOPICS_BY_GRADE: Record<number, string[]> = {
  1: ['decompose', 'addSub10', 'complete10', 'add20', 'sub20'],
  2: ['add100', 'sub100', 'multiply', 'divide'],
  3: ['multiply', 'divide', 'addSub1000'],
}

function SettingsPanel({ grade, current, onSave, onClose }: {
  grade: number
  current: any
  onSave: (s: any) => void
  onClose: () => void
}) {
  const [loc, setLoc] = useState({ ...current })
  const topicKeys = TOPICS_BY_GRADE[grade]
  const hasMultDiv = loc.topics?.some((t: string) => t === 'multiply' || t === 'divide')
  const hasAddSub = loc.topics?.some((t: string) => ['add20', 'sub20', 'add100', 'sub100'].includes(t))

  const toggleTopic = (k: string) => {
    const cur = loc.topics ?? []
    if (cur.includes(k)) { if (cur.length === 1) return; setLoc({ ...loc, topics: cur.filter((x: string) => x !== k) }) }
    else setLoc({ ...loc, topics: [...cur, k] })
  }
  const toggleTable = (t: number) => {
    const cur = loc.multiplyTables ?? []
    if (cur.includes(t)) { if (cur.length === 1) return; setLoc({ ...loc, multiplyTables: cur.filter((x: number) => x !== t) }) }
    else setLoc({ ...loc, multiplyTables: [...cur, t].sort((a: number, b: number) => a - b) })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, direction: 'rtl' }}>
      <div style={{ background: '#1a3a6b', border: '2px solid #f0a820', borderRadius: 16, padding: '28px 24px', width: 'min(400px,92vw)', color: '#fff', fontFamily: 'var(--font-secular), sans-serif', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ textAlign: 'center', color: '#f0a820', fontSize: 18, fontWeight: 800, marginBottom: 16 }}>הגדרות</div>

        <div style={{ fontSize: 12, color: '#f0a820', marginBottom: 8, fontWeight: 700 }}>נושאים</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {topicKeys.map(k => (
            <button key={k} onClick={() => toggleTopic(k)} style={{
              padding: '10px 8px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700,
              fontFamily: 'var(--font-secular), sans-serif',
              background: loc.topics?.includes(k) ? '#f0a820' : 'rgba(255,255,255,0.08)',
              color: loc.topics?.includes(k) ? '#1a1a1a' : '#fff',
              border: '2px solid ' + (loc.topics?.includes(k) ? '#f0a820' : 'rgba(255,255,255,0.2)'),
            }}>{TOPICS[k]?.label}</button>
          ))}
        </div>

        {hasMultDiv && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#f0a820', marginBottom: 8, fontWeight: 700 }}>כפולות</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[1,2,3,4,5,6,7,8,9,10].map(t => (
                <button key={t} onClick={() => toggleTable(t)} style={{
                  width: 34, height: 34, borderRadius: 7, cursor: 'pointer', fontSize: 14, fontWeight: 700,
                  fontFamily: 'var(--font-secular), sans-serif',
                  background: loc.multiplyTables?.includes(t) ? '#f0a820' : 'rgba(255,255,255,0.08)',
                  color: loc.multiplyTables?.includes(t) ? '#1a1a1a' : '#fff',
                  border: '1px solid ' + (loc.multiplyTables?.includes(t) ? '#f0a820' : 'rgba(255,255,255,0.2)'),
                }}>{t}</button>
              ))}
            </div>
          </div>
        )}

        {hasAddSub && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, marginBottom: 16 }}>
            <input type="checkbox" checked={!!loc.breakingTen} onChange={e => setLoc({ ...loc, breakingTen: e.target.checked })} style={{ width: 17, height: 17, accentColor: '#f0a820' }} />
            עם שבירת עשרת
          </label>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={() => { onSave(loc); onClose() }} style={{ padding: '10px 28px', background: '#f0a820', color: '#1a1a1a', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-secular), sans-serif' }}>שמור</button>
          <button onClick={onClose} style={{ padding: '10px 18px', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontFamily: 'var(--font-secular), sans-serif' }}>ביטול</button>
        </div>
      </div>
    </div>
  )
}

const DEFAULT_SETTINGS_BY_GRADE: Record<number, { topics: string[], multiplyTables: number[], breakingTen: boolean }> = {
  1: { topics: ['add20'], multiplyTables: [], breakingTen: false },
  2: { topics: ['add100'], multiplyTables: [2, 5, 10], breakingTen: false },
  3: { topics: ['multiply', 'divide', 'addSub1000'], multiplyTables: [2, 3, 4, 5], breakingTen: false },
}

export default function GameClient() {
  const searchParams = useSearchParams()
  const GAME_ID = searchParams.get('gameId') ?? 'math-drill-001'
  const GRADE = GAME_ID_MAP[GAME_ID] ?? 1

  const [childId, setChildId] = useState<string | null>(null)
  const [settings, setSettings] = useState<object | null>(null)
  const [memory, setMemory] = useState<object[]>([])
  const [loading, setLoading] = useState(true)

  const [questions, setQuestions] = useState<{ q: string, a: number, key: string }[]>([])
  const [boardOpts, setBoardOpts] = useState<number[]>([])
  const [qIdx, setQIdx] = useState(0)
  const [qVisible, setQVisible] = useState(true)
  const [cubeStates, setCubeStates] = useState<string[]>(Array(9).fill('idle'))
  const [answered, setAnswered] = useState(false)
  const [done, setDone] = useState(false)
  const [score, setScore] = useState(0)
  const [attemptNumber, setAttemptNumber] = useState(1)
  const [showSettings, setShowSettings] = useState(false)

  const router = useRouter()

  function startGame(loadedSettings: any, loadedMemory: any[]) {
    const merged = { ...DEFAULT_SETTINGS_BY_GRADE[GRADE], ...loadedSettings }
    const memoryMap: Record<string, number> = {}
    const errorPool: string[] = []
    for (const row of loadedMemory) {
      memoryMap[row.question_key] = row.correct_count
      if (row.in_error_pool) errorPool.push(row.question_key)
    }
    const qs = buildQuestions(merged, memoryMap, errorPool)
    if (!qs.length) return
    setBoardOpts(qs.map(q => q.a).sort((a, b) => a - b))
    setQuestions(qs)
    setQIdx(0)
    setCubeStates(Array(9).fill('idle'))
    setAnswered(false)
    setDone(false)
    setScore(0)
    setQVisible(true)
    setAttemptNumber(1)
  }

  async function handleAnswer(val: number, ci: number) {
    if (answered || done) return
    const cur = questions[qIdx]
    if (!cur) return
    const ok = val === cur.a

    window.MathPlatformSDK?.emit('ANSWER', {
      correct: ok,
      questionId: cur.key,
      questionType: cur.key.split(':')[0],
      correctAnswer: String(cur.a),
      childAnswer: String(val),
      attemptNumber,
    })

    if (childId) {
      await fetch('/api/question-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, gameId: GAME_ID, questionKey: cur.key, correct: ok }),
      })
    }

    if (ok) {
      setAnswered(true)
      setScore(s => s + 1)
      setCubeStates(prev => { const n = [...prev]; n[ci] = 'correct'; return n })
      setTimeout(() => {
        setCubeStates(prev => { const n = [...prev]; n[ci] = 'gone'; return n })
        const next = qIdx + 1
        if (next >= 9) {
          setDone(true)
          const stars = (score + 1) / 9 >= 0.9 ? 3 : (score + 1) / 9 >= 0.6 ? 2 : 1
          window.MathPlatformSDK?.emit('GAME_OVER', {
            score: score + 1,
            maxScore: 9,
            stars,
            correctAnswers: score + 1,
            totalQuestions: 9,
          })
          return
        }
        setTimeout(() => {
          setQVisible(false)
          setTimeout(() => { setQIdx(next); setAnswered(false); setAttemptNumber(1); setQVisible(true) }, 200)
        }, 300)
      }, 600)
    } else {
      setCubeStates(prev => { const n = [...prev]; n[ci] = 'wrong'; return n })
      setAttemptNumber(a => a + 1)
      setTimeout(() => { setCubeStates(prev => { const n = [...prev]; n[ci] = 'idle'; return n }) }, 400)
    }
  }

  useEffect(() => {
    const script = document.createElement('script')
    script.src = '/sdk/mathplatform-sdk-v1.js'
    script.onload = () => {
      window.MathPlatformSDK?.emit('GAME_STARTED', { gameId: GAME_ID })
    }
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const cid = params.get('childId')
    setChildId(cid)

    if (!cid) {
      setLoading(false)
      startGame({}, [])
      return
    }

    Promise.all([
      fetch(`/api/game-settings?childId=${cid}&gameId=${GAME_ID}`).then(r => r.json()),
      fetch(`/api/question-memory?childId=${cid}&gameId=${GAME_ID}`).then(r => r.json()),
    ]).then(([s, m]) => {
      setSettings(s ?? {})
      setMemory(Array.isArray(m) ? m : [])
      setLoading(false)
      startGame(s ?? {}, Array.isArray(m) ? m : [])
    })
  }, [])

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⏳</div>

  const currentQ = questions[qIdx]
  const stars = score / 9 >= 0.9 ? 3 : score / 9 >= 0.6 ? 2 : 1

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: "url('/art/games/math-drill-bg.jpg')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-secular), sans-serif',
      direction: 'rtl',
    }}>
      <GameBackButton />

      {done ? (
        <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.85)', borderRadius: 24, padding: '40px 48px' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>
            {stars === 3 ? '⭐⭐⭐' : stars === 2 ? '⭐⭐🌑' : '⭐🌑🌑'}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
            {score} מתוך 9 נכון
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => startGame(settings, memory)} style={btnStyle('#6c3fc5')}>שחק שוב</button>
            <button onClick={() => router.back()} style={btnStyle('#3a9e4a')}>המשך</button>
          </div>
        </div>
      ) : (
        <>
          <div style={{
            background: 'rgba(255,255,255,0.9)',
            borderRadius: 16,
            padding: '16px 40px',
            fontSize: 42,
            fontWeight: 900,
            marginBottom: 32,
            boxShadow: '0 4px 20px #0003',
            opacity: qVisible ? 1 : 0,
            transition: 'opacity 0.15s',
          }}>
            {currentQ?.q.startsWith('D|') ? (() => {
              const [, n, a] = currentQ.q.split('|')
              return `${n} = ${a} + ?`
            })() : currentQ?.q}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {boardOpts.map((val, ci) => {
              const state = cubeStates[ci]
              if (state === 'gone') return <div key={ci} style={{ width: 100, height: 100 }} />
              return (
                <div
                  key={ci}
                  onClick={() => handleAnswer(val, ci)}
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 32,
                    fontWeight: 900,
                    cursor: state === 'idle' ? 'pointer' : 'default',
                    background: state === 'correct' ? '#33cc66'
                      : state === 'wrong' ? '#ff4444'
                      : 'rgba(255,255,255,0.85)',
                    color: state === 'idle' ? '#2a0040' : '#fff',
                    boxShadow: '0 4px 16px #0003',
                    transform: state === 'correct' ? 'scale(1.12)' : state === 'wrong' ? 'scale(0.95)' : 'scale(1)',
                    transition: 'all 0.2s',
                    animation: state === 'wrong' ? 'shake 0.4s ease' : 'none',
                    userSelect: 'none',
                  }}
                >
                  {val}
                </div>
              )
            })}
          </div>
        </>
      )}

      <button onClick={() => setShowSettings(true)} style={{
        position: 'fixed', top: 16, left: 16,
        background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(4px)',
        border: '1.5px solid rgba(255,255,255,0.5)', color: '#fff',
        borderRadius: 10, padding: '6px 14px', cursor: 'pointer', fontSize: 18,
      }}>⚙️</button>

      {showSettings && (
        <SettingsPanel
          grade={GRADE}
          current={{ ...DEFAULT_SETTINGS_BY_GRADE[GRADE], ...settings }}
          onSave={async (newSettings) => {
            setSettings(newSettings)
            if (childId) {
              await fetch('/api/game-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ childId, gameId: GAME_ID, settings: newSettings }),
              })
            }
            startGame(newSettings, memory)
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0) scale(0.95); }
          25% { transform: translateX(-8px) scale(0.95); }
          75% { transform: translateX(8px) scale(0.95); }
        }
      `}</style>
    </div>
  )
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    padding: '12px 28px', borderRadius: 12, border: 'none',
    background: bg, color: '#fff', fontSize: 18, fontWeight: 700, cursor: 'pointer',
  }
}
