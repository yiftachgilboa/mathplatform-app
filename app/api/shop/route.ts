import { NextResponse } from 'next/server'
import { authorizeChild } from '@/lib/course/admin'
import { buyBox, decide, loadShop, startShop } from '@/lib/shop/wallet'

/**
 * POST { childId, courseId, action, … } → { result, shop }
 *   start           — כניסה ראשונה לחנות (מטבעות פתיחה, פעם אחת)
 *   buy    { box }  — קונה קופסה; הפריט מוגרל בשרת ומחכה ב-shop.pending
 *   decide { take } — וי (נלבש) / איקס (נעלם)
 */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}))
  const childId = String(b.childId ?? '')
  if (!await authorizeChild(childId, String(b.courseId ?? ''))) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  let result = 'ok'
  if (b.action === 'start') result = await startShop(childId) ? 'ok' : 'error'
  else if (b.action === 'buy') result = await buyBox(childId, String(b.box ?? ''))
  else if (b.action === 'decide') result = await decide(childId, b.take === true) ? 'ok' : 'error'
  else return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  return NextResponse.json({ result, shop: await loadShop(childId) })
}
