'use client'
import { useEffect, useState } from 'react'
import { fetchStoriesByTopic } from '@/lib/storybook/storyLoader'
import { StoryBook } from '@/lib/storybook/types'

interface Props {
  topic: string
  onSelect: (bookId: string) => void
}

export default function StorySelector({ topic, onSelect }: Props) {
  const [stories, setStories] = useState<StoryBook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStoriesByTopic(topic)
      .then((data) => {
        console.log('[StorySelector] data:', data)
        if (!data || data.length === 0) {
          setError('לא נמצאו סיפורים לנושא: ' + topic)
        } else {
          setStories(data)
        }
      })
      .catch((err) => {
        console.error('[StorySelector] error full:', err)
        console.error('[StorySelector] error message:', err?.message)
        console.error('[StorySelector] error code:', err?.code)
        setError('שגיאה: ' + JSON.stringify(err))
      })
      .finally(() => setLoading(false))
  }, [topic])

  // Preload תמונה ראשונה של כל סיפור (עמוד 1)
  useEffect(() => {
    if (stories.length === 0) return
    stories.forEach(s => {
      // בנה את ה-URL של תמונה 1 לפי מבנה ה-Storage
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/stories/${s.id}/1.jpg`
      const img = new Image()
      img.src = url
    })
  }, [stories])

  if (loading) return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Secular One', serif", fontSize: 22, color: '#111',
    }}>
      טוען סיפורים...
    </div>
  )

  if (error) return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Secular One', serif", fontSize: 18, color: '#c00',
    }}>
      {error}
    </div>
  )

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '2rem', gap: '1.5rem',
      fontFamily: "'Secular One', serif", direction: 'rtl',
    }}>
      <div style={{
        fontFamily: "'Bangers', cursive",
        fontSize: 'clamp(28px,5vw,42px)',
        letterSpacing: '0.06em', color: '#111',
      }}>
        בחר סיפור
      </div>

      <div style={{
        display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center',
      }}>
        {stories.map(s => (
          <button key={s.id} onClick={() => onSelect(s.id)} style={{
            background: '#FFE066',
            border: '3px solid #111',
            borderRadius: 16,
            boxShadow: '6px 6px 0 #111',
            width: 280,
            height: 392,
            display: 'flex', flexDirection: 'column',
            cursor: 'pointer',
            overflow: 'hidden',
            padding: 0,
            position: 'relative',
            fontFamily: "'Bangers', cursive",
          }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-7px) rotate(-1.5deg)'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '8px 10px 0 #111'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = ''
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '6px 6px 0 #111'
            }}
          >
            {/* תמונה כרקע מלא */}
            <div style={{
              flex: 1,
              width: '100%',
              overflow: 'hidden',
              position: 'relative',
            }}>
              <img
                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/stories/${s.id}/1.jpg`}
                alt={s.title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none'
                }}
              />
            </div>

            {/* שם הסיפור — רקע לבן למטה */}
            <div style={{
              background: 'rgba(255,255,255,0.92)',
              borderTop: '2px solid #111',
              padding: '8px 12px',
              textAlign: 'center',
              fontSize: 20,
              fontFamily: "'Bangers', cursive",
              letterSpacing: '0.06em',
              color: '#111',
            }}>
              {s.title}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
