// ״אורין ודלתות האור״ — עמוד HTML עצמאי ב-public/games/math-fractions-orin-001/index.html.
// לוח הילד פותח /games/<id>?childId=… — מעבירים לעמוד עם אותם פרמטרים (ה-SDK קורא משם את childId).
import { redirect } from 'next/navigation'

export default async function OrinGame({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) if (typeof v === 'string') q.set(k, v)
  const qs = q.toString()
  redirect(`/games/math-fractions-orin-001/index.html${qs ? `?${qs}` : ''}`)
}
