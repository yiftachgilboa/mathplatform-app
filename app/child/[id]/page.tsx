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
    .select('id, name, grade, coins')
    .eq('id', id)
    .eq('parent_id', session.user.id)
    .single()

  if (!child) redirect('/select-child')

  // Fetch games for this child's grade
  const { data: games } = await supabase
    .from('games')
    .select('id, title, topic, thumbnail')
    .eq('grade', child.grade)
    .eq('is_visible', true)
    .order('difficulty', { ascending: true })

  return <ChildDashboardClient child={child} games={games ?? []} />
}
