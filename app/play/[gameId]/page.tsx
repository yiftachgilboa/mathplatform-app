import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server-client'
import GameFrame from './GameFrame'

export default async function PlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ gameId: string }>
  searchParams: Promise<{ childId?: string }>
}) {
  const { gameId } = await params
  const { childId } = await searchParams

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (!childId) redirect('/dashboard')

  const [{ data: game }, { data: child }] = await Promise.all([
    supabase.from('games').select('id, title, url').eq('id', gameId).single(),
    supabase.from('children').select('id, name, parent_id').eq('id', childId).single(),
  ])

  if (!game || !child || child.parent_id !== user.id) notFound()

  const gameUrl = `${game.url}?childId=${childId}`

  return (
    <div className="h-screen flex flex-col bg-black">
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-900">
        <a
          href={`/child/${childId}`}
          className="text-sm text-gray-400 hover:text-white transition"
        >
          → חזרה
        </a>
        <span className="text-white font-medium text-sm">{game.title}</span>
      </div>
      <GameFrame url={gameUrl} title={game.title} />
    </div>
  )
}
