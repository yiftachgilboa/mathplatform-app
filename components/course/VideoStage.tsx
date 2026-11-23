'use client'
import { useEffect, useRef, useState } from 'react'
import { PlayIcon } from './art'
import LessonArt from './LessonArt'

/**
 * שלב 1 — סרטון הסבר. מסך פתיחה: איור לפי השיעור, ״בואו נתחיל״ וכפתור Play (המשולש פועם לאט).
 * הסרטון נטען רק בלחיצה. ✓ בצפייה ב-90%.
 */
export default function VideoStage({ lessonId, src, poster, tint, playLabel, startLabel, soonLabel, paused = false, onComplete }: {
  lessonId: string; src?: string; poster?: string; tint: string; playLabel: string; startLabel: string; soonLabel: string; paused?: boolean; onComplete: () => void
}) {
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(!src)
  const sent = useRef(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  // החנות נפתחה מעל הסרטון → הסרטון נעצר (חוזרים ב-Play של הנגן)
  useEffect(() => { if (paused) videoRef.current?.pause() }, [paused])

  if (playing && !failed) {
    return (
      <div className="box panel-in" style={{ background: '#000' }}>
        <video ref={videoRef} src={src} poster={poster} autoPlay controls playsInline
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
      <LessonArt lessonId={lessonId} />
      {failed ? (
        <p style={{ position: 'relative', margin: 0, padding: '14px 26px', borderRadius: 999, background: '#fff', fontSize: 20, fontWeight: 800 }}>{soonLabel}</p>
      ) : (
        <div className="c-start">
          <p>{startLabel}</p>
          <button type="button" className="press c-play" aria-label={playLabel} onClick={() => setPlaying(true)} style={{ background: '#fff' }}>
            <span className="breathe"><PlayIcon color="var(--primary)" /></span>
          </button>
        </div>
      )}
    </div>
  )
}
