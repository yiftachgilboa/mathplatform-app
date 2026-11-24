// הגדרות החנות והתגמולים (content/shop/shop.json) + חישובי מחיר. בטוח לשרת וללקוח.
// כל המספרים בקובץ אחד: משנים תגמול לתרגול ← מחירי הקופסאות מתעדכנים לבד.
import shop from '@/content/shop/shop.json'

export type RewardKind = keyof typeof shop.rewards
export type Slot = 'shirt' | 'pants' | 'shoes' | 'hair' | 'glasses' | 'hat'
export type Worn = { color: string; kind?: string }
export type Look = Partial<Record<Slot, Worn>>
/** פריט שיצא מקופסה ומחכה להחלטה */
export type PendingItem = Worn & { slot: Slot; box: string }
export type ShopState = { coins: number; look: Look; pending: PendingItem | null; gifts: number; started: boolean }

export const SHOP = shop
export const SHOP_UI = shop.ui
export const BOXES = shop.boxes
export const GIFT_BOX = 'gift'

/** המחיר האמיתי: כמה תרגולים שווה קופסה × מטבעות לתרגול */
export const fullPrice = shop.boxPricePractices * shop.rewards.practice.first
/** המחיר שנגבה. במצב בדיקה (testMode) — 0 */
export const boxPrice = shop.testMode ? 0 : fullPrice
/** מטבעות לסיום תרגול (מוצג גם בתוך המשחקים) */
export const practiceReward = shop.rewards.practice.first
/** מטבעות לשלב, לפי מספרו (2 התנסות, 3 תרגול, 4 העשרה) */
export const stageRewards = { 2: shop.rewards.interactive.first, 3: shop.rewards.practice.first, 4: shop.rewards.enrichment.first }

export const itemName = (slot: string) => shop.items.find(i => i.slot === slot)?.name ?? ''
export const boxColor = (id: string) => shop.boxes.find(b => b.id === id)?.color ?? '#f1c43e'

const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]

/** פריט אקראי בצבעי הקופסה. לא אותו דבר בדיוק שהילד כבר לובש. */
export function rollItem(boxId: string, look: Look): PendingItem | null {
  const box = boxId === GIFT_BOX ? pick(BOXES) : BOXES.find(b => b.id === boxId)
  if (!box) return null
  const bag = SHOP.items.flatMap(it => Array<(typeof SHOP.items)[number]>(it.weight).fill(it))
  for (let i = 0; i < 40; i++) {
    const it = pick(bag), slot = it.slot as Slot, color = pick(box.shades)
    const kind = it.kinds ? pick(it.kinds) : undefined
    const cur = look[slot]
    if (cur && cur.color === color && cur.kind === kind) continue
    return { slot, color, ...(kind ? { kind } : {}), box: boxId }
  }
  return null
}
