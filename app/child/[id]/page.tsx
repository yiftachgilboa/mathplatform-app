import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import GameGrid from './GameGrid'

const GRADE_LABELS: Record<number, string> = {
  1: 'כיתה א׳', 2: 'כיתה ב׳', 3: 'כיתה ג׳',
  4: 'כיתה ד׳', 5: 'כיתה ה׳', 6: 'כיתה ו׳',
}

export default async function ChildDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Step 1: child
  const { data: child } = await supabase
    .from('children')
    .select('id, name, grade, avatar, theme, parent_id')
    .eq('id', id)
    .single()

  if (!child) redirect('/select-child')

  // Steps 2-4 and weekly stars in parallel
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const [{ data: accessRows }, { data: allGames }, { data: progressRows }] =
    await Promise.all([
      supabase
        .from('parent_access')
        .select('access_key, expires_at')
        .eq('parent_id', child.parent_id),
      supabase
        .from('games')
        .select('id, title, subject, topic, grade, difficulty, duration_minutes, thumbnail, tier')
        .eq('is_visible', true)
        .eq('grade', child.grade)
        .order('created_at', { ascending: true }),
      supabase
        .from('progress')
        .select('stars')
        .eq('child_id', child.id)
        .gte('created_at', weekAgo.toISOString()),
    ])

  // Step 2: active access keys
  const activeKeys = (accessRows ?? [])
    .filter(r => !r.expires_at || new Date(r.expires_at) > new Date())
    .map(r => r.access_key as string)

  // Step 4: filter games by access
  const games = (allGames ?? []).filter(game => {
    if (activeKeys.includes('tier:premium')) return true
    if (activeKeys.includes(`subject:${game.subject}`)) return true
    if (activeKeys.includes(`topic:${game.topic}`)) return true
    if (activeKeys.includes(`grade:${game.grade}`)) return true
    if (game.tier === 'free' && activeKeys.includes('tier:free')) return true
    return false
  })

  // Step 5: weekly stars
  const weeklyStars =
    progressRows?.reduce((sum, r) => sum + (r.stars || 0), 0) ?? 0

  return (
    <>
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50%       { opacity: 1;    transform: scale(1.5); }
        }
        .cd-star {
          position: absolute;
          border-radius: 50%;
          background: #fff;
          animation: twinkle var(--dur, 3s) var(--delay, 0s) ease-in-out infinite;
        }
      `}</style>

      <div
        dir="rtl"
        style={{
          minHeight: '100vh',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'var(--font-primary)',
          background:
            'linear-gradient(135deg, var(--color-bg-gradient-from) 0%, var(--color-bg-gradient-mid) 50%, var(--color-bg-gradient-to) 100%)',
        }}
      >
        {/* Stars */}
        <Stars />

        {/* Glow */}
        <div
          aria-hidden
          style={{
            position: 'fixed',
            inset: 0,
            background:
              'radial-gradient(ellipse 60% 50% at 50% 30%, var(--color-accent-glow), transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Header */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: 'var(--color-card-bg)',
            borderBottom: '1.5px solid var(--color-card-border)',
            backdropFilter: 'blur(12px)',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Left: back link */}
          <Link
            href="/select-child"
            style={{
              fontSize: '13px',
              color: 'var(--color-text-muted)',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            → בחר ילד
          </Link>

          {/* Center: avatar + name + grade */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '32px', lineHeight: 1 }}>{child.avatar}</span>
            <div>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 800,
                  color: 'var(--color-text-primary)',
                }}
              >
                {child.name}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--color-text-muted)',
                }}
              >
                {GRADE_LABELS[child.grade] ?? `כיתה ${child.grade}`}
              </div>
            </div>
          </div>

          {/* Right: weekly stars */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--color-accent-dim)',
              border: '1.5px solid var(--color-card-border)',
              borderRadius: 'var(--radius-pill)',
              padding: '6px 14px',
            }}
          >
            <span style={{ fontSize: '18px' }}>⭐</span>
            <span
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
              }}
            >
              {weeklyStars}
            </span>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--color-text-muted)',
              }}
            >
              השבוע
            </span>
          </div>
        </header>

        {/* Main content */}
        <main
          style={{
            position: 'relative',
            zIndex: 1,
            maxWidth: '900px',
            margin: '0 auto',
            padding: '32px 20px 48px',
          }}
        >
          <h2
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: 'var(--color-text-primary)',
              margin: '0 0 20px',
            }}
          >
            המשחקים שלך
          </h2>

          <GameGrid games={games} />
        </main>
      </div>
    </>
  )
}

/* ── 50 stars (server-rendered, static seed) ── */
function Stars() {
  // Fixed positions — no Math.random() in server components to keep output stable
  const stars = Array.from({ length: 50 }, (_, i) => ({
    top: `${(i * 37 + 11) % 100}%`,
    left: `${(i * 61 + 7) % 100}%`,
    size: `${2 + (i % 3)}px`,
    delay: `${(i * 0.3) % 4}s`,
    dur: `${2.5 + (i % 3) * 0.7}s`,
  }))
  return (
    <>
      {stars.map((s, i) => (
        <span
          key={i}
          className="cd-star"
          style={
            {
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              '--delay': s.delay,
              '--dur': s.dur,
            } as React.CSSProperties
          }
        />
      ))}
    </>
  )
}
