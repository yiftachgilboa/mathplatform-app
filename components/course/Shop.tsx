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
 */
export default function Shop({ shop, onAction, onClose }: {
  shop: ShopState
  onAction: (a: Action) => Promise<ShopReply | null>
  onClose: () => void
}) {
  const ui = SHOP_UI
  const [phase, setPhase] = useState<Phase>(shop.pending ? 'closed' : 'browse')
  const [item, setItem] = useState<PendingItem | null>(shop.pending)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [pose, setPose] = useState<HeroPose>('wave')
  const [start, setStart] = useState<string | null>(shop.pending?.box ?? null)   // אחרי קנייה חוזרים לאותה קופסה
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const later = useCallback((fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)) }, [])

  useEffect(() => {
    const list = timers.current
    later(() => setPose('stand'), 2200)
    return () => list.forEach(clearTimeout)
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

  async function run(a: Action) {
    setBusy(true); setError(false)
    const r = await onAction(a)
    setBusy(false)
    if (!r || r.result === 'error') setError(true)
    return r
  }

  async function buy(id: string) {
    if (busy) return
    const r = await run({ action: 'buy', box: id })
    const got = r?.shop?.pending
    if (!got) return
    setStart(id)
    setItem(got); setPhase('closed')
    tone(523); tone(784, .22, 'triangle', .08, .1)
  }

  function open() {
    if (phase !== 'closed') return
    setPhase('opening')
    ;[392, 523, 659, 784, 1047].forEach((f, i) => tone(f, .2, 'triangle', .07, i * .09))
    later(() => setPhase('item'), 750)
  }

  async function choose(take: boolean) {
    if (busy || phase !== 'item') return
    const r = await run({ action: 'decide', take })
    if (!r || r.result === 'error') return
    setPhase('browse'); setItem(null)
    if (take) {
      setPose('cheer')
      ;[523, 659, 784, 1047].forEach((f, i) => tone(f, .25, 'triangle', .08, i * .1))
      later(() => setPose('stand'), 2200)
    } else tone(330, .2, 'sine', .07)
  }

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
          {phase === 'browse' || !item ? (
            <Carousel list={list} start={start} coins={shop.coins} busy={busy} onBuy={buy} />
          ) : phase !== 'item' ? (
            <button type="button" className="s-open" data-phase={phase} onClick={open} autoFocus>
              <BoxArt color={boxColor(item.box)} gift={item.box === GIFT_BOX} open={phase === 'opening'} />
              <span data-hide={phase === 'opening' || undefined}>{ui.open}</span>
            </button>
          ) : (
            <div className="s-item">
              <div className="s-item-art pop" style={{ '--c': item.color } as React.CSSProperties}><ItemArt slot={item.slot} kind={item.kind} color={item.color} /></div>
              <strong>{itemName(item.slot)}</strong>
              <div className="s-choice">
                <button type="button" className="press s-yes" disabled={busy} onClick={() => choose(true)} aria-label={ui.take} title={ui.take}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                </button>
                <button type="button" className="press s-no" disabled={busy} onClick={() => choose(false)} aria-label={ui.leave} title={ui.leave}>
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

/** שורת קופסאות שגוללים ימינה ושמאלה. הקופסה במרכז גדולה; לחיצה עליה קונה, לחיצה על אחרת מביאה אותה למרכז. */
function Carousel({ list, start, coins, busy, onBuy }: { list: BoxCard[]; start: string | null; coins: number; busy: boolean; onBuy: (id: string) => void }) {
  const ui = SHOP_UI
  const row = useRef<HTMLDivElement>(null)
  const [sel, setSel] = useState(() => {
    const i = list.findIndex(b => b.id === start)
    return i >= 0 ? i : list[0].gift ? 0 : Math.floor(list.length / 2)
  })
  const selRef = useRef(sel)

  const centerOn = useCallback((i: number, smooth: boolean) => {
    const el = row.current, c = el?.children[i] as HTMLElement | undefined
    if (!el || !c) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollTo({ left: c.offsetLeft + c.offsetWidth / 2 - el.clientWidth / 2, behavior: smooth && !reduce ? 'smooth' : 'auto' })
  }, [])

  useLayoutEffect(() => {
    const el = row.current
    if (!el) return
    centerOn(selRef.current, false)
    const ro = new ResizeObserver(() => centerOn(selRef.current, false))
    ro.observe(el)
    return () => ro.disconnect()
  }, [centerOn])

  function onScroll() {
    const el = row.current
    if (!el) return
    const mid = el.scrollLeft + el.clientWidth / 2
    let best = 0, d = Infinity
    Array.from(el.children).forEach((c, i) => {
      const h = c as HTMLElement, k = Math.abs(h.offsetLeft + h.offsetWidth / 2 - mid)
      if (k < d) { d = k; best = i }
    })
    selRef.current = best
    setSel(best)
  }

  const go = (i: number) => centerOn(Math.max(0, Math.min(list.length - 1, i)), true)
  const arrow = (d: string, label: string, to: number) => (
    <button type="button" className="press c-light s-arrow" aria-label={label} title={label} disabled={to < 0 || to >= list.length} onClick={() => go(to)}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
    </button>
  )

  return (
    <div className="s-carousel" dir="ltr">
      {arrow('M15 5l-7 7 7 7', ui.prevBox, sel - 1)}
      <div ref={row} className="s-row" onScroll={onScroll}>
        {list.map((b, i) => {
          const missing = b.gift ? 0 : b.price - coins
          return (
            <button key={b.id} type="button" className="s-box" data-sel={i === sel || undefined} data-poor={missing > 0 || undefined}
              aria-label={`${b.label}, ${b.gift ? ui.gift : `${b.price} ${ui.coins}`}`} disabled={busy}
              onClick={() => (i !== sel ? go(i) : missing > 0 ? tone(220, .15, 'sine', .07) : onBuy(b.id))}>
              <BoxArt color={b.color} gift={b.gift} />
              <span className="s-price" dir="ltr">
                {b.gift ? <span dir="rtl">{ui.gift}</span> : <><CoinIcon size={34} />{b.price}{b.price < fullPrice && <s>{fullPrice}</s>}</>}
              </span>
              {missing > 0 && <span className="s-missing">{fill(ui.missing, { n: missing })}</span>}
            </button>
          )
        })}
      </div>
      {arrow('M9 5l7 7-7 7', ui.nextBox, sel + 1)}
    </div>
  )
}
