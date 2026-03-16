import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from './SignOutButton'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: children } = await supabase
    .from('children')
    .select('id, name, grade')
    .eq('parent_id', user.id)
    .order('name')

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">הילדים שלי</h1>
          <SignOutButton />
        </div>

        {!children || children.length === 0 ? (
          <p className="text-center text-gray-500 mt-16">אין ילדים רשומים עדיין.</p>
        ) : (
          <div className="grid gap-4">
            {children.map(child => (
              <Link
                key={child.id}
                href={`/child/${child.id}`}
                className="bg-white rounded-2xl shadow-sm p-5 flex justify-between items-center hover:shadow-md transition"
              >
                <div>
                  <p className="text-lg font-semibold">{child.name}</p>
                  <p className="text-sm text-gray-500">כיתה {child.grade}</p>
                </div>
                <span className="text-blue-400 text-2xl">←</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
