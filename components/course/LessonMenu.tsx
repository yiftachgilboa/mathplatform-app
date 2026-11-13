'use client'
import { useEffect, useRef } from 'react'
import type { Lesson } from '@/lib/course/content'

export type LessonState = 'done' | 'cur' | 'future'

/** תפריט השיעורים: דסקטופ — עמודה נגללת; טלפון — פס אופקי. הנבחר גדל ונצבע ב-tint. אין נעילות. */
export default function LessonMenu({ lessons, states, selected, label, onPick }: {
  lessons: Lesson[]; states: LessonState[]; selected: number; label: string; onPick: (i: number) => void
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
      {lessons.map((l, i) => (
        <button key={l.id} ref={el => { btnRefs.current[i] = el }} type="button" className="press c-lesson"
          data-state={states[i]} data-sel={i === selected} aria-current={i === selected ? 'page' : undefined}
          onClick={() => onPick(i)} style={{ '--tint': l.tint } as React.CSSProperties}>
          {l.key}
        </button>
      ))}
    </nav>
  )
}
