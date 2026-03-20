'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import StarsBackground from './StarsBackground'

const GRADE_LABELS: Record<number, string> = {
  1: 'כיתה א׳', 2: 'כיתה ב׳', 3: 'כיתה ג׳',
  4: 'כיתה ד׳', 5: 'כיתה ה׳', 6: 'כיתה ו׳',
}

type Child = { id: string; name: string; grade: number; avatar: string }

export default function SelectChildPage() {
  const router = useRouter()
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Child | null>(null)

  async function handleDelete(child: Child) {
    const supabase = createClient()

    const r1 = await supabase.from('child_lessons').delete().eq('child_id', child.id)
    console.log('child_lessons:', r1.error)

    const r2 = await supabase.from('progress').delete().eq('child_id', child.id)
    console.log('progress:', r2.error)

    const r3 = await supabase.from('wrong_answers').delete().eq('child_id', child.id)
    console.log('wrong_answers:', r3.error)

    const r4 = await supabase.from('sessions').delete().eq('child_id', child.id)
    console.log('sessions:', r4.error)

    const { error } = await supabase.from('children').delete().eq('id', child.id)
    console.log('children:', error)

    setChildren(prev => prev.filter(c => c.id !== child.id))
    setDeleteTarget(null)
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data } = await supabase
        .from('children')
        .select('id, name, grade, avatar')
        .eq('parent_id', user.id)
        .order('created_at', { ascending: true })

      setChildren(data ?? [])
      setLoading(false)
    }
    load()
  }, [router])

  return (
    <>
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50%       { opacity: 1;    transform: scale(1.5); }
        }
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 0.35; }
          50%       { opacity: 0.7; }
        }
        .sc-star {
          position: absolute;
          border-radius: 50%;
          background: #fff;
          animation: twinkle var(--dur, 3s) var(--delay, 0s) ease-in-out infinite;
        }
        .sc-child-card {
          cursor: pointer;
          transition: border-color 0.18s, transform 0.18s, box-shadow 0.18s;
        }
        .sc-child-card:hover {
          border-color: var(--color-accent) !important;
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.18);
        }
        .sc-add-btn {
          transition: background 0.18s, transform 0.18s, color 0.18s;
          cursor: pointer;
        }
        .sc-add-btn:hover {
          background: var(--color-accent-dim) !important;
          transform: translateY(-2px);
        }
        .sc-skeleton {
          animation: skeleton-pulse 1.4s ease-in-out infinite;
        }
      `}</style>

      <div
        dir="rtl"
        style={{
          minHeight: '100vh',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-primary)',
          background:
            'linear-gradient(135deg, var(--color-bg-gradient-from) 0%, var(--color-bg-gradient-mid) 50%, var(--color-bg-gradient-to) 100%)',
          padding: '40px 16px',
        }}
      >
        {/* Sign out */}
        <button
          onClick={async () => {
            const supabase = createClient()
            await supabase.auth.signOut()
            router.push('/login')
          }}
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            zIndex: 10,
            padding: '6px 14px',
            borderRadius: '999px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent',
            color: 'rgba(255,255,255,0.45)',
            fontSize: '12px',
            fontFamily: 'var(--font-primary)',
            cursor: 'pointer',
            transition: 'color 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => {
            (e.target as HTMLButtonElement).style.color = 'rgba(255,255,255,0.8)'
            ;(e.target as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.25)'
          }}
          onMouseLeave={e => {
            (e.target as HTMLButtonElement).style.color = 'rgba(255,255,255,0.45)'
            ;(e.target as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)'
          }}
        >
          התנתק
        </button>

        {/* Stars */}
        <StarsBackground />

        {/* Central glow */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 60% 50% at 50% 50%, var(--color-accent-glow), transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Main content */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            width: 'min(720px, 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '32px',
          }}
        >
          {/* Logo badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: 'var(--color-accent)',
                boxShadow: '0 0 8px var(--color-accent)',
                flexShrink: 0,
                animation: 'twinkle 2s ease-in-out infinite',
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

          {/* Title */}
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 800,
              color: 'var(--color-text-primary)',
              margin: 0,
              textAlign: 'center',
            }}
          >
            מי משחק היום?
          </h1>

          {/* Grid */}
          {loading ? (
            <SkeletonGrid />
          ) : children.length === 0 ? (
            <EmptyState onAdd={() => router.push('/onboarding')} />
          ) : (
            <ChildGrid
              children={children}
              onSelect={(id) => router.push(`/child/${id}`)}
              onAdd={() => router.push('/onboarding')}
              onDelete={(child) => setDeleteTarget(child)}
            />
          )}
        </div>

        {deleteTarget && (
          <div
            onClick={() => setDeleteTarget(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: 'rgba(0,0,0,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: 'linear-gradient(170deg, #3A1E1E, #2B1212)',
                border: '1.5px solid rgba(192,57,43,0.35)',
                borderRadius: '22px',
                padding: '28px 24px',
                width: '280px',
                textAlign: 'center',
                fontFamily: 'var(--font-primary)',
              }}
            >
              <div style={{ fontSize: '16px', color: 'white', marginBottom: '8px' }}>
                למחוק את {deleteTarget.name}?
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '24px' }}>
                הפעולה לא ניתנת לביטול
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setDeleteTarget(null)}
                  style={{
                    flex: 1, height: '42px', borderRadius: '11px',
                    border: '1.5px solid rgba(255,255,255,0.14)',
                    background: 'transparent', color: 'rgba(255,255,255,0.5)',
                    fontSize: '14px', fontFamily: 'var(--font-primary)', cursor: 'pointer',
                  }}
                >
                  ביטול
                </button>
                <button
                  onClick={() => handleDelete(deleteTarget)}
                  style={{
                    flex: 1, height: '42px', borderRadius: '11px',
                    border: 'none', background: '#C0392B',
                    color: 'white', fontSize: '14px',
                    fontFamily: 'var(--font-primary)', cursor: 'pointer',
                  }}
                >
                  מחק
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

/* ── Child grid ── */
function ChildGrid({
  children,
  onSelect,
  onAdd,
  onDelete,
}: {
  children: Child[]
  onSelect: (id: string) => void
  onAdd: () => void
  onDelete: (child: Child) => void
}) {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '16px',
        }}
      >
        {children.map((child) => (
          <ChildCard key={child.id} child={child} onClick={() => onSelect(child.id)} onDelete={() => onDelete(child)} />
        ))}
      </div>
      <AddButton onClick={onAdd} />
    </div>
  )
}

/* ── Child card ── */
function ChildCard({ child, onClick, onDelete }: { child: Child; onClick: () => void; onDelete: () => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <button
        className="sc-child-card"
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: '100%',
          background: 'var(--color-card-bg)',
          border: '1.5px solid var(--color-card-border)',
          borderRadius: 'var(--radius-card)',
          backdropFilter: 'blur(10px)',
          padding: '28px 16px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          cursor: 'pointer',
          fontFamily: 'var(--font-primary)',
        }}
      >
        <span style={{ fontSize: '64px', lineHeight: 1 }}>{child.avatar}</span>
        <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          {child.name}
        </span>
        <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
          {GRADE_LABELS[child.grade] ?? `כיתה ${child.grade}`}
        </span>
      </button>

      {hovered && (
        <div
          onMouseEnter={() => setHovered(true)}
          onClick={e => { e.stopPropagation(); onDelete() }}
          style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: 'rgba(192,57,43,0.85)',
            color: 'white',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 5,
          }}
        >
          ✕
        </div>
      )}
    </div>
  )
}

/* ── Add button ── */
function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="sc-add-btn"
      onClick={onClick}
      style={{
        width: '100%',
        padding: '18px',
        borderRadius: 'var(--radius-card)',
        border: '2px dashed var(--color-accent)',
        background: 'transparent',
        color: 'var(--color-accent)',
        fontSize: '16px',
        fontWeight: 700,
        fontFamily: 'var(--font-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
      }}
    >
      הוסף ילד +
    </button>
  )
}

/* ── Empty state ── */
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        width: '100%',
      }}
    >
      <p
        style={{
          fontSize: '18px',
          color: 'var(--color-text-muted)',
          margin: 0,
          textAlign: 'center',
        }}
      >
        עדיין אין ילדים
      </p>
      <button
        className="sc-add-btn"
        onClick={onAdd}
        style={{
          padding: '14px 32px',
          borderRadius: 'var(--radius-button)',
          border: '2px dashed var(--color-accent)',
          background: 'transparent',
          color: 'var(--color-accent)',
          fontSize: '16px',
          fontWeight: 700,
          fontFamily: 'var(--font-primary)',
        }}
      >
        הוסף ילד ראשון
      </button>
    </div>
  )
}

/* ── Skeleton ── */
function SkeletonGrid() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '16px',
        width: '100%',
      }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="sc-skeleton"
          style={{
            background: 'var(--color-card-bg)',
            border: '1.5px solid var(--color-card-border)',
            borderRadius: 'var(--radius-card)',
            padding: '28px 16px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--color-card-border)',
            }}
          />
          <div
            style={{
              width: '80px',
              height: '16px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--color-card-border)',
            }}
          />
          <div
            style={{
              width: '56px',
              height: '12px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--color-card-border)',
            }}
          />
        </div>
      ))}
    </div>
  )
}
