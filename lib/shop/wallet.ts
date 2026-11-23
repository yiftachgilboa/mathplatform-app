// שרת בלבד — ארנק וחנות (טבלאות coin_ledger, child_shop; פונקציות ב-supabase/migrations/20261123_shop.sql).
import { adminClient } from '@/lib/course/admin'
import { GIFT_BOX, SHOP, boxPrice, rollItem, type Look, type PendingItem, type RewardKind, type ShopState } from './config'

/** מצב הארנק והחנות של ילד. null = הטבלאות עוד לא קיימות / שגיאה (הקורס עובד בלי חנות). */
export async function loadShop(childId: string): Promise<ShopState | null> {
  const db = adminClient()
  const [child, row, start] = await Promise.all([
    db.from('children').select('coins').eq('id', childId).maybeSingle(),
    db.from('child_shop').select('look, pending, gift_boxes').eq('child_id', childId).maybeSingle(),
    db.from('coin_ledger').select('id').eq('child_id', childId).eq('ref', 'start').maybeSingle(),
  ])
  const error = child.error ?? row.error ?? start.error
  if (error || !child.data) {
    console.error('[shop] load', error?.message)
    return null
  }
  return {
    coins: child.data.coins ?? 0,
    look: (row.data?.look ?? {}) as Look,
    pending: (row.data?.pending ?? null) as PendingItem | null,
    gifts: row.data?.gift_boxes ?? 0,
    started: !!start.data,   // מטבעות הפתיחה ניתנו = הילד כבר היה בחנות
  }
}

/** true = שולם עכשיו, false = כבר שולם. זורק אם הטבלאות עוד לא קיימות. */
async function award(childId: string, amount: number, ref: string, boxes = 0): Promise<boolean> {
  if (amount <= 0 && boxes <= 0) return false
  const { data, error } = await adminClient().rpc('award_coins', { p_child: childId, p_amount: amount, p_ref: ref, p_boxes: boxes })
  if (error) throw new Error(error.message)
  return data === true
}

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })

/**
 * תגמול על פעולה. base מזהה אותה (למשל "course:kidodo-g1:lesson-03:3"): פעם ראשונה → first (+ קופסאות מתנה אם הוגדרו),
 * אחר כך → repeat, עד repeatPerDay ביום. מחזיר כמה מטבעות נוספו, או null אם הארנק עוד לא מותקן.
 */
export async function reward(childId: string, kind: RewardKind, base: string): Promise<number | null> {
  const r = SHOP.rewards[kind]
  const boxes = (SHOP.giftBoxes as Record<string, number>)[kind] ?? 0
  try {
    if (await award(childId, r.first, base, boxes)) return r.first
    const day = `${base}:${today()}`
    for (let n = 1; n <= r.repeatPerDay; n++) {
      if (await award(childId, r.repeat, `${day}:${n}`)) return r.repeat
    }
    return 0
  } catch (e) {
    console.error('[shop] reward', e)
    return null
  }
}

/** קופסאות מתנה על יעד כלשהו (ref = היעד; פעם אחת לכל ref). לשימוש עתידי ביעדים. */
export async function giftBox(childId: string, ref: string, boxes = 1) {
  try { return await award(childId, 0, `gift:${ref}`, boxes) } catch (e) { console.error('[shop] gift', e); return false }
}

/** משחק ״מטבעות הפתעה״: מה שנאסף, עם תקרה ומספר פעמים ביום. null = הארנק עוד לא מותקן */
export async function rewardSurprise(childId: string, collected: number): Promise<number | null> {
  const amount = Math.max(0, Math.min(SHOP.surpriseGame.max, Math.round(collected) || 0))
  try {
    for (let n = 1; n <= SHOP.surpriseGame.perDay; n++) {
      if (await award(childId, amount, `surprise:${today()}:${n}`)) return amount
    }
    return 0
  } catch (e) {
    console.error('[shop] surprise', e)
    return null
  }
}

export async function startShop(childId: string) {
  const { error } = await adminClient().rpc('shop_start', { p_child: childId, p_coins: SHOP.startCoins })
  if (error) console.error('[shop] start', error.message)
  return !error
}

export type BuyResult = 'ok' | 'pending' | 'poor' | 'nogift' | 'error'

/**
 * קונה קופסה. אם כבר יש קופסה משולמת שלא נפתחה (הילד יצא באמצע) — היא מתחלפת בקופסה שנבחרה, בלי תשלום נוסף.
 * state = מצב הילד שכבר נטען (המצב החדש מחושב ממנו, בלי לטעון שוב)
 */
export async function buyBox(childId: string, boxId: string, state: ShopState | null): Promise<{ result: BuyResult; shop: ShopState | null }> {
  const item = state && rollItem(boxId, state.look)
  if (!item) return { result: 'error', shop: state }
  if (state.pending) {
    const { error } = await adminClient().from('child_shop').update({ pending: item, updated_at: new Date().toISOString() })
      .eq('child_id', childId).not('pending', 'is', null)
    if (error) { console.error('[shop] swap', error.message); return { result: 'error', shop: state } }
    return { result: 'ok', shop: { ...state, pending: item } }
  }
  const gift = boxId === GIFT_BOX
  const { data, error } = await adminClient().rpc('shop_buy', { p_child: childId, p_price: boxPrice, p_item: item, p_gift: gift })
  if (error) { console.error('[shop] buy', error.message); return { result: 'error', shop: state } }
  if (data !== 'ok') return { result: data as BuyResult, shop: await loadShop(childId) }
  return { result: 'ok', shop: { ...state, pending: item, coins: state.coins - (gift ? 0 : boxPrice), gifts: state.gifts - (gift ? 1 : 0) } }
}

/** וי / איקס. מחזיר את המראה אחרי ההחלטה, או null בשגיאה */
export async function decide(childId: string, take: boolean): Promise<Look | null> {
  const { data, error } = await adminClient().rpc('shop_decide', { p_child: childId, p_take: take })
  if (error) { console.error('[shop] decide', error.message); return null }
  return data as Look
}
