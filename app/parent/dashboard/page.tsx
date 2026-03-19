import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ParentDashboardClient from './ParentDashboardClient'

export default async function ParentDashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: children } = await supabase
    .from('children')
    .select('id, name, grade, avatar, coins')
    .eq('parent_id', user.id)
    .order('created_at', { ascending: true })

  const childList = children ?? []

  const { data: gamesData } = await supabase
    .from('games')
    .select('id, title, grade')
    .order('grade', { ascending: true })
    .order('id', { ascending: true })
  const lessons = (gamesData ?? []).map(g => ({ id: g.id, name: g.title, grade: String(g.grade) }))



  const childIds = childList.map((c) => c.id)

  const { data: childLessonsRows } = childIds.length > 0
    ? await supabase
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

  return (
    <ParentDashboardClient
      children={childList}
      lessons={lessons ?? []}
      childLessonsMap={childLessonsMap}
    />
  )
}
