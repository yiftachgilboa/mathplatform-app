'use client'
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
export default function Hero({ look, pose = 'stand', label, className }: {
  look: Look; pose?: HeroPose; label?: string; className?: string
}) {
  return <LowPoly tilt={TILT} viewBox={heroBox} run={pose !== 'stand'} dep={JSON.stringify(look) + pose} label={label} className={className}
    build={(LP, t) => LP.hero(look, { size: 100, pose, t, rot: -.2, expression: pose === 'stand' ? 'happy' : undefined })} />
}
