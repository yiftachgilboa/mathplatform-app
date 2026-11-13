'use client'
import { Bars, Bubbles, PlayIcon } from './art'

/** שלבים 3–4 — משחק תרגול / העשרה. איור שטוח + כפתור Play. המשחק נפתח בעמוד מלא וחוזר לכאן (router.back). */
export default function GameStage({ kind, tint, label, soonLabel, available, onPlay }: {
  kind: 'practice' | 'enrichment'; tint: string; label: string; soonLabel: string; available: boolean; onPlay: () => void
}) {
  return (
    <div className="box panel-in" style={{ background: kind === 'enrichment' ? '#FFF0B8' : tint }}>
      {kind === 'enrichment' ? <Bubbles /> : <Bars />}
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
