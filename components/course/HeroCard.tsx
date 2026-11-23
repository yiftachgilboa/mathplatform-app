'use client'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { SHOP_UI, boxPrice, type ShopState } from '@/lib/shop/config'
import { fill } from '@/lib/course/content'
import { LiveHero, type Act, type HeroPose } from './Hero'
import { CoinPill } from './Shop'
import { StoreIcon } from './ShopArt'

/** הדמות מנופפת בכניסה, וחוגגת כש-happy משתנה (מטבעות חדשים / פריט חדש). שאר הזמן — פריים אחד. */
export function useHeroPose(happy: number): Act | null {
  const [pose, setPose] = useState<HeroPose>('wave')
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- תגובה לאירוע, ואז חזרה לעמידה
    if (happy > 0) setPose('cheer')
    const t = setTimeout(() => setPose('stand'), 2200)
    return () => clearTimeout(t)
  }, [happy])
  return useMemo(() => (pose === 'stand' ? null : { pose, ms: 0 }), [pose])
}

type HeroProps = {
  shop: ShopState
  act: Act | null
  talking?: boolean
  /** הילד משחק או צופה: הדמות עומדת */
  calm?: boolean
  onShop: () => void
  /** נגיעה בדמות (קופצת ומסבירה שוב) */
  onHero: () => void
  /** בועת ההוראות */
  bubble?: React.ReactNode
}

/** מחשב: כרטיס הדמות מעל תפריט השיעורים — דמות, מטבעות, כפתור חנות (באותו גודל) ובר לקופסה הבאה */
export function HeroCard({ shop, act, talking, calm, onShop, onHero, bubble }: HeroProps) {
  const left = Math.max(0, boxPrice - shop.coins)
  return (
    <div className="c-herocard">
      <button type="button" className="press c-herobtn" onClick={onHero} aria-label={SHOP_UI.myHero}><LiveHero look={shop.look} act={act} talking={talking} calm={calm} className="c-hero" /></button>
      {bubble}
      <div className="info">
        <CoinPill coins={shop.coins} id="c-coins-desk" />
        <ShopButton onClick={onShop} />
      </div>
      {boxPrice > 0 && (
        <div className="goal">
          <span className="bar"><b style={{ width: `${Math.min(100, Math.round(shop.coins / boxPrice * 100))}%` }} /></span>
          <span>{left > 0 ? fill(SHOP_UI.goal, { n: left }) : SHOP_UI.goalReached}</span>
        </div>
      )}
    </div>
  )
}

function ShopButton({ onClick }: { onClick: () => void }) {
  return <button type="button" className="press c-shopbtn" onClick={onClick} aria-label={SHOP_UI.shop} title={SHOP_UI.shop}><StoreIcon size={30} /></button>
}

/** טלפון: אותו דבר בשורת הכותרת */
export function HeroStrip({ shop, act, talking, calm, onShop, onHero, bubble }: HeroProps) {
  return (
    <div className="c-herostrip">
      <button type="button" className="press c-herobtn" onClick={onHero} aria-label={SHOP_UI.myHero}><LiveHero look={shop.look} act={act} talking={talking} calm={calm} className="c-hero" /></button>
      {bubble}
      <CoinPill coins={shop.coins} id="c-coins-phone" />
      <ShopButton onClick={onShop} />
    </div>
  )
}

