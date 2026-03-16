'use client'

import { useRouter } from 'next/navigation'

type Game = {
  id: string
  title: string
  difficulty: number
  duration_minutes: number
  thumbnail: string
}

export default function GameGrid({ games }: { games: Game[] }) {
  const router = useRouter()

  if (games.length === 0) {
    return (
      <p
        style={{
          textAlign: 'center',
          fontSize: '18px',
          color: 'var(--color-text-muted)',
          marginTop: '64px',
        }}
      >
        אין משחקים זמינים כרגע 🎮
      </p>
    )
  }

  return (
    <>
      <style>{`
        @keyframes gg-pulse {
          0%, 100% { opacity: 0.35; }
          50%       { opacity: 0.7; }
        }
        .gg-card {
          transition: border-color 0.18s, transform 0.18s, box-shadow 0.18s;
          cursor: pointer;
        }
        .gg-card:hover {
          border-color: var(--color-accent) !important;
          transform: scale(1.02);
          box-shadow: 0 8px 28px rgba(0,0,0,0.18);
        }
      `}</style>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        {games.map((game) => (
          <button
            key={game.id}
            className="gg-card"
            onClick={() => router.push(`/play/${game.id}`)}
            style={{
              background: 'var(--color-card-bg)',
              border: '1.5px solid var(--color-card-border)',
              borderRadius: 'var(--radius-card)',
              backdropFilter: 'blur(10px)',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '12px',
              textAlign: 'right',
              fontFamily: 'var(--font-primary)',
            }}
          >
            {/* Thumbnail */}
            <span style={{ fontSize: '48px', lineHeight: 1 }}>{game.thumbnail}</span>

            {/* Title */}
            <span
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                lineHeight: 1.3,
              }}
            >
              {game.title}
            </span>

            {/* Difficulty stars */}
            <span style={{ fontSize: '16px', letterSpacing: '2px' }}>
              {Array.from({ length: 3 }, (_, i) =>
                i < game.difficulty ? '⭐' : '☆'
              ).join('')}
            </span>

            {/* Duration */}
            <span
              style={{
                fontSize: '12px',
                color: 'var(--color-text-muted)',
              }}
            >
              {game.duration_minutes} דקות
            </span>
          </button>
        ))}
      </div>
    </>
  )
}
