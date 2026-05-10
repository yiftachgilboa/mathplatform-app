import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const childId = searchParams.get('childId')
  const gameId = searchParams.get('gameId')

  if (!childId || !gameId) {
    return NextResponse.json({ error: 'Missing childId or gameId' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('game_settings')
    .select('settings')
    .eq('child_id', childId)
    .eq('game_id', gameId)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data?.settings ?? {})
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { childId, gameId, settings } = body

  if (!childId || !gameId || settings === undefined) {
    return NextResponse.json({ error: 'Missing childId, gameId or settings' }, { status: 400 })
  }

  const { error } = await supabase
    .from('game_settings')
    .upsert(
      { child_id: childId, game_id: gameId, settings, updated_at: new Date().toISOString() },
      { onConflict: 'child_id,game_id' }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
