'use client'
import { useRef, useState } from 'react'
import { PlayIcon, Stairs } from './art'

/**
 * שלב 1 — סרטון הסבר. מסך פתיחה: איור השלב, ״בואו נתחיל״ וכפתור Play שפועם לאט.
 * הסרטון נטען רק בלחיצה. ✓ בצפייה ב-90%.
 */
export default function VideoStage({ src, poster, tint, playLabel, startLabel, soonLabel, onComplete }: {
  src?: string; poster?: string; tint: string; playLabel: string; startLabel: string; soonLabel: string; onComplete: () => void
}) {
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(!src)
  const sent = useRef(false)

  if (playing && !failed) {
    return (
      <div className="box panel-in" style={{ background: '#000' }}>
        <video src={src} poster={poster} autoPlay controls playsInline
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
          onError={() => { setFailed(true); setPlaying(false) }}
          onTimeUpdate={e => {
            const v = e.currentTarget
            if (!sent.current && v.duration && v.currentTime / v.duration >= 0.9) { sent.current = true; onComplete() }
          }} />
      </div>
    )
  }

  return (
    <div className="box panel-in" style={{ background: tint }}>
      <Stairs />
      {failed ? (
        <p style={{ position: 'relative', margin: 0, padding: '14px 26px', borderRadius: 999, background: '#fff', fontSize: 20, fontWeight: 800 }}>{soonLabel}</p>
      ) : (
        <div className="c-start">
          <p>{startLabel}</p>
          <button type="button" className="press c-play breathe" aria-label={playLabel} onClick={() => setPlaying(true)} style={{ background: '#fff' }}>
            <PlayIcon color="var(--primary)" />
          </button>
        </div>
      )}
    </div>
  )
}
