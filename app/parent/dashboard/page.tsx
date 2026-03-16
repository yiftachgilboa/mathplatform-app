import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from '@/app/dashboard/SignOutButton'

const GRADE_LABELS: Record<number, string> = {
  1: 'כיתה א׳', 2: 'כיתה ב׳', 3: 'כיתה ג׳',
  4: 'כיתה ד׳', 5: 'כיתה ה׳', 6: 'כיתה ו׳',
}

type Child = { id: string; name: string; grade: number; avatar: string | null }
type ChildWithStats = Child & { weeklyStars: number; weeklyGames: number }

export default async function ParentDashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: children } = await supabase
    .from('children')
    .select('id, name, grade, avatar')
    .eq('parent_id', user.id)
    .order('created_at', { ascending: true })

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const childrenWithStats: ChildWithStats[] = await Promise.all(
    (children ?? []).map(async (child: Child) => {
      const { data: progress } = await supabase
        .from('progress')
        .select('stars, created_at')
        .eq('child_id', child.id)
        .gte('created_at', weekAgo.toISOString())

      const weeklyStars = (progress ?? []).reduce((sum, r) => sum + (r.stars || 0), 0)
      const weeklyGames = (progress ?? []).length

      return { ...child, weeklyStars, weeklyGames }
    })
  )

  return (
    <>
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50%       { opacity: 1;    transform: scale(1.5); }
        }
        .pd-star {
          position: absolute;
          border-radius: 50%;
          background: #fff;
          animation: twinkle var(--dur, 3s) var(--delay, 0s) ease-in-out infinite;
        }
        .pd-child-card {
          transition: border-color 0.18s, transform 0.18s, box-shadow 0.18s;
        }
        .pd-child-card:hover {
          border-color: var(--color-accent) !important;
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.18);
        }
        .pd-manage-btn {
          transition: color 0.15s, background 0.15s;
          text-decoration: none;
        }
        .pd-manage-btn:hover {
          color: var(--color-accent) !important;
          background: var(--color-accent-dim) !important;
        }
        .pd-add-btn {
          transition: background 0.18s, transform 0.18s;
          cursor: pointer;
        }
        .pd-add-btn:hover {
          background: var(--color-accent-dim) !important;
          transform: translateY(-2px);
        }
        .pd-signout-btn {
          transition: color 0.15s;
          background: none;
          border: none;
          cursor: pointer;
          font-family: var(--font-primary);
        }
        .pd-signout-btn:hover {
          color: var(--color-accent) !important;
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
            borderBottom: '1px solid var(--color-card-border)',
            backdropFilter: 'blur(12px)',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Left: Logo badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: 'var(--color-accent)',
                boxShadow: '0 0 8px var(--color-accent)',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.13em',
                color: 'var(--color-text-muted)',
              }}
            >
              MATHPLATFORM
            </span>
          </div>

          {/* Right: Sign out */}
          <SignOutButton />
        </header>

        {/* Main */}
        <main
          style={{
            position: 'relative',
            zIndex: 1,
            maxWidth: '760px',
            margin: '0 auto',
            padding: '40px 20px 64px',
          }}
        >
          {childrenWithStats.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <h2
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: 'var(--color-text-primary)',
                  margin: '0 0 24px',
                }}
              >
                הילדים שלך
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {childrenWithStats.map((child) => (
                  <ChildCard key={child.id} child={child} />
                ))}
              </div>

              {/* Add child button */}
              <Link
                href="/onboarding"
                className="pd-add-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '16px',
                  padding: '18px',
                  borderRadius: 'var(--radius-card)',
                  border: '2px dashed var(--color-accent)',
                  background: 'transparent',
                  color: 'var(--color-accent)',
                  fontSize: '16px',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                הוסף ילד +
              </Link>
            </>
          )}
        </main>
      </div>
    </>
  )
}

/* ── Child card ── */
function ChildCard({ child }: { child: ChildWithStats }) {
  return (
    <div
      className="pd-child-card"
      style={{
        position: 'relative',
        background: 'var(--color-card-bg)',
        border: '1.5px solid var(--color-card-border)',
        borderRadius: 'var(--radius-card)',
        backdropFilter: 'blur(10px)',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Full-card click target → /select-child */}
      <Link
        href="/select-child"
        aria-label={`כניסה כ${child.name}`}
        style={{ position: 'absolute', inset: 0, borderRadius: 'var(--radius-card)' }}
      />

      {/* Top row: avatar + name + grade */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span style={{ fontSize: '40px', lineHeight: 1, flexShrink: 0 }}>
          {child.avatar ?? '🧒'}
        </span>
        <div>
          <div
            style={{
              fontSize: '17px',
              fontWeight: 800,
              color: 'var(--color-text-primary)',
            }}
          >
            {child.name}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            {GRADE_LABELS[child.grade] ?? `כיתה ${child.grade}`}
          </div>
        </div>
      </div>

      {/* Bottom row: stats + manage button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Weekly stats */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            fontSize: '13px',
            color: 'var(--color-text-muted)',
          }}
        >
          <span>⭐ {child.weeklyStars} כוכבים השבוע</span>
          <span>🎮 {child.weeklyGames} משחקים השבוע</span>
        </div>

        {/* Manage assignments button — higher z-index than the card link */}
        <Link
          href={`/parent/assignments/${child.id}`}
          className="pd-manage-btn"
          style={{
            position: 'relative',
            zIndex: 1,
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-button)',
            flexShrink: 0,
          }}
        >
          ניהול שיעורים ←
        </Link>
      </div>
    </div>
  )
}

/* ── Empty state ── */
function EmptyState() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        marginTop: '80px',
        textAlign: 'center',
      }}
    >
      <h2
        style={{
          fontSize: '28px',
          fontWeight: 800,
          color: 'var(--color-text-primary)',
          margin: 0,
        }}
      >
        ברוך הבא! 👋
      </h2>
      <p style={{ fontSize: '16px', color: 'var(--color-text-muted)', margin: 0 }}>
        בוא נוסיף את הילד הראשון שלך
      </p>
      <Link
        href="/onboarding"
        className="pd-add-btn"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          padding: '16px 36px',
          borderRadius: 'var(--radius-button)',
          background: 'var(--color-accent)',
          color: '#000',
          fontSize: '17px',
          fontWeight: 700,
          textDecoration: 'none',
        }}
      >
        הוסף ילד ראשון 🚀
      </Link>
    </div>
  )
}

/* ── 50 stars (server-rendered, static seed) ── */
function Stars() {
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
          className="pd-star"
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
