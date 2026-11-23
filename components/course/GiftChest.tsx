'use client'
import { useEffect, useRef } from 'react'
import LowPoly, { useArt } from './LowPoly'

/* eslint-disable @typescript-eslint/no-explicit-any -- ספריית הארט היא JS רגיל (art/lowpoly.js) */
const TILT = .3
const RED = '#ef5c55'
let box: string | null = null
/** מסגרת לפי התיבה הסגורה (המכסה הפתוח והסרט גולשים מעליה) */
function chestBox(LP: any): string {
  if (box) return box
  const b = LP.bounds(LP.facets(LP.make.giftChest({ size: 100 }), LP.camera({ a: TILT })))
  return (box = [b.x - 2, b.y - 2, b.w + 4, b.h + 3].map((n: number) => n.toFixed(1)).join(' '))
}
/** gift = קופסת מתנה על יעד: זהובה עם סרט אדום */
const make = (LP: any, color: string, gift: boolean, open = 0) => LP.make.giftChest({ size: 100, color, open, ribbon: gift ? LP.dye(RED) : undefined })
/** המכסה נפתח בקפיצה קטנה — אותה תנועה כמו התיבה במשחקים */
const lidAt = (t: number) => { const k = Math.min(1, t / .45); return 2 * (1 - Math.pow(1 - k, 3)) + Math.sin(k * Math.PI) * .3 }

const still: Record<string, string> = {}
/** תיבת מתנה סגורה (פריים אחד, נשמר לפי צבע — מהיר גם כשיש הרבה) */
export function GiftChestStill({ color, gift = false }: { color: string; gift?: boolean }) {
  const LP = useArt()
  if (!LP) return <svg className="s-chest" viewBox="0 0 110 80" aria-hidden />
  const key = color + gift
  still[key] ??= LP.draw(make(LP, color, gift), LP.camera({ a: TILT }))
  return <svg className="s-chest" viewBox={chestBox(LP)} preserveAspectRatio="xMidYMax meet" aria-hidden dangerouslySetInnerHTML={{ __html: still[key] }} />
}

/** התיבה שנקנתה: סגורה, או נפתחת */
export function GiftChest({ color, gift = false, open }: { color: string; gift?: boolean; open: boolean }) {
  return <LowPoly className="s-chest" tilt={TILT} viewBox={chestBox} run={open} until={.5} fps={30} dep={color + gift + open}
    build={(LP, t) => make(LP, color, gift, open ? lidAt(t) : 0)} />
}

/** היד מהמשחקים: מראה ללחוץ על התיבה */
export function TapHand() {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const a = ref.current?.animate([{ transform: 'translateY(18px)' }, { transform: 'translateY(0) scale(.92)', offset: .45 }, { transform: 'translateY(18px)' }],
      { duration: 1000, iterations: Infinity, easing: 'ease-in-out' })
    return () => a?.cancel()
  }, [])
  return (
    <span ref={ref} className="s-hand" aria-hidden>
      <svg width="52" height="73" viewBox="0 0 44 62">
        <polygon points="10,4 14,0 18,4 18,28 10,28" fill="#FFDDB8" /><polygon points="14,0 18,4 18,28 14,28" fill="#F6C99A" />
        <polygon points="18,16 25,15 26,28 18,28" fill="#F6C99A" /><polygon points="26,18 32,18 33,30 26,30" fill="#EBB585" />
        <polygon points="4,26 34,26 36,46 8,48" fill="#FFDDB8" /><polygon points="20,26 34,26 36,46 22,47" fill="#F6C99A" />
        <polygon points="0,30 6,27 9,38 3,39" fill="#FFDDB8" />
        <polygon points="7,47 36,45 37,60 8,62" fill="#3D6FE0" /><polygon points="22,46 36,45 37,60 23,61" fill="#2D57C2" />
      </svg>
    </span>
  )
}

/** קונפטי שעף מהתיבה — אותה תנועה כמו המטבעות של תיבת האוצר */
export function chestBurst(el: Element | null, colors: string[], n = 22) {
  if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const r = el.getBoundingClientRect(), x0 = r.left + r.width / 2, y0 = r.top + r.height * .38, H = window.innerHeight
  for (let i = 0; i < n; i++) {
    const c = document.createElement('i'), s = 9 + Math.random() * 9
    Object.assign(c.style, { position: 'fixed', left: '0', top: '0', width: `${s}px`, height: `${s}px`, zIndex: '65', pointerEvents: 'none', background: colors[i % colors.length],
      clipPath: i % 2 ? 'polygon(50% 0,100% 100%,0 80%)' : 'polygon(0 15%,100% 0,85% 100%,10% 85%)' })
    document.body.appendChild(c)
    const vx = (Math.random() - .5) * Math.min(800, window.innerWidth * 1.4), vy = -(420 + Math.random() * 460), g = 1500
    const T = Math.max(1, (-vy + Math.sqrt(vy * vy + 2 * g * Math.max(0, H - y0 + 60))) / g), spin = 2 + Math.floor(Math.random() * 4), frames: Keyframe[] = []
    for (let k = 0; k <= 12; k++) {
      const t = T * k / 12
      frames.push({ transform: `translate(${x0 + vx * t - s / 2}px,${y0 + vy * t + .5 * g * t * t - s / 2}px) rotate(${k * 30}deg) scaleX(${Math.cos(k / 12 * spin * Math.PI * 2).toFixed(2)})`, opacity: k ? 1 : 0 })
    }
    c.animate(frames, { duration: T * 1000, delay: i * 9, easing: 'linear', fill: 'both' }).onfinish = () => c.remove()
  }
}
