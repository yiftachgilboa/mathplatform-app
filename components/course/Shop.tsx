'use client'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BOXES, GIFT_BOX, SHOP_UI, boxColor, boxPrice, fullPrice, itemName, type PendingItem, type ShopState } from '@/lib/shop/config'
import { tone, type ShopReply } from '@/lib/shop/client'
import { fill } from '@/lib/course/content'
import Hero, { type HeroPose } from './Hero'
import { BoxArt, CoinIcon, ItemArt } from './ShopArt'

type Phase = 'browse' | 'closed' | 'opening' | 'item'
type Action = { action: 'buy'; box: string } | { action: 'decide'; take: boolean }

/**
 * החנות (גרסת בדיקת קונספט): שורת קופסאות הפתעה שגוללים, מחיר מתחת לכל אחת.
 * קונים ← לוחצים לפתיחה ← יוצא פריט בצבע הקופסה ← וי (הדמות לובשת) או איקס (הפריט נעלם).
 * הפריט מוגרל ונשמר בשרת (shop.pending), כך שרענון לא מגריל מחדש.
 * המסך לא מחכה לשרת: הקופסה מופיעה מיד והפריט מגיע ברקע; וי/איקס משפיעים מיד. הבקשות נשלחות זו אחרי זו.
 */
export default function Shop({ shop, onAction, onClose }: {
  shop: ShopState
  /** decide: העמוד מעדכן את הדמות מיד, עוד לפני התשובה */
  onAction: (a: Action) => Promise<ShopReply | null>
  onClose: () => void
}) {
  const ui = SHOP_UI
  const [phase, setPhase] = useState<Phase>(shop.pending ? 'closed' : 'browse')
  const [box, setBox] = useState<string | null>(shop.pending?.box ?? null)   // הקופסה שנקנתה (ואחריה חוזרים אליה)
  const [item, setItem] = useState<PendingItem | null>(shop.pending)
  const [tapped, setTapped] = useState(false)                                // לחצו לפתוח לפני שהפריט הגיע
  const [error, setError] = useState(false)
  const [pose, setPose] = useState<HeroPose>('wave')
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const alive = useRef(true)
  const later = useCallback((fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)) }, [])

  useEffect(() => {
    const list = timers.current
    alive.current = true
    later(() => setPose('stand'), 2200)
    return () => { alive.current = false; list.forEach(clearTimeout) }
  }, [later])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const list = [
    ...(shop.gifts > 0 ? [{ id: GIFT_BOX, label: ui.giftName, color: boxColor(GIFT_BOX), price: 0, gift: true }] : []),
    ...BOXES.map(b => ({ id: b.id, label: fill(ui.boxName, { name: b.name }), color: b.color, price: boxPrice, gift: false })),
  ]

  // בקשה אחת בכל פעם, לפי הסדר (קנייה לא תעקוף החלטה שעוד בדרך). onAction נקרא דרך ref כדי לקבל תמיד את הגרסה העדכנית
  const actRef = useRef(onAction)
  useEffect(() => { actRef.current = onAction })
  const send = (a: Action) => {
    const p = queue.current.then(() => actRef.current(a))
    queue.current = p.catch(() => {})
    return p.catch(() => null)
  }

  async function buy(id: string) {
    if (phase !== 'browse') return
    setError(false); setBox(id); setItem(null); setTapped(false); setPhase('closed')
    tone(523); tone(784, .22, 'triangle', .08, .1)
    const r = await send({ action: 'buy', box: id })
    if (!alive.current) return
    const got = r?.shop?.pending
    if (!got) { setPhase('browse'); setError(true); return }
    setBox(got.box); setItem(got)
  }

  // נפתחת כשלחצו וגם הפריט כבר כאן
  const ready = phase === 'closed' && tapped && !!item
  useEffect(() => {
    if (!ready) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- שני תנאים ממקורות שונים (לחיצה + תשובת השרת)
    setPhase('opening')
    later(() => setPhase('item'), 420)
  }, [ready, later])

  function open() {
    if (phase !== 'closed' || tapped) return
    setTapped(true)
    ;[392, 523, 659, 784, 1047].forEach((f, i) => tone(f, .2, 'triangle', .07, i * .07))
  }

  async function choose(take: boolean) {
    if (phase !== 'item') return
    setPhase('browse'); setItem(null)
    if (take) {
      setPose('cheer')
      ;[523, 659, 784, 1047].forEach((f, i) => tone(f, .25, 'triangle', .08, i * .1))
      later(() => setPose('stand'), 2200)
    } else tone(330, .2, 'sine', .07)
    const r = await send({ action: 'decide', take })
    if (alive.current && (!r || r.result === 'error')) setError(true)
  }

  const color = boxColor(box ?? ''), gift = box === GIFT_BOX
  return (
    <div className="s-shop" role="dialog" aria-modal="true" aria-label={ui.title}>
      <div className="s-top">
        <button type="button" className="press s-close" onClick={onClose} aria-label={ui.close} title={ui.close}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <h2>{ui.title}</h2>
        <CoinPill coins={shop.coins} />
      </div>

      <div className="s-body">
        <div className="s-mirror"><Hero look={shop.look} pose={pose} label={ui.myHero} className="s-hero" /></div>

        <div className="s-stage">
          {phase === 'browse' ? (
            <Carousel list={list} start={box} coins={shop.coins} onBuy={buy} />
          ) : phase !== 'item' || !item ? (
            <button type="button" className="s-open" data-phase={phase} data-tapped={tapped || undefined} onClick={open} autoFocus>
              <BoxArt color={color} gift={gift} open={phase === 'opening'} />
              <span data-hide={tapped || undefined}>{ui.open}</span>
            </button>
          ) : (
            <div className="s-item">
              <div className="s-item-art pop" style={{ '--c': item.color } as React.CSSProperties}><ItemArt slot={item.slot} kind={item.kind} color={item.color} /></div>
              <strong>{itemName(item.slot)}</strong>
              <div className="s-choice">
                <button type="button" className="press s-yes" onClick={() => choose(true)} aria-label={ui.take} title={ui.take}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                </button>
                <button type="button" className="press s-no" onClick={() => choose(false)} aria-label={ui.leave} title={ui.leave}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" aria-hidden><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></svg>
                </button>
              </div>
            </div>
          )}
          {error && <p role="alert" className="s-error">{ui.error}</p>}
        </div>
      </div>
    </div>
  )
}

