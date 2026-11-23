'use client'
import { useEffect, useRef, useState } from 'react'

/* eslint-disable @typescript-eslint/no-explicit-any -- ספריית הארט היא JS רגיל (art/lowpoly.js) */
let loading: Promise<any> | null = null
/** טוען את ספריית הארט פעם אחת (public/art/lowpoly.js, נבנה ב-npm run build-practices) */
export function loadArt(): Promise<any> {
  const w = window as any
  if (w.LP) return Promise.resolve(w.LP)
  loading ??= new Promise((res, rej) => {
    const s = document.createElement('script')
    s.src = '/art/lowpoly.js'; s.async = true
    s.onload = () => { w.LP['useTheme']('day'); res(w.LP) }
    s.onerror = () => { loading = null; s.remove(); rej(new Error('lowpoly.js')) }
    document.head.appendChild(s)
  })
  return loading
}

/** הספרייה כשהיא מוכנה, אחרת null */
export function useArt(): any {
  const [art, setArt] = useState<any>(null)
  useEffect(() => {
    let dead = false
    loadArt().then(LP => { if (!dead) setArt(LP) }).catch(() => { /* בלי הספרייה — בלי ציור, העמוד עובד */ })
    return () => { dead = true }
  }, [])
  return art
}

const NS = 'http://www.w3.org/2000/svg'

/** מצייר אובייקט לתוך svg עם מאגר פוליגונים קבוע. all = הכול, face = רק שכבת הפנים (זול). */
export function painter(LP: any, el: SVGSVGElement, tilt: number) {
  const g = document.createElementNS(NS, 'g'), fg = document.createElementNS(NS, 'g')
  const pool: SVGPolygonElement[] = []
  el.replaceChildren(g, fg)
  const cam = LP.camera({ a: tilt })
  const face = (o: any) => { if (o.face) fg.innerHTML = LP.face(o, cam) }
  const all = (o: any) => {
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
    face(o)
  }
  return { all, face }
}

/**
 * אובייקט חי מהספרייה: build(LP, t) → אובייקט. run = מצויר שוב ושוב (עד until שניות), אחרת פריים אחד.
 * מאגר פוליגונים קבוע, בלי innerHTML בכל פריים (כמו במשחקים). משנים dep כדי לצייר מחדש.
 */
export default function LowPoly({ build, viewBox, tilt, run = false, until, fps = 20, dep, label, className }: {
  build: (LP: any, t: number) => any
  viewBox: (LP: any) => string
  tilt: number; run?: boolean; until?: number; fps?: number; dep: string; label?: string; className?: string
}) {
  const ref = useRef<SVGSVGElement>(null)
  const fns = useRef({ build, viewBox })
  useEffect(() => { fns.current = { build, viewBox } })

  useEffect(() => {
    let raf = 0, dead = false
    loadArt().then(LP => {
      const el = ref.current
      if (dead || !el) return
      el.setAttribute('viewBox', fns.current.viewBox(LP))
      const paint = painter(LP, el, tilt)
      const draw = (t: number) => paint.all(fns.current.build(LP, t))
      const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (!run || still) { draw(run && until != null ? until : 0); return }
      draw(0)
      const t0 = performance.now()
      let last = t0
      const loop = (now: number) => {
        const t = (now - t0) / 1000
        if (until != null && t >= until) { draw(until); return }
        if (now - last >= 1000 / fps - 2) { last = now; draw(t) }
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    }).catch(() => { /* ראו useArt */ })
    return () => { dead = true; cancelAnimationFrame(raf) }
  }, [dep, run, until, fps, tilt])

  return <svg ref={ref} className={className} viewBox="0 0 100 120" preserveAspectRatio="xMidYMax meet"
    role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} style={{ overflow: 'visible', display: 'block' }} />
}
