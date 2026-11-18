'use client'
import { useEffect, useRef } from 'react'
import type { Lesson } from '@/lib/course/content'

export type LessonState = 'done' | 'cur' | 'future'

/** צבע רמזור לבר: אדום ב-0, כתום באמצע, ירוק מלא ביעד (90%) — מעבר הדרגתי */
function meterColor(value: number, goal: number) {
  const t = Math.max(0, Math.min(1, value / goal))
  return `hsl(${Math.round(t * 130)} 72% 47%)`
}

function Check() {
  return (
    <span className="check" aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
    </span>
  )
}

/**
 * תפריט השיעורים: דסקטופ — עמודה נגללת (פס הגלילה מימין); טלפון — פס אופקי.
 * לא נבחר: חצי רוחב, ממורכז — בר אפור קטן, שם, ״שיעור N״.
 * נבחר: בר רמזור, ״מפתח ה...״ והמשפט.
 * שיעור שהושג (מבחן עבר או 90% בתרגול): וי ירוק במקום הבר.
 */
export default function LessonMenu({ lessons, states, selected, label, meters, achieved, meterLabel, doneLabel, goal, titleOf, numberOf, onPick, onReset }: {
  lessons: Lesson[]; states: LessonState[]; selected: number; label: string
  meters: number[]; achieved: boolean[]; meterLabel: string; doneLabel: string; goal: number
  titleOf: (l: Lesson) => string; numberOf: (n: number) => string
  onPick: (i: number) => void
  /** זמני, לבדיקות: דאבל-קליק מאפס את ההתקדמות בשיעור */
  onReset?: (i: number) => void
}) {
  const navRef = useRef<HTMLElement>(null)
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([])

  // הנבחר במרכז התפריט (אנכי בדסקטופ, אופקי בטלפון)
  useEffect(() => {
    const nav = navRef.current, btn = btnRefs.current[selected]
    if (!nav || !btn) return
    const t = setTimeout(() => {
      const n = nav.getBoundingClientRect(), b = btn.getBoundingClientRect()
      nav.scrollBy({
        top: b.top - n.top - (n.height - b.height) / 2,
        left: b.left - n.left - (n.width - b.width) / 2,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      })
    }, 260) // אחרי שהכרטיסייה גדלה
    return () => clearTimeout(t)
  }, [selected])

  return (
    <nav ref={navRef} className="c-menu" aria-label={label}>
      {lessons.map((l, i) => {
        const sel = i === selected, m = meters[i]
        const status = achieved[i] ? <Check /> : (
          <span className="c-meter" role="meter" aria-label={meterLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={m}>
            <span className="fill" style={{ width: `${Math.max(m, 4)}%`, background: sel ? meterColor(m, goal) : undefined }} />
          </span>
        )
        return (
          <button key={l.id} ref={el => { btnRefs.current[i] = el }} type="button" className="press c-lesson"
            data-state={states[i]} data-sel={sel} aria-current={sel ? 'page' : undefined}
            aria-label={achieved[i] ? `${sel ? titleOf(l) : l.key} — ${doneLabel}` : undefined}
            onClick={() => onPick(i)} onDoubleClick={() => onReset?.(i)} style={{ '--tint': l.tint } as React.CSSProperties}>
            {status}
            {sel ? (
              <>
                <span className="nm">{titleOf(l)}</span>
                <span className="tag">{l.tagline}</span>
              </>
            ) : (
              <>
                <span className="nm">{l.key}</span>
                <span className="sub">{numberOf(i + 1)}</span>
              </>
            )}
          </button>
        )
      })}
    </nav>
  )
}
