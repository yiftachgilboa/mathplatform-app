'use client'

import { useState, useEffect } from 'react'
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
  return games.map((g, i) => ({
    id: g.id,
    title: g.title,
    topic: g.topic,
    icon: g.thumbnail,
    state: i === 0 ? 'active' : 'future',
    bg: g.bg_image ? `/art/games/${g.bg_image}` : `/art/games/bg-default.jpg`,
  }))
}


function getBgForTheme(theme: string | null): string {
  switch (theme) {
    case 'magical-forest': return '/art/backgrounds/bg-magical-forest.jpg';
    case 'monsters': return '/art/backgrounds/bg_monsters.jpg';
    default: return '';
  }
}

// Deterministic spark data for a connector at index ci
function sparksFor(ci: number) {
  return Array.from({ length: 3 }, (_, si) => ({
    delay: `${((ci * 3 + si) * 0.47) % 2.5}s`,
    dur:   `${1.5 + ((ci * 3 + si) * 0.23) % 1.5}s`,
    size:  `${8 + ((ci * 3 + si) * 7) % 5}px`,
  }))
}

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

export default function ChildDashboardClient({ child, games }: { child: Child; games: Game[] }) {
  const router = useRouter()
  const stations = buildStations(games)
  const initialActive = Math.max(stations.findIndex(s => s.state === 'active'), 0)
  const [selectedIdx, setSelectedIdx] = useState(initialActive)
  const [isDone, setIsDone] = useState(false)
  const [todayIdx, setTodayIdx] = useState<number | null>(null)
  const [completedToday, setCompletedToday] = useState(0)
  const [cardBg, setCardBg] = useState<string | null>(stations[initialActive]?.bg || null)

  useEffect(() => {
    setTodayIdx(new Date().getDay())
  }, [])

  useEffect(() => {
    const themes = [
      '/art/backgrounds/bg-magical-forest.jpg',
      '/art/backgrounds/bg_monsters.jpg',
    ]
    themes.forEach(src => {
      const img = new window.Image()
      img.src = src
    })
  }, [])

  function selectStation(idx: number) {
    if (stations[idx].state === 'future') return
    setSelectedIdx(idx)
    setIsDone(false)
    setCardBg(null)
    setTimeout(() => {
      setCardBg(stations[idx]?.bg || null)
    }, 100)
  }

  function nodeState(idx: number): StationState {
    if (idx === selectedIdx) return 'active'
    return stations[idx].state
  }

  const selected = stations[selectedIdx]
  const fillPct   = isDone ? 100 : 62
  const bgUrl = getBgForTheme(child.theme)
  const screenStyle = bgUrl
    ? { backgroundImage: `url(${bgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {}
  const [titleLine1, titleLine2] = selected ? splitTitle(selected.title) : ['', '']

  return (
    <>
      <style>{`
        @keyframes tw     { 0%,100%{opacity:0}        50%{opacity:0.5} }
        @keyframes scTw   { 0%,100%{opacity:0;transform:scale(0.7)} 50%{opacity:0.85;transform:scale(1.2)} }
        @keyframes pulse  {
          0%,100%{box-shadow:0 0 14px rgba(255,237,221,0.3)}
          50%    {box-shadow:0 0 28px rgba(255,237,221,0.6), 0 0 50px rgba(190,166,148,0.35)}
        }
        @keyframes spk    { 0%,100%{opacity:0.4;transform:scale(0.88)} 50%{opacity:1;transform:scale(1.2)} }
        @keyframes spkDeco{ 0%,100%{opacity:0.4;transform:scale(0.8) rotate(-10deg)} 50%{opacity:1;transform:scale(1.2) rotate(10deg)} }
        @keyframes liquidFlow { 0%,100%{background-position:0% 0%} 50%{background-position:0% 100%} }
        @keyframes sparkle { 0%,100%{opacity:0;transform:scale(0.5)} 50%{opacity:1;transform:scale(1.2)} }
        .sdot       { position:absolute; background:white; border-radius:50%; opacity:0; animation:tw ease-in-out infinite; pointer-events:none; }
        .sc         { opacity:0; color:rgba(182,212,158,0.75); animation:scTw ease-in-out infinite; }
        .snode-done   { background:rgba(99,177,133,0.22);  border:2px solid #63B185;                color:#B6D49E; }
        .snode-active { background:rgba(255,237,221,0.18); border:2px solid #FFEDDD;                color:white;  animation:pulse 2.5s ease-in-out infinite; }
        .snode-future { background:rgba(255,255,255,0.05); border:2px solid rgba(255,255,255,0.15); color:rgba(255,255,255,0.3); cursor:default; }
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
          background: 'linear-gradient(180deg, #1F4A38 0%, #1A3C2F 100%)',
          ...screenStyle,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          padding: '16px 16px 0',
          gap: '12px',
        }}
      >
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
        }}>
          <Link href="/select-child" style={{
            ...PILL, width: '48px', height: '48px',
            color: 'white', fontSize: '20px', flexShrink: 0, textDecoration: 'none',
          }}>→</Link>

          <div style={{ ...PILL, flex: 1, height: '48px', padding: '0 20px', fontSize: '16px', color: 'rgba(255,255,255,0.9)' }}>
            <span>שלום, <span style={{ color: '#7CFF9F' }}>{child.name}</span> 👋</span>
          </div>

          <div style={{ ...PILL, height: '48px', padding: '0 18px', gap: '10px', flexShrink: 0 }}>
            <span style={{ fontSize: '22px' }}>🪙</span>
            <span style={{ fontSize: '16px', color: 'white', minWidth: '52px', textAlign: 'right' }}>
              {child.coins.toLocaleString('he-IL')}
            </span>
          </div>
        </div>

        {/* ── Main area ── */}
        <div style={{
          flex: 1, display: 'flex', gap: '12px',
          overflow: 'hidden', position: 'relative', zIndex: 2, minHeight: 0,
        }}>

          {/* ── Track panel ── */}
          <div style={{
            width: '110px', flexShrink: 0,
            display: 'flex', flexDirection: 'column', gap: '8px',
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(0px)',
            WebkitBackdropFilter: 'blur(0px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '20px',
            padding: '8px',
          }}>
            <button style={{
              width: '100%', padding: '12px 8px', borderRadius: '16px',
              background: 'linear-gradient(135deg, #283E30 0%, #5F8367 100%)',
              border: '1.5px solid rgba(255,255,255,0.22)',
              color: 'white', fontSize: '14px',
              fontFamily: "var(--font-secular, 'Secular One', sans-serif)",
              cursor: 'pointer', textAlign: 'center',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
              lineHeight: 1.5, flexShrink: 0,
            }}
            onClick={() => router.push(`/parent/dashboard?childId=${child.id}`)}>
              בחירת נושאי לימוד
            </button>

            <div style={{
              flex: 1, overflowY: 'auto', overflowX: 'hidden',
              scrollbarWidth: 'none', padding: '10px 0 16px',
              position: 'relative', minHeight: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
              {stations.map((station, i) => {
                const state = nodeState(i)
                return (
                  <div key={station.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div
                      className={`snode-${state}`}
                      onClick={() => selectStation(i)}
                      style={{
                        width: '64px', height: '64px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexDirection: 'column', gap: '2px',
                        fontSize: '22px', cursor: state === 'future' ? 'default' : 'pointer',
                        transition: 'all 0.2s', position: 'relative',
                      }}
                    >
                      <span style={{ fontSize: '9px', color: 'inherit', textAlign: 'center', lineHeight: 1.2, padding: '0 4px', wordBreak: 'break-word' }}>
                        {station.title}
                      </span>
                      {station.state === 'done' && (
                        <span style={{
                          position: 'absolute', top: '-3px', right: '-3px',
                          width: '18px', height: '18px', background: '#63B185',
                          borderRadius: '50%', fontSize: '10px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', pointerEvents: 'none',
                        }}>✓</span>
                      )}
                    </div>
                    {i < stations.length - 1 && (
                      <div style={{
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', height: '44px', justifyContent: 'space-evenly',
                      }}>
                        {sparksFor(i).map((spark, j) => (
                          <span key={j} className="sc" style={{ animationDelay: spark.delay, animationDuration: spark.dur, fontSize: spark.size }}>✦</span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Card wrap ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, position: 'relative' }}>

            {/* Energy Bar */}
            <div style={{
              position: 'absolute',
              left: -28,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 18,
              height: 160,
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
            </div>

            <div style={{
              width: '64%', margin: '0 auto', flex: 1, minHeight: 0,
              background: 'rgba(0,0,0,0.75)',
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 0 24px rgba(255,255,255,0.15), 0 0 48px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.3)',
              borderRadius: '40px',
              padding: '20px 24px',
              position: 'relative', overflow: 'hidden',
              backdropFilter: 'blur(0px)',
              WebkitBackdropFilter: 'blur(0px)',
              display: 'flex', flexDirection: 'column',
              transition: 'background 0.6s ease',
            }}>

              {/* Background image */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 38,
                backgroundImage: cardBg ? `url(${cardBg})` : 'none',
                backgroundSize: 'cover', backgroundPosition: 'center',
                opacity: cardBg ? 1 : 0,
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
                    // fire and forget
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
                    background: 'linear-gradient(135deg, #7CFF9F 0%, #40c080 40%, #FF9F7C 100%)',
                    boxShadow: '0 4px 18px rgba(124,255,159,0.35), 0 8px 24px rgba(0,0,0,0.2)',
                    fontFamily: "var(--font-secular, 'Secular One', sans-serif)",
                    fontSize: '30px', color: 'white', flexShrink: 0,
                    textShadow: '0 1px 8px rgba(0,0,0,0.3)', letterSpacing: '0.5px',
                    transition: 'transform 0.2s',
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

            </div>
          </div>

        </div>

        {/* ── Week bar ── */}
        <div style={{
          flexShrink: 0, display: 'flex', justifyContent: 'center',
          padding: '8px 0 14px', position: 'relative', zIndex: 2,
        }}>
          <div style={{
            width: '64%', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: 0,
          }}>
            {["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"].map((label, i) => {
              const isToday = todayIdx === i
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '8px 4px', cursor: 'pointer', borderRadius: '26px', flex: 1,
                    background: isToday ? 'rgba(60,120,90,0.85)' : 'transparent',
                    border: isToday ? '1.5px solid rgba(124,255,159,0.5)' : '1.5px solid transparent',
                  }}
                >
                  <span style={{
                    fontSize: '22px',
                    color: isToday ? '#7CFF9F' : 'rgba(255,255,255,0.75)',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}>
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </>
  )
}
