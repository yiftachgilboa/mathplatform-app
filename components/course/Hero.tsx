'use client'
import { useEffect, useRef, useState } from 'react'
import type { Look } from '@/lib/shop/config'
import LowPoly, { loadArt, painter } from './LowPoly'

/* eslint-disable @typescript-eslint/no-explicit-any -- ספריית הארט היא JS רגיל (art/lowpoly.js) */
const TILT = .25
let box: string | null = null
/** מסגרת קבועה לפי הדמות הרגילה, עם מקום לכובע (אותו גודל דמות בכל לבוש) */
function heroBox(LP: any): string {
  if (box) return box
  const b = LP.bounds(LP.facets(LP.hero({}, { size: 100, pose: 'stand', t: 0, rot: -.2 }), LP.camera({ a: TILT })))
  return (box = [b.x - 10, b.y - 14, b.w + 20, b.h + 16].map((n: number) => n.toFixed(1)).join(' '))
}

export type HeroPose = 'stand' | 'wave' | 'cheer' | 'jump'

/** הדמות של הילד (LP.hero), לפי מה שהוא לובש. עומדת = פריים אחד בלבד. */
export default function Hero({ look, pose = 'stand', expression, label, className }: {
  look: Look; pose?: HeroPose; expression?: string; label?: string; className?: string
}) {
  return <LowPoly tilt={TILT} viewBox={heroBox} run={pose !== 'stand'} dep={JSON.stringify(look) + pose + expression} label={label} className={className}
    build={(LP, t) => LP.hero(look, { size: 100, pose, t, rot: -.2, expression: expression ?? (pose === 'stand' ? 'happy' : undefined) })} />
}

export type Act = { pose: HeroPose; expression?: string; ms: number }
const ACTS: Act[] = [
  { pose: 'wave', expression: 'happy', ms: 2200 }, { pose: 'jump', expression: 'joy', ms: 2000 }, { pose: 'stand', expression: 'joy', ms: 1500 },
  { pose: 'wave', expression: 'joy', ms: 2000 }, { pose: 'jump', expression: 'happy', ms: 1000 }, { pose: 'stand', expression: 'surprised', ms: 1300 },
]
/** כמו במשחקים: כשהדמות מחכה (idle) היא מדי פעם מנפנפת, קופצת או עושה פרצוף. בין לבין — פריים אחד. */
export function useIdleAct(idle: boolean): Act | null {
  const [act, setAct] = useState<Act | null>(null)
  useEffect(() => {
    if (!idle) return
    let timer: ReturnType<typeof setTimeout>, last = -1
    const next = () => {
      timer = setTimeout(() => {
        let i = Math.floor(Math.random() * (ACTS.length - 1))
        if (i >= last && last >= 0) i++           // לא אותו דבר פעמיים ברצף
        last = i
        setAct(ACTS[i])
        timer = setTimeout(() => { setAct(null); next() }, ACTS[i].ms)
      }, 2000 + Math.random() * 2500)
    }
    next()
    return () => { clearTimeout(timer); setAct(null) }
  }, [idle])
  return act
}

/**
 * הדמות החיה של עמוד הקורס: עוקבת בעיניים ובגוף אחרי העכבר / הנגיעה, ממצמצת, מדברת (talking) ומבצעת act.
 * calm = הילד משחק או צופה: פריים אחד ובלי לולאה, כדי לא להסיח ולא להכביד על המשחק.
 * הגוף מצויר רק כשהוא זז; מבט, מצמוץ ודיבור הם שכבת הפנים בלבד.
 */
export function LiveHero({ look, act, talking = false, calm = false, className }: {
  look: Look; act: Act | null; talking?: boolean; calm?: boolean; className?: string
}) {
  const ref = useRef<SVGSVGElement>(null)
  const cur = useRef({ act, talking })
  useEffect(() => { cur.current = { act, talking } })
  const dep = JSON.stringify(look)

  useEffect(() => {
    let raf = 0, dead = false, off = () => {}
    loadArt().then(LP => {
      const el = ref.current
      if (dead || !el) return
      el.setAttribute('viewBox', heroBox(LP))
      const paint = painter(LP, el, TILT)
      if (calm || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        paint.all(LP.hero(look, { size: 100, pose: 'stand', t: 0, rot: -.2, expression: 'happy' }))
        return
      }
      const gaze = [0, 0], target = [0, 0]
      let lastMove = 0, box = el.getBoundingClientRect(), boxAt = 0, last = 0
      let shown: Act | null = null, t0 = 0, obj: any = null, rot = 0, drawn = '', blinkAt = performance.now() + 2000

      const frame = (now: number) => {
        const { act, talking } = cur.current
        if (act !== shown) { shown = act; t0 = now; obj = null }
        const pose = act?.pose ?? 'stand'
        if (now - lastMove > 4000) target[0] = target[1] = 0   // לא זזו: חוזרת להסתכל קדימה
        for (const i of [0, 1]) gaze[i] += (target[i] - gaze[i]) * .25
        if (now > blinkAt + 130) blinkAt = now + 1800 + Math.random() * 3200
        const life = { gaze: [...gaze], blink: now >= blinkAt, talk: talking ? Math.abs(Math.sin(now / 95)) * .9 + .1 : 0 }
        const wantRot = -.2 + gaze[0] * .28
        if (!obj || pose !== 'stand' || Math.abs(wantRot - rot) > .02) {
          rot = wantRot
          obj = LP.hero(look, { size: 100, pose, t: (now - t0) / 1000, rot, expression: act?.expression ?? (pose === 'stand' ? 'happy' : undefined), ...life })
          paint.all(obj)
          return
        }
        const key = `${gaze.map(n => n.toFixed(2))}${life.blink}${life.talk.toFixed(1)}`
        if (key === drawn) return
        drawn = key
        Object.assign(obj.face, life)
        paint.face(obj)
      }

      const onMove = (e: PointerEvent) => {
        if (!box.width) return
        lastMove = performance.now()
        const clamp = (n: number) => Math.max(-1, Math.min(1, n))
        target[0] = clamp((e.clientX - box.left - box.width / 2) / (window.innerWidth * .3))
        target[1] = clamp((e.clientY - box.top - box.height * .4) / (window.innerHeight * .35))
      }
      window.addEventListener('pointermove', onMove, { passive: true })
      window.addEventListener('pointerdown', onMove, { passive: true })
      off = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerdown', onMove) }
      const loop = (now: number) => {
        raf = requestAnimationFrame(loop)
        if (now - last < 48) return
        last = now
        if (now - boxAt > 500) { boxAt = now; box = el.getBoundingClientRect() }
        if (box.width) frame(now)      // העותק המוסתר (טלפון / מחשב) לא מצויר
      }
      raf = requestAnimationFrame(loop)
    }).catch(() => { /* ראו useArt */ })
    return () => { dead = true; cancelAnimationFrame(raf); off() }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- look לפי התוכן (dep)
  }, [dep, calm])

  return <svg ref={ref} className={className} viewBox="0 0 100 120" preserveAspectRatio="xMidYMax meet" aria-hidden style={{ overflow: 'visible', display: 'block' }} />
}
