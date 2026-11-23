'use client'
import { useEffect, useRef } from 'react'
import type { Look } from '@/lib/shop/config'

/* eslint-disable @typescript-eslint/no-explicit-any -- ספריית הארט היא JS רגיל (art/lowpoly.js) */
let loading: Promise<any> | null = null
/** טוען את ספריית הארט פעם אחת (public/art/lowpoly.js, נבנה ב-npm run build-practices) */
function loadArt(): Promise<any> {
  const w = window as any
  if (w.LP) return Promise.resolve(w.LP)
  loading ??= new Promise((res, rej) => {
    const s = document.createElement('script')
    s.src = '/art/lowpoly.js'; s.async = true
    s.onload = () => res(w.LP)
    s.onerror = () => { loading = null; s.remove(); rej(new Error('lowpoly.js')) }
    document.head.appendChild(s)
  })
  return loading
}

const NS = 'http://www.w3.org/2000/svg'
const TILT = .25
let viewBox: string | null = null
/** מסגרת קבועה לפי הדמות הרגילה, עם מקום לכובע (אותו גודל דמות בכל לבוש) */
function heroBox(LP: any): string {
  if (viewBox) return viewBox
  const cam = LP.camera({ a: TILT }), b = LP.bounds(LP.facets(LP.hero({}, { size: 100, pose: 'stand', t: 0, rot: -.2 }), cam))
  return (viewBox = [b.x - 10, b.y - 14, b.w + 20, b.h + 16].map((n: number) => n.toFixed(1)).join(' '))
}

export type HeroPose = 'stand' | 'wave' | 'cheer' | 'jump'

/**
 * הדמות של הילד (LP.hero), לפי מה שהוא לובש. עומדת = פריים אחד בלבד; בתנועה 20 פריימים בשנייה,
 * עם מאגר פוליגונים קבוע (בלי innerHTML), כמו במשחקים.
 */
export default function Hero({ look, pose = 'stand', expression, label, className }: {
  look: Look; pose?: HeroPose; expression?: string; label?: string; className?: string
}) {
  const ref = useRef<SVGSVGElement>(null)
  const key = JSON.stringify(look)

  useEffect(() => {
    let raf = 0, dead = false
    loadArt().then(LP => {
      const el = ref.current
      if (dead || !el || !LP) return
      LP['useTheme']('day')   // ערכת צבע של הספרייה (לא React hook)
      el.setAttribute('viewBox', heroBox(LP))
      const g = document.createElementNS(NS, 'g'), fg = document.createElementNS(NS, 'g')
      const pool: SVGPolygonElement[] = []
      el.replaceChildren(g, fg)
      const worn = JSON.parse(key), cam = LP.camera({ a: TILT })
      const draw = (t: number) => {
        const o = LP.hero(worn, { size: 100, pose, t, rot: -.2, expression: expression ?? (pose === 'stand' ? 'happy' : undefined) })
        const list = LP.facets(o, cam)
        for (let i = 0; i < Math.max(list.length, pool.length); i++) {
          let p = pool[i]
          if (!p) {
            p = document.createElementNS(NS, 'polygon')
            p.setAttribute('stroke-width', '.7'); p.setAttribute('stroke-linejoin', 'round')
            g.appendChild(p); pool.push(p)
          }
          const f = list[i]
          if (!f) { p.setAttribute('points', ''); continue }
          p.setAttribute('points', f.pts.map((q: number[]) => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' '))
          p.setAttribute('fill', f.fill); p.setAttribute('stroke', f.fill)
        }
        fg.innerHTML = LP.face(o, cam)
      }
      draw(0)
      if (pose === 'stand' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const t0 = performance.now()
      let last = t0
      const loop = (now: number) => {
        if (now - last >= 48) { last = now; draw((now - t0) / 1000) }
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    }).catch(() => { /* בלי הספרייה — בלי דמות, העמוד עובד */ })
    return () => { dead = true; cancelAnimationFrame(raf) }
  }, [key, pose, expression])

  return <svg ref={ref} className={className} viewBox="0 0 100 120" preserveAspectRatio="xMidYMax meet"
    role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} style={{ overflow: 'visible', display: 'block' }} />
}
