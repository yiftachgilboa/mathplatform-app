'use client'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BOXES, GIFT_BOX, SHOP_UI, boxColor, boxPrice, fullPrice, itemName, type PendingItem, type ShopState } from '@/lib/shop/config'
import { tone, type ShopReply } from '@/lib/shop/client'
import { fill } from '@/lib/course/content'
import Hero, { type HeroPose } from './Hero'
import { GiftChest, GiftChestStill, TapHand, chestBurst } from './GiftChest'
import { CoinIcon, ItemArt } from './ShopArt'

type Phase = 'browse' | 'closed' | 'opening' | 'item'
type Action = { action: 'buy'; box: string } | { action: 'decide'; take: boolean }

/**
 * החנות (גרסת בדיקת קונספט): שורת קופסאות הפתעה שגוללים, מחיר מתחת לכל אחת.
 * קונים ← התיבה מחכה (כמו במשחקים; אחרי 3 שניות יד מראה ללחוץ) ← נפתחת ← יוצא פריט בצבע הקופסה ← וי (הדמות לובשת) או איקס (הפריט נעלם).
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
  const [hand, setHand] = useState(false)
  const chest = useRef<HTMLButtonElement>(null)
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
    setPhase('opening')
    const c = item!.color
    ;[392, 523, 659, 784, 1047].forEach((f, i) => tone(f, .2, 'triangle', .07, i * .07))
    later(() => chestBurst(chest.current, [c, '#ffffff', c, '#f2c431']), 60)
    later(() => setPhase('item'), 420)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- item קבוע כל עוד ready
  }, [ready, later])

  // הילד לא לוחץ 3 שניות → יד, כמו במשחקים
  const waiting = phase === 'closed' && !tapped
  useEffect(() => {
    if (!waiting) return
    const t = setTimeout(() => setHand(true), 3000)
    return () => { clearTimeout(t); setHand(false) }
  }, [waiting])

  function open() {
    if (phase !== 'closed' || tapped) return
    setTapped(true)
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
          ) : (
            <div className="s-reveal">
              <div className="s-item" data-on={(phase === 'item' && !!item) || undefined}>
                {phase === 'item' && item && (<>
                  <strong>{itemName(item.slot)}</strong>
                  <div className="s-choice">
                    <button type="button" className="press s-yes" onClick={() => choose(true)} aria-label={ui.take} title={ui.take}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                    </button>
                    <div className="s-item-art" style={{ '--c': item.color } as React.CSSProperties}><ItemArt slot={item.slot} kind={item.kind} color={item.color} /></div>
                    <button type="button" className="press s-no" onClick={() => choose(false)} aria-label={ui.leave} title={ui.leave}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" aria-hidden><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></svg>
                    </button>
                  </div>
                </>)}
              </div>
              <button ref={chest} type="button" className="s-open" data-phase={phase} data-tapped={tapped || undefined} onClick={open}
                disabled={phase !== 'closed'} aria-label={ui.open} autoFocus>
                <GiftChest color={color} gift={gift} open={phase !== 'closed'} />
                {hand && <TapHand />}
              </button>
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

const SIDE = 5   // כמה קופסאות מציירים מכל צד של המרכז

/**
 * קרוסלה מעגלית ואינסופית: חצים, גרירה, גלגלת או מקשי חצים. התיבה במרכז גדולה; לחיצה עליה קונה, לחיצה על אחרת מביאה אותה למרכז.
 * pos = מקום וירטואלי (מספר שלם בלי גבול); הקופסה במקום i היא list[i mod אורך]. התנועה היא transform, כך שהבחירה מתחלפת מיד.
 */
