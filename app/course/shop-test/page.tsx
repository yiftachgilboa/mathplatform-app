'use client'
import { useCallback, useLayoutEffect, useState } from 'react'
import Shop from '@/components/course/Shop'
import { HeroCard, HeroStrip, useHeroPose } from '@/components/course/HeroCard'
import { GIFT_BOX, SHOP, boxPrice, practiceReward, rollItem, type ShopState } from '@/lib/shop/config'
import { afterDecide, shareLook, type ShopReply } from '@/lib/shop/client'

/**
 * זמני — עמוד בדיקה של קונספט החנות: בלי כניסה ובלי שמירה (הכול בזיכרון הדף).
 * אותם רכיבים בדיוק כמו בקורס, והמשחק למטה מקבל את הדמות כמו בקורס.
 */
export default function ShopTestPage() {
  const [shop, setShop] = useState<ShopState>({ coins: SHOP.startCoins, look: {}, pending: null, gifts: 0, started: true })
  const [open, setOpen] = useState(true)
  const [happy, setHappy] = useState(0)
  const [game, setGame] = useState(false)
  const pose = useHeroPose(happy)

  useLayoutEffect(() => { shareLook('shop-test', shop.look) }, [shop.look])

  const onAction = useCallback(async (a: { action: string; box?: string; take?: boolean }): Promise<ShopReply> => {
    let result = 'ok', next = shop
    if (a.action === 'buy' && a.box) {
      const gift = a.box === GIFT_BOX
      if (shop.pending) next = { ...shop, pending: rollItem(a.box, shop.look) }
      else if (!gift && shop.coins < boxPrice) result = 'poor'
      else next = { ...shop, pending: rollItem(a.box, shop.look), coins: shop.coins - (gift ? 0 : boxPrice), gifts: shop.gifts - (gift ? 1 : 0) }
    }
    if (a.action === 'decide') next = afterDecide(shop, a.take === true)
    setShop(next)
    await new Promise(r => setTimeout(r, 400))   // מדמה את זמן השרת
    return { result, shop: next }
  }, [shop])

  const btn: React.CSSProperties = { minHeight: 48, padding: '0 18px', borderRadius: 999, fontSize: 17, fontWeight: 700 }
  return (
    <>
      <header className="c-header" data-strip>
        <HeroStrip shop={shop} pose={pose} onShop={() => setOpen(true)} />
        <span className="hello hi">עמוד בדיקה — חנות</span>
      </header>
      <div className="c-wrap">
        <div className="c-side"><HeroCard shop={shop} pose={pose} onShop={() => setOpen(true)} /></div>
        <main className="c-main">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <button type="button" className="press c-light" style={btn} onClick={() => { setShop(s => ({ ...s, coins: s.coins + practiceReward })); setHappy(n => n + 1) }}>סיימתי תרגול (+{practiceReward})</button>
            <button type="button" className="press c-light" style={btn} onClick={() => setShop(s => ({ ...s, gifts: s.gifts + 1 }))}>קופסת מתנה על יעד</button>
            <button type="button" className="press c-light" style={btn} onClick={() => setGame(g => !g)}>{game ? 'לסגור את המשחק' : 'לראות את הדמות במשחק'}</button>
          </div>
          {game && <iframe src="/practices/climb.html?childId=shop-test" title="משחק" style={{ width: '100%', height: 560, border: 0, borderRadius: 24 }} />}
        </main>
      </div>
      {open && <Shop shop={shop} onAction={onAction} onClose={() => { setOpen(false); setHappy(n => n + 1) }} />}
    </>
  )
}