export function CoinPill({ coins, id }: { coins: number; id?: string }) {
  return <span className="s-coins" id={id} dir="ltr" aria-label={`${coins} ${SHOP_UI.coins}`}><CoinIcon size={26} /><span key={coins} className="s-num">{coins}</span></span>
}

type BoxCard = { id: string; label: string; color: string; price: number; gift: boolean }

/**
 * שורת קופסאות: חצים, גרירה, גלגלת או מקשי חצים. הקופסה במרכז גדולה; לחיצה עליה קונה, לחיצה על אחרת מביאה אותה למרכז.
 * התנועה היא transform (בלי גלילה של הדפדפן), כך שהבחירה מתחלפת מיד בלחיצה.
 */
function Carousel({ list, start, coins, onBuy }: { list: BoxCard[]; start: string | null; coins: number; onBuy: (id: string) => void }) {
  const ui = SHOP_UI
  const [sel, setSel] = useState(() => {
    const i = list.findIndex(b => b.id === start)
    return i >= 0 ? i : list[0].gift ? 0 : Math.floor(list.length / 2)
  })
  const row = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; t: number; moved: boolean } | null>(null)
  const wheelAt = useRef(0)
  const blockClick = useRef(false)
  const step = () => (track.current?.children[0] as HTMLElement | undefined)?.offsetWidth || 1

  const place = useCallback((i: number, dx = 0) => {
    const t = track.current
    if (t) t.style.transform = `translateX(${-(i + .5) * step() + dx}px)`
  }, [])
  useLayoutEffect(() => {
    place(sel)
  }, [sel, place])
  // מיקום ראשון ושינוי גודל — בלי תנועה
  const selNow = useRef(sel)
  useLayoutEffect(() => { selNow.current = sel })
  useLayoutEffect(() => {
    const jump = () => {
      const t = track.current
      if (!t) return
      t.style.transition = 'none'
      place(selNow.current)
      void t.offsetWidth
      t.style.transition = ''
    }
    jump()
    let w = row.current?.clientWidth
    const ro = new ResizeObserver(() => { if (row.current?.clientWidth !== w) { w = row.current?.clientWidth; jump() } })
    if (row.current) ro.observe(row.current)
    return () => ro.disconnect()
  }, [place])

  const last = list.length - 1
  const go = (i: number) => setSel(Math.max(0, Math.min(last, i)))

  function down(e: React.PointerEvent) {
    blockClick.current = false
    if (e.button === 0) drag.current = { x: e.clientX, t: performance.now(), moved: false }
  }
  function move(e: React.PointerEvent) {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    if (!d.moved && Math.abs(dx) > 8) {
      d.moved = true
      row.current?.setPointerCapture(e.pointerId)
      if (track.current) track.current.style.transition = 'none'
    }
    if (d.moved) place(sel, dx)
  }
  function up(e: React.PointerEvent) {
    const d = drag.current
    drag.current = null
    if (!d?.moved) return
    blockClick.current = true   // סוף גרירה אינו לחיצה על קופסה
    if (track.current) track.current.style.transition = ''
    const dx = e.clientX - d.x, flick = performance.now() - d.t < 250 && Math.abs(dx) > 24
    const by = Math.round(-dx / step())
    const to = Math.max(0, Math.min(last, sel + (by === 0 && flick ? -Math.sign(dx) : by)))
    place(to)
    setSel(to)
  }
  function wheel(e: React.WheelEvent) {
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
    const now = performance.now()
    if (Math.abs(d) < 8 || now - wheelAt.current < 160) return
    wheelAt.current = now
    go(sel + Math.sign(d))
  }

  const arrow = (d: string, label: string, to: number) => (
    <button type="button" className="press c-light s-arrow" aria-label={label} title={label} disabled={to < 0 || to > last} onClick={() => go(to)}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
    </button>
  )

  return (
    <div className="s-carousel" dir="ltr" onKeyDown={e => { if (e.key === 'ArrowLeft') go(sel - 1); else if (e.key === 'ArrowRight') go(sel + 1) }}>
      {arrow('M15 5l-7 7 7 7', ui.prevBox, sel - 1)}
      <div ref={row} className="s-row" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onWheel={wheel}>
        <div ref={track} className="s-track">
          {list.map((b, i) => {
            const missing = b.gift ? 0 : b.price - coins
            return (
              <button key={b.id} type="button" className="s-box" data-sel={i === sel || undefined} data-poor={missing > 0 || undefined}
                aria-label={`${b.label}, ${b.gift ? ui.gift : `${b.price} ${ui.coins}`}`}
                onClick={() => {
                  if (blockClick.current) return
                  if (i !== sel) go(i)
                  else if (missing > 0) tone(220, .15, 'sine', .07)
                  else onBuy(b.id)
                }}>
                <BoxArt color={b.color} gift={b.gift} />
                <span className="s-price" dir="ltr">
                  {b.gift ? <span dir="rtl">{ui.gift}</span> : <><CoinIcon size={34} />{b.price}{b.price < fullPrice && <s>{fullPrice}</s>}</>}
                </span>
                {missing > 0 && <span className="s-missing">{fill(ui.missing, { n: missing })}</span>}
              </button>
            )
          })}
        </div>
      </div>
      {arrow('M9 5l7 7-7 7', ui.nextBox, sel + 1)}
    </div>
  )
}