function Carousel({ list, start, coins, onBuy }: { list: BoxCard[]; start: string | null; coins: number; onBuy: (id: string) => void }) {
  const ui = SHOP_UI
  const at = (i: number) => list[((i % list.length) + list.length) % list.length]
  const [pos, setPos] = useState(() => Math.max(0, list.findIndex(b => b.id === start)))
  const row = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; pos: number; moved: boolean; trail: { x: number; t: number }[] } | null>(null)
  const wheelAt = useRef(0)
  const blockClick = useRef(false)
  const step = () => (track.current?.children[0] as HTMLElement | undefined)?.offsetWidth || 1

  const place = useCallback((p: number, smooth: boolean) => {
    const t = track.current
    if (!t) return
    if (!smooth) t.style.transition = 'none'
    t.style.transform = `translateX(${-p * step()}px)`
    if (!smooth) { void t.offsetWidth; t.style.transition = '' }
  }, [])
  const first = useRef(true)
  const posNow = useRef(pos)
  useLayoutEffect(() => {
    posNow.current = pos
    if (!drag.current?.moved) place(pos, !first.current)
    first.current = false
  }, [pos, place])
  useLayoutEffect(() => {   // שינוי גודל — בלי תנועה
    let w = row.current?.clientWidth
    const ro = new ResizeObserver(() => { if (row.current?.clientWidth !== w) { w = row.current?.clientWidth; place(posNow.current, false) } })
    if (row.current) ro.observe(row.current)
    return () => ro.disconnect()
  }, [place])

  const go = (i: number) => setPos(i)

  function down(e: React.PointerEvent) {
    blockClick.current = false
    if (e.button === 0) drag.current = { x: e.clientX, pos, moved: false, trail: [] }
  }
  function move(e: React.PointerEvent) {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    if (!d.moved && Math.abs(dx) > 8) { d.moved = true; row.current?.setPointerCapture(e.pointerId) }
    if (!d.moved) return
    const now = performance.now(), raw = d.pos - dx / step()
    d.trail = [...d.trail.filter(p => now - p.t < 90), { x: e.clientX, t: now }]
    place(raw, false)
    setPos(Math.round(raw))
  }
  function up(e: React.PointerEvent) {
    const d = drag.current
    drag.current = null
    if (!d?.moved) return
    blockClick.current = true   // סוף גרירה אינו לחיצה על קופסה
    setTimeout(() => { blockClick.current = false }, 50)
    const a = d.trail[0], v = a && performance.now() > a.t ? (e.clientX - a.x) / (performance.now() - a.t) : 0   // px לאלפית שנייה
    const raw = d.pos - (e.clientX - d.x) / step()
    const to = Math.round(raw - Math.max(-2, Math.min(2, v * 180 / step())))
    place(to, true)
    setPos(to)
  }
  function wheel(e: React.WheelEvent) {
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
    const now = performance.now()
    if (Math.abs(d) < 8 || now - wheelAt.current < 160) return
    wheelAt.current = now
    go(pos + Math.sign(d))
  }

  const arrow = (d: string, label: string, by: number) => (
    <button type="button" className="press c-light s-arrow" aria-label={label} title={label} onClick={() => setPos(p => p + by)}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
    </button>
  )

  return (
    <div className="s-carousel" dir="ltr" onKeyDown={e => { if (e.key === 'ArrowLeft') go(pos - 1); else if (e.key === 'ArrowRight') go(pos + 1) }}>
      {arrow('M15 5l-7 7 7 7', ui.prevBox, -1)}
      <div ref={row} className="s-row" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onWheel={wheel}>
        <div ref={track} className="s-track">
          {Array.from({ length: SIDE * 2 + 1 }, (_, k) => pos - SIDE + k).map(i => {
            const b = at(i), sel = i === pos, missing = b.gift ? 0 : b.price - coins
            return (
              <button key={i} type="button" className="s-box" data-sel={sel || undefined} data-poor={missing > 0 || undefined} tabIndex={sel ? 0 : -1}
                style={{ left: `calc(var(--step) * ${i})` }}
                aria-label={`${b.label}, ${b.gift ? ui.gift : `${b.price} ${ui.coins}`}`}
                onClick={() => {
                  if (blockClick.current) return
                  if (!sel) go(i)
                  else if (missing > 0) tone(220, .15, 'sine', .07)
                  else onBuy(b.id)
                }}>
                <GiftChestStill color={b.color} gift={b.gift} />
                <span className="s-price" dir="ltr">
                  {b.gift ? <span dir="rtl">{ui.gift}</span> : <><CoinIcon size={34} />{b.price}{b.price < fullPrice && <s>{fullPrice}</s>}</>}
                </span>
                {missing > 0 && <span className="s-missing">{fill(ui.missing, { n: missing })}</span>}
              </button>
            )
          })}
        </div>
      </div>
      {arrow('M9 5l7 7-7 7', ui.nextBox, 1)}
    </div>
  )
}
