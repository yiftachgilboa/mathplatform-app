'use client'
import { useEffect, useState } from 'react'
import type { Look } from '@/lib/shop/config'
import LowPoly from './LowPoly'

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

type Act = { pose: HeroPose; expression?: string; ms: number }
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
