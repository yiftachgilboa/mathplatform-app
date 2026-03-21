import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import ParentDashboardClient from './ParentDashboardClient'

export default async function ParentDashboardPage({ searchParams }: { searchParams: Promise<{ childId?: string }> }) {
  const { childId } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  let userId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any

  if (user) {
    userId = user.id
    db = supabase
  } else if (childId) {
    // ילד נכנס — שלוף parent_id שלו עם service role
    const s = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )
    const { data: child } = await s
      .from('children')
      .select('parent_id')
      .eq('id', childId)
      .single()
    if (!child) redirect('/login')
    userId = child.parent_id
    db = s
  } else {
    redirect('/login')
  }

  const { data: children } = await db
    .from('children')
    .select('id, name, grade, avatar, coins, theme')
    .eq('parent_id', userId)
    .order('created_at', { ascending: true })

  const childList = (children ?? []).map((c: any) => ({ ...c, grade: String(c.grade) }))

  const { data: gamesData } = await db
    .from('games')
    .select('id, title, grade')
    .order('grade', { ascending: true })
    .order('id', { ascending: true })
  const lessons = (gamesData ?? []).map((g: any) => ({ id: g.id, name: g.title, grade: String(g.grade) }))

  const childIds = childList.map((c) => c.id)

  const { data: childLessonsRows } = childIds.length > 0
    ? await db
        .from('child_lessons')
        .select('child_id, game_id, position')
        .in('child_id', childIds)
        .order('position', { ascending: true })
    : { data: [] }

  const childLessonsMap: Record<string, string[]> = {}
  for (const child of childList) {
    childLessonsMap[child.id] = []
  }
  for (const row of childLessonsRows ?? []) {
    if (childLessonsMap[row.child_id]) {
      childLessonsMap[row.child_id].push(row.game_id)
    }
  }

  console.log('[DEBUG] childList:', JSON.stringify(childList.map(c => c.id)))
  console.log('[DEBUG] childLessonsRows:', JSON.stringify(childLessonsRows))
  console.log('[DEBUG] childLessonsMap:', JSON.stringify(childLessonsMap))
  console.log('[DEBUG] initialChildId:', childId)

  return (
    <ParentDashboardClient
      children={childList}
      lessons={lessons ?? []}
      childLessonsMap={childLessonsMap}
      initialChildId={childId}
    />
  )
}
