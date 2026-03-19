export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ChildDashboardClient from './ChildDashboardClient'

export default async function ChildDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Session check
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  // Fetch child — verify ownership
  const { data: child } = await supabase
    .from('children')
    .select('id, name, grade, coins, theme')
    .eq('id', id)
    .eq('parent_id', session.user.id)
    .single()

  if (!child) redirect('/select-child')

  // Fetch parent-assigned track for this child
  const { data: childLessons } = await supabase
    .from('child_lessons')
    .select('game_id, position')
    .eq('child_id', id)
    .order('position', { ascending: true })

  let games
  if (childLessons && childLessons.length > 0) {
    // Load games in the order the parent defined
    const gameIds = childLessons.map(l => l.game_id)
    const { data: fetchedGames } = await supabase
      .from('games')
      .select('id, title, topic, thumbnail')
      .in('id', gameIds)
      .eq('is_visible', true)
    // Re-order to match the parent's track order
    const byId = Object.fromEntries((fetchedGames ?? []).map(g => [g.id, g]))
    games = gameIds.map(gid => byId[gid]).filter(Boolean)
  } else {
    // Fallback: all games for this grade, ordered by difficulty
    const { data: gradeGames } = await supabase
      .from('games')
      .select('id, title, topic, thumbnail')
      .eq('grade', child.grade)
      .eq('is_visible', true)
      .order('difficulty', { ascending: true })
    games = gradeGames ?? []
  }

  return <ChildDashboardClient child={child} games={games} />
}
