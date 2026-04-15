'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Child = {
  id: string
  name: string
  grade: number
  coins: number
  theme: string | null
}

type Game = {
  id: string
  title: string
  topic: string
  thumbnail: string
  bg_image: string | null
}

type StationState = 'done' | 'active' | 'future'

type Station = {
  id: string
  title: string
  topic: string
  icon: string
  state: StationState
  bg: string | null
}

function buildStations(games: Game[]): Station[] {
  return games.map((g) => ({
    id: g.id,
    title: g.title,
    topic: g.topic,
    icon: g.thumbnail,
    state: 'future' as StationState,
    bg: g.bg_image ? `/art/games/${g.bg_image}` : `/art/games/bg-magical-forest.jpg`,
  }))
}


function getBgForTheme(theme: string | null): string {
  switch (theme) {
    case 'magical-forest': return '/art/backgrounds/bg-magical-forest.jpg';
    case 'monsters': return '/art/backgrounds/bg_monsters.jpg';
    default: return '';
  }
}

const GRADIENTS = [
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #f7971e, #ffd200)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  'linear-gradient(135deg, #fd7043, #ff8a65)',
]

const GLOW_COLORS = [
  'rgba(67,233,123,0.6)',
  'rgba(247,151,30,0.6)',
  'rgba(240,147,251,0.6)',
  'rgba(79,172,254,0.6)',
  'rgba(67,233,123,0.6)',
  'rgba(247,151,30,0.6)',
]


// Deterministic star data
const STARS = Array.from({ length: 40 }, (_, i) => ({
  sz:    i % 3 === 0 ? 3 : 2,
  left:  `${(i * 61 + 7) % 100}%`,
  top:   `${(i * 37 + 11) % 100}%`,
  delay: `${((i * 0.31) % 4).toFixed(2)}s`,
  dur:   `${(2 + (i % 10) * 0.3).toFixed(2)}s`,
}))

const PILL: React.CSSProperties = {
  background: 'rgba(255,255,255,0.1)',
  border: '1.5px solid rgba(255,255,255,0.2)',
  borderRadius: '50px',
  backdropFilter: 'blur(10px)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 2px 8px rgba(0,0,0,0.12)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

function splitTitle(label: string): [string, string] {
  const i = label.indexOf(' ')
  return i === -1 ? [label, ''] : [label.slice(0, i), label.slice(i + 1)]
}

const GRADE_LABELS: Record<number, string> = {
  1: 'כיתה א׳', 2: 'כיתה ב׳', 3: 'כיתה ג׳',
  4: 'כיתה ד׳', 5: 'כיתה ה׳', 6: 'כיתה ו׳',
}

type ProgressEntry = { game_id: string; stars: number }

function todayKey(childId: string) {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `completedToday_${childId}_${yyyy}-${mm}-${dd}`
}

function weekKey(childId: string) {
  const d = new Date()
  // ISO week number
  const jan1 = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)
  return `weekProgress_${childId}_${d.getFullYear()}-W${String(week).padStart(2, '0')}`
}

function dailyStarsKey(childId: string, gameId: string) {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `dailyStars_${childId}_${gameId}_${yyyy}-${mm}-${dd}`
}

function readWeekDays(childId: string): number[] {
  try { return JSON.parse(localStorage.getItem(weekKey(childId)) || '[]') } catch { return [] }
}

