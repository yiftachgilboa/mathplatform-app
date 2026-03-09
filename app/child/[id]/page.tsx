import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server-client'

export default async function ChildDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: child }, { data: games }, { data: progress }] = await Promise.all([
    supabase
      .from('children')
      .select('id, name, grade, parent_id, coins')
      .eq('id', id)
      .single(),
    supabase
      .from('games')
      .select('id, title, description, url')
      .order('title'),
    supabase
      .from('progress')
      .select('stars')
      .eq('child_id', id),
  ])

  if (!child || child.parent_id !== user.id) notFound()

  const totalStars = progress?.reduce((sum, row) => sum + (row.stars ?? 0), 0) ?? 0

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-blue-500 transition">
            → חזרה
          </Link>
        </div>

        {/* Child info */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 text-center">
          <h1 className="text-3xl font-bold mb-1">{child.name}</h1>
          <p className="text-gray-500 mb-4">כיתה {child.grade}</p>
          <div className="flex items-center justify-center gap-6 text-2xl font-semibold">
            <div className="flex items-center gap-2 text-yellow-500">
              <span>⭐</span>
              <span>{totalStars}</span>
              <span className="text-base text-gray-500 font-normal">כוכבים</span>
            </div>
            <div className="flex items-center gap-2 text-amber-600">
              <span>🪙</span>
              <span>{child.coins ?? 0}</span>
              <span className="text-base text-gray-500 font-normal">מטבעות</span>
            </div>
          </div>
        </div>

        {/* Games */}
        <h2 className="text-lg font-bold mb-3">משחקים</h2>

        {!games || games.length === 0 ? (
          <p className="text-center text-gray-500 mt-8">אין משחקים זמינים כרגע.</p>
        ) : (
          <div className="grid gap-4">
            {games.map(game => (
              <Link
                key={game.id}
                href={`/games/${game.id}?childId=${child.id}`}
                className="bg-white rounded-2xl shadow-sm p-5 flex justify-between items-center hover:shadow-md transition"
              >
                <div>
                  <p className="text-lg font-semibold">{game.title}</p>
                  {game.description && (
                    <p className="text-sm text-gray-500">{game.description}</p>
                  )}
                </div>
                <span className="text-blue-400 text-xl">שחק ←</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
