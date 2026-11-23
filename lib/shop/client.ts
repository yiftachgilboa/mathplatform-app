// לקוח בלבד — המראה והתגמול זמינים למשחקים (iframe מאותו מקור) דרך localStorage.
// kidodo-practice.js קורא אותם לפני הציור הראשון, ומקבל אירוע storage כשהם משתנים באמצע משחק.
import { practiceReward, type Look, type ShopState } from './config'

export function shareLook(childId: string, look: Look) {
  try { localStorage.setItem(`kidodo-shop:${childId}`, JSON.stringify({ look, reward: practiceReward })) } catch { /* בלי אחסון — הדמות הרגילה */ }
}

export type ShopReply = { result: string; shop: ShopState | null }

export async function shopAction(childId: string, courseId: string, body: Record<string, unknown>): Promise<ShopReply | null> {
  try {
    const res = await fetch('/api/shop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ childId, courseId, ...body }) })
    return res.ok ? await res.json() : null
  } catch { return null }
}

/** צלילים קצרים בקוד (Web Audio), כמו במשחקים */
let ctx: AudioContext | null = null
export function tone(freq: number, dur = .18, type: OscillatorType = 'triangle', vol = .08, delay = 0) {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') ctx.resume()
    const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain()
    o.type = type; o.frequency.value = freq
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur)
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur)
  } catch { /* בלי צליל */ }
}
