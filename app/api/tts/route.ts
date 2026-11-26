import { createHash } from 'crypto'
import { adminClient } from '@/lib/course/admin'

/*
 * הקראה איכותית (Azure). כל משפט נוצר פעם אחת ונשמר ב-Supabase (kidodo-media/tts/…),
 * ומשם מנגנים אותו לכל הילדים. בלי מפתח: { on: false } והמשחקים נשארים עם קול הדפדפן.
 *
 *   GET /api/tts                              → { on }  (האם יש הקראה בענן)
 *   GET /api/tts?v=hila|avri&r=-5&p=0&t=…     → mp3 (או הפניה לקובץ שכבר נשמר)
 *
 * משתני סביבה: AZURE_SPEECH_KEY, AZURE_SPEECH_REGION (למשל westeurope).
 * בפיתוח בלי מפתח: TTS_MOCK=1 מחזיר צפצוף באורך המשפט (לבדיקת הנגן).
 */

const VOICES: Record<string, string> = { hila: 'he-IL-HilaNeural', avri: 'he-IL-AvriNeural' }
const MAX = 400
const BUCKET = 'kidodo-media'
const KEEP = 'public, max-age=86400, s-maxage=31536000, immutable'

const key = () => process.env.AZURE_SPEECH_KEY
const mock = () => !key() && process.env.TTS_MOCK === '1' && process.env.NODE_ENV !== 'production'

/** אותו משפט = אותו קובץ: בלי סימני כיווון, מרכאות ורווחים כפולים */
function cleanText(t: string) {
  return t.replace(/[‎‏⁦-⁩]/g, '').replace(/[״"׳]/g, '')
    .replace(/\s+/g, ' ').replace(/\s+([!?.,:])/g, '$1').trim()
}

// שמירה מפני מי שמנסה לייצר הרבה מבחוץ: לכל מופע שרת, עד 40 משפטים חדשים בדקה
let windowStart = 0, made = 0
function allowNew() {
  const now = Date.now()
  if (now - windowStart > 60_000) { windowStart = now; made = 0 }
  return ++made <= 40
}

const pct = (s: string | null) => {
  const n = Math.round(Number(s) || 0)
  return Math.max(-50, Math.min(50, n))
}
const sign = (n: number) => (n >= 0 ? '+' : '') + n + '%'
const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams
  if (!q.has('t')) {
    return Response.json({ on: !!key() || mock() }, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' } })
  }
  if (!key() && !mock()) return new Response('off', { status: 503, headers: { 'Cache-Control': 'no-store' } })

  const v = q.get('v') ?? 'hila', r = pct(q.get('r')), p = pct(q.get('p'))
  const text = cleanText(q.get('t') ?? '')
  if (!VOICES[v] || !text || text.length > MAX || !/[א-ת]/.test(text)) {
    return new Response('bad', { status: 400 })
  }
  if (mock()) return new Response(new Uint8Array(beep(text.length * 70 / (1 + r / 100))), { headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store' } })

  const path = `tts/${v}/${createHash('sha1').update(`${v}|${r}|${p}|${text}`).digest('hex')}.mp3`
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`
  const saved = await fetch(url, { method: 'HEAD' }).then(x => x.ok, () => false)
  if (saved) return new Response(null, { status: 302, headers: { Location: url, 'Cache-Control': KEEP } })
  if (!allowNew()) return new Response('busy', { status: 429, headers: { 'Cache-Control': 'no-store' } })

  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="he-IL">` +
    `<voice name="${VOICES[v]}"><prosody rate="${sign(r)}" pitch="${sign(p)}">${xml(text)}</prosody></voice></speak>`
  const az = await fetch(`https://${process.env.AZURE_SPEECH_REGION ?? 'westeurope'}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key()!,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'kidodo',
    },
    body: ssml,
  }).catch(() => null)
  if (!az?.ok) {
    console.error('tts: azure', az?.status, await az?.text().catch(() => ''))
    return new Response('tts failed', { status: 502, headers: { 'Cache-Control': 'no-store' } })
  }
  const audio = Buffer.from(await az.arrayBuffer())
  const { error } = await adminClient().storage.from(BUCKET)
    .upload(path, audio, { contentType: 'audio/mpeg', upsert: true, cacheControl: '31536000' })
  if (error) console.error('tts: upload', error.message)
  return new Response(new Uint8Array(audio), { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': error ? 'no-store' : KEEP } })
}

/** בדיקות בלבד: צליל שקט־למחצה באורך ms */
function beep(ms: number) {
  const rate = 8000, n = Math.round(rate * Math.min(12, Math.max(.4, ms / 1000)))
  const b = Buffer.alloc(44 + n)
  b.write('RIFF', 0); b.writeUInt32LE(36 + n, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16)
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate, 28)
  b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34); b.write('data', 36); b.writeUInt32LE(n, 40)
  for (let i = 0; i < n; i++) b[44 + i] = 128 + Math.round(18 * Math.sin(i / rate * 2 * Math.PI * 330))
  return b
}
