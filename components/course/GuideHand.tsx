'use client'
import { useEffect, useRef, useState } from 'react'
import type { GuidePoint } from '@/lib/course/guide'

/**
 * יד שמצביעה על מה שהדמות ממליצה ללחוץ עליו: שלב בשורת השלבים (data-stage) או שיעור בתפריט (data-lesson).
 * אותה יד של החנות. במחצית התחתונה של המסך היא מגיעה מלמעלה (האצבע למטה), אחרת מלמטה.
 * עוקבת אחרי המטרה (גלילה, שינוי גודל); לא חוסמת לחיצות.
 */
export default function GuideHand({ point }: { point: GuidePoint }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [down, setDown] = useState(false)

  useEffect(() => {
    const sel = 'stage' in point ? `[data-stage="${point.stage}"]` : `[data-lesson="${point.lesson}"]`
    let raf = 0
    const place = () => {
      raf = requestAnimationFrame(place)
      const hand = ref.current
      // בטלפון ובמחשב יש שני תפריטים / שורות — לוקחים את זה שגלוי
      const el = [...document.querySelectorAll<HTMLElement>(sel)].find(e => e.offsetParent && e.getBoundingClientRect().width > 0)
      if (!hand) return
      if (!el) { hand.style.opacity = '0'; return }
      const r = el.getBoundingClientRect()
      const isDown = r.top + r.height / 2 > window.innerHeight / 2
      setDown(d => (d === isDown ? d : isDown))
      // קצה האצבע (14/44 מרוחב היד; הפוכה — 30/44) על מרכז המטרה, קצת בפנים
      const x = r.left + r.width / 2 - 52 * (isDown ? 30 : 14) / 44
      const y = isDown ? r.top + r.height * .45 - 73 : r.top + r.height * .55
      hand.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px)`
      hand.style.opacity = '1'
    }
    place()
    return () => cancelAnimationFrame(raf)
  }, [point])

  useEffect(() => {
    const svg = ref.current?.firstElementChild as SVGElement | null
    if (!svg || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const d = down ? -14 : 14
    const a = svg.animate([{ transform: `translateY(${d}px)` }, { transform: 'translateY(0) scale(.92)', offset: .45 }, { transform: `translateY(${d}px)` }],
      { duration: 1000, iterations: Infinity, easing: 'ease-in-out' })
    return () => a.cancel()
  }, [down])

  return (
    <span ref={ref} className="c-guidehand" aria-hidden style={{ opacity: 0 }}>
      <svg width="52" height="73" viewBox="0 0 44 62" style={{ display: 'block', rotate: down ? '180deg' : undefined }}>
        <polygon points="10,4 14,0 18,4 18,28 10,28" fill="#FFDDB8" /><polygon points="14,0 18,4 18,28 14,28" fill="#F6C99A" />
        <polygon points="18,16 25,15 26,28 18,28" fill="#F6C99A" /><polygon points="26,18 32,18 33,30 26,30" fill="#EBB585" />
        <polygon points="4,26 34,26 36,46 8,48" fill="#FFDDB8" /><polygon points="20,26 34,26 36,46 22,47" fill="#F6C99A" />
        <polygon points="0,30 6,27 9,38 3,39" fill="#FFDDB8" />
        <polygon points="7,47 36,45 37,60 8,62" fill="#3D6FE0" /><polygon points="22,46 36,45 37,60 23,61" fill="#2D57C2" />
      </svg>
    </span>
  )
}