export default function ChildDashboardClient({ child, games, progress }: { child: Child; games: Game[]; progress: ProgressEntry[] }) {
  const router = useRouter()
  const stations = buildStations(games)
  const starsForGame = Object.fromEntries(progress.map(p => [p.game_id, p.stars]))
  const firstIncomplete = stations.findIndex(s => (starsForGame[s.id] ?? 0) < 3)
  const initialActive = firstIncomplete === -1 ? Math.max(stations.length - 1, 0) : firstIncomplete
  const [selectedIdx, setSelectedIdx] = useState(initialActive)
  const [isDone, setIsDone] = useState(false)
  const [todayIdx, setTodayIdx] = useState<number | null>(null)
  const [completedToday, setCompletedToday] = useState(0)
  const [bottomBg, setBottomBg] = useState<string>('/art/games/bg-magical-forest.jpg')
  const [topBg, setTopBg] = useState<string | null>(null)
  const [topVisible, setTopVisible] = useState(false)
  const [starsMap, setStarsMap] = useState<Record<string, number>>(starsForGame)
  const [dailyStarsMap, setDailyStarsMap] = useState<Record<string, number>>({})
  const [completedDays, setCompletedDays] = useState<number[]>([])

  const trackPanelRef = useRef<HTMLDivElement>(null)
  const energyBarRef  = useRef<HTMLDivElement>(null)
  const weekBarRef    = useRef<HTMLDivElement>(null)

  // Dev-only layout debugger — logs pixel positions after first paint
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    const log = () => {
      ;[
        ['trackPanel', trackPanelRef],
        ['energyBar',  energyBarRef],
        ['weekBar',    weekBarRef],
      ].forEach(([name, ref]) => {
        const r = (ref as React.RefObject<HTMLDivElement>).current?.getBoundingClientRect()
        if (r) console.log(`[layout] ${name}  top:${r.top.toFixed(1)}  height:${r.height.toFixed(1)}  bottom:${r.bottom.toFixed(1)}  (from-screen-bottom:${(window.innerHeight - r.bottom).toFixed(1)})`)
      })
    }
    requestAnimationFrame(log)
  }, [])

  useEffect(() => {
    setTodayIdx(new Date().getDay())
    const src = stations[initialActive]?.bg || '/art/games/bg-magical-forest.jpg'
    const img = new window.Image()
    img.onload = () => setBottomBg(src)
    img.onerror = () => setBottomBg('/art/games/bg-magical-forest.jpg')
    img.src = src
  }, [])

  useEffect(() => {
    const dateKey = todayKey(child.id)
    const readCount = () => {
      setCompletedToday(Math.min(parseInt(localStorage.getItem(dateKey) || '0'), 3))
      const daily: Record<string, number> = {}
      games.forEach(g => {
        const val = parseInt(localStorage.getItem(dailyStarsKey(child.id, g.id)) || '0')
        if (val > 0) daily[g.id] = val
      })
      setDailyStarsMap(daily)
    }
    readCount()
    setCompletedDays(readWeekDays(child.id))
    const onVisible = () => { if (document.visibilityState === 'visible') readCount() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [child.id])

  useEffect(() => {
    if (completedToday < 3) return
    const src = '/art/games/treasure1.jpg'
    const img = new window.Image()
    const onReady = () => {
      setTopBg(src)
      setTopVisible(true)
      setTimeout(() => {
        setBottomBg(src)
        setTopVisible(false)
      }, 1200)
    }
    img.onload = onReady
    img.onerror = onReady
    img.src = src
  }, [completedToday])

  useEffect(() => {
    stations.slice(selectedIdx, selectedIdx + 3).forEach(s => {
      if (s.bg) {
        const img = new window.Image()
        img.src = s.bg
      }
    })
  }, [selectedIdx])

  function handleGameOver(gameId: string, stars: number) {
    // Update Supabase progress + coins
    fetch('/api/sdk/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'GAME_OVER',
        childId: child.id,
        gameId,
        data: { stars, score: stars * 10, correctAnswers: stars * 3, totalQuestions: 9 },
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {})
    // Update local stars state (always)
    setStarsMap(prev => ({ ...prev, [gameId]: stars }))
    localStorage.setItem(dailyStarsKey(child.id, gameId), String(stars))
    setDailyStarsMap(prev => ({ ...prev, [gameId]: stars }))
    // Auto-advance only on 3 stars
    if (stars >= 1) {
      const updated = { ...starsMap, [gameId]: stars }
      const nextIdx = stations.findIndex(s => (updated[s.id] ?? 0) < 3)
      const target = nextIdx === -1 ? stations.length - 1 : nextIdx
      selectStation(target)
    }
    // Update daily progress bar
    const dateKey = todayKey(child.id)
    const newCount = Math.min((parseInt(localStorage.getItem(dateKey) || '0')) + 1, 3)
    localStorage.setItem(dateKey, String(newCount))
    setCompletedToday(newCount)
    if (newCount >= 3) {
      const day = new Date().getDay()
      const days = readWeekDays(child.id)
      if (!days.includes(day)) {
        const updated = [...days, day]
        localStorage.setItem(weekKey(child.id), JSON.stringify(updated))
        setCompletedDays(updated)
      }
    }
  }

  // Debug shortcut — development only
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    function onKey(e: KeyboardEvent) {
      if (e.key === '4') {
        // Simulate surprise game GAME_OVER + reset daily bar
        fetch('/api/sdk/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'GAME_OVER',
            childId: child.id,
            gameId: 'surprise-coins-001',
            data: { stars: 3, score: 50, correctAnswers: 5, totalQuestions: 5 },
            timestamp: new Date().toISOString(),
          }),
        }).catch(() => {})
        const dateKey = todayKey(child.id)
        localStorage.setItem(dateKey, '0')
        setCompletedToday(0)
        return
      }
      if (e.key === '0') {
        const station = stations[selectedIdx]
        if (station) setStarsMap(prev => ({ ...prev, [station.id]: 0 }))
        return
      }
      const stars = e.key === '1' ? 1 : e.key === '2' ? 2 : e.key === '3' ? 3 : null
      if (stars === null) return
      const gameId = stations[selectedIdx]?.id
      if (gameId) handleGameOver(gameId, stars)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedIdx, child.id, completedToday])

  function selectStation(idx: number) {
    setSelectedIdx(idx)
    setIsDone(false)
    const src = stations[idx]?.bg || '/art/games/bg-magical-forest.jpg'
    const img = new window.Image()
    const onReady = (finalSrc: string) => {
      setTopBg(finalSrc)
      setTopVisible(true)
      setTimeout(() => {
        setBottomBg(finalSrc)
        setTopVisible(false)
      }, 1200)
    }
    img.onload = () => onReady(src)
    img.onerror = () => onReady('/art/games/bg-magical-forest.jpg')
    img.src = src
  }

  function nodeState(idx: number): StationState {
    if (idx === selectedIdx) return 'active'
    return stations[idx].state
  }

  const selected = stations[selectedIdx]
  const activeGradient = GRADIENTS[selectedIdx % GRADIENTS.length]
  const fillPct   = isDone ? 100 : 62
  const [titleLine1, titleLine2] = selected ? splitTitle(selected.title) : ['', '']

  return (
    <>
      <style>{`
        @keyframes tw     { 0%,100%{opacity:0}        50%{opacity:0.5} }
        @keyframes scTw   { 0%,100%{opacity:0;transform:scale(0.7)} 50%{opacity:0.85;transform:scale(1.2)} }
        @keyframes pulse  {
          0%,100%{box-shadow:0 0 16px 4px var(--glow-color, rgba(255,255,255,0.4))}
          50%    {box-shadow:0 0 32px 10px var(--glow-color, rgba(255,255,255,0.6))}
        }
        @keyframes spk    { 0%,100%{opacity:0.4;transform:scale(0.88)} 50%{opacity:1;transform:scale(1.2)} }
        @keyframes spkDeco{ 0%,100%{opacity:0.4;transform:scale(0.8) rotate(-10deg)} 50%{opacity:1;transform:scale(1.2) rotate(10deg)} }
        @keyframes liquidFlow { 0%,100%{background-position:0% 0%} 50%{background-position:0% 100%} }
        @keyframes sparkle { 0%,100%{opacity:0;transform:scale(0.5)} 50%{opacity:1;transform:scale(1.2)} }
        @keyframes giftBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        .sdot       { position:absolute; background:white; border-radius:50%; opacity:0; animation:tw ease-in-out infinite; pointer-events:none; }

        .track-scroll { -webkit-overflow-scrolling:touch; }
        .track-scroll::-webkit-scrollbar { width:4px; }
        .track-scroll::-webkit-scrollbar-track { background:transparent; }
        .track-scroll::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.18); border-radius:4px; }
        .track-scroll::-webkit-scrollbar-thumb:hover { background:rgba(255,255,255,0.32); }
        .snode-active { }
        .play-btn:hover  { transform:translateY(-2px); }
        .play-btn:active { transform:scale(0.97); }
        .replay-btn:hover { background:rgba(255,255,255,0.14) !important; color:white !important; }
      `}</style>

      {/* ── Screen ── */}
      <div
        dir="rtl"
        style={{
          fontFamily: "var(--font-secular, 'Secular One', sans-serif)",
          width: '100%',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          padding: '16px',
          gap: '0',
        }}
      >
        {/* BG layer — bottom (current) */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          backgroundImage: `url(${bottomBg})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
        }} />
        {/* BG layer — top (incoming, fades in) */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
          backgroundImage: topBg ? `url(${topBg})` : 'none',
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: topVisible ? 1 : 0,
          transition: 'opacity 1.2s ease',
        }} />

        {/* Dot-grid overlay */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }} />

        {/* Central glow */}
        <div aria-hidden style={{
          position: 'absolute', width: '700px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 65%)',
          top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          pointerEvents: 'none', zIndex: 0, filter: 'blur(12px)',
        }} />

        {/* Stars */}
        {STARS.map((s, i) => (
          <span key={i} className="sdot" style={{
            width: `${s.sz}px`, height: `${s.sz}px`,
            left: s.left, top: s.top,
            animationDelay: s.delay, animationDuration: s.dur,
          }} />
        ))}

        {/* ── Top row ── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'relative', zIndex: 10, flexShrink: 0, gap: '10px',
          marginRight: '266px', marginBottom: '12px',
        }}>
          <div style={{ ...PILL, flex: 1, height: '48px', padding: '0 20px', fontSize: '16px', color: 'rgba(255,255,255,0.9)' }}>
            <span>שלום, <span style={{ color: '#7CFF9F' }}>{child.name}</span> 👋</span>
          </div>

          <div style={{ ...PILL, height: '48px', padding: '0 18px', gap: '10px', flexShrink: 0 }}>
            <span style={{ fontSize: '22px' }}>🪙</span>
            <span style={{ fontSize: '16px', color: 'white', minWidth: '52px', textAlign: 'right' }}>
              {child.coins.toLocaleString('he-IL')}
            </span>
          </div>

          <Link href="/select-child" style={{
            ...PILL, width: '48px', height: '48px',
            color: 'white', fontSize: '20px', flexShrink: 0, textDecoration: 'none',
            transform: 'rotate(180deg)',
          }}>→</Link>

        </div>

        <button
          onClick={() => router.push(`/parent/dashboard?childId=${child.id}`)}
          style={{
            ...PILL,
            position: 'fixed',
            top: '16px',
            right: '16px',
            left: 'auto',
            zIndex: 100,
            height: '48px',
            padding: '0 18px',
            gap: '10px',
            color: 'white',
            fontSize: '16px',
            fontFamily: "var(--font-secular, 'Secular One', sans-serif)",
            cursor: 'pointer',
            WebkitBackdropFilter: 'blur(10px)',
            width: '240px',
          }}
        >⚙️ משימות להיום</button>

        {/* ── Main area ── */}
        <div style={{
          flex: 1, display: 'flex', gap: '12px',
          overflow: 'visible', position: 'relative', zIndex: 2, minHeight: 0,
        }}>

          {/* ── Track panel + button ── */}
          <div style={{ position: 'fixed', top: '136px', bottom: '0', right: '16px', width: '240px', display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '8px', zIndex: 20 }}>

          {/* ── Track panel ── */}
          <div ref={trackPanelRef} style={{
            flex: 1, minHeight: 0,
            display: 'flex', flexDirection: 'column', gap: '8px',
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '24px',
            border: '2px solid rgba(255,255,255,0.25)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            padding: '12px 15px',
            overflow: 'hidden',
          }}>
            <div
              className="track-scroll"
              style={{
                flex: 1, overflowY: 'auto', overflowX: 'hidden',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255,255,255,0.18) transparent',
                touchAction: 'pan-y',
                position: 'relative', minHeight: 0,
                direction: 'ltr',
              }}
            >
              <div style={{
                direction: 'rtl',
                padding: '10px 12px 16px',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
              }}>
              {stations.map((station, i) => {
                const state = nodeState(i)
                const hasDone = (dailyStarsMap[station.id] ?? 0) >= 1
                const visualState: StationState = state === 'active' ? 'active' : hasDone ? 'done' : 'future'
                return (
                  <div key={station.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px' }}>
                    <div
                      className={state === 'active' ? 'snode-active' : undefined}
                      onClick={() => selectStation(i)}
                      style={{
                        width: '100%', maxWidth: state === 'active' ? '175px' : '155px',
                        minHeight: state === 'active' ? '80px' : '68px',
                        borderRadius: '18px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease', position: 'relative',
                        overflow: 'visible',
                        opacity: visualState === 'future' ? 0.5 : visualState === 'done' ? 0.7 : 1,
                        background: visualState === 'future'
                          ? 'rgba(255,255,255,0.08)'
                          : GRADIENTS[i % GRADIENTS.length],
                        border: 'none',
                        color: visualState === 'future' ? 'rgba(255,255,255,0.5)' : 'white',
                        boxShadow: visualState === 'done' ? '0 4px 14px rgba(0,0,0,0.2)' : 'none',
                        animation: state === 'active' ? 'pulse 2.5s ease-in-out infinite' : 'none',
                        '--glow-color': GLOW_COLORS[i % GLOW_COLORS.length],
                      } as React.CSSProperties}
                    >
                      {state === 'active' && (
                        <div style={{
                          position: 'absolute',
                          left: '-16px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: '14px',
                          filter: 'drop-shadow(0 0 4px rgba(255,210,0,0.8))',
                        }}>▶</div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <span style={{
                          fontSize: state === 'active' ? '46px' : '42px', lineHeight: 1,
                          position: 'relative', top: '-22px', marginBottom: '-14px',
                          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
                          display: 'block',
                        }}>{station.icon || (station.id.startsWith('math') ? '🔢' : station.id.startsWith('language') ? '📖' : '🎮')}</span>
                        <span style={{ fontSize: '16px', fontWeight: 400, fontFamily: "var(--font-secular, 'Secular One', sans-serif)", textAlign: 'center', lineHeight: 1.2, padding: '0 6px', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                          {station.title}
                        </span>
                      </div>
                      {(dailyStarsMap[station.id] ?? 0) >= 1 && (
                        <span style={{
                          position: 'absolute', top: '-6px', right: '-6px',
                          width: '22px', height: '22px',
                          background: 'linear-gradient(135deg,#f6d365,#fda085)',
                          borderRadius: '50%', fontSize: '12px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontWeight: 'bold', pointerEvents: 'none',
                          boxShadow: '0 2px 6px rgba(246,211,101,0.6)',
                        }}>✓</span>
                      )}
                    </div>
                    {/* Stars row — only when earned */}
                    {(dailyStarsMap[station.id] ?? 0) > 0 && (
                      <div style={{ display: 'flex', gap: '3px', marginTop: '6px' }}>
                        {[1, 2, 3].map(n => (dailyStarsMap[station.id] ?? 0) >= n
                          ? <span key={n} style={{ fontSize: '14px', color: '#FFD700', lineHeight: 1 }}>⭐</span>
                          : null
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              </div>
            </div>
          </div>
          </div>

          {/* ── Card wrap ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, position: 'relative' }}>

            {/* Treasure + Energy Bar wrapper — flex column, icon centered above bar */}
            <div ref={energyBarRef} style={{
              position: 'absolute',
              left: 24,
              top: 68,
              bottom: '88px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              zIndex: 10,
            }}>
              {/* Treasure chest icon */}
              <div style={{
                fontSize: '52px',
                lineHeight: 1,
                filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))',
                pointerEvents: 'none',
                flexShrink: 0,
              }}>🎁</div>

              {/* Energy Bar */}
              <div style={{
                flex: 1,
                minHeight: 0,
                width: 36,
                borderRadius: 20,
                border: '2px solid rgba(255,215,0,0.7)',
                boxShadow: '0 0 12px rgba(255,215,0,0.4), inset 0 0 8px rgba(0,0,0,0.3)',
                background: 'rgba(0,0,0,0.35)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
              }}>
              {/* מילוי נוזלי */}
              <div style={{
                width: '100%',
                height: `${(completedToday / 3) * 100}%`,
                background: 'linear-gradient(180deg, #7FFFD4 0%, #00CED1 30%, #9B59B6 70%, #6A0DAD 100%)',
                backgroundSize: '100% 200%',
                borderRadius: '0 0 18px 18px',
                transition: 'height 0.8s cubic-bezier(0.34,1.56,0.64,1)',
                animation: 'liquidFlow 3s ease-in-out infinite',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* ניצוצות */}
                {[...Array(5)].map((_, i) => (
                  <div key={i} style={{
                    position: 'absolute',
                    width: 3, height: 3,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.8)',
                    left: `${20 + i * 15}%`,
                    top: `${10 + i * 18}%`,
                    animation: `sparkle ${1 + i * 0.4}s ease-in-out infinite`,
                  }} />
                ))}
              </div>
              </div>{/* end Energy Bar */}
            </div>{/* end Treasure + Bar wrapper */}

            <div style={{
              width: '64%', margin: '0 auto', flex: 1, minHeight: 0,
              background: completedToday >= 3 ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0)',
              border: completedToday >= 3 ? '1.5px solid rgba(255,255,255,0.2)' : 'none',
              boxShadow: completedToday >= 3 ? '0 8px 32px rgba(0,0,0,0.3)' : 'none',
              borderRadius: '40px',
              padding: '20px 24px',
              position: 'relative', overflow: 'hidden',
              backdropFilter: completedToday >= 3 ? 'blur(12px)' : 'none',
              WebkitBackdropFilter: completedToday >= 3 ? 'blur(12px)' : 'none',
              display: 'flex', flexDirection: 'column',
              transition: 'background 0.6s ease, backdrop-filter 0.6s ease',
            }}>

              {/* Background image */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 38,
                backgroundImage: bottomBg ? `url(${bottomBg})` : 'none',
                backgroundSize: 'cover', backgroundPosition: 'center',
                opacity: 0,
                transition: 'opacity 0.5s ease',
                zIndex: 0,
              }} />
              {/* Overlay */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 38,
                background: 'linear-gradient(135deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 100%)',
                zIndex: 0, pointerEvents: 'none',
              }} />

              {/* Shimmer line */}
              <div aria-hidden style={{
                position: 'absolute', top: 0, left: '12%', right: '12%', height: '1.5px',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                zIndex: 1,
              }} />

              {completedToday >= 3 ? (
                /* ── Surprise card ── */
                <>
                  {/* Content — screen background handles the image */}
                  <div style={{ flex: 1, position: 'relative', zIndex: 2 }} />

                  {/* Start button */}
                  <button
                    className="play-btn"
                    onClick={() => router.push(`/games/surprise-coins-001?childId=${child.id}`)}
                    style={{
                      position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
                      width: '58%', margin: '0 auto', height: '72px',
                      borderRadius: '39px', border: 'none', cursor: 'pointer', overflow: 'hidden',
                      background: 'linear-gradient(135deg, #A78BFA 0%, #D4A017 100%)',
                      boxShadow: '0 4px 18px rgba(167,139,250,0.45), 0 8px 24px rgba(0,0,0,0.2)',
                      fontFamily: "var(--font-secular, 'Secular One', sans-serif)",
                      fontSize: '30px', color: 'white', flexShrink: 0,
                      textShadow: '0 1px 8px rgba(0,0,0,0.3)',
                      transition: 'transform 0.2s',
                    }}
                  >
                    התחל
                  </button>
                </>
              ) : (
                /* ── Regular task card ── */
                <>
                  {/* ── Card top ── */}
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    flex: 1, minHeight: 0, gap: '16px', marginBottom: '12px',
                    overflow: 'hidden', position: 'relative', zIndex: 1,
                  }}>

                    {/* col-text */}
                    <div style={{
                      flex: 1, display: 'flex', flexDirection: 'column',
                      justifyContent: 'center', alignItems: 'center', minWidth: 0,
                      textAlign: 'center', position: 'relative',
                    }}>
                      {/* Sparkle decos */}
                      <span aria-hidden style={{ position: 'absolute', top: '-8px', left: '60px', color: '#FFCC00', fontSize: '14px', animation: 'spkDeco 1.5s ease-in-out infinite', filter: 'drop-shadow(0 0 4px rgba(255,204,0,0.8))', zIndex: 3, pointerEvents: 'none', animationDelay: '0s' }}>✦</span>
                      <span aria-hidden style={{ position: 'absolute', top: '20px',  left: '20px', color: '#FFCC00', fontSize: '10px', animation: 'spkDeco 1.5s ease-in-out infinite', filter: 'drop-shadow(0 0 4px rgba(255,204,0,0.8))', zIndex: 3, pointerEvents: 'none', animationDelay: '0.7s' }}>✦</span>
                      <span aria-hidden style={{ position: 'absolute', bottom: '20px', left: '50px', color: '#FFCC00', fontSize: '11px', animation: 'spkDeco 1.5s ease-in-out infinite', filter: 'drop-shadow(0 0 4px rgba(255,204,0,0.8))', zIndex: 3, pointerEvents: 'none', animationDelay: '1.3s' }}>✦</span>

                      {/* Label */}
                      <div style={{
                        fontSize: 13, color: 'rgba(124,255,159,0.85)',
                        letterSpacing: 2, marginBottom: 8,
                        textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 30px rgba(0,0,0,0.6)',
                      }}>
                        המשימה היומית
                      </div>

                      {/* Title text */}
                      <div style={{
                        fontSize: '72px', color: 'white', lineHeight: 1.05,
                        textShadow: '0 2px 12px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.6)',
                        textAlign: 'center', position: 'relative', zIndex: 2,
                        transition: 'all 0.3s ease',
                      }}>
                        {titleLine1}<br />{titleLine2}
                      </div>
                    </div>

                  </div>

                  {/* ── Play button ── */}
                  {!isDone && (
                    <button
                      className="play-btn"
                      onClick={() => {
                        fetch('/api/child/session', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ childId: child.id }),
                        }).catch(() => {})
                        router.push(`/games/${selected.id}?childId=${child.id}`)
                      }}
                      style={{
                        position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1,
                        width: '58%', margin: '0 auto', height: '72px',
                        borderRadius: '39px', border: 'none', cursor: 'pointer', overflow: 'hidden',
                        background: activeGradient,
                        boxShadow: `0 4px 18px ${GLOW_COLORS[selectedIdx % GLOW_COLORS.length]}, 0 8px 24px rgba(0,0,0,0.2)`,
                        fontFamily: "var(--font-secular, 'Secular One', sans-serif)",
                        fontSize: '30px', color: 'white', flexShrink: 0,
                        textShadow: '0 1px 8px rgba(0,0,0,0.3)', letterSpacing: '0.5px',
                        transition: 'transform 0.2s, background 0.4s ease, box-shadow 0.4s ease',
                      }}
                    >
                      {completedToday === 0 ? 'התחל' : 'ממשיכים'}
                    </button>
                  )}

                  {/* ── Done state ── */}
                  {isDone && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0, position: 'relative', zIndex: 1 }}>
                      <div style={{
                        textAlign: 'center', padding: '10px', borderRadius: '14px',
                        background: 'rgba(99,177,133,0.12)', border: '1px solid rgba(99,177,133,0.35)',
                        fontSize: '14px', color: '#B6D49E',
                      }}>
                        🎉 כל הכבוד! סיימת את המשימה להיום
                      </div>
                      <button
                        className="replay-btn"
                        onClick={() => setIsDone(false)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: '58%', margin: '0 auto', padding: '16px', borderRadius: '50px',
                          border: '1.5px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.08)',
                          color: 'rgba(255,255,255,0.65)',
                          fontFamily: "var(--font-secular, 'Secular One', sans-serif)",
                          fontSize: '18px', cursor: 'pointer', transition: 'all 0.2s',
                        }}
                      >
                        שחק שוב
                      </button>
                    </div>
                  )}
                </>
              )}

            </div>
          </div>

        </div>

        {/* ── Week bar ── */}
        <div ref={weekBarRef} style={{
          flexShrink: 0, display: 'flex', justifyContent: 'center',
          padding: '8px 0 14px', position: 'relative', zIndex: 2,
          marginRight: '252px',
        }}>
          <div style={{
            width: '64%', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: 0,
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderRadius: '50px',
            border: '1.5px solid rgba(255,255,255,0.2)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 2px 8px rgba(0,0,0,0.12)',
            padding: '4px 8px',
          }}>
            {["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"].map((label, i) => {
              const isToday = todayIdx === i
              const isDone = completedDays.includes(i)
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '6px 4px', cursor: 'pointer', borderRadius: '26px', flex: 1,
                    background: isToday ? 'rgba(60,120,90,0.85)' : 'transparent',
                    border: isToday ? '1.5px solid rgba(124,255,159,0.5)' : '1.5px solid transparent',
                    gap: '2px',
                  }}
                >
                  <span style={{
                    fontSize: '22px',
                    color: isToday ? '#7CFF9F' : 'rgba(255,255,255,0.75)',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    lineHeight: 1,
                  }}>
                    {label}
                  </span>
                  {isDone && (
                    <span style={{ fontSize: '12px', color: '#7CFF9F', lineHeight: 1 }}>✓</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div style={{
            position: 'absolute', bottom: 6, left: 10, zIndex: 999,
            fontSize: '10px', color: 'rgba(255,255,255,0.25)',
            pointerEvents: 'none', userSelect: 'none',
          }}>🛠 1/2/3/4</div>
        )}
      </div>
    </>
  )
}
