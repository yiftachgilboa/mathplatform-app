import { NextResponse } from 'next/server'
import { authorizeChild } from '@/lib/course/admin'
import { buyBox, decide, loadShop, startShop } from '@/lib/shop/wallet'

/**
 * POST { childId, courseId, action, … } → { result, shop } (decide: { result, look })
 *   start           — כניסה ראשונה לחנות (מטבעות פתיחה, פעם אחת)
 *   buy    { box }  — קונה קופסה; הפריט מוגרל בשרת ומחכה ב-shop.pending
 *   decide { take } — וי (נלבש) / איקס (נעלם)
 */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}))
  const childId = String(b.childId ?? '')
  // ההרשאה והמצב נטענים יחד; שום דבר לא נשלח או נכתב לפני שההרשאה עברה
  const [auth, state] = await Promise.all([
    authorizeChild(childId, String(b.courseId ?? '')),
    b.action === 'buy' && childId ? loadShop(childId) : null,
  ])
  if (!auth) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  if (b.action === 'buy') return NextResponse.json(await buyBox(childId, String(b.box ?? ''), state))
  if (b.action === 'decide') {
    const look = await decide(childId, b.take === true)
    return NextResponse.json({ result: look ? 'ok' : 'error', shop: null, look })
  }
  if (b.action === 'start') {
    const ok = await startShop(childId)
    return NextResponse.json({ result: ok ? 'ok' : 'error', shop: await loadShop(childId) })
  }
  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
