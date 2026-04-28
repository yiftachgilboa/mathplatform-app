import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

async function getAuthenticatedParentId() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ childId: string; gameId: string }> }
) {
  const { childId, gameId } = await params
  const parentId = await getAuthenticatedParentId()
  if (!parentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: child } = await serviceSupabase
    .from('children').select('id').eq('id', childId).eq('parent_id', parentId).single()
  if (!child) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data } = await serviceSupabase
    .from('game_internal_progress')
    .select('progress_data')
    .eq('child_id', childId)
    .eq('game_id', gameId)
    .single()

  return NextResponse.json({ progress_data: data?.progress_data ?? null })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ childId: string; gameId: string }> }
) {
  const { childId, gameId } = await params
  const parentId = await getAuthenticatedParentId()
  if (!parentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: child } = await serviceSupabase
    .from('children').select('id').eq('id', childId).eq('parent_id', parentId).single()
  if (!child) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { progress_data } = await req.json()

  await serviceSupabase.from('game_internal_progress').upsert({
    child_id: childId,
    game_id: gameId,
    progress_data,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'child_id,game_id' })

  return NextResponse.json({ ok: true })
}
