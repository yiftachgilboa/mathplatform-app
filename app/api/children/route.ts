import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, grade, avatar } = body as { name: string; grade: number; avatar: string }

  if (!name?.trim() || !grade || !avatar) {
    return NextResponse.json({ error: 'חסרים פרטים' }, { status: 400 })
  }

  // Check for duplicate name (case-insensitive) under the same parent
  const { data: existing } = await supabase
    .from('children')
    .select('id')
    .eq('parent_id', user.id)
    .ilike('name', name.trim())
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'כבר קיים ילד בשם זה במשפחה' }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('children')
    .insert({ parent_id: user.id, name: name.trim(), grade, avatar, theme: 'default' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ child: data }, { status: 201 })
}