/** מחשב: החץ של הבועה, באלכסון מהפינה שלה אל הפה של הדמות (נמדד, כי גובה הבועה משתנה לפי הטקסט) */
function useTail(ref: React.RefObject<HTMLDivElement | null>) {
  const [tail, setTail] = useState<{ fill: string; line: string } | null>(null)
  useLayoutEffect(() => {
    const el = ref.current, card = el?.closest<HTMLElement>('.c-herocard'), hero = card?.querySelector<HTMLElement>('.c-herobtn')
    if (!el || !card || !hero) return
    const draw = () => {
      const W = el.clientWidth, H = el.clientHeight, w = hero.offsetWidth, h = hero.offsetHeight
      if (!W || !w) return
      // הכול ביחס לתוך הבועה (בלי המסגרת)
      const mouth = [hero.offsetLeft + w * .48 - el.offsetLeft - el.clientLeft, hero.offsetTop + h * .68 - el.offsetTop - el.clientTop]
      const k = w / 140, low = mouth[1] - 34 * k > H   // הפה מתחת לבועה: החץ יוצא מהתחתית, אחרת מהצד
      const root = low ? [W - 56 * k, H] : [W, Math.min(H - 34 * k, mouth[1] - 22 * k)]
      const dx = mouth[0] - root[0], dy = mouth[1] - root[1], len = Math.hypot(dx, dy) || 1
      const gap = Math.min(len * .6, w * .31)          // עוצר ליד הלחי
      const tip = [mouth[0] - dx / len * gap, mouth[1] - dy / len * gap]
      const half = (low ? 21 : 14) * k
      const at = (d: number, inset: number) => (low ? [root[0] + d, H - inset] : [W - inset, root[1] + d])
      const n = (p: number[]) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`
      // צדדים מעט קעורים, כמו בועת קומיקס
      const mid = (p: number[], s: number) => [(p[0] + tip[0]) / 2 - dy / len * s, (p[1] + tip[1]) / 2 + dx / len * s]
      const path = (inset: number) => {
        const a = at(-half, inset), b = at(half, inset)
        return `M${n(a)} Q${n(mid(a, -3 * k))} ${n(tip)} Q${n(mid(b, -3 * k))} ${n(b)}`
      }
      setTail({ fill: path(1) + 'Z', line: path(-1) })
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(el); ro.observe(hero)
    return () => ro.disconnect()
  }, [ref])
  return tail
}

/** בועת ההוראות: מה עושים עכשיו, לילד ולמי שעוזר לו. רמקול = להקריא / להשתיק, X = לסגור */
export function GuideBubble({ text, talking, sayLabel, closeLabel, onSay, onClose }: {
  text: string; talking: boolean; sayLabel: string; closeLabel: string; onSay: () => void; onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const tail = useTail(ref)
  return (
    <div ref={ref} className="c-bubble" role="status">
      {tail && (
        <svg className="c-tail" aria-hidden>
          <path d={tail.fill} fill="#fff" />
          <path d={tail.line} fill="none" stroke="#BFE8EC" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      )}
      <p>{text}</p>
      <button type="button" className="press say" data-on={talking || undefined} aria-label={sayLabel} title={sayLabel} aria-pressed={talking} onClick={onSay}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor" /><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" />
        </svg>
      </button>
      <button type="button" className="x" aria-label={closeLabel} title={closeLabel} onClick={onClose}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>
  )
}

const COIN = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#c98f17"/><circle cx="12" cy="12" r="9.2" fill="#f1c43e"/><path d="M12 2.8a9.2 9.2 0 0 1 9.2 9.2L12 12z" fill="#ffe07a"/></svg>')

/** מטבעות עפים מאזור השלב אל הארנק */
export function flyCoins(n = 8) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const to = ['c-coins-desk', 'c-coins-phone'].map(id => document.getElementById(id)?.getBoundingClientRect()).find(r => r && r.width > 0)
  const from = document.querySelector('.c-stage')?.getBoundingClientRect()
  if (!to || !from) return
  for (let i = 0; i < n; i++) {
    const img = document.createElement('img')
    img.src = COIN; img.alt = ''
    Object.assign(img.style, { position: 'fixed', left: '0', top: '0', width: '30px', height: '30px', zIndex: '70', pointerEvents: 'none' })
    document.body.appendChild(img)
    const x0 = from.left + from.width / 2 + (Math.random() - .5) * 120, y0 = from.top + from.height / 2 + (Math.random() - .5) * 80
    const x1 = to.left + 4, y1 = to.top + 2, xm = (x0 + x1) / 2, ym = Math.min(y0, y1) - 60
    const a = img.animate([
      { transform: `translate(${x0}px,${y0}px) scale(.4)`, opacity: 0 },
      { transform: `translate(${xm}px,${ym}px) scale(1.15)`, opacity: 1, offset: .5 },
      { transform: `translate(${x1}px,${y1}px) scale(.8)`, opacity: 1 },
    ], { duration: 900, delay: i * 70, easing: 'ease-in-out', fill: 'both' })
    a.onfinish = () => img.remove()
  }
}
