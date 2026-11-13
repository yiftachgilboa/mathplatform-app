'use client'
import { useRef, useState } from 'react'
import type { Cue } from '@/lib/course/content'
import { PlayIcon, Stairs } from './art'

type Mark = { i: number; tone: 'ok' | 'bad' | 'reveal' }

/**
 * שלב 2 — התנסות: סרטון שעוצר בנקודות ושואל.
 * נכון → ממשיך. שגוי → רמז וניסיון נוסף. אחרי 2 טעויות → מראים את הפתרון וממשיכים.
 * ✓ כשכל השאלות נענו נכון. בלי סרטון (או אם לא נטען) — השאלות מוצגות ברצף.
 */
export default function InteractiveVideoStage({ src, cues, playLabel, retryLabel, onAnswer, onComplete }: {
  src?: string; cues: Cue[]; playLabel: string; retryLabel: string
  onAnswer: (correct: boolean, cue: Cue, picked: number, attempt: number) => void
  onComplete: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [started, setStarted] = useState(false)
  const [noVideo, setNoVideo] = useState(!src)
  const [cueIdx, setCueIdx] = useState(0)          // השאלה הבאה
  const [open, setOpen] = useState(false)           // כרטיס שאלה פתוח
  const [mistakes, setMistakes] = useState(0)
  const [mark, setMark] = useState<Mark | null>(null)
  const [allCorrect, setAllCorrect] = useState(true)
  const [finished, setFinished] = useState(false)
  const lock = useRef(false)

  const cue = cues[cueIdx]

  // בלי סרטון: השאלה הבאה פתוחה מיד
  const showCard = open || (started && noVideo && !finished && !!cue)

  function finish(perfect: boolean) {
    setFinished(true)
    if (perfect) onComplete()
  }

  function advance(perfect: boolean) {
    const ok = allCorrect && perfect
    setAllCorrect(ok)
    setOpen(false); setMark(null); setMistakes(0); lock.current = false
    const next = cueIdx + 1
    setCueIdx(next)
    if (next >= cues.length && (noVideo || videoRef.current?.ended)) finish(ok)
    else if (!noVideo) videoRef.current?.play().catch(() => {})
  }

  function pick(i: number) {
    if (lock.current || !cue) return
    const correct = i === cue.correct
    onAnswer(correct, cue, i, mistakes + 1)
    if (correct) {
      lock.current = true
      setMark({ i, tone: 'ok' })
      setTimeout(() => advance(true), 700) // נכון גם בניסיון השני נחשב
      return
    }
    const m = mistakes + 1
    setMistakes(m)
    if (m >= 2) {
      lock.current = true
      setMark({ i: cue.correct, tone: 'reveal' })
      setTimeout(() => advance(false), 1600)
    } else {
      setMark({ i, tone: 'bad' })
    }
  }

  function restart() {
    setCueIdx(0); setOpen(false); setMark(null); setMistakes(0); setAllCorrect(true); setFinished(false); lock.current = false
    if (!noVideo && videoRef.current) { videoRef.current.currentTime = 0; videoRef.current.play().catch(() => {}) }
  }

  return (
    <div className="box panel-in" style={{ background: 'var(--navy)', padding: 24 }}>
      {started && !noVideo && (
        <video ref={videoRef} src={src} autoPlay playsInline controls={!showCard}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
          onError={() => setNoVideo(true)}
          onTimeUpdate={e => {
            if (cue && !open && e.currentTarget.currentTime >= cue.t) { e.currentTarget.pause(); setOpen(true) }
          }}
          onEnded={() => { if (cueIdx >= cues.length) finish(allCorrect) }} />
      )}
      {(!started || noVideo) && <Stairs mono />}

      {!started && (
        <button type="button" className="press c-play" aria-label={playLabel} onClick={() => setStarted(true)} style={{ background: '#fff' }}>
          <PlayIcon color="var(--primary)" />
        </button>
      )}

      {showCard && cue && (
        <div key={cueIdx} className="pop" role="dialog" aria-live="polite"
          style={{ position: 'relative', width: '100%', maxWidth: 500, background: '#fff', borderRadius: 28, padding: 'clamp(20px, 4vw, 30px)', display: 'flex', flexDirection: 'column', gap: 22 }}>
          <p style={{ margin: 0, fontSize: 'clamp(22px, 3.4vw, 28px)', fontWeight: 900, lineHeight: 1.2, letterSpacing: '-0.6px' }}>{cue.q}</p>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(cue.answers.length, 4)}, minmax(0, 1fr))`, gap: 12 }}>
            {cue.answers.map((a, i) => {
              const m = mark?.i === i ? mark.tone : null
              const bg = m === 'bad' ? '#FFF0B8' : m ? '#DFF6EE' : '#fff'
              const ring = m === 'bad' ? 'var(--warn)' : m ? 'var(--success)' : 'var(--line-2)'
              return (
                <button key={i} type="button" className="press c-ans" onClick={() => pick(i)}
                  style={{ fontSize: a.length > 3 ? 24 : 'clamp(30px, 5vw, 40px)', fontWeight: 900, minHeight: 84, borderRadius: 22, border: `2px solid ${ring}`, background: bg, padding: '0 8px' }}>
                  {a}
                </button>
              )
            })}
          </div>
          {mark?.tone === 'bad' && cue.hint && (
            <p className="pop" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#9B6A00' }}>{cue.hint}</p>
          )}
        </div>
      )}

      {finished && (
        <button type="button" className="press c-play pop" aria-label={retryLabel} onClick={restart} style={{ background: '#fff' }}>
          <svg width={38} height={38} viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 12a8 8 0 1 0 2.5-5.8" /><path d="M4 4v5h5" />
          </svg>
        </button>
      )}
    </div>
  )
}
