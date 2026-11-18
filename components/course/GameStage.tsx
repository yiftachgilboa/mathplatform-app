'use client'
import { Bars, Bubbles, PlayIcon, Stairs } from './art'

/**
 * שלבים 2–4 — התנסות (עמוד מלא) / משחק תרגול / העשרה. איור שטוח + כפתור Play.
 * המשחק או ההתנסות נפתחים בעמוד מלא וחוזרים לכאן.
 */
export default function GameStage({ kind, tint, label, soonLabel, available, onPlay }: {
  kind: 'interactive' | 'practice' | 'enrichment'; tint: string; label: string; soonLabel: string; available: boolean; onPlay: () => void
}) {
  return (
    <div className="box panel-in" style={{ background: kind === 'enrichment' ? '#FFF0B8' : tint }}>
      {kind === 'enrichment' ? <Bubbles /> : kind === 'interactive' ? <Stairs /> : <Bars />}
      {available ? (
        <button type="button" className="press c-play c-primary" aria-label={label} onClick={onPlay}>
          <PlayIcon color="#FFFFFF" />
        </button>
      ) : (
        <p style={{ position: 'relative', margin: 0, padding: '14px 26px', borderRadius: 999, background: '#fff', fontSize: 20, fontWeight: 800 }}>{soonLabel}</p>
      )}
    </div>
  )
}
