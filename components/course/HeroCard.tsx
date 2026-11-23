'use client'
import { useEffect, useState } from 'react'
import { SHOP_UI, boxPrice, type ShopState } from '@/lib/shop/config'
import { fill } from '@/lib/course/content'
import Hero, { type HeroPose } from './Hero'
import { CoinPill } from './Shop'
import { BagIcon } from './ShopArt'

/** הדמות מנופפת בכניסה, וחוגגת כש-happy משתנה (מטבעות חדשים / פריט חדש). שאר הזמן — פריים אחד. */
export function useHeroPose(happy: number): HeroPose {
  const [pose, setPose] = useState<HeroPose>('wave')
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- תגובה לאירוע, ואז חזרה לעמידה
    if (happy > 0) setPose('cheer')
    const t = setTimeout(() => setPose('stand'), 2200)
    return () => clearTimeout(t)
  }, [happy])
  return pose
}

/** מחשב: כרטיס הדמות מעל תפריט השיעורים — דמות, שם, מטבעות, כפתור חנות ובר לקופסה הבאה */
export function HeroCard({ shop, name, pose, onShop }: { shop: ShopState; name: string; pose: HeroPose; onShop: () => void }) {
  const left = Math.max(0, boxPrice - shop.coins)
  return (
    <div className="c-herocard">
      <button type="button" className="press c-herobtn" onClick={onShop} aria-label={SHOP_UI.myHero}><Hero look={shop.look} pose={pose} className="c-hero" /></button>
      <div className="info">
        <span className="name">{name}</span>
        <CoinPill coins={shop.coins} id="c-coins-desk" />
        <button type="button" className="press c-primary c-shopbtn" onClick={onShop}><BagIcon />{SHOP_UI.shop}</button>
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

/** טלפון: אותו דבר בשורת הכותרת */
export function HeroStrip({ shop, pose, onShop }: { shop: ShopState; pose: HeroPose; onShop: () => void }) {
  return (
    <div className="c-herostrip">
      <button type="button" className="press c-herobtn" onClick={onShop} aria-label={SHOP_UI.myHero}><Hero look={shop.look} pose={pose} className="c-hero" /></button>
      <CoinPill coins={shop.coins} id="c-coins-phone" />
      <button type="button" className="press c-primary c-shopbtn" onClick={onShop} aria-label={SHOP_UI.shop} title={SHOP_UI.shop}><BagIcon /></button>
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
