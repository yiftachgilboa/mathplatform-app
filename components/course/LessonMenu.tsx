'use client'
import { useEffect, useRef } from 'react'
import type { Lesson } from '@/lib/course/content'

export type LessonState = 'done' | 'cur' | 'future'

/** צבע רמזור לבר: אדום ב-0, כתום באמצע, ירוק מלא ביעד (90%) — מעבר הדרגתי */
function meterColor(value: number, goal: number) {
  const t = Math.max(0, Math.min(1, value / goal))
  return `hsl(${Math.round(t * 130)} 72% 47%)`
}

/**
 * תפריט השיעורים: דסקטופ — עמודה נגללת (פס הגלילה מימין); טלפון — פס אופקי.
 * לא נבחר: שם + ״שיעור N״. שיעור עתידי: חצי רוחב, אפור, מנעול (פיקטיבי — לחיצה פותחת).
 * נבחר: בר רמזור, ״מפתח ה...״ והמשפט.
 */
export default function LessonMenu({ lessons, states, selected, label, meter, goal, meterLabel, titleOf, numberOf, onPick }: {
  lessons: Lesson[]; states: LessonState[]; selected: number; label: string
  meter: number; goal: number; meterLabel: string
  titleOf: (l: Lesson) => string; numberOf: (n: number) => string
  onPick: (i: number) => void
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
        const sel = i === selected
        return (
          <button key={l.id} ref={el => { btnRefs.current[i] = el }} type="button" className="press c-lesson"
            data-state={states[i]} data-sel={sel} aria-current={sel ? 'page' : undefined}
            onClick={() => onPick(i)} style={{ '--tint': l.tint } as React.CSSProperties}>
            {sel ? (
              <>
                <span className="c-meter" role="meter" aria-label={meterLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={meter}>
                  <span className="fill" style={{ width: `${Math.max(meter, 4)}%`, background: meterColor(meter, goal) }} />
                </span>
                <span className="nm">{titleOf(l)}</span>
                <span className="tag">{l.tagline}</span>
              </>
            ) : (
              <>
                <span className="txt">
                  <span className="nm">{l.key}</span>
                  <span className="sub">{numberOf(i + 1)}</span>
                </span>
                {states[i] === 'future' && (
                  <svg className="lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="5" y="11" width="14" height="10" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                )}
              </>
            )}
          </button>
        )
      })}
    </nav>
  )
}
