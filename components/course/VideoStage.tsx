'use client'
import { useRef, useState } from 'react'
import { Stairs } from './art'

/**
 * שלב 1 — סרטון הסבר. הנגן מוצג מיד (עם תמונת הפתיחה), בלי מסך ביניים.
 * נטען רק המידע הבסיסי (preload=metadata); הסרטון עצמו יורד כשלוחצים Play.
 * מגדילים למסך מלא מהכפתור של הנגן. ✓ בצפייה ב-90%.
 */
export default function VideoStage({ src, poster, tint, soonLabel, onComplete }: {
  src?: string; poster?: string; tint: string; playLabel?: string; soonLabel: string; onComplete: () => void
}) {
  const [failed, setFailed] = useState(!src)
  const sent = useRef(false)

  if (failed) {
    return (
      <div className="box panel-in" style={{ background: tint }}>
        <Stairs />
        <p style={{ position: 'relative', margin: 0, padding: '14px 26px', borderRadius: 999, background: '#fff', fontSize: 20, fontWeight: 800 }}>{soonLabel}</p>
      </div>
    )
  }

  return (
    <div className="box panel-in" style={{ background: '#000' }}>
      <video src={src} poster={poster} controls playsInline preload="metadata"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
        onError={() => setFailed(true)}
        onTimeUpdate={e => {
          const v = e.currentTarget
          if (!sent.current && v.duration && v.currentTime / v.duration >= 0.9) { sent.current = true; onComplete() }
        }} />
    </div>
  )
}
